from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.entity.database.base import Base
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


def sgt_now():
    return datetime.now(ZoneInfo("Asia/Singapore"))


class ExpertPortfolio(Base):
    __tablename__ = "expert_portfolios"

    portfolio_id = Column(String(50), primary_key=True, default=lambda: f"portfolio_{uuid4()}")
    expert_id = Column(String(50), ForeignKey("expert.expert_id"), nullable=False)
    user_id = Column(String(50), ForeignKey("user_account.user_id"), nullable=False)
    portfolio_name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    risk_level = Column(String(50), nullable=False, default="Moderate")
    target_audience = Column(String(150), nullable=True)
    strategy_notes = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="published")
    created_at = Column(DateTime, default=sgt_now)
    updated_at = Column(DateTime, default=sgt_now, onupdate=sgt_now)

    expert = relationship("Expert", backref="strategy_portfolios")
    holdings = relationship(
        "ExpertPortfolioHolding",
        backref="portfolio",
        cascade="all, delete-orphan",
    )


class ExpertPortfolioHolding(Base):
    __tablename__ = "expert_portfolio_holdings"

    holding_id = Column(String(50), primary_key=True, default=lambda: f"holding_{uuid4()}")
    portfolio_id = Column(String(50), ForeignKey("expert_portfolios.portfolio_id"), nullable=False)
    ticker = Column(String(20), nullable=False)
    company_name = Column(String(150), nullable=True)
    allocation_pct = Column(Float, nullable=False, default=0)
    purchase_rationale = Column(Text, nullable=True)
    created_at = Column(DateTime, default=sgt_now)
    updated_at = Column(DateTime, default=sgt_now, onupdate=sgt_now)
