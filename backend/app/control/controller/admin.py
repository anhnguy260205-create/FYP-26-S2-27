from uuid import uuid4

from app.entity.models.user import User

class CreateAccountController:
    def create_account(
        self,
        profile_id: str,
        username: str,
        full_name: str,
        email_address: str,
        password: str,
        phone_number: int,
        address: str
    ) -> User:
        return User(
            user_id=str(uuid4()),
            profile_id=profile_id,
            username=username,
            full_name=full_name,
            email_address=email_address,
            password=password,
            phone_number=phone_number,
            address=address
        )
