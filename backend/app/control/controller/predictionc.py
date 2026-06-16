"""
PredictionController
====================
Currently runs a *mock* prediction so the frontend works before the real
BiLSTM + FinBERT ensemble is ready.

When your model is ready, replace the block inside `_run_model()` that is
marked with  ← REPLACE THIS  comments.  Everything else (API shape, error
handling, response format) stays exactly the same.
"""

import random
import math
from datetime import datetime, timedelta

import yfinance as yf


# ── Constants ──────────────────────────────────────────────────────────────────

SUPPORTED_SYMBOLS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
    "META", "TSLA", "AVGO", "ORCL", "AMD",
]

# Confidence interval half-widths as % of price (widens with forecast horizon)
CI_BASE_PCT = 0.015   # ±1.5 % on day-1
CI_GROWTH   = 0.008   # adds 0.8 % per extra day


# ── Controller ─────────────────────────────────────────────────────────────────

class PredictionController:

    def predict(self, symbol: str, days: int) -> dict | None:
        """
        Returns a dict ready to be sent straight to the frontend, or None on error.

        Response shape
        --------------
        {
          "symbol":       str,
          "days":         int,
          "last_close":   float,

          "predictions": [
            {
              "date":   "YYYY-MM-DD",
              "price":  float,
              "upper":  float,   # upper confidence bound
              "lower":  float,   # lower confidence bound
            },
            ...
          ],

          "sentiment": {
            "score":      float,   # –1.0 (bearish) … +1.0 (bullish)
            "label":      "Bullish" | "Neutral" | "Bearish",
            "confidence": float,   # 0.0 – 1.0
            "breakdown":  {
              "positive": float,   # share of articles positive
              "neutral":  float,
              "negative": float,
            }
          }
        }
        """
        if symbol not in SUPPORTED_SYMBOLS:
            return None

        days = max(1, min(days, 30))

        # Fetch the last known close price from yfinance
        last_close = self._fetch_last_close(symbol)
        if last_close is None:
            return None

        # Run model (or mock)
        predictions = self._run_model(symbol, last_close, days)
        sentiment   = self._run_sentiment(symbol)

        return {
            "symbol":      symbol,
            "days":        days,
            "last_close":  round(last_close, 4),
            "predictions": predictions,
            "sentiment":   sentiment,
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _fetch_last_close(self, symbol: str) -> float | None:
        try:
            ticker = yf.Ticker(symbol)
            hist   = ticker.history(period="2d", interval="1d")
            if hist.empty:
                return None
            return float(hist.iloc[-1]["Close"])
        except Exception as e:
            print(f"yfinance fetch failed for {symbol}: {e}")
            return None

    def _run_model(self, symbol: str, last_close: float, days: int) -> list[dict]:
        """
        ╔══════════════════════════════════════════════════════════════╗
        ║  ← REPLACE THIS with your real BiLSTM + FinBERT ensemble   ║
        ║                                                              ║
        ║  Expected output: a list of dicts, one per forecast day:     ║
        ║    [{"date": "YYYY-MM-DD",                                   ║
        ║       "price": float,                                        ║
        ║       "upper": float,                                        ║
        ║       "lower": float }, ...]                                 ║
        ║                                                              ║
        ║  Tip: load your .h5 / .pt model file once at module level   ║
        ║  (outside this method) to avoid reloading on every request. ║
        ╚══════════════════════════════════════════════════════════════╝

        Mock logic below: random walk with slight upward drift.
        """
        predictions = []
        price = last_close

        # Skip weekends when labelling dates
        current_date = datetime.today()
        trading_days_added = 0
        calendar_day = current_date

        while trading_days_added < days:
            calendar_day += timedelta(days=1)
            if calendar_day.weekday() >= 5:   # Sat=5, Sun=6
                continue

            # Random walk: ±1 % per day with tiny upward drift
            pct_change = random.gauss(0.001, 0.012)
            price = price * (1 + pct_change)

            # Widening confidence interval
            half_width_pct = CI_BASE_PCT + CI_GROWTH * trading_days_added
            upper = price * (1 + half_width_pct)
            lower = price * (1 - half_width_pct)

            predictions.append({
                "date":  calendar_day.strftime("%Y-%m-%d"),
                "price": round(price, 4),
                "upper": round(upper, 4),
                "lower": round(lower, 4),
            })
            trading_days_added += 1

        return predictions

    def _run_sentiment(self, symbol: str) -> dict:
        """
        ╔══════════════════════════════════════════════════════════════╗
        ║  ← REPLACE THIS with your real FinBERT sentiment scorer    ║
        ║                                                              ║
        ║  Expected output:                                            ║
        ║    {                                                         ║
        ║      "score":      float,   # –1.0 … +1.0                  ║
        ║      "label":      str,     # "Bullish"|"Neutral"|"Bearish" ║
        ║      "confidence": float,   # 0.0 – 1.0                    ║
        ║      "breakdown":  {                                         ║
        ║        "positive": float,                                    ║
        ║        "neutral":  float,                                    ║
        ║        "negative": float,                                    ║
        ║      }                                                       ║
        ║    }                                                         ║
        ╚══════════════════════════════════════════════════════════════╝

        Mock logic below: random plausible sentiment.
        """
        pos = random.uniform(0.25, 0.65)
        neg = random.uniform(0.05, 0.35)
        neg = min(neg, 1 - pos)          # ensure pos + neg <= 1
        neu = round(1 - pos - neg, 4)
        pos = round(pos, 4)
        neg = round(neg, 4)

        score = round(pos - neg, 4)      # –1 … +1

        if score > 0.15:
            label = "Bullish"
        elif score < -0.15:
            label = "Bearish"
        else:
            label = "Neutral"

        confidence = round(abs(score) * 0.8 + random.uniform(0.1, 0.2), 4)
        confidence = min(confidence, 0.99)

        return {
            "score":      score,
            "label":      label,
            "confidence": confidence,
            "breakdown": {
                "positive": pos,
                "neutral":  neu,
                "negative": neg,
            },
        }