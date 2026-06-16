"""
ml_model.py
===========
Loads the trained XGBoost classifier (xgb_stock_model.json) and exposes
helper functions to:
  1. Compute the 26 input features from OHLCV price history + sentiment data.
  2. Run inference to get a probability that the stock will be UP at the
     end of the next trading session.
  3. Translate that probability into business-facing metrics:
       - expected profit margin (e.g. "+10.4%")
       - statistical confidence tier (e.g. "70%" / "90%")
       - bullish / bearish / neutral label

The model itself is a binary classifier (objective: binary:logistic) trained
to predict next-period direction (up/down). Its best_iteration achieved an
AUC (best_score) of ~0.692 on the validation set, which we use as the model's
baseline statistical confidence ceiling.

NOTE on sentiment features:
The model expects FinBERT sentiment features (finbert_score_mean,
finbert_pos_mean, finbert_neg_mean, news_count, sentiment_lag1/2). Since the
live FinBERT/news pipeline isn't wired into this project yet, those features
default to neutral (0.0 score, 0 news count). When the news pipeline is
ready, replace `_get_sentiment_features()` with real FinBERT output - the
rest of this module does not need to change.
"""

import os
import math
import numpy as np
import pandas as pd
import xgboost as xgb

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml_models", "xgb_stock_model.json")

# Validation AUC reported by the model's training run (attributes.best_score)
MODEL_VALIDATION_AUC = 0.6920174504161174

_booster = None


def _load_model():
    global _booster
    if _booster is None:
        booster = xgb.Booster()
        booster.load_model(MODEL_PATH)
        _booster = booster
    return _booster


# ── Feature computation ──────────────────────────────────────────────────────

def _rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50)


def _macd_diff(series: pd.Series, fast=12, slow=26, signal=9) -> pd.Series:
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd = ema_fast - ema_slow
    signal_line = macd.ewm(span=signal, adjust=False).mean()
    return macd - signal_line


def _stochastic(high, low, close, k_period=14, d_period=3):
    lowest_low = low.rolling(k_period).min()
    highest_high = high.rolling(k_period).max()
    denom = (highest_high - lowest_low).replace(0, np.nan)
    stoch_k = 100 * (close - lowest_low) / denom
    stoch_k = stoch_k.fillna(50)
    stoch_d = stoch_k.rolling(d_period).mean().fillna(50)
    return stoch_k, stoch_d


def _bollinger(series: pd.Series, period=20, num_std=2):
    ma = series.rolling(period).mean()
    std = series.rolling(period).std()
    upper = ma + num_std * std
    lower = ma - num_std * std
    width = (upper - lower) / ma.replace(0, np.nan)
    pct = (series - lower) / (upper - lower).replace(0, np.nan)
    return width.fillna(0), pct.fillna(0.5)


def _atr_pct(high, low, close, period=14):
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low - prev_close).abs(),
    ], axis=1).max(axis=1)
    atr = tr.rolling(period).mean()
    return (atr / close.replace(0, np.nan)).fillna(0)


def _get_sentiment_features() -> dict:
    """
    ╔══════════════════════════════════════════════════════════════╗
    ║  ← REPLACE THIS with real FinBERT news-sentiment pipeline   ║
    ║  Expected keys: finbert_score_mean, finbert_pos_mean,        ║
    ║  finbert_neg_mean, news_count, sentiment_lag1, sentiment_lag2║
    ╚══════════════════════════════════════════════════════════════╝
    Neutral defaults until the news pipeline is connected.
    """
    return {
        "finbert_score_mean": 0.0,
        "finbert_pos_mean": 0.0,
        "finbert_neg_mean": 0.0,
        "news_count": 0.0,
        "sentiment_lag1": 0.0,
        "sentiment_lag2": 0.0,
    }


def compute_features(history: pd.DataFrame) -> dict | None:
    """
    Given a DataFrame of OHLCV data (yfinance .history() output, daily),
    compute the 26 features required by the model. Returns the feature
    dict for the most recent row, or None if there isn't enough history.
    """
    if history is None or len(history) < 25:
        return None

    df = history.copy()
    close = df["Close"]
    high = df["High"]
    low = df["Low"]
    volume = df["Volume"]

    df["return_1d"] = close.pct_change(1)
    df["return_2d"] = close.pct_change(2)
    df["return_5d"] = close.pct_change(5)

    ma5 = close.rolling(5).mean()
    ma20 = close.rolling(20).mean()
    df["price_to_ma5"] = close / ma5 - 1
    df["price_to_ma20"] = close / ma20 - 1
    df["ma5_to_ma20"] = ma5 / ma20 - 1

    df["rsi"] = _rsi(close)
    df["macd_diff"] = _macd_diff(close)
    df["stoch_k"], df["stoch_d"] = _stochastic(high, low, close)
    df["bb_width"], df["bb_pct"] = _bollinger(close)
    df["atr_pct"] = _atr_pct(high, low, close)

    avg_volume_20 = volume.rolling(20).mean()
    df["volume_ratio"] = (volume / avg_volume_20.replace(0, np.nan)).fillna(1)

    df["return_lag1"] = df["return_1d"].shift(1)
    df["return_lag2"] = df["return_1d"].shift(2)
    df["return_lag3"] = df["return_1d"].shift(3)
    df["rsi_lag1"] = df["rsi"].shift(1)
    df["rsi_lag2"] = df["rsi"].shift(2)
    df["rsi_lag3"] = df["rsi"].shift(3)

    sentiment = _get_sentiment_features()

    latest = df.iloc[-1]

    feature_order = [
        "return_1d", "return_2d", "return_5d", "price_to_ma5", "price_to_ma20",
        "ma5_to_ma20", "rsi", "macd_diff", "stoch_k", "stoch_d", "bb_width",
        "bb_pct", "atr_pct", "volume_ratio", "return_lag1", "return_lag2",
        "return_lag3", "rsi_lag1", "rsi_lag2", "rsi_lag3",
        "finbert_score_mean", "finbert_pos_mean", "finbert_neg_mean",
        "news_count", "sentiment_lag1", "sentiment_lag2",
    ]

    features = {}
    for name in feature_order:
        if name in sentiment:
            features[name] = sentiment[name]
        else:
            val = latest[name]
            features[name] = float(val) if pd.notna(val) else 0.0

    return features


def predict_probability_up(history: pd.DataFrame) -> float | None:
    """
    Returns the model's probability (0..1) that the stock will close UP
    in the next trading session, or None if features can't be computed.
    """
    features = compute_features(history)
    if features is None:
        return None

    booster = _load_model()
    feature_order = booster.feature_names
    row = np.array([[features[name] for name in feature_order]], dtype=np.float32)
    dmatrix = xgb.DMatrix(row, feature_names=feature_order)

    prob_up = float(booster.predict(dmatrix)[0])
    return prob_up


# ── Business-logic translation ───────────────────────────────────────────────

def confidence_tier(prob_up: float) -> dict:
    """
    Translates the raw model probability into a business-facing confidence
    level. The model's edge over a coin-flip (|prob_up - 0.5|) scales
    against its known validation AUC to produce a "statistical confidence"
    percentage capped at the model's proven AUC ceiling (~69%) for the
    directional call itself, while the magnitude of conviction (how far
    from 50/50) is shown separately as "signal strength".

    Returns:
      {
        "direction": "up" | "down",
        "signal_strength": float (0..1),   # |prob_up - 0.5| * 2
        "confidence_pct": float,           # 50-69%, scaled by signal strength
        "tier_label": "Low" | "Moderate" | "High"
      }
    """
    direction = "up" if prob_up >= 0.5 else "down"
    signal_strength = abs(prob_up - 0.5) * 2  # 0 (no edge) .. 1 (max edge)

    # Confidence ranges from 50% (no edge) up to the model's proven AUC (~69.2%)
    confidence_pct = 50 + signal_strength * (MODEL_VALIDATION_AUC * 100 - 50)

    if signal_strength < 0.2:
        tier_label = "Low"
    elif signal_strength < 0.5:
        tier_label = "Moderate"
    else:
        tier_label = "High"

    return {
        "direction": direction,
        "signal_strength": round(signal_strength, 4),
        "confidence_pct": round(confidence_pct, 2),
        "tier_label": tier_label,
    }


def expected_profit_margin_pct(prob_up: float, typical_daily_move_pct: float) -> float:
    """
    Expected-value profit margin for going long, expressed as a percentage:

        E[return] = P(up) * (+typical_move) + P(down) * (-typical_move)
                  = typical_move * (2 * P(up) - 1)

    `typical_daily_move_pct` should be the stock's recent average absolute
    daily return (e.g. derived from ATR% or historical volatility), which
    anchors the *magnitude* of the move while the model supplies the
    *directional* edge.
    """
    return round(typical_daily_move_pct * (2 * prob_up - 1), 4)
