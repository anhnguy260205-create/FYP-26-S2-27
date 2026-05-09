from app.entity.models.user import User, UserProfile

class CreateAccountController:
    def create_account(self, user_id: str, profile_id: str, username: str, email: str, password: str, role: str = "investor"):
        new_user = User(
            user_id=user_id,
            profile_id=profile_id,
            username=username,
            email=email,
            password=password,
            role=role
        )
        return new_user