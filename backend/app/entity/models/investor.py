from sqlalchemy import Column, ForeignKey, String, Float, Boolean
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
    assets = Column(Float, default=0)
    used_amount = Column(Float, default=0)
    investor_subscription_status = Column(String(20), default="inactive")
 
    transaction_pin = Column(String(255), nullable=True)

    expert_eligibility_notified = Column(Boolean, nullable=False, default=False)

    @staticmethod
    def get_all_user_ids():
        with get_session() as session:
            return [uid for (uid,) in session.query(Investor.user_id).all() if uid]

    @staticmethod
    def getUserIdByInvestorId(investor_id):
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.investor_id == investor_id
            ).first()
            return investor.user_id if investor else None

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
                session.flush()  # populate investor_id from its Python-side default
                investor_id = investor.investor_id
                # get_session() handles commit automatically
            print("INVESTOR CREATED")

            # Every new investor starts on the free Basic plan automatically —
            # no manual "activate subscription" step required.
            try:
                from app.entity.models.subscription import Subscription
                Subscription.createSubscription(
                    f"basic_{uuid4()}", "basic", investor_id)
            except Exception as e:
                print("BASIC SUBSCRIPTION ACTIVATION ERROR:", e)

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
                "assets": investor.assets,
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
            "assets": investor["assets"],
            "used_amount": investor["used_amount"],
            "investor_subscription_status": investor["investor_subscription_status"]
        }

    @staticmethod
    def buyStock(user_id, symbol, quantity, price):
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

            if investor.assets < total_debit:
                return {
                    "success": False,
                    "message": (
                        f"Insufficient assets — need ${total_debit:,.2f} "
                        f"(${total_cost:,.2f} + ${platform_fee:,.2f} platform fee), "
                        f"have ${investor.assets:,.2f}"
                    ),
                }

            # Round-and-persist immediately -- Float can't exactly represent
            # cents, so without this every trade compounds a tiny binary
            # rounding error into the next one until stray pennies show up.
            investor.assets = round(investor.assets - total_debit, 2)
            investor.used_amount = round(investor.used_amount + total_cost, 2)
            investor_id = investor.investor_id
            session.flush()

            new_balance = investor.assets

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

        try:
            from app.control.controller.notificationc import create_notification
            create_notification(
                user_id, "trading", f"Buy order executed — {symbol}",
                f"Bought {quantity} share{'s' if quantity != 1 else ''} of {symbol} "
                f"at ${price:,.2f} (total ${total_cost:,.2f}).",
            )
        except Exception as e:
            print(f"[TRADING] buy notification failed: {e}")

        return {
            "success": True,
            "message": "Buy order executed successfully",
            "transaction_id": transaction_id,
            "assets": new_balance,
            "total_amount": total_cost,
            "platform_fee": platform_fee,
            "net_amount": total_debit,
        }

    @staticmethod
    def sellStock(user_id, symbol, quantity, price):
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
            # Round-and-persist immediately -- see buyStock() for why.
            investor.assets = round(investor.assets + net_proceeds, 2)
            investor.used_amount = round(investor.used_amount - cost_basis, 2)
            if investor.used_amount < 0:
                investor.used_amount = 0
            session.flush()
            new_balance = investor.assets

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

        try:
            from app.control.controller.notificationc import create_notification
            create_notification(
                user_id, "trading", f"Sell order executed — {symbol}",
                f"Sold {quantity} share{'s' if quantity != 1 else ''} of {symbol} "
                f"at ${price:,.2f} (total ${total_proceeds:,.2f}).",
            )
        except Exception as e:
            print(f"[TRADING] sell notification failed: {e}")

        return {
            "success": True,
            "message": "Sell order executed successfully",
            "transaction_id": transaction_id,
            "assets": new_balance,
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
            assets = investor.assets
            used_amount = investor.used_amount

        holdings = Holding.getHoldingsByInvestor(investor_id)

        return {
            "assets": assets,
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
        from app.entity.models.dashboardusage import DashboardUsage
        from app.entity.models.chatusage import ChatUsage
        from app.entity.models.emailalert import StockAlert
        from app.entity.models.notification import Notification
        from app.entity.models.expertfollow import ExpertFollow
        from app.entity.models.expertportfolioreview import ExpertPortfolioReview
        from app.entity.models.expertprofileview import ExpertProfileView
        from app.entity.models.chat import Conversation, ChatMessage
        from app.entity.models.wallet import WalletTransaction
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return False


            session.query(Transaction).filter(
                Transaction.investor_id == investor.investor_id
            ).delete()
            session.query(WalletTransaction).filter(
                WalletTransaction.investor_id == investor.investor_id
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
            session.query(DashboardUsage).filter(
                DashboardUsage.investor_id == investor.investor_id
            ).delete()
            session.query(ChatUsage).filter(
                ChatUsage.investor_id == investor.investor_id
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

            # Alerts and notifications (keyed by user_id, not investor_id)
            session.query(StockAlert).filter(
                StockAlert.user_id == user_id
            ).delete()
            session.query(Notification).filter(
                Notification.user_id == user_id
            ).delete()

            #  Merged roles: the account may also have an expert row, remove its children first so the user_account delete succeeds.
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

            # Investor row (child of user_account)
            session.delete(investor)
            session.flush()

            # User account row
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()
            if user:
                session.delete(user)
            return True

    @staticmethod
    def addAssets(user_id, amount):
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
            new_balance = round(investor.assets + amount, 2)
            if new_balance > MAX_BALANCE:
                return {"success": False, "message": f"Balance cannot exceed ${MAX_BALANCE:,.0f}"}
            investor.assets = new_balance
            return {"success": True, "assets": new_balance}

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

        from app.entity.models.transaction import Transaction
        from app.entity.models.wallet import WalletTransaction

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return None
            investor_id = investor.investor_id

        distinct_stocks = Transaction.getDistinctSymbolCount(investor_id)
        profit = Transaction.getRealizedPnl(investor_id)

        totals = WalletTransaction.get_totals(investor_id)
        capital_in = round((totals.get("cash_in", 0.0) or 0.0)
                           - (totals.get("cash_out", 0.0) or 0.0), 2)
        # No capital deployed → margin is undefined; treat as 0% (not eligible).
        profit_margin = round(profit / capital_in * 100, 2) if capital_in > 0 else 0.0

        return {
            "distinct_stocks": distinct_stocks,
            "required_stocks": min_distinct_stocks,
            "profit": profit,
            "profit_margin": profit_margin,
            "required_profit_margin": min_profit_margin,
            "eligible": distinct_stocks >= min_distinct_stocks and profit_margin >= min_profit_margin,
        }

    @staticmethod
    def check_and_notify_expert_eligibility(
        user_id, min_distinct_stocks=30, min_profit_margin=200.0
    ):
        
        from app.entity.models.expert import Expert

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor or investor.expert_eligibility_notified:
                return
            already_applied = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first() is not None
            if already_applied:
                investor.expert_eligibility_notified = True
                return

        eligibility = Investor.getExpertEligibility(
            user_id, min_distinct_stocks, min_profit_margin
        )
        if not eligibility or not eligibility["eligible"]:
            return

        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor or investor.expert_eligibility_notified:
                return
            investor.expert_eligibility_notified = True

        from app.control.controller.notificationc import create_notification
        create_notification(
            user_id,
            "expert",
            "You're eligible to become an expert!",
            f"You've traded {min_distinct_stocks}+ different stocks and hit a "
            f"{min_profit_margin:.0f}% profit margin — apply now to share your "
            "portfolio and earn as a verified expert.",
        )

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

    # ── Transaction PIN ──────────────────────────────────────────────────
    # A 6-digit PIN confirms every buy, sell and cash-out. It is stored
    # salted+hashed with PBKDF2 — never in plaintext.

    @staticmethod
    def _hash_pin(pin: str) -> str:
        import hashlib
        import os
        salt = os.urandom(16)
        digest = hashlib.pbkdf2_hmac("sha256", pin.encode("utf-8"), salt, 200_000)
        return f"pbkdf2_sha256$200000${salt.hex()}${digest.hex()}"

    @staticmethod
    def _verify_pin_hash(pin: str, stored: str) -> bool:
        import hashlib
        import hmac
        if not stored or stored.count("$") != 3:
            return False
        try:
            _algo, iterations, salt_hex, digest_hex = stored.split("$")
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(digest_hex)
            candidate = hashlib.pbkdf2_hmac(
                "sha256", pin.encode("utf-8"), salt, int(iterations))
            return hmac.compare_digest(candidate, expected)
        except (ValueError, TypeError):
            return False

    @staticmethod
    def setTransactionPin(user_id, pin: str):
        pin = (pin or "").strip()
        if not (pin.isdigit() and len(pin) == 6):
            return {"success": False, "message": "PIN must be exactly 6 digits"}
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor:
                return {"success": False, "message": "Investor not found"}
            investor.transaction_pin = Investor._hash_pin(pin)
        return {"success": True, "message": "Transaction PIN set"}

    @staticmethod
    def hasTransactionPin(user_id) -> bool:
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            return bool(investor and investor.transaction_pin)

    @staticmethod
    def verifyTransactionPin(user_id, pin: str) -> bool:
        pin = (pin or "").strip()
        if not (pin.isdigit() and len(pin) == 6):
            return False
        with get_session() as session:
            investor = session.query(Investor).filter(
                Investor.user_id == user_id
            ).first()
            if not investor or not investor.transaction_pin:
                return False
            return Investor._verify_pin_hash(pin, investor.transaction_pin)
