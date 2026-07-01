"""
sector_model.py
===============
Loads the 11 per-sector "Quant Rating" models and exposes helpers to turn a
single ticker into a Seeking-Alpha-style rating.

Each model lives in backend/ml_models/sector/sector_<Sector>.pkl and is a
``CalibratedClassifierCV(XGBClassifier, method="isotonic")`` — i.e. an
isotonic-calibrated **BUY classifier**. ``predict_proba(...)[:, 1]`` therefore
returns a *calibrated probability that the stock is a BUY* over the model's
training horizon. That single, trustworthy probability is the source of truth
and gets translated into:

  - a 0-100 score and a 1-5 star rating
  - a Strong Buy / Buy / Hold / Sell / Strong Sell label (anchored on the
    model's own stored decision ``threshold``)
  - per-factor grades (Momentum / Value / Growth / Profitability / Technicals),
    computed as the stock's percentile rank inside its sector cohort
  - a sector leaderboard (rank within sector)

Design notes
------------
* The set AND ORDER of features is read from the model itself
  (``feature_names_in_``), never hard-coded. We compute a broad superset of
  features and reindex to exactly what the model expects; any feature we can't
  compute is left as NaN, which XGBoost handles natively. This keeps the
  service correct even if the training feature list changes slightly.
* All network/feature work is cached per (key, UTC-date) so a page view does
  the expensive yfinance work at most once per ticker per day.
"""

import os
import math
import pickle
from datetime import datetime

import numpy as np
import pandas as pd
import yfinance as yf

try:
    import joblib  # models may have been saved with joblib.dump
except Exception:  # pragma: no cover
    joblib = None


# ── Paths & sector wiring ────────────────────────────────────────────────────

_MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml_models", "sector")

# pkl filename stem per canonical sector key
_SECTOR_FILES = {
    "Technology":       "sector_Technology",
    "Financials":       "sector_Financials",
    "Healthcare":       "sector_Healthcare",
    "ConsumerDisc":     "sector_ConsumerDisc",
    "ConsumerStaples":  "sector_ConsumerStaples",
    "Energy":           "sector_Energy",
    "Industrials":      "sector_Industrials",
    "Materials":        "sector_Materials",
    "RealEstate":       "sector_RealEstate",
    "Utilities":        "sector_Utilities",
    "CommServices":     "sector_CommServices",
}

# yfinance info["sector"] string  ->  our canonical key
_YF_SECTOR_MAP = {
    "Technology":             "Technology",
    "Financial Services":     "Financials",
    "Healthcare":             "Healthcare",
    "Consumer Cyclical":      "ConsumerDisc",
    "Consumer Defensive":     "ConsumerStaples",
    "Energy":                 "Energy",
    "Industrials":            "Industrials",
    "Basic Materials":        "Materials",
    "Real Estate":            "RealEstate",
    "Utilities":              "Utilities",
    "Communication Services": "CommServices",
}

# Sector SPDR ETF used for relative-strength features (rs_vs_sect_*)
_SECTOR_ETF = {
    "Technology": "XLK", "Financials": "XLF", "Healthcare": "XLV",
    "ConsumerDisc": "XLY", "ConsumerStaples": "XLP", "Energy": "XLE",
    "Industrials": "XLI", "Materials": "XLB", "RealEstate": "XLRE",
    "Utilities": "XLU", "CommServices": "XLC",
}

# Human-readable sector labels for the UI
SECTOR_LABELS = {
    "Technology": "Technology", "Financials": "Financials", "Healthcare": "Health Care",
    "ConsumerDisc": "Consumer Discretionary", "ConsumerStaples": "Consumer Staples",
    "Energy": "Energy", "Industrials": "Industrials", "Materials": "Materials",
    "RealEstate": "Real Estate", "Utilities": "Utilities", "CommServices": "Communication Services",
}

# Per-sector cohort used for the leaderboard + factor-grade percentiles.
# Static map first (fast, deterministic); falls back to yfinance lookup for
# anything not listed. Keep these to liquid large caps so yfinance is reliable.
SECTOR_UNIVERSE = {
    "Technology":      ["AAPL", "MSFT", "NVDA", "AVGO", "ORCL", "AMD", "ADBE", "CRM", "CSCO", "INTC", "QCOM", "TXN"],
    "Financials":      ["JPM", "BAC", "WFC", "GS", "MS", "C", "BLK", "SCHW", "AXP", "SPGI", "BX", "V"],
    "Healthcare":      ["LLY", "UNH", "JNJ", "MRK", "ABBV", "PFE", "TMO", "ABT", "DHR", "AMGN", "BMY", "GILD"],
    "ConsumerDisc":    ["AMZN", "TSLA", "HD", "MCD", "NKE", "LOW", "SBUX", "BKNG", "TJX", "ORLY", "GM", "MAR"],
    "ConsumerStaples": ["PG", "KO", "PEP", "COST", "WMT", "MDLZ", "PM", "MO", "CL", "KMB", "GIS", "KHC"],
    "Energy":          ["XOM", "CVX", "COP", "SLB", "EOG", "MPC", "PSX", "VLO", "OXY", "WMB", "KMI", "HAL"],
    "Industrials":     ["GE", "CAT", "RTX", "HON", "UNP", "BA", "DE", "LMT", "UPS", "ETN", "EMR", "GD"],
    "Materials":       ["LIN", "SHW", "APD", "ECL", "FCX", "NEM", "NUE", "DOW", "DD", "PPG", "VMC", "MLM"],
    "RealEstate":      ["PLD", "AMT", "EQIX", "WELL", "SPG", "PSA", "O", "CCI", "DLR", "CBRE", "VICI", "EXR"],
    "Utilities":       ["NEE", "SO", "DUK", "CEG", "SRE", "AEP", "D", "EXC", "XEL", "PEG", "ED", "WEC"],
    "CommServices":    ["META", "GOOGL", "NFLX", "DIS", "TMUS", "VZ", "T", "CMCSA", "CHTR", "EA", "TTWO", "OMC"],
}


# ── Caches ───────────────────────────────────────────────────────────────────

_models: dict = {}          # sector_key -> loaded estimator
_rating_cache: dict = {}    # (symbol, "YYYY-MM-DD") -> rating dict
_cohort_cache: dict = {}    # (sector_key, "YYYY-MM-DD") -> {symbol: feature_dict}
_mkt_cache: dict = {}       # "YYYY-MM-DD" -> {"spy": Series, "tnx": Series, etf...: Series}


def _today() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


# ── Model loading ────────────────────────────────────────────────────────────

def _load_model(sector_key: str):
    """Load (and cache) the calibrated estimator for a sector key."""
    if sector_key in _models:
        return _models[sector_key]
    stem = _SECTOR_FILES.get(sector_key)
    if stem is None:
        return None
    path = os.path.join(_MODEL_DIR, f"{stem}.pkl")
    if not os.path.exists(path):
        return None
    model = None
    # joblib first (these pickles reference joblib.numpy_pickle), then stdlib.
    if joblib is not None:
        try:
            model = joblib.load(path)
        except Exception:
            model = None
    if model is None:
        with open(path, "rb") as fh:
            model = pickle.load(fh)
    # Some training pipelines store {"model": est, "threshold": .., "metrics": {..}}
    _models[sector_key] = model
    return model


def _unwrap(model):
    """Return (estimator, threshold, metrics) regardless of how the pkl was wrapped."""
    threshold = 0.5
    metrics = {}
    est = model
    if isinstance(model, dict):
        est = model.get("model") or model.get("estimator") or model.get("clf")
        threshold = model.get("threshold", threshold)
        metrics = dict(model.get("metrics", {}) or {})
        # trained_at / reliable live at the top level of the wrapper dict
        for k in ("trained_at", "reliable", "auc_buy_cv", "buy_precision_cv", "sell_precision_cv"):
            if k in model and k not in metrics:
                metrics[k] = model[k]
    else:
        # attributes stuffed onto the estimator object itself
        for attr in ("threshold", "buy_threshold"):
            if hasattr(est, attr):
                threshold = getattr(est, attr)
                break
        metrics = {
            k: getattr(est, k) for k in
            ("auc_buy_cv", "buy_precision_cv", "sell_precision_cv", "trained_at", "reliable")
            if hasattr(est, k)
        }
    try:
        threshold = float(threshold)
    except (TypeError, ValueError):
        threshold = 0.5
    return est, threshold, metrics


def _inner_xgb(est):
    """Find the fitted XGBClassifier inside a (possibly calibrated) estimator."""
    if hasattr(est, "get_booster"):
        return est
    ccs = getattr(est, "calibrated_classifiers_", None)
    if ccs:
        for cc in ccs:
            for attr in ("estimator", "base_estimator"):
                e = getattr(cc, attr, None)
                if e is not None and hasattr(e, "get_booster"):
                    return e
    for attr in ("estimator", "base_estimator", "estimator_", "best_estimator_"):
        e = getattr(est, attr, None)
        if e is not None and hasattr(e, "get_booster"):
            return e
    return None


def _expected_features(est) -> list | None:
    """Read the ordered feature names the model was trained on (list of str) or None."""
    names = getattr(est, "feature_names_in_", None)
    if names is not None:
        return [str(x) for x in names]
    xgb = _inner_xgb(est)
    if xgb is not None:
        names = getattr(xgb, "feature_names_in_", None)
        if names is not None:
            return [str(x) for x in names]
        try:
            bn = xgb.get_booster().feature_names
            if bn:
                return [str(x) for x in bn]
        except Exception:
            pass
    return None


def _is_str_list(v) -> bool:
    """True if v is a non-empty list/tuple/ndarray of strings."""
    try:
        seq = list(v)
    except TypeError:
        return False
    return len(seq) > 0 and all(isinstance(x, str) for x in seq)


def _model_feature_names(model, est) -> list | None:
    """Resolve the ordered training feature names.

    The pkls are dict wrappers, so the feature list is most likely stored there
    under some key. We (1) try common key names, (2) fall back to auto-detecting
    the longest list-of-strings in the dict, then (3) fall back to the estimator."""
    if isinstance(model, dict):
        for k in ("features", "feature_names", "feature_cols", "feature_columns",
                  "feature_list", "feats", "X_columns", "x_columns", "columns", "cols"):
            v = model.get(k)
            if _is_str_list(v):
                return [str(x) for x in v]
        # Auto-detect: longest list-of-strings in the dict (feature lists are long).
        best = None
        for v in model.values():
            if _is_str_list(v) and len(list(v)) >= 10:
                if best is None or len(list(v)) > len(best):
                    best = list(v)
        if best is not None:
            return [str(x) for x in best]
    return _expected_features(est)


def _buy_class_index(est) -> int:
    """Index into predict_proba output for the BUY class.

    Models are 3-class (0=Sell, 1=Hold, 2=Buy), so BUY is the highest label.
    Falls back gracefully for binary models."""
    classes = list(getattr(est, "classes_", [0, 1]))
    try:
        return classes.index(max(classes))
    except (ValueError, TypeError):
        return len(classes) - 1


# ── Technical indicator helpers ──────────────────────────────────────────────

def _safe(v, fallback=np.nan):
    try:
        f = float(v)
        return f if math.isfinite(f) else fallback
    except (TypeError, ValueError):
        return fallback


def _rsi(series: pd.Series, period: int) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50)


def _macd(series: pd.Series):
    ema_f = series.ewm(span=12, adjust=False).mean()
    ema_s = series.ewm(span=26, adjust=False).mean()
    macd = ema_f - ema_s
    signal = macd.ewm(span=9, adjust=False).mean()
    return macd, signal


def _bollinger(series: pd.Series, period=20, k=2):
    ma = series.rolling(period).mean()
    sd = series.rolling(period).std()
    upper, lower = ma + k * sd, ma - k * sd
    width = (upper - lower) / ma.replace(0, np.nan)
    pct = (series - lower) / (upper - lower).replace(0, np.nan)
    return width.fillna(0), pct.fillna(0.5)


def _atr_pct(high, low, close, period=14):
    prev = close.shift(1)
    tr = pd.concat([high - low, (high - prev).abs(), (low - prev).abs()], axis=1).max(axis=1)
    return (tr.rolling(period).mean() / close.replace(0, np.nan)).fillna(0)


def _stoch(high, low, close, k=14, d=3):
    ll = low.rolling(k).min()
    hh = high.rolling(k).max()
    sk = (100 * (close - ll) / (hh - ll).replace(0, np.nan)).fillna(50)
    return sk, sk.rolling(d).mean().fillna(50)


def _ret(series: pd.Series, n: int) -> float:
    if len(series) <= n:
        return np.nan
    return _safe(series.iloc[-1] / series.iloc[-1 - n] - 1)


# ── Market context (SPY / sector ETF / 10y yield), cached per day ────────────

def _market_ctx(sector_key: str) -> dict:
    key = _today()
    cache = _mkt_cache.setdefault(key, {})
    etf = _SECTOR_ETF.get(sector_key, "SPY")
    need = ["SPY", "^TNX", etf]
    for sym in need:
        if sym not in cache:
            try:
                h = yf.Ticker(sym).history(period="1y", interval="1d")
                cache[sym] = h["Close"].dropna() if not h.empty else pd.Series(dtype=float)
            except Exception:
                cache[sym] = pd.Series(dtype=float)
    return {"spy": cache["SPY"], "tnx": cache["^TNX"], "sect": cache[etf]}


# ── Feature computation ──────────────────────────────────────────────────────

def compute_features(history: pd.DataFrame, info: dict, sector_key: str) -> dict:
    """Compute a broad superset of features for the latest bar. Missing values
    are left as NaN; the caller reindexes to the model's expected columns."""
    f: dict = {}
    if history is None or len(history) < 30:
        return f

    close = history["Close"].astype(float)
    high = history["High"].astype(float)
    low = history["Low"].astype(float)
    vol = history["Volume"].astype(float)
    ret = close.pct_change()

    # Momentum
    f["mom_5d"], f["mom_21d"] = _ret(close, 5), _ret(close, 21)
    f["mom_63d"], f["mom_126d"] = _ret(close, 63), _ret(close, 126)
    f["mom_252d"] = _ret(close, 252)
    if len(close) > 253:
        f["mom_12m_ex1m"] = _safe(close.iloc[-22] / close.iloc[-253] - 1)

    # Trend / moving averages
    ma50 = close.rolling(50).mean()
    ma200 = close.rolling(200).mean()
    f["price_to_ma50"] = _safe(close.iloc[-1] / ma50.iloc[-1] - 1) if ma50.notna().iloc[-1] else np.nan
    f["price_to_ma200"] = _safe(close.iloc[-1] / ma200.iloc[-1] - 1) if ma200.notna().iloc[-1] else np.nan
    if ma50.notna().iloc[-1] and ma200.notna().iloc[-1]:
        f["ma50_vs_ma200"] = _safe(ma50.iloc[-1] / ma200.iloc[-1] - 1)

    # 52-week position
    win = close.tail(252)
    f["high_52w_ratio"] = _safe(close.iloc[-1] / win.max())
    f["low_52w_ratio"] = _safe(close.iloc[-1] / win.min())

    # Oscillators
    f["rsi_7"] = _safe(_rsi(close, 7).iloc[-1])
    f["rsi_14"] = _safe(_rsi(close, 14).iloc[-1])
    macd, signal = _macd(close)
    f["macd_signal"] = _safe(signal.iloc[-1])
    f["macd_diff"] = _safe((macd - signal).iloc[-1])
    bbw, bbp = _bollinger(close)
    f["bb_width"], f["bb_pct"] = _safe(bbw.iloc[-1]), _safe(bbp.iloc[-1])
    f["atr_pct"] = _safe(_atr_pct(high, low, close).iloc[-1])
    sk, sd = _stoch(high, low, close)
    f["stoch_k"], f["stoch_d"] = _safe(sk.iloc[-1]), _safe(sd.iloc[-1])

    # Realised volatility
    f["vol_21d"] = _safe(ret.tail(21).std() * math.sqrt(252))
    f["vol_63d"] = _safe(ret.tail(63).std() * math.sqrt(252))

    # Volume
    av20 = vol.rolling(20).mean()
    f["vol_ratio"] = _safe(vol.iloc[-1] / av20.iloc[-1]) if av20.notna().iloc[-1] else np.nan
    f["vol_ratio_5d"] = _safe(vol.tail(5).mean() / av20.iloc[-1]) if av20.notna().iloc[-1] else np.nan
    av60 = vol.rolling(60).mean()
    f["vol_ratio_20d"] = _safe(av20.iloc[-1] / av60.iloc[-1]) if av60.notna().iloc[-1] else np.nan

    # Correlations
    f["vol_price_corr"] = _safe(vol.pct_change().tail(63).corr(ret.tail(63)))

    # Market-relative (SPY / sector ETF / 10y yield)
    ctx = _market_ctx(sector_key)
    spy, sect, tnx = ctx["spy"], ctx["sect"], ctx["tnx"]
    if len(spy) > 63:
        spy_m5, spy_m21, spy_m63 = _ret(spy, 5), _ret(spy, 21), _ret(spy, 63)
        f["spy_mom_5d"], f["spy_mom_21d"] = spy_m5, spy_m21
        f["spy_rsi"] = _safe(_rsi(spy, 14).iloc[-1])
        f["rs_vs_spy_5d"] = _safe(f.get("mom_5d", np.nan) - spy_m5)
        f["rs_vs_spy_21d"] = _safe(f.get("mom_21d", np.nan) - spy_m21)
        f["rs_vs_spy_63d"] = _safe(f.get("mom_63d", np.nan) - spy_m63)
    if len(sect) > 63:
        f["rs_vs_sect_21d"] = _safe(f.get("mom_21d", np.nan) - _ret(sect, 21))
        f["rs_vs_sect_63d"] = _safe(f.get("mom_63d", np.nan) - _ret(sect, 63))
    if len(tnx) > 21:
        f["yield_10y"] = _safe(tnx.iloc[-1])
        f["yield_chg_21d"] = _safe(tnx.iloc[-1] - tnx.iloc[-22])
        n = min(len(ret), len(tnx)) - 1
        if n > 20:
            f["stock_yield_corr"] = _safe(ret.tail(n).reset_index(drop=True)
                                          .corr(tnx.pct_change().tail(n).reset_index(drop=True)))

    # Fundamentals / ownership / analyst (yfinance .info)
    info = info or {}
    g = info.get
    f["pe_fwd"] = _safe(g("forwardPE"))
    f["pe_trail"] = _safe(g("trailingPE"))
    f["pb"] = _safe(g("priceToBook"))
    f["ps"] = _safe(g("priceToSalesTrailing12Months"))
    f["peg"] = _safe(g("trailingPegRatio", g("pegRatio")))
    f["ev_ebitda"] = _safe(g("enterpriseToEbitda"))
    mcap = _safe(g("marketCap"))
    fcf = _safe(g("freeCashflow"))
    f["fcf_yield"] = _safe(fcf / mcap) if mcap and math.isfinite(mcap) and mcap != 0 else np.nan
    f["roe"] = _safe(g("returnOnEquity"))
    f["roa"] = _safe(g("returnOnAssets"))
    f["profit_margin"] = _safe(g("profitMargins"))
    f["gross_margin"] = _safe(g("grossMargins"))
    f["revenue_growth"] = _safe(g("revenueGrowth"))
    f["earnings_growth"] = _safe(g("earningsGrowth", g("earningsQuarterlyGrowth")))
    f["debt_to_equity"] = _safe(g("debtToEquity"))
    f["current_ratio"] = _safe(g("currentRatio"))
    f["dividend_yield"] = _safe(g("dividendYield"))
    f["payout_ratio"] = _safe(g("payoutRatio"))
    f["insider_pct"] = _safe(g("heldPercentInsiders"))
    f["inst_pct"] = _safe(g("heldPercentInstitutions"))
    f["short_pct_float"] = _safe(g("shortPercentOfFloat"))
    f["short_ratio"] = _safe(g("shortRatio"))
    f["analyst_mean"] = _safe(g("recommendationMean"))
    f["num_analysts"] = _safe(g("numberOfAnalystOpinions"))
    tgt = _safe(g("targetMeanPrice"))
    cur = _safe(g("currentPrice", close.iloc[-1]))
    f["price_to_target"] = _safe(cur / tgt - 1) if tgt and math.isfinite(tgt) and tgt != 0 else np.nan

    return f


# ── Inference ────────────────────────────────────────────────────────────────

def _buy_probability(est, features: dict, cols: list | None) -> float | None:
    """Calibrated probability that the stock is a BUY.

    Aligns the computed features to the model's EXACT expected feature list and
    order (`cols`). Features the pipeline doesn't compute are left as NaN — XGBoost
    treats them as missing, so shapes always match (no "Feature shape mismatch").
    BUY probability is the highest class (models are 3-class: 0=Sell,1=Hold,2=Buy)."""
    if not cols:
        raise RuntimeError(
            "Could not resolve the model's feature names — cannot align features. "
            "Run `python -m scripts.verify_sector_models` to inspect the pkl structure."
        )
    row = pd.DataFrame([{c: features.get(c, np.nan) for c in cols}], columns=cols)
    proba = est.predict_proba(row)
    return float(proba[0][_buy_class_index(est)])


# ── Rating translation ───────────────────────────────────────────────────────

def _label_from_prob(p: float, threshold: float) -> str:
    if p >= threshold + 0.15:
        return "Strong Buy"
    if p >= threshold:
        return "Buy"
    if p >= threshold - 0.10:
        return "Hold"
    if p >= threshold - 0.20:
        return "Sell"
    return "Strong Sell"


def _stars_from_prob(p: float) -> float:
    return round(1 + max(0.0, min(1.0, p)) * 4, 1)   # 1.0 .. 5.0


# Factor groups: (feature, +1 if higher-is-better else -1)
_FACTOR_GROUPS = {
    "Momentum": [("mom_21d", 1), ("mom_63d", 1), ("mom_126d", 1), ("mom_252d", 1),
                 ("rs_vs_spy_63d", 1), ("rs_vs_sect_63d", 1)],
    "Value": [("pe_fwd", -1), ("pe_trail", -1), ("peg", -1), ("ev_ebitda", -1),
              ("fcf_yield", 1), ("price_to_target", -1)],
    "Growth": [("revenue_growth", 1), ("earnings_growth", 1)],
    "Profitability": [("roe", 1), ("roa", 1), ("profit_margin", 1), ("gross_margin", 1)],
    "Technicals": [("rsi_14", 1), ("macd_diff", 1), ("bb_pct", 1),
                   ("price_to_ma50", 1), ("price_to_ma200", 1)],
}


def _grade_from_pct(pct: float) -> str:
    if pct >= 0.85:
        return "A"
    if pct >= 0.65:
        return "B"
    if pct >= 0.40:
        return "C"
    if pct >= 0.20:
        return "D"
    return "F"


def _percentile(value: float, cohort_values: list, higher_better: int) -> float | None:
    vals = [v for v in cohort_values if v is not None and math.isfinite(v)]
    if value is None or not math.isfinite(value) or len(vals) < 3:
        return None
    rank = sum(1 for v in vals if v <= value) / len(vals)
    return rank if higher_better == 1 else 1 - rank


def _factor_grades(features: dict, cohort: dict) -> list:
    """Grade each factor group by the stock's percentile inside its sector cohort."""
    out = []
    for group, feats in _FACTOR_GROUPS.items():
        pcts = []
        for feat, direction in feats:
            cohort_vals = [m.get(feat) for m in cohort.values()]
            p = _percentile(features.get(feat), cohort_vals, direction)
            if p is not None:
                pcts.append(p)
        if pcts:
            avg = sum(pcts) / len(pcts)
            out.append({"factor": group, "grade": _grade_from_pct(avg), "percentile": round(avg * 100)})
        else:
            out.append({"factor": group, "grade": "N/A", "percentile": None})
    return out


# ── Public API ───────────────────────────────────────────────────────────────

def resolve_sector(symbol: str, info: dict | None = None) -> str | None:
    """Map a ticker to a canonical sector key (static universe first, then yfinance)."""
    for key, members in SECTOR_UNIVERSE.items():
        if symbol.upper() in members:
            return key
    yf_sector = (info or {}).get("sector")
    if yf_sector:
        return _YF_SECTOR_MAP.get(yf_sector)
    return None


def _features_for(symbol: str, sector_key: str) -> dict:
    """Compute (and lightly cache within cohort build) features for one symbol."""
    try:
        tk = yf.Ticker(symbol)
        hist = tk.history(period="2y", interval="1d")
        info = tk.info or {}
    except Exception:
        return {}
    return compute_features(hist, info, sector_key)


def _cohort_features(sector_key: str) -> dict:
    """Feature dicts for every cohort member of a sector, cached per day."""
    ckey = (sector_key, _today())
    if ckey in _cohort_cache:
        return _cohort_cache[ckey]
    cohort = {}
    for sym in SECTOR_UNIVERSE.get(sector_key, []):
        feats = _features_for(sym, sector_key)
        if feats:
            cohort[sym] = feats
    _cohort_cache[ckey] = cohort
    return cohort


def rate_symbol(symbol: str) -> dict | None:
    """Full Quant Rating for one ticker, ready for the frontend."""
    symbol = symbol.upper()
    ckey = (symbol, _today())
    if ckey in _rating_cache:
        return _rating_cache[ckey]

    try:
        tk = yf.Ticker(symbol)
        hist = tk.history(period="2y", interval="1d")
        info = tk.info or {}
    except Exception:
        return None
    if hist is None or hist.empty:
        return None

    sector_key = resolve_sector(symbol, info)
    if sector_key is None:
        return None

    model = _load_model(sector_key)
    if model is None:
        return None
    est, threshold, metrics = _unwrap(model)
    cols = _model_feature_names(model, est)

    features = compute_features(hist, info, sector_key)
    if not features:
        return None

    prob = _buy_probability(est, features, cols)
    if prob is None:
        return None

    cohort = _cohort_features(sector_key)
    grades = _factor_grades(features, cohort)

    result = {
        "symbol": symbol,
        "name": info.get("shortName") or info.get("longName") or symbol,
        "sector": sector_key,
        "sectorLabel": SECTOR_LABELS.get(sector_key, sector_key),
        "buyProbability": round(prob, 4),
        "score": round(prob * 100),
        "stars": _stars_from_prob(prob),
        "label": _label_from_prob(prob, threshold),
        "threshold": round(threshold, 4),
        "currentPrice": _safe(info.get("currentPrice", hist["Close"].iloc[-1])),
        "targetMeanPrice": _safe(info.get("targetMeanPrice")),
        "factorGrades": grades,
        "modelMetrics": {
            "aucBuyCv": _safe(metrics.get("auc_buy_cv")) if metrics else None,
            "buyPrecisionCv": _safe(metrics.get("buy_precision_cv")) if metrics else None,
            "sellPrecisionCv": _safe(metrics.get("sell_precision_cv")) if metrics else None,
            "trainedAt": metrics.get("trained_at") if metrics else None,
            "reliable": metrics.get("reliable") if metrics else None,
        },
    }
    result = _json_safe(result)
    _rating_cache[ckey] = result
    return result


def rank_sector(sector_key: str) -> dict | None:
    """Leaderboard: rate every cohort member of a sector and sort by score."""
    if sector_key not in _SECTOR_FILES:
        return None
    model = _load_model(sector_key)
    if model is None:
        return None
    est, threshold, _ = _unwrap(model)
    cols = _model_feature_names(model, est)
    cohort = _cohort_features(sector_key)

    rows = []
    for sym, feats in cohort.items():
        p = _buy_probability(est, feats, cols)
        if p is None:
            continue
        rows.append({
            "symbol": sym,
            "score": round(p * 100),
            "buyProbability": round(p, 4),
            "stars": _stars_from_prob(p),
            "label": _label_from_prob(p, threshold),
        })
    rows.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(rows, 1):
        r["rank"] = i
    return _json_safe({
        "sector": sector_key,
        "sectorLabel": SECTOR_LABELS.get(sector_key, sector_key),
        "count": len(rows),
        "ranking": rows,
    })


def list_sectors() -> list:
    return [{"key": k, "label": SECTOR_LABELS.get(k, k)} for k in _SECTOR_FILES]


def _json_safe(obj):
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, float) and not math.isfinite(obj):
        return None
    if isinstance(obj, (np.floating,)):
        v = float(obj)
        return v if math.isfinite(v) else None
    if isinstance(obj, (np.integer,)):
        return int(obj)
    return obj
