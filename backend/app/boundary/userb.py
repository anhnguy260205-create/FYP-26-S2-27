from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter

from app.control.controller.userc import CreateAccountController

router = APIRouter(prefix="/user", tags=["User"])


# Request body model
class CreateAccountRequest(BaseModel):
    role: str
    username: str
    full_name: str
    email_address: str
    password: str
    phone_number: str
    address: str
    stock_level: Optional[int] = None
    experience_year: Optional[int] = None
    linked_in_url: Optional[str] = None


class CreateAccountPage:
    def __init__(self):
        self.controller = CreateAccountController()

    def clickCreateAccount(self, role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url):

        return self.controller.createAccount(role, username, full_name, email_address, password, phone_number, address, stock_level, experience_year, linked_in_url)


@router.post("/create-account")
def create_account(data: CreateAccountRequest):

    boundary = CreateAccountPage()

    result = boundary.clickCreateAccount(
        data.role,
        data.username,
        data.full_name,
        data.email_address,
        data.password,
        data.phone_number,
        data.address,
        data.stock_level,
        data.experience_year,
        data.linked_in_url
    )

    return result