from sqlalchemy import Float, Column, ForeignKey, Integer, String, DateTime
from app.entity.models.useraccount import UserAccount 
from uuid import uuid4
from app.entity.database import session
class Expert(UserAccount):
    __tablename__ = 'expert'
    # Additional fields specific to Expert can be added here
    user_id = Column(String, ForeignKey("user_account.user_id"), primary_key=True, nullable=False)
    expert_id = Column(String, primary_key=True, default= lambda: f"expert_{uuid4}")
    expert_status = Column(String, default="active")
    rating = Column(Float, default= 0)
    experience_years = Column(Integer, nullable=False)
    linked_in_url = Column(String, nullable=True)
    verification_status = Column(String, default="pending")
    verification_score = Column(Integer, default=0)
    # This will define later
    approved_date = Column(DateTime, nullable=True)

    @staticmethod
    def createAccount(username, full_name, email_address, password, phone_number, address, experience_year, linked_in_url)->bool:
        user_id = UserAccount.createAccount(username=username, full_name= full_name, email_adddress= email_address, password= password, phone_number=phone_number, address=address)
        if user_id == False:
            return False 
        
        # add investor-specific profile
        expert = Expert(
            user_id=user_id,
            experience_year= experience_year,
            linked_in_url= linked_in_url
        )

        session.add(expert)

        session.commit()

        return True