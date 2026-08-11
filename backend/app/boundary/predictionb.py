from fastapi import APIRouter, Depends
import yfinance as yf

from app.control.services.auth import get_current_user


router = APIRouter(prefix="/predict", tags=["Prediction"])


# Get analyst price targets and recommendation data for a stock.
@router.get("/analyst/{symbol}")
def get_analyst(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
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


# Get the main company and financial details shown on the stock overview page.
@router.get("/overview/{symbol}")
def get_overview(
    symbol: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info or {}

        # Find the CEO from the company officer list.
        ceo = None
        for off in (info.get("companyOfficers") or []):
            title = (off.get("title") or "").lower()
            if "ceo" in title or "chief executive" in title:
                ceo = off.get("name")
                break

        # Earnings data is available in slightly different formats depending on the stock.
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

        # Fall back to the value from the main company information if needed.
        if eps_est is None:
            eps_est = info.get("forwardEps")

        # Combine the available location fields into a simple headquarters string.
        hq = ", ".join(
            [p for p in [info.get("city"), info.get("country")] if p]
        ) or None

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