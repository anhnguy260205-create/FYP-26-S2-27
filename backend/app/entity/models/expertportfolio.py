
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.entity.database.base import Base
from app.entity.database.session import get_session
from app.entity.models.expert import Expert

try:
    from zoneinfo import ZoneInfo
    def _now():
        return datetime.now(ZoneInfo("Asia/Singapore"))
except Exception:
    def _now():
        return datetime.now()


class ExpertPortfolio(Base):
    __tablename__ = "expert_portfolio"

    portfolio_id = Column(String(50), primary_key=True, default=lambda: f"portfolio_{uuid4()}")
    expert_id = Column(String(50), ForeignKey("expert.expert_id"), nullable=False)
    portfolio_name = Column(String(120), nullable=False, default="Balanced Growth Portfolio")
    description = Column(Text, nullable=True)
    investment_objective = Column(String(255), nullable=True)
    risk_level = Column(String(50), nullable=False, default="Moderate")
    time_horizon = Column(String(80), nullable=True, default="3-5 years")
    target_audience = Column(String(160), nullable=True)
    status = Column(String(20), default="Active")
    created_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=_now)
    last_rebalanced = Column(DateTime, default=_now)
    cash_balance = Column(Float, default=0.0)

    holdings = relationship(
        "ExpertPortfolioHolding",
        cascade="all, delete-orphan",
        back_populates="portfolio",
        lazy="joined",
    )


class ExpertPortfolioHolding(Base):
    __tablename__ = "expert_portfolio_holding"

    holding_id = Column(String(50), primary_key=True, default=lambda: f"portfolio_holding_{uuid4()}")
    portfolio_id = Column(String(50), ForeignKey("expert_portfolio.portfolio_id"), nullable=False)
    ticker = Column(String(20), nullable=False)
    company_name = Column(String(120), nullable=False)
    asset_class = Column(String(80), default="Equity")
    sector = Column(String(80), nullable=True)
    units = Column(Float, default=0.0)
    average_buy_price = Column(Float, default=0.0)
    current_price = Column(Float, default=0.0)
    total_invested = Column(Float, default=0.0)
    allocation_percentage = Column(Float, default=0.0)
    purchase_rationale = Column(Text, nullable=True)

    portfolio = relationship("ExpertPortfolio", back_populates="holdings")


def _resolve_expert_id(session, user_id=None):
    expert = None
    if user_id:
        expert = session.query(Expert).filter(Expert.user_id == user_id).first()
    if not expert:
        expert = session.query(Expert).first()
    return expert.expert_id if expert else None


def _serialise_holding(holding):
    return {
        "holding_id": holding.holding_id,
        "ticker": holding.ticker,
        "company_name": holding.company_name,
        "asset_class": holding.asset_class,
        "sector": holding.sector,
        "units": holding.units,
        "average_buy_price": holding.average_buy_price,
        "current_price": holding.current_price,
        "total_invested": holding.total_invested,
        "allocation_percentage": holding.allocation_percentage,
        "purchase_rationale": holding.purchase_rationale,
    }


def _serialise_portfolio(portfolio):
    if not portfolio:
        return None
    holdings = list(portfolio.holdings or [])
    total_invested = sum(float(h.total_invested or 0) for h in holdings)
    total_allocation = sum(float(h.allocation_percentage or 0) for h in holdings)
    return {
        "portfolio_id": portfolio.portfolio_id,
        "expert_id": portfolio.expert_id,
        "portfolio_name": portfolio.portfolio_name,
        "description": portfolio.description,
        "investment_objective": portfolio.investment_objective,
        "risk_level": portfolio.risk_level,
        "time_horizon": portfolio.time_horizon,
        "target_audience": portfolio.target_audience,
        "status": portfolio.status,
        "created_by": portfolio.created_by,
        "created_at": portfolio.created_at.isoformat() if portfolio.created_at else None,
        "last_rebalanced": portfolio.last_rebalanced.isoformat() if portfolio.last_rebalanced else None,
        "cash_balance": portfolio.cash_balance,
        "total_invested": total_invested,
        "total_allocation": total_allocation,
        "total_holdings": len(holdings),
        "holdings": [_serialise_holding(h) for h in holdings],
    }


class ExpertPortfolioRepository:
    @staticmethod
    def get_or_seed_by_user(user_id=None):
        with get_session() as session:
            expert_id = _resolve_expert_id(session, user_id)
            if not expert_id:
                return None

            portfolio = session.query(ExpertPortfolio).filter(
                ExpertPortfolio.expert_id == expert_id
            ).first()
            if not portfolio:
                portfolio = ExpertPortfolioRepository._create_demo(session, expert_id)
                session.flush()
            return _serialise_portfolio(portfolio)

    @staticmethod
    def save_for_user(user_id, payload):
        with get_session() as session:
            expert_id = _resolve_expert_id(session, user_id)
            if not expert_id:
                return None

            portfolio = session.query(ExpertPortfolio).filter(
                ExpertPortfolio.expert_id == expert_id
            ).first()
            if not portfolio:
                portfolio = ExpertPortfolio(portfolio_id=f"portfolio_{uuid4()}", expert_id=expert_id)
                session.add(portfolio)

            portfolio.portfolio_name = payload.get("portfolio_name") or payload.get("name") or "Expert Portfolio"
            portfolio.description = payload.get("description") or ""
            portfolio.investment_objective = payload.get("investment_objective") or "Balanced long-term growth with controlled downside risk."
            portfolio.risk_level = payload.get("risk_level") or "Moderate"
            portfolio.time_horizon = payload.get("time_horizon") or "3-5 years"
            portfolio.target_audience = payload.get("target_audience") or payload.get("target_market") or "Moderate-risk investors"
            portfolio.status = payload.get("status") or "Active"
            portfolio.created_by = payload.get("created_by") or "Consultant"
            portfolio.cash_balance = float(payload.get("cash_balance") or 0)
            portfolio.last_rebalanced = _now()

            portfolio.holdings[:] = []
            for item in payload.get("holdings") or []:
                portfolio.holdings.append(ExpertPortfolioHolding(
                    holding_id=f"portfolio_holding_{uuid4()}",
                    ticker=(item.get("ticker") or item.get("symbol") or "").upper(),
                    company_name=item.get("company_name") or item.get("company") or "Unknown Company",
                    asset_class=item.get("asset_class") or "Equity",
                    sector=item.get("sector") or "",
                    units=float(item.get("units") or item.get("units_held") or 0),
                    average_buy_price=float(item.get("average_buy_price") or item.get("buy_price") or 0),
                    current_price=float(item.get("current_price") or 0),
                    total_invested=float(item.get("total_invested") or 0),
                    allocation_percentage=float(item.get("allocation_percentage") or item.get("weight") or 0),
                    purchase_rationale=item.get("purchase_rationale") or item.get("rationale") or "",
                ))
            session.flush()
            return _serialise_portfolio(portfolio)

    @staticmethod
    def _create_demo(session, expert_id):
        portfolio = ExpertPortfolio(
            portfolio_id=f"portfolio_{uuid4()}",
            expert_id=expert_id,
            portfolio_name="Balanced Growth Portfolio",
            description="A consultant-managed model portfolio focused on resilient large-cap stocks, quality technology exposure and defensive income holdings.",
            investment_objective="Generate steady long-term capital growth while keeping sector concentration and downside risk controlled.",
            risk_level="Moderate",
            time_horizon="3-5 years",
            target_audience="Premium investors seeking diversified equity exposure",
            status="Active",
            created_by="Consultant",
            cash_balance=5000,
        )
        portfolio.holdings = [
            ExpertPortfolioHolding(
                holding_id=f"portfolio_holding_{uuid4()}", ticker="AAPL", company_name="Apple Inc.", asset_class="Equity", sector="Technology",
                units=30, average_buy_price=172.5, current_price=181.6, total_invested=5175, allocation_percentage=20,
                purchase_rationale="Strong brand loyalty, stable cash generation and potential upside from services growth."
            ),
            ExpertPortfolioHolding(
                holding_id=f"portfolio_holding_{uuid4()}", ticker="MSFT", company_name="Microsoft Corporation", asset_class="Equity", sector="Technology",
                units=18, average_buy_price=395, current_price=412.8, total_invested=7110, allocation_percentage=25,
                purchase_rationale="Cloud and AI exposure with diversified enterprise revenue streams."
            ),
            ExpertPortfolioHolding(
                holding_id=f"portfolio_holding_{uuid4()}", ticker="DBS.SI", company_name="DBS Group Holdings", asset_class="Equity", sector="Financials",
                units=220, average_buy_price=36.2, current_price=38.1, total_invested=7964, allocation_percentage=25,
                purchase_rationale="Local banking leader with attractive dividends and resilient earnings."
            ),
            ExpertPortfolioHolding(
                holding_id=f"portfolio_holding_{uuid4()}", ticker="JNJ", company_name="Johnson & Johnson", asset_class="Equity", sector="Healthcare",
                units=35, average_buy_price=151.2, current_price=156.8, total_invested=5292, allocation_percentage=15,
                purchase_rationale="Defensive healthcare exposure to reduce cyclical volatility."
            ),
            ExpertPortfolioHolding(
                holding_id=f"portfolio_holding_{uuid4()}", ticker="KO", company_name="The Coca-Cola Company", asset_class="Equity", sector="Consumer Staples",
                units=70, average_buy_price=61.1, current_price=63.4, total_invested=4277, allocation_percentage=15,
                purchase_rationale="Defensive consumer staples holding with dividend stability."
            ),
        ]
        session.add(portfolio)
        return portfolio
