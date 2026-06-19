from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app.control.controller.predictionc import PredictionController

router = APIRouter(prefix="/predict", tags=["Prediction"])


class PredictRequest(BaseModel):
    symbol: str
    days: int = 7  # 1–30, used by "standard" mode

    # mode: "standard" | "daytrade" | "goal"
    mode: Optional[str] = "standard"

    # daytrade mode
    horizon_hours: Optional[int] = None  # 12 or 24

    # goal mode
    budget: Optional[float] = None
    target_return_pct: Optional[float] = None
    timeline_days: Optional[int] = None  # default ~21 (1 month of trading days)


@router.post("")
def predict(data: PredictRequest):
    controller = PredictionController()
    result = controller.predict(
        data.symbol.upper(),
        data.days,
        mode=data.mode or "standard",
        horizon_hours=data.horizon_hours,
        budget=data.budget,
        target_return_pct=data.target_return_pct,
        timeline_days=data.timeline_days,
    )

    if result is None:
        return {"success": False, "message": "Prediction failed"}

    return {"success": True, **result}
