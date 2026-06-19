from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
import yfinance as yf
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


@router.get("/analyst/{symbol}")
def get_analyst(symbol: str):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info or {}

        # Breakdown counts from recommendations_summary
        strong_buy = buy = hold = sell = strong_sell = 0
        try:
            rs = ticker.recommendations_summary
            if rs is not None and len(rs) > 0:
                row = rs.iloc[0]
                strong_buy  = int(row.get("strongBuy",   0))
                buy         = int(row.get("buy",         0))
                hold        = int(row.get("hold",        0))
                sell        = int(row.get("sell",        0))
                strong_sell = int(row.get("strongSell",  0))
        except Exception:
            pass

        total = strong_buy + buy + hold + sell + strong_sell

        rec_key  = info.get("recommendationKey", "n/a")
        rec_mean = float(info.get("recommendationMean") or 3.0)
        target   = info.get("targetMeanPrice")
        target_h = info.get("targetHighPrice")
        target_l = info.get("targetLowPrice")
        n_analysts = int(info.get("numberOfAnalystOpinions") or total or 0)
        beta     = info.get("beta")

        if beta is not None:
            b = float(beta)
            if b < 0.5:      volatility = "Low"
            elif b < 0.8:    volatility = "Below Average"
            elif b < 1.2:    volatility = "Average"
            elif b < 1.8:    volatility = "Above Average"
            else:            volatility = "High"
        else:
            volatility = "N/A"

        # Human-readable label from mean score
        if rec_mean <= 1.5:   rec_label = "Strong Buy"
        elif rec_mean <= 2.5: rec_label = "Buy"
        elif rec_mean <= 3.5: rec_label = "Hold"
        elif rec_mean <= 4.5: rec_label = "Sell"
        else:                 rec_label = "Strong Sell"

        return {
            "success": True,
            "symbol": symbol.upper(),
            "rec_label": rec_label,
            "rec_mean": round(rec_mean, 2),
            "target_price": round(target, 2) if target else None,
            "target_high":  round(target_h, 2) if target_h else None,
            "target_low":   round(target_l, 2) if target_l else None,
            "num_analysts": n_analysts,
            "volatility": volatility,
            "beta": round(float(beta), 2) if beta else None,
            "breakdown": {
                "strong_buy":  strong_buy,
                "buy":         buy,
                "hold":        hold,
                "sell":        sell,
                "strong_sell": strong_sell,
            },
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
