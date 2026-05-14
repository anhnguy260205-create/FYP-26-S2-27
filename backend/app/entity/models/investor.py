from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, Boolean
from app.entity.models.useraccount import UserAccount 
from app.entity.database import session

from uuid import uuid4
class Investor(UserAccount):
    __tablename__ = 'investor'
    super
    # Additional fields specific to Investor can be added here
    user_id = Column(String, ForeignKey("user_account.user_id"),primary_key=True, nullable=False)
    investor_id = Column(String, primary_key=True, default= lambda: f"investor_{uuid4}")
    #order_id = Column(String, ForeignKey("orders.order_id"), nullable=True)
    stock_level = Column(String, default="beginner")
    investor_subscription_status = Column(String, default="inactive")

    @staticmethod
    def createAccount(username, full_name, email_address, password, phone_number, address, stock_level):
        user_id = UserAccount.createAccount(username=username, full_name= full_name, email_adddress= email_address, password= password, phone_number=phone_number, address=address)
        if user_id == False:
            return False 
        
        # add investor-specific profile
        investor = Investor(
            user_id=user_id,
            stock_level="beginner",
        )

        session.add(investor)

        session.commit()

        return True
        