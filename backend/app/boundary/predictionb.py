from fastapi import APIRouter
from pydantic import BaseModel
from app.control.controller.predictionc import PredictionController

router = APIRouter(prefix="/predict", tags=["Prediction"])


class PredictRequest(BaseModel):
    symbol: str
    days: int  # 1–30


@router.post("")
def predict(data: PredictRequest):
    controller = PredictionController()
    result = controller.predict(data.symbol.upper(), data.days)

    if result is None:
        return {"success": False, "message": "Prediction failed"}

    return {"success": True, **result}