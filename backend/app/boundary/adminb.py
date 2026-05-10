from typing import Optional

from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.control.controller.admin import CreateAccountController
from app.entity.database.session import SessionLocal
from app.entity.models.user import User
from app.entity.models.userprofile import UserProfile

router = APIRouter(prefix="/admin", tags=["Admin"])


class CreateAccountRequest(BaseModel):
    profile_id: str
    username: str
    full_name: str
    email_address: str
    password: str
    phone_number: int
    address: str


class UpdateAccountRequest(BaseModel):
    profile_id: Optional[str] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    email_address: Optional[str] = None
    password: Optional[str] = None
    phone_number: Optional[int] = None
    address: Optional[str] = None
    account_status: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    user_id: str
    profile_id: str
    username: str
    full_name: str
    email_address: str
    phone_number: int
    address: str
    account_status: str
    is_active: bool

    class Config:
        from_attributes = True
        orm_mode = True


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_or_404(user_id: str, db: Session) -> User:
    user = db.query(User).filter(User.user_id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account does not exist",
        )
    return user


def validate_profile_exists(profile_id: str, db: Session):
    profile = (
        db.query(UserProfile)
        .filter(UserProfile.profile_id == profile_id)
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile does not exist",
        )


def validate_unique_account(
    db: Session,
    username: Optional[str] = None,
    email_address: Optional[str] = None,
    phone_number: Optional[int] = None,
    user_id: Optional[str] = None,
):
    filters = []
    if username is not None:
        filters.append(User.username == username)
    if email_address is not None:
        filters.append(User.email_address == email_address)
    if phone_number is not None:
        filters.append(User.phone_number == phone_number)

    if not filters:
        return

    existing_user = db.query(User).filter(or_(*filters)).first()
    if existing_user is not None and existing_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username, email address, or phone number already exists",
        )


@router.post(
    "/accounts",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_account(
    account: CreateAccountRequest,
    db: Session = Depends(get_db),
):
    validate_profile_exists(account.profile_id, db)
    validate_unique_account(
        db,
        username=account.username,
        email_address=account.email_address,
        phone_number=account.phone_number,
    )

    controller = CreateAccountController()
    new_user = controller.create_account(
        profile_id=account.profile_id,
        username=account.username,
        full_name=account.full_name,
        email_address=account.email_address,
        password=account.password,
        phone_number=account.phone_number,
        address=account.address,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.get("/accounts", response_model=list[UserResponse])
def view_all_accounts(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.get("/accounts/{user_id}", response_model=UserResponse)
def view_account(user_id: str, db: Session = Depends(get_db)):
    return get_user_or_404(user_id, db)


@router.put("/accounts/{user_id}", response_model=UserResponse)
def update_account(
    user_id: str,
    account: UpdateAccountRequest,
    db: Session = Depends(get_db),
):
    user = get_user_or_404(user_id, db)
    update_data = account.dict(exclude_unset=True)

    if "profile_id" in update_data:
        validate_profile_exists(update_data["profile_id"], db)

    validate_unique_account(
        db,
        username=update_data.get("username"),
        email_address=update_data.get("email_address"),
        phone_number=update_data.get("phone_number"),
        user_id=user_id,
    )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/accounts/{user_id}/deactivate", response_model=UserResponse)
def deactivate_account(user_id: str, db: Session = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    user.account_status = "inactive"
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


@router.patch("/accounts/{user_id}/activate", response_model=UserResponse)
def activate_account(user_id: str, db: Session = Depends(get_db)):
    user = get_user_or_404(user_id, db)
    user.account_status = "active"
    user.is_active = True
    db.commit()
    db.refresh(user)
    return user

