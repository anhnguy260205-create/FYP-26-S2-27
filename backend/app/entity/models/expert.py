from sqlalchemy import Float, Column, ForeignKey, Integer, String, Boolean
from app.entity.models.useraccount import UserAccount
from app.entity.models.expertverification import ExpertVerification
from app.entity.database.base import Base
from uuid import uuid4
from app.entity.database.session import get_session


class Expert(Base):
    __tablename__ = 'expert'
    expert_id = Column(String(50), primary_key=True,
                       default=lambda: f"expert_{uuid4()}")
    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    rating = Column(Float, default=0)
    experience_years = Column(Integer, nullable=True)
    linked_in_url = Column(String(255), nullable=True)

    chat_available = Column(Boolean, default=True, nullable=False)


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
            ExpertVerification.create_for_expert(expert.expert_id)
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
    def create_for_existing_user(user_id, experience_years=None, linked_in_url=None):
        with get_session() as session:
            existing = session.query(Expert).filter(
                Expert.user_id == user_id).first()
            if existing:
                return {"expert_id": existing.expert_id, "created": False}
            expert = Expert(
                user_id=user_id,
                experience_years=experience_years,
                linked_in_url=linked_in_url,
            )
            session.add(expert)
            session.flush()
            expert_id = expert.expert_id
        ExpertVerification.create_for_expert(expert_id)
        return {"expert_id": expert_id, "created": True}

    @staticmethod
    def update_profile(user_id, experience_years=None, linked_in_url=None):
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id).first()
            if not expert:
                return False
            if experience_years is not None:
                expert.experience_years = experience_years
            if linked_in_url is not None:
                expert.linked_in_url = linked_in_url
            return True

    @staticmethod
    def set_chat_available(user_id, available: bool):
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id).first()
            if not expert:
                return False
            expert.chat_available = available
            return True

    @staticmethod
    def update_documents(user_id, documents: list):
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id).first()
            if not expert:
                return False
            expert_id = expert.expert_id
        return ExpertVerification.update_documents(expert_id, documents)

    @staticmethod
    def set_verification_status(expert_id, status):
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.expert_id == expert_id).first()
            if not expert:
                return False
        return ExpertVerification.set_status(expert_id, status)

    @staticmethod
    def demote_to_investor(user_id):

        from app.entity.models.article import Article
        from app.entity.models.expertportfolio import ExpertPortfolio, ExpertPortfolioHolding
        from app.entity.models.expertcompensation import ExpertCompensationLedger

        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not expert:
                return False

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
            return True

    @staticmethod
    def get_user_id_by_expert_id(expert_id):
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.expert_id == expert_id).first()
            return expert.user_id if expert else None

    @staticmethod
    def get_all_for_admin():
        from app.entity.models.expertfollow import ExpertFollow
        from app.entity.models.expertportfolioreview import ExpertPortfolioReview
        from app.entity.models.expertcompensation import is_compensation_eligible
        from app.entity.models.login_mfa import LoginMfaSession

        with get_session() as session:
            experts = session.query(Expert).all()
            verification_by_expert = ExpertVerification.get_all_by_expert_id()
            result = []
            for e in experts:
                user = session.query(UserAccount).filter(
                    UserAccount.user_id == e.user_id).first()
                verification = verification_by_expert.get(e.expert_id, {
                    "verification_status": "not_submitted",
                    "documents": [],
                    "approved_date": None,
                })
                verified = str(verification.get("verification_status", "")).lower() in (
                    "verified", "approved", "active")
                follower_count = ExpertFollow.get_follower_count(e.user_id)
                rating_average = ExpertPortfolioReview._stats(
                    session, e.user_id)["average"]
                login_days_this_week = LoginMfaSession.get_login_days_this_week(
                    user.email_address) if user else 0

                result.append({
                    "expert_id": e.expert_id,
                    "user_id": e.user_id,
                    "rating": e.rating,
                    "full_name": user.full_name or (user.username if user else ""),
                    "email_address": user.email_address if user else "",
                    "phone_number": user.phone_number if user else "",
                    "address": user.address if user else "",
                    "experience_years": e.experience_years,
                    "linked_in_url": e.linked_in_url,
                    "follower_count": follower_count,
                    "rating_average": rating_average,
                    "login_days_this_week": login_days_this_week,
                    "compensation_eligible": is_compensation_eligible(
                        verified, follower_count, rating_average),
                    **verification,
                })
            return result

    @staticmethod
    def get_expert_information(user_id):
        user = UserAccount.get_user_information(user_id)
        with get_session() as session:
            expert = session.query(Expert).filter(
                Expert.user_id == user_id
            ).first()
            if not expert:
                return None
            expert_id = expert.expert_id
            rating = expert.rating
            experience_years = expert.experience_years
            linked_in_url = expert.linked_in_url
            chat_available = expert.chat_available

        verification = ExpertVerification.get_for_expert(expert_id)
        return {
            **user,
            "role": "expert",
            "rating": rating,
            "experience_years": experience_years,
            "linked_in_url": linked_in_url,
            "chat_available": chat_available,
            **verification,
        }

    @staticmethod
    def deleteExpert(user_id):
        # Merged roles: every expert also has an Investor row (holdings,
        # transactions, chat/dashboard/prediction usage, subscription, …).
        # Investor.deleteInvestor already cleans up those tables *and* the
        # expert-only ones (portfolio, articles, verification, compensation)
        # before deleting the expert and user_account rows — deleting only
        # the expert-side tables here left the Investor row behind, which
        # blocked the user_account delete with a foreign-key violation.
        from app.entity.models.investor import Investor
        return Investor.deleteInvestor(user_id)


def _promote_seed_expert(email_address: str):
    """Merged-roles: make a seeded expert account a fully verified expert —
    investor row (everyone trades as an investor), approved verification,
    and the complimentary premium tier. Idempotent; safe on every startup."""
    from app.entity.models.investor import Investor

    with get_session() as session:
        user = session.query(UserAccount).filter(
            UserAccount.email_address == email_address).first()
        if not user:
            return
        user_id = user.user_id
        expert = session.query(Expert).filter(
            Expert.user_id == user_id).first()
        expert_id = expert.expert_id if expert else None

        investor = session.query(Investor).filter(
            Investor.user_id == user_id).first()
        if not investor:
            session.add(Investor(
                user_id=user_id, investor_subscription_status="premium"))
        elif investor.investor_subscription_status != "premium":
            investor.investor_subscription_status = "premium"

    if expert_id:
        ExpertVerification.create_for_expert(expert_id)
        verification = ExpertVerification.get_for_expert(expert_id)
        if verification["verification_status"] not in ("approved", "active"):
            ExpertVerification.set_status(expert_id, "approved")


def seed_jordan_account():
    Expert.createAccount(
        username="jordan",
        email_address="jordan@gmail.com",
        experience_year=5,
        linked_in_url="https://linkedin.com/in/jordan"
    )
    _promote_seed_expert("jordan@gmail.com")
