from sqlalchemy import Float, Column, ForeignKey, Integer, String, DateTime
from app.entity.models.useraccount import UserAccount
from app.entity.database.base import Base
from uuid import uuid4
from app.entity.database.session import get_session


class Expert(Base):
    __tablename__ = 'expert'
    # Additional fields specific to Expert can be added here
    expert_id = Column(String(50), primary_key=True,
                       default=lambda: f"expert_{uuid4()}")
    user_id = Column(String(50), ForeignKey(
        "user_account.user_id"), nullable=False)
    expert_status = Column(String(20), default="active")
    rating = Column(Float, default=0)
    experience_years = Column(Integer, nullable=False)
    linked_in_url = Column(String(255), nullable=True)
    verification_status = Column(String(20), default="pending")
    verification_score = Column(Integer, default=0)
    # This will define later
    approved_date = Column(DateTime, nullable=True)

    @staticmethod
    def createAccount(username, email_address, experience_year=None, linked_in_url=None) -> bool:
        user_id = UserAccount.createAccount(
            username=username,
            email_address=email_address,
            profile_name="expert"
        )
        if user_id == False:
            return False
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
                "verification_status": expert.verification_status,
                "rating": expert.rating,
                "experience_years": expert.experience_years,
                "linked_in_url": expert.linked_in_url,
            }


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
