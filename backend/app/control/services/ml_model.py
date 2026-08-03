

import os
import math
from datetime import datetime
import numpy as np
import pandas as pd
import xgboost as xgb
import yfinance as yf
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_vader = SentimentIntensityAnalyzer()
_sentiment_cache: dict = {}  # (symbol, "YYYY-MM-DD") -> feature dict
_spy_cache: dict = {}        # "YYYY-MM-DD" -> spy feature dict


def _get_spy_features() -> dict:
    """Fetch SPY daily history and compute market-relative features, cached per day."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    if today in _spy_cache:
        return _spy_cache[today]
    try:
        spy = yf.Ticker("SPY").history(period="3mo", interval="1d")
        if spy.empty or len(spy) < 25:
            raise ValueError("Insufficient SPY history")
        close = spy["Close"]
        ret_1d = float(close.pct_change(1).iloc[-1])
        ret_5d = float(close.pct_change(5).iloc[-1])
        ma20   = float(close.rolling(20).mean().iloc[-1])
        ratio  = float(close.iloc[-1] / ma20 - 1) if ma20 else 0.0
        result = {
            "spy_return_1d": ret_1d  if math.isfinite(ret_1d)  else 0.0,
            "spy_return_5d": ret_5d  if math.isfinite(ret_5d)  else 0.0,
            "spy_ma_ratio":  ratio   if math.isfinite(ratio)   else 0.0,
        }
    except Exception as e:
        print(f"SPY feature fetch failed: {e}")
        result = {"spy_return_1d": 0.0, "spy_return_5d": 0.0, "spy_ma_ratio": 0.0}
    _spy_cache[today] = result
    return result


def _safe_float(val, fallback: float = 0.0) -> float:
    """Return val as float, replacing NaN/inf with fallback."""
    try:
        f = float(val)
        return f if math.isfinite(f) else fallback
    except (TypeError, ValueError):
        return fallback

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml_models", "xgb_all_auc0.5386_20260618_2159.json")

# Validation AUC reported by the model's training run (attributes.best_score)
MODEL_VALIDATION_AUC = 0.5386

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


_NEUTRAL_SENTIMENT = {
    "finbert_score_mean": 0.0,
    "finbert_pos_mean": 0.0,
    "finbert_neg_mean": 0.0,
    "news_count": 0.0,
    "sentiment_lag1": 0.0,
    "sentiment_lag2": 0.0,
}


def _get_sentiment_features(symbol: str) -> dict:
    #  Fetch recent news for the stock symbol and compute sentiment features using VADER. Caches results per symbol per day to avoid repeated API calls.
    cache_key = (symbol, datetime.utcnow().strftime("%Y-%m-%d"))
    if cache_key in _sentiment_cache:
        return _sentiment_cache[cache_key]

    try:
        news = yf.Ticker(symbol).news or []
    except Exception:
        return _NEUTRAL_SENTIMENT

    if not news:
        return _NEUTRAL_SENTIMENT

    today = datetime.utcnow().date()

    # Group article titles by days-ago (0 = today, 1 = yesterday, 2 = two days ago)
    groups: dict[int, list[str]] = {0: [], 1: [], 2: []}
    for article in news:
        ts = article.get("providerPublishTime")
        if not ts:
            continue
        try:
            delta = (today - datetime.utcfromtimestamp(int(ts)).date()).days
        except Exception:
            continue
        if delta in groups:
            title = article.get("title", "")
            if title:
                groups[delta].append(title)

    def _mean_scores(titles: list[str]) -> tuple[float, float, float]:
        if not titles:
            return 0.0, 0.0, 0.0
        scores = [_vader.polarity_scores(t) for t in titles]
        n = len(scores)
        return (
            sum(s["compound"] for s in scores) / n,
            sum(s["pos"] for s in scores) / n,
            sum(s["neg"] for s in scores) / n,
        )

    # Current sentiment: pool all articles across the 3-day window
    all_recent = groups[0] + groups[1] + groups[2]
    compound, pos, neg = _mean_scores(all_recent)
    lag1, _, _ = _mean_scores(groups[1] + groups[2])
    lag2, _, _ = _mean_scores(groups[2])

    result = {
        "finbert_score_mean": round(compound, 4),
        "finbert_pos_mean": round(pos, 4),
        "finbert_neg_mean": round(neg, 4),
        "news_count": float(len(all_recent)),
        "sentiment_lag1": round(lag1, 4),
        "sentiment_lag2": round(lag2, 4),
    }
    _sentiment_cache[cache_key] = result
    return result


def compute_features(history: pd.DataFrame, symbol: str) -> dict | None:
    # Compute a flat dictionary of features for the ML model from the stock's historical OHLCV data and sentiment. Returns None if insufficient history is available.
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

    sentiment = _get_sentiment_features(symbol)
    spy = _get_spy_features()

    latest = df.iloc[-1]

    # Build a flat lookup: technical indicators + sentiment + SPY features
    all_sources = {**spy, **sentiment}

    # Let booster.feature_names drive selection — compute everything available
    features = {}
    for col in df.columns:
        try:
            features[col] = _safe_float(latest[col])
        except Exception:
            pass
    features.update(all_sources)

    return features


def predict_probability_up(history: pd.DataFrame, symbol: str) -> float | None:
    # Compute features and run the XGBoost model to predict the probability that the stock will go up. Returns None if features cannot be computed.
    features = compute_features(history, symbol)
    if features is None:
        return None

    booster = _load_model()
    feature_order = booster.feature_names
    row = np.array([[features[name] for name in feature_order]], dtype=np.float32)
    dmatrix = xgb.DMatrix(row, feature_names=feature_order)

    prob_up = float(booster.predict(dmatrix)[0])
    return prob_up


#  Business-logic translation 

def confidence_tier(prob_up: float) -> dict:
    
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
  
    return round(typical_daily_move_pct * (2 * prob_up - 1), 4)
