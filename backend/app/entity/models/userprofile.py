from sqlalchemy import Column, String
from app.entity.database.base import Base
from sqlalchemy.orm import relationship
from app.entity.database.session import get_session
from uuid import uuid4


class UserProfile(Base):
    __tablename__ = "user_profiles"
    profile_id = Column(String(50), primary_key=True,
                        default=lambda: f"profile_{uuid4().hex}")
    profile_name = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default="active")
    description = Column(String(255), nullable=True)

    users = relationship("UserAccount", back_populates="profile")

    @staticmethod
    def get_or_create(profile_name, description=None):
        normalized_name = profile_name.strip().lower()
        with get_session() as session:
            profile = session.query(UserProfile).filter(
                UserProfile.profile_name == normalized_name
            ).first()

        if profile:
            return profile

        profile = UserProfile(
            profile_name=normalized_name,
            description=description
        )
        session.add(profile)
        session.flush()
        return profile


def seed_profiles():

    profiles = [
        ("admin", "System administrator"),
        ("investor", "Investor account"),
        ("expert", "Expert account")
    ]

    try:
        for profile_name, description in profiles:
            UserProfile.get_or_create(profile_name, description)
        with get_session() as session:
            session.commit()

    except Exception as e:
        with get_session() as session:
            session.rollback()
        print("Error generating profiles:", e)


if __name__ == "__main__":
    seed_profiles()
