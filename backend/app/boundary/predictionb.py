from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
import yfinance as yf

from app.control.controller.predictionc import PredictionController
from app.control.services.auth import get_current_user

router = APIRouter(prefix="/predict", tags=["Prediction"])


class PredictRequest(BaseModel):
    symbol: str
    days: int = 7

    mode: Optional[str] = "standard"

    horizon_hours: Optional[int] = None

    budget: Optional[float] = None
    target_return_pct: Optional[float] = None
    timeline_days: Optional[int] = None


@router.post("")
def predict(
    data: PredictRequest,
    current_user: dict = Depends(get_current_user),
):
    result = PredictionController().predict(
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


@router.get("/analyst/{symbol}")
def get_analyst(symbol: str, current_user: dict = Depends(get_current_user)):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info or {}
        return {
            "success": True,
            "symbol": symbol.upper(),
            "targetMeanPrice": info.get("targetMeanPrice"),
            "targetHighPrice": info.get("targetHighPrice"),
            "targetLowPrice": info.get("targetLowPrice"),
            "recommendationMean": info.get("recommendationMean"),
            "recommendationKey": info.get("recommendationKey"),
            "numberOfAnalystOpinions": info.get("numberOfAnalystOpinions"),
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
