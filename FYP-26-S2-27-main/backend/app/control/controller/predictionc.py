"""
PredictionController
====================
Drives the AI Prediction feature. Three response "modes" are supported,
selected by the `mode` field in the request:

  • "standard"   - multi-day price forecast (1-30 trading days), as before.
  • "daytrade"   - short-term forecast for a 12h or 24h window, intended for
                   day-traders who need a same-session or next-session call.
  • "goal"       - given a fixed budget, target return %, and ~1 month
                   timeline, estimates the probability of reaching the goal
                   and the projected portfolio value.

All three modes are powered by the same underlying XGBoost classifier
(xgb_stock_model.json), which outputs `prob_up`: the probability the stock
closes UP over the next trading session. That single probability is then
translated into:

  - a directional call (up/down)
  - a "signal strength" / "statistical confidence" tier (see ml_model.py)
  - an expected profit margin (expected value of the move, in %)
  - a multi-step price/probability projection for the requested horizon
"""

import math
from datetime import datetime, timedelta

import yfinance as yf
import pandas as pd

from app.control.services import ml_model


def _sanitize(obj):
    """Recursively replace NaN/inf floats with None so JSON serialization never fails."""
    if isinstance(obj, dict):
        return {k: _sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize(v) for v in obj]
    if isinstance(obj, float) and not math.isfinite(obj):
        return None
    return obj


# ── Constants ──────────────────────────────────────────────────────────────────

SUPPORTED_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "AVGO", "ORCL", "AMD",
]

# Confidence interval half-widths as % of price (widens with forecast horizon)
CI_BASE_PCT = 0.015   # ±1.5 % on day-1
CI_GROWTH = 0.008     # adds 0.8 % per extra day

# Trading hours per day (US market) - used to convert "12h"/"24h" into a
# fraction of a trading day for the day-trading mode.
TRADING_HOURS_PER_DAY = 6.5

# ~1 calendar month ≈ 21 trading days
ONE_MONTH_TRADING_DAYS = 21


# ── Controller ─────────────────────────────────────────────────────────────────

class PredictionController:

    def predict(self, symbol: str, days: int, mode: str = "standard",
                 horizon_hours: int | None = None, budget: float | None = None,
                 target_return_pct: float | None = None,
                 timeline_days: int | None = None) -> dict | None:
        """
        Returns a dict ready to be sent straight to the frontend, or None on error.
        See predictionb.py for the full response shape per mode.
        """
        if symbol not in SUPPORTED_SYMBOLS:
            return None

        history = self._fetch_history(symbol)
        if history is None or history.empty:
            return None

        last_close = float(history["Close"].iloc[-1])

        prob_up = ml_model.predict_probability_up(history, symbol)
        if prob_up is None:
            return None

        confidence = ml_model.confidence_tier(prob_up)
        typical_move_pct = self._typical_daily_move_pct(history)
        sentiment = self._run_sentiment(symbol, prob_up)

        if mode == "daytrade":
            return _sanitize(self._build_daytrade_response(
                symbol, last_close, prob_up, confidence, typical_move_pct,
                sentiment, horizon_hours or 24
            ))

        if mode == "goal":
            return _sanitize(self._build_goal_response(
                symbol, last_close, prob_up, confidence, typical_move_pct,
                sentiment, budget or 1000.0, target_return_pct or 10.0,
                timeline_days or ONE_MONTH_TRADING_DAYS
            ))

        # Default: standard multi-day forecast
        days = max(1, min(days, 30))
        predictions = self._build_standard_predictions(
            last_close, prob_up, typical_move_pct, days
        )

        return _sanitize({
            "mode": "standard",
            "symbol": symbol,
            "days": days,
            "last_close": round(last_close, 4),
            "predictions": predictions,
            "sentiment": sentiment,
            "model_signal": {
                "prob_up": round(prob_up, 4),
                "direction": confidence["direction"],
                "confidence_pct": confidence["confidence_pct"],
                "tier_label": confidence["tier_label"],
                "expected_profit_margin_pct": ml_model.expected_profit_margin_pct(
                    prob_up, typical_move_pct
                ),
            },
        })

    # ── Data fetching ────────────────────────────────────────────────────────

    def _fetch_history(self, symbol: str) -> pd.DataFrame | None:
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(period="6mo", interval="1d")
            if hist.empty:
                return None
            return hist
        except Exception as e:
            print(f"yfinance fetch failed for {symbol}: {e}")
            return None

    def _typical_daily_move_pct(self, history: pd.DataFrame, lookback: int = 20) -> float:
        """Average absolute daily return (%) over the lookback window."""
        returns = history["Close"].pct_change().dropna().tail(lookback)
        if returns.empty:
            return 1.0
        return float(returns.abs().mean() * 100)

    # ── Standard multi-day mode ────────────────────────────────────────────────

    def _build_standard_predictions(self, last_close, prob_up, typical_move_pct, days):
        """
        Each day's expected return is the model's expected-value move
        (direction * magnitude from prob_up), with widening confidence
        bands. The directional edge is held constant across the horizon
        (the model isn't re-run per day - this represents "if today's
        signal persists").
        """
        daily_drift_pct = ml_model.expected_profit_margin_pct(prob_up, typical_move_pct) / 100

        predictions = []
        price = last_close
        current_date = datetime.today()
        trading_days_added = 0
        calendar_day = current_date

        while trading_days_added < days:
            calendar_day += timedelta(days=1)
            if calendar_day.weekday() >= 5:
                continue

            price = price * (1 + daily_drift_pct)

            half_width_pct = CI_BASE_PCT + CI_GROWTH * trading_days_added
            upper = price * (1 + half_width_pct)
            lower = price * (1 - half_width_pct)

            predictions.append({
                "date": calendar_day.strftime("%Y-%m-%d"),
                "price": round(price, 4),
                "upper": round(upper, 4),
                "lower": round(lower, 4),
            })
            trading_days_added += 1

        return predictions

    # ── Day-trading mode (12h / 24h) ───────────────────────────────────────────

    def _build_daytrade_response(self, symbol, last_close, prob_up, confidence,
                                    typical_move_pct, sentiment, horizon_hours):
        """
        Day traders need a same-session or next-session call rather than a
        multi-week forecast. We scale the model's expected move down to the
        requested intraday window:

          fraction_of_day = horizon_hours / TRADING_HOURS_PER_DAY (capped at 1
          for 24h since markets are closed overnight - 24h ≈ "next session")

        The price target is last_close * (1 + scaled expected return), with
        a tighter confidence band than the multi-day mode since the horizon
        is short.
        """
        horizon_hours = 24 if horizon_hours not in (12, 24) else horizon_hours

        # 12h ≈ intraday session (~fraction of one trading day);
        # 24h ≈ through the next full session.
        if horizon_hours == 12:
            fraction_of_day = min(12 / TRADING_HOURS_PER_DAY, 1.0)
            sessions = fraction_of_day
        else:
            fraction_of_day = 1.0
            sessions = 1.0

        expected_return_pct = ml_model.expected_profit_margin_pct(prob_up, typical_move_pct) * sessions
        target_price = last_close * (1 + expected_return_pct / 100)

        # Tighter band for short horizons
        half_width_pct = (CI_BASE_PCT * 0.6) * sessions + (CI_BASE_PCT * 0.4)
        upper = target_price * (1 + half_width_pct)
        lower = target_price * (1 - half_width_pct)

        target_time = datetime.now() + timedelta(hours=horizon_hours)

        return {
            "mode": "daytrade",
            "symbol": symbol,
            "horizon_hours": horizon_hours,
            "last_close": round(last_close, 4),
            "as_of": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "target_time": target_time.strftime("%Y-%m-%d %H:%M"),
            "target_price": round(target_price, 4),
            "upper": round(upper, 4),
            "lower": round(lower, 4),
            "expected_return_pct": round(expected_return_pct, 4),
            "sentiment": sentiment,
            "model_signal": {
                "prob_up": round(prob_up, 4),
                "direction": confidence["direction"],
                "confidence_pct": confidence["confidence_pct"],
                "tier_label": confidence["tier_label"],
                "expected_profit_margin_pct": round(expected_return_pct, 4),
            },
        }

    # ── Long-term goal mode (fixed budget, target return, ~1 month) ───────────

    def _build_goal_response(self, symbol, last_close, prob_up, confidence,
                               typical_move_pct, sentiment, budget,
                               target_return_pct, timeline_days):
        """
        For an investor with a fixed `budget` who wants `target_return_pct`
        within `timeline_days` (default ~1 month / 21 trading days):

        1. Compute the model's expected DAILY return (expected value from
           prob_up, scaled to the stock's typical daily move).
        2. Compound that daily return over `timeline_days` to get the
           PROJECTED portfolio value at the end of the timeline.
        3. Compare the projected return to the target return to estimate
           whether the goal is likely to be met, and by how much the
           investor is over/under-shooting.
        4. Estimate the probability of reaching the target using the
           model's signal strength as a proxy for how reliably the daily
           edge will persist (a simple, transparent heuristic - not a
           guarantee).

        Returns the trajectory (so the frontend can chart the path to the
        goal) plus the goal-comparison metrics.
        """
        timeline_days = max(1, min(timeline_days, 252))  # cap at ~1 year

        daily_drift_pct = ml_model.expected_profit_margin_pct(prob_up, typical_move_pct) / 100
        shares_affordable = math.floor(budget / last_close) if last_close > 0 else 0
        invested_amount = round(shares_affordable * last_close, 2)
        cash_remainder = round(budget - invested_amount, 2)

        trajectory = []
        portfolio_value = invested_amount
        current_date = datetime.today()
        trading_days_added = 0
        calendar_day = current_date

        while trading_days_added < timeline_days:
            calendar_day += timedelta(days=1)
            if calendar_day.weekday() >= 5:
                continue

            portfolio_value = portfolio_value * (1 + daily_drift_pct)
            trading_days_added += 1

            # Sample every few days to keep payload small for longer timelines
            step = max(1, timeline_days // 20)
            if trading_days_added % step == 0 or trading_days_added == timeline_days:
                trajectory.append({
                    "date": calendar_day.strftime("%Y-%m-%d"),
                    "trading_day": trading_days_added,
                    "value": round(portfolio_value + cash_remainder, 2),
                })

        final_value = portfolio_value + cash_remainder
        projected_return_pct = round(((final_value - budget) / budget) * 100, 4) if budget > 0 else 0

        target_value = round(budget * (1 + target_return_pct / 100), 2)
        gap_pct = round(projected_return_pct - target_return_pct, 4)
        goal_met = projected_return_pct >= target_return_pct

        # Probability heuristic: blend the model's confidence (how reliable
        # the directional signal is) with how achievable the target is
        # relative to the projection. A target far beyond the projection
        # lowers the estimated probability even if the direction is correct.
        achievability = 1.0
        if target_return_pct > 0:
            achievability = max(0.0, min(1.0, projected_return_pct / target_return_pct)) \
                if projected_return_pct > 0 else 0.0
        elif target_return_pct <= 0:
            achievability = 1.0  # any non-negative outcome satisfies a <=0% target

        prob_reach_goal = round(
            min(0.95, max(0.05, confidence["confidence_pct"] / 100 * achievability)), 4
        )

        return {
            "mode": "goal",
            "symbol": symbol,
            "last_close": round(last_close, 4),
            "budget": round(budget, 2),
            "shares_affordable": shares_affordable,
            "invested_amount": invested_amount,
            "cash_remainder": cash_remainder,
            "timeline_days": timeline_days,
            "target_return_pct": target_return_pct,
            "target_value": target_value,
            "projected_value": round(final_value, 2),
            "projected_return_pct": projected_return_pct,
            "goal_gap_pct": gap_pct,
            "goal_met_projection": goal_met,
            "probability_reach_goal": prob_reach_goal,
            "trajectory": trajectory,
            "sentiment": sentiment,
            "model_signal": {
                "prob_up": round(prob_up, 4),
                "direction": confidence["direction"],
                "confidence_pct": confidence["confidence_pct"],
                "tier_label": confidence["tier_label"],
                "expected_daily_profit_margin_pct": round(daily_drift_pct * 100, 4),
            },
        }

    # ── Sentiment ──────────────────────────────────────────────────────────────

    def _run_sentiment(self, symbol: str, prob_up: float) -> dict:
        """
        Build the sentiment panel from VADER-scored news headlines (cached
        in ml_model from the same fetch used for model features). Falls back
        to a prob_up-derived estimate when no news is available.
        """
        feat = ml_model._get_sentiment_features(symbol)
        news_count = feat.get("news_count", 0.0)

        if news_count > 0:
            score = feat["finbert_score_mean"]
            pos   = feat["finbert_pos_mean"]
            neg   = feat["finbert_neg_mean"]
            neu   = round(max(0.0, 1.0 - pos - neg), 4)
            confidence = round(min(0.99, abs(score) * 0.8 + 0.15), 4)
        else:
            # No news available — fall back to model probability signal
            score = round((prob_up - 0.5) * 2, 4)
            magnitude = abs(score)
            neu = round(max(0.1, 1 - magnitude), 4)
            remaining = round(1 - neu, 4)
            pos = round(remaining * (0.5 + score / 2), 4)
            neg = round(remaining - pos, 4)
            confidence = round(min(0.99, magnitude * 0.8 + 0.15), 4)

        if score > 0.15:
            label = "Bullish"
        elif score < -0.15:
            label = "Bearish"
        else:
            label = "Neutral"

        return {
            "score": round(score, 4),
            "label": label,
            "confidence": confidence,
            "breakdown": {
                "positive": round(pos, 4),
                "neutral": round(neu, 4),
                "negative": round(neg, 4),
            },
        }
