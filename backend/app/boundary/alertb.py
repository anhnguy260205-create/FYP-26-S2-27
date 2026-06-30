from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.control.controller.alertc import (
    CreateAlertController,
    GetAlertsController,
    DeleteAlertController,
)
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/alert", tags=["Alert"])


class CreateAlertRequest(BaseModel):
    stock_symbol: str
    price_above: Optional[float] = None
    price_below: Optional[float] = None
    increase_percent: Optional[float] = None
    decrease_percent: Optional[float] = None
    custom_message: Optional[str] = None
    notification_email: str


@router.post("/create")
def create_alert(
    data: CreateAlertRequest,
    current_user: dict = Depends(get_current_user),
):
    alert_id = CreateAlertController().create_alert(
        current_user["user_id"],
        data.stock_symbol,
        data.price_above,
        data.price_below,
        data.increase_percent,
        data.decrease_percent,
        data.custom_message,
        data.notification_email,
    )
    return {"success": True, "alert_id": alert_id}


@router.get("/list/{user_id}")
def get_alerts(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    alerts = GetAlertsController().get_alerts(user_id)
    return {"success": True, "alerts": [
        {
            "alert_id": a.alert_id,
            "stock_symbol": a.stock_symbol,
            "price_above": float(a.price_above) if a.price_above else None,
            "price_below": float(a.price_below) if a.price_below else None,
            "increase_percent": float(a.increase_percent) if a.increase_percent else None,
            "decrease_percent": float(a.decrease_percent) if a.decrease_percent else None,
            "custom_message": a.custom_message,
            "notification_email": a.notification_email,
        }
        for a in alerts
    ]}


@router.delete("/delete/{alert_id}")
def delete_alert(alert_id: int, current_user: dict = Depends(get_current_user)):
    ok = DeleteAlertController().delete_alert(alert_id, current_user["user_id"])
    return {"success": ok}
