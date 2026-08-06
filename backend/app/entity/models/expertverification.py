import json
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4
from sqlalchemy import Column, ForeignKey, String, DateTime, Text
from app.entity.database.base import Base
from app.entity.database.session import get_session


class ExpertVerification(Base):

    __tablename__ = 'expert_verification'

    verification_id = Column(String(50), primary_key=True,
                             default=lambda: f"ever_{uuid4()}")
    expert_id = Column(String(50), ForeignKey(
        "expert.expert_id"), nullable=False, unique=True)
    verification_status = Column(String(20), default="Unverified")
    documents = Column(Text, nullable=True)  # JSON array of {name, url, type}
    approved_date = Column(DateTime, nullable=True)

    @staticmethod
    def create_for_expert(expert_id):
        with get_session() as session:
            exists = session.query(ExpertVerification).filter(
                ExpertVerification.expert_id == expert_id).first()
            if not exists:
                session.add(ExpertVerification(expert_id=expert_id))

    @staticmethod
    def update_documents(expert_id, documents: list):
        with get_session() as session:
            record = session.query(ExpertVerification).filter(
                ExpertVerification.expert_id == expert_id).first()
            if not record:
                record = ExpertVerification(expert_id=expert_id)
                session.add(record)
            record.documents = json.dumps(documents)
            # Submitting/changing documents moves the expert back into the
            # admin's review queue — any prior approval no longer applies to
            # documents the admin hasn't seen.
            record.verification_status = "pending" if documents else "not_submitted"
            record.approved_date = None
            return True

    @staticmethod
    def set_status(expert_id, status):
        with get_session() as session:
            record = session.query(ExpertVerification).filter(
                ExpertVerification.expert_id == expert_id).first()
            if not record:
                record = ExpertVerification(expert_id=expert_id)
                session.add(record)
            record.verification_status = status
            if status == "approved":
                record.approved_date = datetime.now(ZoneInfo("Asia/Singapore"))
            else:
                record.approved_date = None
            return True

    @staticmethod
    def reject_and_clear_documents(expert_id):
        with get_session() as session:
            record = session.query(ExpertVerification).filter(
                ExpertVerification.expert_id == expert_id).first()
            if not record:
                record = ExpertVerification(expert_id=expert_id)
                session.add(record)
            record.verification_status = "rejected"
            record.documents = None
            record.approved_date = None
            return True

    @staticmethod
    def get_for_expert(expert_id):
        with get_session() as session:
            record = session.query(ExpertVerification).filter(
                ExpertVerification.expert_id == expert_id).first()
            if not record:
                return {
                    "verification_status": "not_submitted",
                    "documents": [],
                    "approved_date": None,
                }
            return {
                "verification_status": record.verification_status,
                "documents": json.loads(record.documents) if record.documents else [],
                "approved_date": record.approved_date.isoformat() if record.approved_date else None,
            }

    @staticmethod
    def get_all_by_expert_id():
        with get_session() as session:
            records = session.query(ExpertVerification).all()
            return {
                r.expert_id: {
                    "verification_status": r.verification_status,
                    "documents": json.loads(r.documents) if r.documents else [],
                    "approved_date": r.approved_date.isoformat() if r.approved_date else None,
                }
                for r in records
            }

    @staticmethod
    def delete_for_expert(session, expert_id):
        session.query(ExpertVerification).filter(
            ExpertVerification.expert_id == expert_id).delete()
