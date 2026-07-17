"""
train_pooled_rating.py
======================
Retrains the Sector Quant Rating as ONE pooled model instead of 11 per-sector
models. Run LOCALLY (needs internet + xgboost/scikit-learn/yfinance):

    cd backend
    python -m scripts.train_pooled_rating

Output: ml_models/sector/sector_pooled.pkl — picked up automatically by
app/control/services/sector_model.py (which falls back to the 11 old pkls if
this file is absent).

Design (why this beats the 11 small models)
-------------------------------------------
* POOLED: all sectors train together (data x11), sector identity is a one-hot
  feature. Small per-sector datasets were why 6/11 old models had
  reliable=False.
* LABEL: binary "did the stock beat its sector's cross-sectional MEDIAN
  21-day-forward excess return (vs sector ETF)". Relative ranking is learnable;
  absolute direction is mostly noise. Median split -> balanced classes.
* POINT-IN-TIME ONLY: price/volume/market features that can be computed
  historically. yfinance `.info` fundamentals are current-only (lookahead
  leakage if paired with past labels) so they are EXCLUDED from the model.
  They still power the factor grades in the UI, which is fine.
* NORMALIZATION: every feature is rank-normalized (0..1) within its
  (date, sector) cohort — matches what serving does within its cohort.
* VALIDATION: walk-forward by date with a 21-trading-day embargo. Metrics are
  rank IC and top-minus-bottom quartile forward excess return, plus AUC, and a
  momentum-only baseline for honesty.
* CALIBRATION: sigmoid (Platt) on a held-out final window — isotonic overfits
  at this sample size.
"""

import os
import sys
import pickle
from datetime import datetime, timezone

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.control.services.sector_model import (  # noqa: E402
    SECTOR_UNIVERSE, _SECTOR_ETF, _rsi, _macd, _bollinger, _atr_pct, _stoch,
)

OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "ml_models", "sector", "sector_pooled.pkl")

HISTORY_PERIOD = "6y"      # per-ticker daily history
HORIZON = 21               # forward trading days for the label
SAMPLE_EVERY = 5           # weekly sampling to reduce label overlap
EMBARGO = 21               # trading days between train end and test start
N_TEST_BLOCKS = 4          # walk-forward test blocks
TEST_BLOCK_DAYS = 126      # ~6 months each
CALIB_DAYS = 126           # final calibration window (last ~6 months)
MIN_COHORT = 6             # min names per (date, sector) row group

SECTOR_KEYS = list(SECTOR_UNIVERSE.keys())

# Point-in-time price/market features (names match serving's compute_features).
PRICE_FEATURES = [
    "mom_5d", "mom_21d", "mom_63d", "mom_126d", "mom_252d", "mom_12m_ex1m",
    "price_to_ma50", "price_to_ma200", "ma50_vs_ma200",
    "high_52w_ratio", "low_52w_ratio",
    "rsi_7", "rsi_14", "macd_signal", "macd_diff", "bb_width", "bb_pct",
    "atr_pct", "stoch_k", "stoch_d",
    "vol_21d", "vol_63d", "vol_ratio", "vol_ratio_5d", "vol_ratio_20d",
    "vol_price_corr",
    "rs_vs_spy_5d", "rs_vs_spy_21d", "rs_vs_spy_63d",
    "rs_vs_sect_21d", "rs_vs_sect_63d",
    "spy_mom_5d", "spy_mom_21d", "spy_rsi",
    "yield_10y", "yield_chg_21d",
]
SECTOR_DUMMIES = [f"sec_{k}" for k in SECTOR_KEYS]
ALL_FEATURES = PRICE_FEATURES + SECTOR_DUMMIES


# ── Historical feature panel (whole time series, not just the last bar) ──────

def _mom(close: pd.Series, n: int) -> pd.Series:
    return close / close.shift(n) - 1


def feature_panel(hist: pd.DataFrame, spy: pd.Series, sect: pd.Series, tnx: pd.Series) -> pd.DataFrame:
    """All PRICE_FEATURES for every date of one ticker's history."""
    close = hist["Close"].astype(float)
    high = hist["High"].astype(float)
    low = hist["Low"].astype(float)
    vol = hist["Volume"].astype(float)
    ret = close.pct_change()

    f = pd.DataFrame(index=hist.index)
    f["mom_5d"], f["mom_21d"] = _mom(close, 5), _mom(close, 21)
    f["mom_63d"], f["mom_126d"] = _mom(close, 63), _mom(close, 126)
    f["mom_252d"] = _mom(close, 252)
    f["mom_12m_ex1m"] = close.shift(21) / close.shift(252) - 1

    ma50, ma200 = close.rolling(50).mean(), close.rolling(200).mean()
    f["price_to_ma50"] = close / ma50 - 1
    f["price_to_ma200"] = close / ma200 - 1
    f["ma50_vs_ma200"] = ma50 / ma200 - 1
    f["high_52w_ratio"] = close / close.rolling(252).max()
    f["low_52w_ratio"] = close / close.rolling(252).min()

    f["rsi_7"], f["rsi_14"] = _rsi(close, 7), _rsi(close, 14)
    macd, signal = _macd(close)
    f["macd_signal"], f["macd_diff"] = signal, macd - signal
    f["bb_width"], f["bb_pct"] = _bollinger(close)
    f["atr_pct"] = _atr_pct(high, low, close)
    f["stoch_k"], f["stoch_d"] = _stoch(high, low, close)

    f["vol_21d"] = ret.rolling(21).std() * np.sqrt(252)
    f["vol_63d"] = ret.rolling(63).std() * np.sqrt(252)
    av20, av60 = vol.rolling(20).mean(), vol.rolling(60).mean()
    f["vol_ratio"] = vol / av20
    f["vol_ratio_5d"] = vol.rolling(5).mean() / av20
    f["vol_ratio_20d"] = av20 / av60
    f["vol_price_corr"] = vol.pct_change().rolling(63).corr(ret)

    spy = spy.reindex(f.index).ffill()
    sect = sect.reindex(f.index).ffill()
    tnx = tnx.reindex(f.index).ffill()
    f["spy_mom_5d"], f["spy_mom_21d"] = _mom(spy, 5), _mom(spy, 21)
    f["spy_rsi"] = _rsi(spy, 14)
    f["rs_vs_spy_5d"] = f["mom_5d"] - _mom(spy, 5)
    f["rs_vs_spy_21d"] = f["mom_21d"] - _mom(spy, 21)
    f["rs_vs_spy_63d"] = f["mom_63d"] - _mom(spy, 63)
    f["rs_vs_sect_21d"] = f["mom_21d"] - _mom(sect, 21)
    f["rs_vs_sect_63d"] = f["mom_63d"] - _mom(sect, 63)
    f["yield_10y"] = tnx
    f["yield_chg_21d"] = tnx - tnx.shift(21)

    # forward 21d excess return vs sector ETF (label ingredient — NOT a feature)
    fwd_stock = close.shift(-HORIZON) / close - 1
    fwd_sect = sect.shift(-HORIZON) / sect - 1
    f["_fwd_excess"] = fwd_stock - fwd_sect
    return f


def download_all():
    import yfinance as yf
    print("Downloading market context (SPY, ^TNX, sector ETFs)...")
    ctx = {}
    for sym in ["SPY", "^TNX"] + list(set(_SECTOR_ETF.values())):
        h = yf.Ticker(sym).history(period=HISTORY_PERIOD, interval="1d")
        ctx[sym] = h["Close"].dropna()
        ctx[sym].index = ctx[sym].index.tz_localize(None)

    rows = []
    for sector, symbols in SECTOR_UNIVERSE.items():
        etf = ctx[_SECTOR_ETF[sector]]
        for sym in symbols:
            try:
                hist = yf.Ticker(sym).history(period=HISTORY_PERIOD, interval="1d")
            except Exception as e:
                print(f"  skip {sym}: {e}")
                continue
            if hist is None or len(hist) < 300:
                print(f"  skip {sym}: not enough history")
                continue
            hist.index = hist.index.tz_localize(None)
            panel = feature_panel(hist, ctx["SPY"], etf, ctx["^TNX"])
            panel = panel.iloc[260::SAMPLE_EVERY]          # warm-up + weekly sampling
            panel = panel.dropna(subset=["_fwd_excess"])   # drop tail with no label yet
            panel["symbol"], panel["sector"] = sym, sector
            rows.append(panel.reset_index(names="date"))
            print(f"  {sym:6s} ({sector}): {len(panel)} rows")
    df = pd.concat(rows, ignore_index=True)
    print(f"Panel: {len(df)} rows, {df['date'].min().date()} → {df['date'].max().date()}")
    return df


# ── Cross-sectional normalization + label ────────────────────────────────────

def normalize_and_label(df: pd.DataFrame) -> pd.DataFrame:
    """Rank features 0..1 within (date, sector); label = beat sector median."""
    g = df.groupby(["date", "sector"])
    df = df[g["symbol"].transform("size") >= MIN_COHORT].copy()
    g = df.groupby(["date", "sector"])
    for c in PRICE_FEATURES:
        df[c] = g[c].rank(pct=True)
    df["y"] = (df["_fwd_excess"] > g["_fwd_excess"].transform("median")).astype(int)
    for k in SECTOR_KEYS:
        df[f"sec_{k}"] = (df["sector"] == k).astype(int)
    return df


# ── Metrics ──────────────────────────────────────────────────────────────────

def rank_ic(df: pd.DataFrame, score_col: str) -> float:
    """Mean per-(date,sector) Spearman corr between score and forward excess return."""
    ics = []
    for _, grp in df.groupby(["date", "sector"]):
        if len(grp) >= MIN_COHORT:
            ic = grp[score_col].corr(grp["_fwd_excess"], method="spearman")
            if np.isfinite(ic):
                ics.append(ic)
    return float(np.mean(ics)) if ics else np.nan


def quartile_spread(df: pd.DataFrame, score_col: str) -> float:
    """Mean (top quartile − bottom quartile) forward excess return per (date,sector)."""
    spreads = []
    for _, grp in df.groupby(["date", "sector"]):
        if len(grp) >= 8:
            q = grp[score_col].rank(pct=True)
            top = grp.loc[q >= 0.75, "_fwd_excess"].mean()
            bot = grp.loc[q <= 0.25, "_fwd_excess"].mean()
            if np.isfinite(top) and np.isfinite(bot):
                spreads.append(top - bot)
    return float(np.mean(spreads)) if spreads else np.nan


def evaluate(df: pd.DataFrame, prob: np.ndarray) -> dict:
    from sklearn.metrics import roc_auc_score
    d = df.copy()
    d["_p"] = prob
    out = {
        "auc": float(roc_auc_score(d["y"], d["_p"])) if d["y"].nunique() == 2 else np.nan,
        "rank_ic": rank_ic(d, "_p"),
        "q_spread": quartile_spread(d, "_p"),
        "baseline_mom63_ic": rank_ic(d, "mom_63d"),
    }
    per_sector = {}
    for k, grp in d.groupby("sector"):
        if grp["y"].nunique() == 2:
            per_sector[k] = {
                "auc": float(roc_auc_score(grp["y"], grp["_p"])),
                "rank_ic": rank_ic(grp, "_p"),
                "n": int(len(grp)),
            }
    out["per_sector"] = per_sector
    return out


# ── Training ─────────────────────────────────────────────────────────────────

def make_xgb():
    from xgboost import XGBClassifier
    return XGBClassifier(
        n_estimators=500, learning_rate=0.03, max_depth=4,
        min_child_weight=20, subsample=0.8, colsample_bytree=0.7,
        reg_alpha=0.1, reg_lambda=1.0,
        objective="binary:logistic", eval_metric="auc",
        random_state=42, n_jobs=-1,
    )


def calibrated(base, X_cal, y_cal):
    """Sigmoid-calibrate a fitted model on a held-out window."""
    from sklearn.calibration import CalibratedClassifierCV
    try:
        from sklearn.frozen import FrozenEstimator
        cal = CalibratedClassifierCV(FrozenEstimator(base), method="sigmoid")
        return cal.fit(X_cal, y_cal)
    except ImportError:  # older sklearn
        cal = CalibratedClassifierCV(base, method="sigmoid", cv="prefit")
        return cal.fit(X_cal, y_cal)


def main():
    df = normalize_and_label(download_all())
    dates = np.sort(df["date"].unique())
    print(f"\n{len(dates)} sample dates after filtering")

    # ── walk-forward evaluation ──
    fold_metrics = []
    for b in range(N_TEST_BLOCKS, 0, -1):
        test_end = len(dates) - (b - 1) * (TEST_BLOCK_DAYS // SAMPLE_EVERY)
        test_start = test_end - TEST_BLOCK_DAYS // SAMPLE_EVERY
        train_end = test_start - EMBARGO // SAMPLE_EVERY
        if train_end < 50:
            continue
        tr = df[df["date"] <= dates[train_end - 1]]
        te = df[(df["date"] >= dates[test_start]) & (df["date"] < dates[min(test_end, len(dates)) - 1])]
        if te.empty:
            continue
        m = make_xgb().fit(tr[ALL_FEATURES], tr["y"])
        prob = m.predict_proba(te[ALL_FEATURES])[:, 1]
        fm = evaluate(te, prob)
        fold_metrics.append(fm)
        print(f"fold {N_TEST_BLOCKS - b + 1}: test {dates[test_start].astype('datetime64[D]')} → "
              f"{dates[min(test_end, len(dates)) - 1].astype('datetime64[D]')}  "
              f"AUC={fm['auc']:.3f} IC={fm['rank_ic']:.3f} spread={fm['q_spread']:+.3%} "
              f"(mom63 baseline IC={fm['baseline_mom63_ic']:.3f})")

    def _avg(key):
        vals = [f[key] for f in fold_metrics if np.isfinite(f[key])]
        return float(np.mean(vals)) if vals else np.nan

    per_sector: dict = {}
    for fm in fold_metrics:
        for k, v in fm["per_sector"].items():
            per_sector.setdefault(k, []).append(v)
    per_sector_avg = {
        k: {
            "auc": float(np.mean([x["auc"] for x in v])),
            "rank_ic": float(np.mean([x["rank_ic"] for x in v if np.isfinite(x["rank_ic"])] or [np.nan])),
            "reliable": bool(np.mean([x["auc"] for x in v]) >= 0.55),
        }
        for k, v in per_sector.items()
    }

    print("\nWalk-forward averages:")
    print(f"  AUC={_avg('auc'):.3f}  rank IC={_avg('rank_ic'):.3f}  "
          f"quartile spread={_avg('q_spread'):+.3%}  mom63 baseline IC={_avg('baseline_mom63_ic'):.3f}")
    for k, v in sorted(per_sector_avg.items(), key=lambda kv: -kv[1]["auc"]):
        print(f"  {k:16s} AUC={v['auc']:.3f} IC={v['rank_ic']:.3f} reliable={v['reliable']}")

    # ── final model: fit on all-but-calibration window, sigmoid-calibrate ──
    cal_start = dates[len(dates) - CALIB_DAYS // SAMPLE_EVERY]
    tr = df[df["date"] < dates[len(dates) - CALIB_DAYS // SAMPLE_EVERY - EMBARGO // SAMPLE_EVERY]]
    ca = df[df["date"] >= cal_start]
    print(f"\nFinal fit: {len(tr)} train rows, {len(ca)} calibration rows")
    base = make_xgb().fit(tr[ALL_FEATURES], tr["y"])
    model = calibrated(base, ca[ALL_FEATURES], ca["y"])

    payload = {
        "model": model,
        "pooled": True,
        "features": ALL_FEATURES,
        "price_features": PRICE_FEATURES,
        "normalization": "rank_pct_within_sector_cohort",
        "label": f"beat sector-median {HORIZON}d forward excess return vs sector ETF",
        "threshold": 0.5,
        "metrics": {
            "auc_buy_cv": _avg("auc"),
            "rank_ic_cv": _avg("rank_ic"),
            "quartile_spread_cv": _avg("q_spread"),
            "baseline_mom63_ic": _avg("baseline_mom63_ic"),
        },
        "per_sector": per_sector_avg,
        "reliable": bool(np.isfinite(_avg("auc")) and _avg("auc") >= 0.55),
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "wb") as fh:
        pickle.dump(payload, fh)
    print(f"\nSaved → {os.path.abspath(OUT_PATH)}")
    print("Serving picks this up automatically; delete the file to fall back to the 11 per-sector pkls.")


if __name__ == "__main__":
    main()
