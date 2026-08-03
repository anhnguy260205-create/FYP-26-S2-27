from fastapi import APIRouter, Depends

from app.control.controller.expertcompensationc import ExpertCompensationController
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/expert/compensation", tags=["Expert Compensation"])

# Expert compensation summary endpoint, returns the total earnings and breakdown of earnings for the current expert user.
@router.get("/summary")
def get_compensation_summary(current_user: dict = Depends(get_current_user)):
    return ExpertCompensationController().get_summary(current_user["user_id"])
