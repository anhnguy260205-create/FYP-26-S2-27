from app.entity.database.session import get_session
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount
from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
from typing import Optional, List, Dict
from datetime import datetime
from zoneinfo import ZoneInfo


def _dt(value):
    return value.isoformat() if value else None


def _holding_to_dict(holding: ExpertPortfolioHolding) -> Dict:
    return {
        "holding_id": holding.holding_id,
        "ticker": holding.ticker,
        "company_name": holding.company_name,
        "allocation_pct": float(holding.allocation_pct or 0),
        "purchase_rationale": holding.purchase_rationale,
    }


def _portfolio_to_dict(portfolio: Optional[ExpertPortfolio]) -> Optional[Dict]:
    if not portfolio:
        return None
    holdings = [_holding_to_dict(h) for h in portfolio.holdings]
    return {
        "portfolio_id": portfolio.portfolio_id,
        "expert_id": portfolio.expert_id,
        "user_id": portfolio.user_id,
        "portfolio_name": portfolio.portfolio_name,
        "description": portfolio.description,
        "risk_level": portfolio.risk_level,
        "target_audience": portfolio.target_audience,
        "strategy_notes": portfolio.strategy_notes,
        "status": portfolio.status,
        "holdings": holdings,
        "total_allocation": round(sum(h["allocation_pct"] for h in holdings), 2),
        "created_at": _dt(portfolio.created_at),
        "updated_at": _dt(portfolio.updated_at),
    }


def _expert_to_dict(expert: Expert, user: Optional[UserAccount], portfolio: Optional[ExpertPortfolio] = None) -> Dict:
    return {
        "expert_id": expert.expert_id,
        "user_id": expert.user_id,
        "username": user.username if user else None,
        "full_name": user.full_name if user else None,
        "email": user.email_address if user else None,
        "phone_number": user.phone_number if user else None,
        "address": user.address if user else None,
        "expert_status": expert.expert_status,
        "rating": float(expert.rating or 0),
        "experience_years": expert.experience_years,
        "linked_in_url": expert.linked_in_url,
        "verification_status": expert.verification_status,
        "verification_score": expert.verification_score,
        "portfolio": _portfolio_to_dict(portfolio),
    }


class ExpertPortfolioController:
    def _get_or_create_expert(self, session, user_id: str, experience_years: int = 0, linked_in_url: Optional[str] = None) -> Expert:
        expert = session.query(Expert).filter(Expert.user_id == user_id).first()
        if expert:
            if experience_years is not None:
                expert.experience_years = int(experience_years or 0)
            if linked_in_url is not None:
                expert.linked_in_url = linked_in_url
            return expert

        expert = Expert(
            user_id=user_id,
            experience_years=int(experience_years or 0),
            linked_in_url=linked_in_url,
            expert_status="active",
            verification_status="pending",
        )
        session.add(expert)
        session.flush()
        return expert

    def get_all_experts(self) -> List[Dict]:
        """Get all experts with their latest portfolio information."""
        with get_session() as session:
            experts = session.query(Expert).all()
            result = []
            for expert in experts:
                user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first()
                portfolio = session.query(ExpertPortfolio).filter(
                    ExpertPortfolio.expert_id == expert.expert_id
                ).order_by(ExpertPortfolio.updated_at.desc()).first()
                result.append(_expert_to_dict(expert, user, portfolio))
            return result

    def get_expert_by_id(self, expert_id: str) -> Optional[Dict]:
        """Get expert by expert_id."""
        with get_session() as session:
            expert = session.query(Expert).filter(Expert.expert_id == expert_id).first()
            if not expert:
                return None
            user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first()
            portfolio = session.query(ExpertPortfolio).filter(
                ExpertPortfolio.expert_id == expert.expert_id
            ).order_by(ExpertPortfolio.updated_at.desc()).first()
            return _expert_to_dict(expert, user, portfolio)

    def get_expert_by_user_id(self, user_id: str) -> Optional[Dict]:
        with get_session() as session:
            expert = session.query(Expert).filter(Expert.user_id == user_id).first()
            if not expert:
                return None
            user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
            portfolio = session.query(ExpertPortfolio).filter(
                ExpertPortfolio.user_id == user_id
            ).order_by(ExpertPortfolio.updated_at.desc()).first()
            return _expert_to_dict(expert, user, portfolio)

    def create_expert_portfolio(
        self,
        user_id: str,
        experience_years: int = 0,
        linked_in_url: Optional[str] = None,
        portfolio_name: Optional[str] = None,
        description: Optional[str] = None,
        risk_level: Optional[str] = None,
        target_audience: Optional[str] = None,
        strategy_notes: Optional[str] = None,
        holdings: Optional[List[Dict]] = None,
    ) -> Dict:
        """Create an expert row if needed, then create the strategy portfolio and allocation holdings."""
        with get_session() as session:
            expert = self._get_or_create_expert(session, user_id, experience_years, linked_in_url)
            existing = session.query(ExpertPortfolio).filter(ExpertPortfolio.user_id == user_id).first()
            if existing:
                return {"created": False, "portfolio": _portfolio_to_dict(existing)}

            portfolio = ExpertPortfolio(
                expert_id=expert.expert_id,
                user_id=user_id,
                portfolio_name=portfolio_name or "Expert Strategy Portfolio",
                description=description,
                risk_level=risk_level or "Moderate",
                target_audience=target_audience,
                strategy_notes=strategy_notes,
                status="published",
            )
            session.add(portfolio)
            session.flush()

            for item in holdings or []:
                ticker = str(item.get("ticker", "")).strip().upper()
                if not ticker:
                    continue
                session.add(ExpertPortfolioHolding(
                    portfolio_id=portfolio.portfolio_id,
                    ticker=ticker,
                    company_name=item.get("company_name"),
                    allocation_pct=float(item.get("allocation_pct") or 0),
                    purchase_rationale=item.get("purchase_rationale"),
                ))

            session.commit()
            session.refresh(portfolio)
            return {"created": True, "portfolio": _portfolio_to_dict(portfolio), "expert_id": expert.expert_id}

    def update_expert_portfolio(
        self,
        portfolio_id: str,
        user_id: str,
        experience_years: Optional[int] = None,
        linked_in_url: Optional[str] = None,
        expert_status: Optional[str] = None,
        portfolio_name: Optional[str] = None,
        description: Optional[str] = None,
        risk_level: Optional[str] = None,
        target_audience: Optional[str] = None,
        strategy_notes: Optional[str] = None,
        holdings: Optional[List[Dict]] = None,
    ) -> Optional[Dict]:
        """Update expert details plus editable portfolio fields and holdings."""
        with get_session() as session:
            portfolio = session.query(ExpertPortfolio).filter(
                ExpertPortfolio.portfolio_id == portfolio_id,
                ExpertPortfolio.user_id == user_id,
            ).first()
            if not portfolio:
                return None

            expert = session.query(Expert).filter(Expert.expert_id == portfolio.expert_id).first()
            if expert:
                if experience_years is not None:
                    expert.experience_years = int(experience_years or 0)
                if linked_in_url is not None:
                    expert.linked_in_url = linked_in_url
                if expert_status is not None:
                    expert.expert_status = expert_status

            if portfolio_name is not None:
                portfolio.portfolio_name = portfolio_name
            if description is not None:
                portfolio.description = description
            if risk_level is not None:
                portfolio.risk_level = risk_level
            if target_audience is not None:
                portfolio.target_audience = target_audience
            if strategy_notes is not None:
                portfolio.strategy_notes = strategy_notes
            portfolio.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))

            if holdings is not None:
                session.query(ExpertPortfolioHolding).filter(
                    ExpertPortfolioHolding.portfolio_id == portfolio.portfolio_id
                ).delete()
                session.flush()
                for item in holdings:
                    ticker = str(item.get("ticker", "")).strip().upper()
                    if not ticker:
                        continue
                    session.add(ExpertPortfolioHolding(
                        portfolio_id=portfolio.portfolio_id,
                        ticker=ticker,
                        company_name=item.get("company_name"),
                        allocation_pct=float(item.get("allocation_pct") or 0),
                        purchase_rationale=item.get("purchase_rationale"),
                    ))

            session.commit()
            session.refresh(portfolio)
            return _portfolio_to_dict(portfolio)
