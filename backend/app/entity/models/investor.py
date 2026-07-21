from sqlalchemy import Column, ForeignKey, String, Float
from app.entity.models.useraccount import UserAccount
from app.entity.database.base import Base
from app.entity.database.session import get_session

from uuid import uuid4


class Investor(Base):
    __tablename__ = 'investor'

    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    investor_id = Column(String(50), primary_key=True,
                         default=lambda: f"investor_{uuid4()}")
    interests = Column(String(255), nullable=True)
    risk_tolerance = Column(String(30), nullable=True)
    paper_money = Column(Float, default=2000)
    used_amount = Column(Float, default=0)
    investor_subscription_status = Column(String(20), default="inactive")

    @staticmethod
    def get_all_user_ids():
        with get_session() as session:
            return [uid for (uid,) in session.query(Investor.user_id).all() if uid]

    @staticmethod
    def createAccount(username, email_address) -> bool:
        user_id = UserAccount.createAccount(
            username=username,
            email_address=email_address,
            profile_name="investor"
        )
        if not user_id or isinstance(user_id, str) and user_id.startswith("duplicate"):
            return user_id
        try:
            with get_session() as session:
                investor = Investor(
                    user_id=user_id,

                )
                session.add(investor)
                # get_session() handles commit automatically
            print("INVESTOR CREATED")
            return user_id
        except Exception as e:
            print("INVESTOR ERROR:", e)
            return False

    @staticmethod
    def getInvestorByUserId(user_id):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            return {
                "investor_id": investor.investor_id,
                "user_id": investor.user_id,
                "interests": investor.interests,
                "risk_tolerance": investor.risk_tolerance,
                "paper_money": investor.paper_money,
                "used_amount": investor.used_amount,
                "investor_subscription_status": investor.investor_subscription_status
            }

    @staticmethod
    def get_investor_information(user_id):
        user = UserAccount.get_user_information(user_id)
        if not user:
            return None
        investor = Investor.getInvestorByUserId(user_id)  # now returns dict
        if not investor:
            return None
        return {
            **user,
            "role": "investor",
            "investor_id": investor["investor_id"],
            "interests": investor["interests"],
            "risk_tolerance": investor["risk_tolerance"],
            "paper_money": investor["paper_money"],
            "used_amount": investor["used_amount"],
            "investor_subscription_status": investor["investor_subscription_status"]
        }

    @staticmethod
    def buyStock(user_id, symbol, quantity, price):
        """
        Deduct cost from paper_money, increase used_amount, add shares to holding,
        and record the transaction. Returns dict with success flag and message.
        """
        from app.entity.models.holding import Holding
        from app.entity.models.transaction import Transaction
        from app.entity.models.wallet import (
            WalletTransaction, PlatformRevenue, TXN_PLATFORM_FEE, REV_TRADE_FEE,
        )
        from app.control.services.trading_engine import calculate_platform_fee

        if quantity <= 0 or price <= 0:
            return {"success": False, "message": "Invalid quantity or price"}

        total_cost = round(price * quantity, 2)
        # Commission sits ON TOP of a buy — the investor needs both.
        platform_fee = calculate_platform_fee(total_cost)
        total_debit = round(total_cost + platform_fee, 2)

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}

            if investor.paper_money < total_debit:
                return {
                    "success": False,
                    "message": (
                        f"Insufficient paper funds — need ${total_debit:,.2f} "
                        f"(${total_cost:,.2f} + ${platform_fee:,.2f} platform fee), "
                        f"have ${investor.paper_money:,.2f}"
                    ),
                }

            investor.paper_money -= total_debit
            # used_amount tracks capital deployed into positions, so the fee
            # (an expense, not a position) is deliberately excluded.
            investor.used_amount += total_cost
            investor_id = investor.investor_id
            session.flush()

            new_balance = investor.paper_money

            if platform_fee > 0:
                WalletTransaction.record(
                    session, investor_id, TXN_PLATFORM_FEE, -platform_fee,
                    description=f"Platform fee — buy {symbol}",
                    balance_after=new_balance,
                )
                PlatformRevenue.record(
                    session, REV_TRADE_FEE, platform_fee,
                    user_id=user_id,
                    description=f"Buy {symbol} — ${total_cost:,.2f} executed",
                )

        Holding.addShares(investor_id, symbol, quantity, price)
        transaction_id = Transaction.createTransaction(
            investor_id, symbol, "buy", quantity, price, total_cost
        )

        return {
            "success": True,
            "message": "Buy order executed successfully",
            "transaction_id": transaction_id,
            "paper_money": new_balance,
            "total_amount": total_cost,
            "platform_fee": platform_fee,
            "net_amount": total_debit,
        }

    @staticmethod
    def sellStock(user_id, symbol, quantity, price):
        """
        Remove shares from holding, credit proceeds to paper_money,
        decrease used_amount, and record the transaction.
        """
        from app.entity.models.holding import Holding
        from app.entity.models.transaction import Transaction
        from app.entity.models.wallet import (
            WalletTransaction, PlatformRevenue, TXN_PLATFORM_FEE, REV_TRADE_FEE,
        )
        from app.control.services.trading_engine import calculate_platform_fee

        if quantity <= 0 or price <= 0:
            return {"success": False, "message": "Invalid quantity or price"}

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}

            investor_id = investor.investor_id

        existing_holding = Holding.getHolding(investor_id, symbol)
        if not existing_holding or existing_holding["quantity"] < quantity:
            return {"success": False, "message": "Not enough shares to sell"}

        total_proceeds = round(price * quantity, 2)
        cost_basis = round(existing_holding["average_cost"] * quantity, 2)
        # Commission comes OUT of the proceeds on a sell.
        platform_fee = calculate_platform_fee(total_proceeds)
        net_proceeds = round(total_proceeds - platform_fee, 2)

        removed = Holding.removeShares(investor_id, symbol, quantity)
        if not removed:
            return {"success": False, "message": "Not enough shares to sell"}

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            investor.paper_money += net_proceeds
            investor.used_amount -= cost_basis
            if investor.used_amount < 0:
                investor.used_amount = 0
            session.flush()
            new_balance = investor.paper_money

            if platform_fee > 0:
                WalletTransaction.record(
                    session, investor_id, TXN_PLATFORM_FEE, -platform_fee,
                    description=f"Platform fee — sell {symbol}",
                    balance_after=new_balance,
                )
                PlatformRevenue.record(
                    session, REV_TRADE_FEE, platform_fee,
                    user_id=user_id,
                    description=f"Sell {symbol} — ${total_proceeds:,.2f} executed",
                )

        transaction_id = Transaction.createTransaction(
            investor_id, symbol, "sell", quantity, price, total_proceeds
        )

        return {
            "success": True,
            "message": "Sell order executed successfully",
            "transaction_id": transaction_id,
            "paper_money": new_balance,
            "total_amount": total_proceeds,
            "platform_fee": platform_fee,
            "net_amount": net_proceeds,
        }

    @staticmethod
    def getPortfolio(user_id):
        from app.entity.models.holding import Holding

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            investor_id = investor.investor_id
            paper_money = investor.paper_money
            used_amount = investor.used_amount

        holdings = Holding.getHoldingsByInvestor(investor_id)

        return {
            "paper_money": paper_money,
            "used_amount": used_amount,
            "holdings": holdings
        }

    @staticmethod
    def deleteInvestor(user_id):
        from app.entity.models.subscription import Subscription
        from app.entity.models.watchlist import Watchlist
        from app.entity.models.transaction import Transaction
        from app.entity.models.holding import Holding
        from app.entity.models.order_book import OrderBook
        from app.entity.models.predictionusage import PredictionUsage
        from app.entity.models.emailalert import StockAlert
        from app.entity.models.notification import Notification
        from app.entity.models.expertfollow import ExpertFollow
        from app.entity.models.expertportfolioreview import ExpertPortfolioReview
        from app.entity.models.expertprofileview import ExpertProfileView
        from app.entity.models.chat import Conversation, ChatMessage
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False

            # 1. FK-constrained children of investor (must go first, or the
            # investor row can't be deleted — trading history in particular
            # exists for almost any real account).
            session.query(Transaction).filter(
                Transaction.investor_id == investor.investor_id
            ).delete()
            session.query(Holding).filter(
                Holding.investor_id == investor.investor_id
            ).delete()
            session.query(OrderBook).filter(
                OrderBook.investor_id == investor.investor_id
            ).delete()
            session.query(PredictionUsage).filter(
                PredictionUsage.investor_id == investor.investor_id
            ).delete()
            session.query(Subscription).filter(
                Subscription.investor_id == investor.investor_id
            ).delete()
            session.query(Watchlist).filter(
                Watchlist.user_id == user_id
            ).delete()
            session.query(ExpertFollow).filter(
                (ExpertFollow.follower_user_id == user_id) |
                (ExpertFollow.expert_user_id == user_id)
            ).delete()
            session.query(ExpertPortfolioReview).filter(
                (ExpertPortfolioReview.reviewer_user_id == user_id) |
                (ExpertPortfolioReview.expert_user_id == user_id)
            ).delete()
            session.query(ExpertProfileView).filter(
                ExpertProfileView.investor_id == investor.investor_id
            ).delete()

            # Chat conversations & messages involving this user — messages are
            # deleted first since they FK to the conversation, which FKs to
            # user_account; both must go before the user row can be dropped.
            conv_ids = [
                c.conv_id for c in session.query(Conversation).filter(
                    (Conversation.user_a_id == user_id) |
                    (Conversation.user_b_id == user_id)
                ).all()
            ]
            if conv_ids:
                session.query(ChatMessage).filter(
                    ChatMessage.conv_id.in_(conv_ids)
                ).delete(synchronize_session=False)
                session.query(Conversation).filter(
                    Conversation.conv_id.in_(conv_ids)
                ).delete(synchronize_session=False)

            # 2. Alerts and notifications (keyed by user_id, not investor_id)
            session.query(StockAlert).filter(
                StockAlert.user_id == user_id
            ).delete()
            session.query(Notification).filter(
                Notification.user_id == user_id
            ).delete()

            # 2b. Merged roles: the account may also have an expert row —
            # remove its children first so the user_account delete succeeds.
            from app.entity.models.expert import Expert
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if expert:
                from app.entity.models.article import Article
                from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
                from app.entity.models.expertverification import ExpertVerification
                from app.entity.models.expertcompensation import ExpertCompensationLedger

                portfolio_ids = [
                    p.portfolio_id for p in session.query(ExpertPortfolio).filter(
                        ExpertPortfolio.expert_id == expert.expert_id
                    ).all()
                ]
                if portfolio_ids:
                    session.query(ExpertPortfolioHolding).filter(
                        ExpertPortfolioHolding.portfolio_id.in_(portfolio_ids)
                    ).delete(synchronize_session=False)
                session.query(ExpertPortfolio).filter(
                    ExpertPortfolio.expert_id == expert.expert_id
                ).delete()
                session.query(Article).filter(
                    Article.expert_id == expert.expert_id
                ).delete()
                session.query(ExpertCompensationLedger).filter(
                    ExpertCompensationLedger.expert_id == expert.expert_id
                ).delete()
                ExpertVerification.delete_for_expert(session, expert.expert_id)
                session.delete(expert)

            # 3. Investor row (child of user_account)
            session.delete(investor)
            session.flush()

            # 4. User account row
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()
            if user:
                session.delete(user)
            return True

    @staticmethod
    def addPaperMoney(user_id, amount):
        MAX_BALANCE = 10000.0
        if amount <= 0:
            return {"success": False, "message": "Amount must be greater than 0"}
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}
            if investor.investor_subscription_status != "premium":
                return {"success": False, "message": "Premium subscription required"}
            new_balance = round(investor.paper_money + amount, 2)
            if new_balance > MAX_BALANCE:
                return {"success": False, "message": f"Balance cannot exceed ${MAX_BALANCE:,.0f}"}
            investor.paper_money = new_balance
            return {"success": True, "paper_money": new_balance}

    @staticmethod
    def setSubscriptionStatus(user_id, status: str):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.investor_subscription_status = status
            return True

    @staticmethod
    def revokeExpertPremium(user_id):
        """Called when expert verification is rejected/cancelled: fall back to
        the latest active paid subscription plan, or inactive if none."""
        from app.entity.models.subscription import Subscription
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            paid = (
                session.query(Subscription)
                .filter(
                    Subscription.investor_id == investor.investor_id,
                    Subscription.sub_status == "active",
                )
                .order_by(Subscription.sub_date.desc())
                .first()
            )
            investor.investor_subscription_status = paid.plan_type if paid else "inactive"
            return True

    @staticmethod
    def getExpertEligibility(user_id, min_distinct_stocks=30, min_profit_margin=200.0):
        """Expert-upgrade requirements: traded >= 30 distinct stocks and hit a
        realized profit margin of >= 200% on the S$2,000 starting capital.
        Profit = paper_money + used_amount (cost basis of holdings) - 2000."""
        from app.entity.models.transaction import Transaction

        STARTING_CAPITAL = 2000.0
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            investor_id = investor.investor_id
            paper_money = investor.paper_money or 0
            used_amount = investor.used_amount or 0

        distinct_stocks = Transaction.getDistinctSymbolCount(investor_id)
        profit = round(paper_money + used_amount - STARTING_CAPITAL, 2)
        profit_margin = round(profit / STARTING_CAPITAL * 100, 2)

        return {
            "distinct_stocks": distinct_stocks,
            "required_stocks": min_distinct_stocks,
            "profit": profit,
            "profit_margin": profit_margin,
            "required_profit_margin": min_profit_margin,
            "eligible": distinct_stocks >= min_distinct_stocks and profit_margin >= min_profit_margin,
        }

    @staticmethod
    def update_investor_stock_level(user_id, stock_level):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.stock_interest = stock_level
            return True

    @staticmethod
    def updateInterests(user_id, interests: str):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.interests = interests
            return True

    @staticmethod
    def updateRiskTolerance(user_id, risk_tolerance: str):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False
            investor.risk_tolerance = risk_tolerance
            return True


def seed_investor_account():
    Investor.createAccount(
        username="Kim",
        email_address="kim@gmail.com",
    )
