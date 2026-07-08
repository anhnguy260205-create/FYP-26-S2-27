import json
from datetime import datetime
from sqlalchemy import Float, Column, ForeignKey, Integer, String, DateTime, Text
from app.entity.models.useraccount import UserAccount
from app.entity.database.base import Base
from uuid import uuid4
from app.entity.database.session import get_session
from zoneinfo import ZoneInfo


class Expert(Base):
    __tablename__ = 'expert'
    # Additional fields specific to Expert can be added here
    expert_id = Column(String(50), primary_key=True,
                       default=lambda: f"expert_{uuid4()}")
    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    expert_status = Column(String(20), default="active")
    rating = Column(Float, default=0)
    experience_years = Column(Integer, nullable=True)
    linked_in_url = Column(String(255), nullable=True)
    risk_tolerance = Column(String(30), nullable=True)
    verification_status = Column(String(20), default="pending")
    verification_score = Column(Integer, default=0)
    approved_date = Column(DateTime, nullable=True)
    documents = Column(Text, nullable=True)  # JSON array of {name, url, type}

    @staticmethod
    def createAccount(username, email_address, experience_year=None, linked_in_url=None) -> bool:
        user_id = UserAccount.createAccount(
            username=username,
            email_address=email_address,
            profile_name="expert"
        )
        if not user_id or isinstance(user_id, str) and user_id.startswith("duplicate"):
            return user_id
        try:
            expert = Expert(
                user_id=user_id,
                experience_years=experience_year,
                linked_in_url=linked_in_url
            )
            with get_session() as session:
                session.add(expert)
                session.commit()
            print("EXPERT CREATED")
            return user_id
        except Exception as e:
            with get_session() as session:
                orphan = session.query(UserAccount).filter(
                    UserAccount.user_id == user_id).first()
                if orphan:
                    session.delete(orphan)
            print("EXPERT ERROR:", e)
            return False

    @staticmethod
    def update_profile(user_id, experience_years=None, linked_in_url=None, risk_tolerance=None):
        with get_session() as session:
            expert = session.query(Expert).filter(Expert.user_id == user_id).first()
            if not expert:
                return False
            if experience_years is not None:
                expert.experience_years = experience_years
            if linked_in_url is not None:
                expert.linked_in_url = linked_in_url
            if risk_tolerance is not None:
                expert.risk_tolerance = risk_tolerance
            return True

    @staticmethod
    def update_documents(user_id, documents: list):
        with get_session() as session:
            expert = session.query(Expert).filter(Expert.user_id == user_id).first()
            if not expert:
                return False
            expert.documents = json.dumps(documents)
            return True

    @staticmethod
    def set_verification_status(expert_id, status):
        with get_session() as session:
            expert = session.query(Expert).filter(Expert.expert_id == expert_id).first()
            if not expert:
                return False
            expert.verification_status = status
            if status == "approved":
                expert.approved_date = datetime.now(ZoneInfo("Asia/Singapore"))
            return True

    @staticmethod
    def get_all_pending():
        with get_session() as session:
            experts = session.query(Expert).filter(
                Expert.verification_status == "pending"
            ).all()
            result = []
            for e in experts:
                user = session.query(UserAccount).filter(UserAccount.user_id == e.user_id).first()
                result.append({
                    "expert_id": e.expert_id,
                    "user_id": e.user_id,
                    "full_name": user.full_name if user else "",
                    "email_address": user.email_address if user else "",
                    "phone_number": user.phone_number if user else "",
                    "address": user.address if user else "",
                    "experience_years": e.experience_years,
                    "linked_in_url": e.linked_in_url,
                    "risk_tolerance": e.risk_tolerance,
                    "verification_status": e.verification_status,
                    "verification_score": e.verification_score,
                    "documents": json.loads(e.documents) if e.documents else [],
                    "approved_date": e.approved_date.isoformat() if e.approved_date else None,
                })
            return result

    @staticmethod
    def get_all_for_admin():
        with get_session() as session:
            experts = session.query(Expert).all()
            result = []
            for e in experts:
                user = session.query(UserAccount).filter(UserAccount.user_id == e.user_id).first()
                result.append({
                    "expert_id": e.expert_id,
                    "user_id": e.user_id,
                    "full_name": user.full_name or (user.username if user else ""),
                    "email_address": user.email_address if user else "",
                    "phone_number": user.phone_number if user else "",
                    "address": user.address if user else "",
                    "experience_years": e.experience_years,
                    "linked_in_url": e.linked_in_url,
                    "risk_tolerance": e.risk_tolerance,
                    "verification_status": e.verification_status,
                    "verification_score": e.verification_score,
                    "documents": json.loads(e.documents) if e.documents else [],
                    "approved_date": e.approved_date.isoformat() if e.approved_date else None,
                })
            return result

    @staticmethod
    def get_expert_information(user_id):
        user = UserAccount.get_user_information(user_id)
        with get_session() as session:
            expert_id = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not expert_id:
                return None
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not expert:
                return None
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            return {
                **user,
                "role": "expert",
                "verification_status": expert.verification_status,
                "rating": expert.rating,
                "experience_years": expert.experience_years,
                "linked_in_url": expert.linked_in_url,
                "risk_tolerance": expert.risk_tolerance,
                "documents": json.loads(expert.documents) if expert.documents else [],
            }

    @staticmethod
    def deleteExpert(user_id):
        from app.entity.models.article import Article
        from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
        from app.entity.models.forumquestion import ExpertQuestion
        from app.entity.models.emailalert import StockAlert
        from app.entity.models.notification import Notification
        from app.entity.models.watchlist import Watchlist

        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not expert:
                return False

            # 1. Portfolio holdings (child of portfolio)
            portfolio_ids = [
                p.portfolio_id for p in session.query(ExpertPortfolio).filter(
                    ExpertPortfolio.expert_id == expert.expert_id
                ).all()
            ]
            if portfolio_ids:
                session.query(ExpertPortfolioHolding).filter(
                    ExpertPortfolioHolding.portfolio_id.in_(portfolio_ids)
                ).delete(synchronize_session=False)

            # 2. Portfolio (child of expert)
            session.query(ExpertPortfolio).filter(
                ExpertPortfolio.expert_id == expert.expert_id
            ).delete()

            # 3. Articles authored (child of expert)
            session.query(Article).filter(
                Article.expert_id == expert.expert_id
            ).delete()

            # 4. Questions assigned to this expert
            session.query(ExpertQuestion).filter(
                ExpertQuestion.expert_id == expert.expert_id
            ).delete()

            # 5. Alerts, notifications, watchlist (keyed by user_id, not expert_id)
            session.query(StockAlert).filter(
                StockAlert.user_id == user_id
            ).delete()
            session.query(Notification).filter(
                Notification.user_id == user_id
            ).delete()
            session.query(Watchlist).filter(
                Watchlist.user_id == user_id
            ).delete()

            # 6. Expert row (child of user_account)
            session.delete(expert)
            session.flush()

            # 7. User account row
            user = session.query(UserAccount).filter(
                UserAccount.user_id == user_id
            ).first()
            if user:
                session.delete(user)
            return True


def seed_expert_account():
    Expert.createAccount(
        username="Anh",
        email_address="kimhi@gmail.com",
        experience_year=3,
        linked_in_url="@anh"
    )


def seed_jordan_account():
    Expert.createAccount(
        username="jordan",
        email_address="jordan@gmail.com",
        experience_year=5,
        linked_in_url="https://linkedin.com/in/jordan"
    )
