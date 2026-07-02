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


@router.get("/overview/{symbol}")
def get_overview(symbol: str, current_user: dict = Depends(get_current_user)):
    """Company key stats, upcoming earnings and profile for the Overview tab."""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info or {}

        ceo = None
        for off in (info.get("companyOfficers") or []):
            title = (off.get("title") or "").lower()
            if "ceo" in title or "chief executive" in title:
                ceo = off.get("name")
                break

        next_earnings, eps_est, rev_est = None, None, None
        try:
            cal = ticker.calendar
            if isinstance(cal, dict):
                ed = cal.get("Earnings Date")
                if isinstance(ed, (list, tuple)) and ed:
                    next_earnings = str(ed[0])
                elif ed:
                    next_earnings = str(ed)
                eps_est = cal.get("Earnings Average") or cal.get("EPS Estimate")
                rev_est = cal.get("Revenue Average") or cal.get("Revenue Estimate")
        except Exception:
            pass
        if eps_est is None:
            eps_est = info.get("forwardEps")

        hq = ", ".join([p for p in [info.get("city"), info.get("country")] if p]) or None

        return {
            "success": True,
            "symbol": symbol.upper(),
            "name": info.get("shortName") or info.get("longName"),
            "marketCap": info.get("marketCap"),
            "dividendYield": info.get("dividendYield"),
            "trailingPE": info.get("trailingPE"),
            "trailingEps": info.get("trailingEps"),
            "netIncome": info.get("netIncomeToCommon"),
            "revenue": info.get("totalRevenue"),
            "floatShares": info.get("floatShares") or info.get("sharesOutstanding"),
            "beta": info.get("beta"),
            "employees": info.get("fullTimeEmployees"),
            "volume": info.get("volume") or info.get("regularMarketVolume"),
            "avgVolume": info.get("averageVolume"),
            "nextEarningsDate": next_earnings,
            "epsEstimate": eps_est,
            "revenueEstimate": rev_est,
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "ceo": ceo,
            "website": info.get("website"),
            "headquarters": hq,
            "description": info.get("longBusinessSummary"),
        }
    except Exception as e:
        return {"success": False, "message": str(e)}
