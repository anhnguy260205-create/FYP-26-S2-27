"""
Offline evaluation of the XGBoost stock prediction model.
Run from the backend directory:
    python evaluate_model.py
"""
import time, math, requests, numpy as np, pandas as pd, xgboost as xgb
from sklearn.metrics import (roc_auc_score, accuracy_score, precision_score,
                              recall_score, f1_score, confusion_matrix)

requests.packages.urllib3.disable_warnings()
_HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

def fetch_ohlcv(symbol: str, start: str, end: str) -> pd.DataFrame:
    """Fetch daily OHLCV from Yahoo Finance v8 API using raw requests."""
    import time as _time
    from datetime import datetime
    p1 = int(datetime.strptime(start, "%Y-%m-%d").timestamp())
    p2 = int(datetime.strptime(end,   "%Y-%m-%d").timestamp())
    url = (f"https://query2.finance.yahoo.com/v8/finance/chart/{symbol}"
           f"?interval=1d&period1={p1}&period2={p2}")
    for attempt in range(3):
        try:
            r = requests.get(url, headers=_HEADERS, verify=False, timeout=15)
            data = r.json()["chart"]["result"][0]
            ts   = data["timestamp"]
            q    = data["indicators"]["quote"][0]
            df   = pd.DataFrame({
                "Open":   q["open"],   "High": q["high"],
                "Low":    q["low"],    "Close": q["close"],
                "Volume": q["volume"],
            }, index=pd.to_datetime(ts, unit="s", utc=True).tz_localize(None))
            return df.dropna()
        except Exception as e:
            if attempt < 2:
                _time.sleep(2)
    return pd.DataFrame()

MODEL   = "ml_models/xgb_all_auc0.5386_20260618_2159.json"
SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","AVGO","ORCL","AMD"]
START   = "2024-01-01"
END     = "2025-12-31"

# ── Technical indicator helpers ───────────────────────────────────────────────
def rsi(s, p=14):
    d = s.diff(); g = d.clip(lower=0); l = -d.clip(upper=0)
    rs = g.rolling(p).mean() / l.rolling(p).mean().replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50)

def macd_diff(s, f=12, sl=26, sg=9):
    m = s.ewm(span=f, adjust=False).mean() - s.ewm(span=sl, adjust=False).mean()
    return m - m.ewm(span=sg, adjust=False).mean()

def stoch(h, l, c, k=14, d=3):
    lo = l.rolling(k).min(); hi = h.rolling(k).max()
    sk = (100 * (c - lo) / (hi - lo).replace(0, np.nan)).fillna(50)
    return sk, sk.rolling(d).mean().fillna(50)

def bollinger(s, p=20, n=2):
    ma = s.rolling(p).mean(); std = s.rolling(p).std()
    up = ma + n*std; lo = ma - n*std
    return ((up-lo)/ma.replace(0,np.nan)).fillna(0), ((s-lo)/(up-lo).replace(0,np.nan)).fillna(.5)

def atr_pct(h, l, c, p=14):
    pc = c.shift(1)
    tr = pd.concat([h-l, (h-pc).abs(), (l-pc).abs()], axis=1).max(axis=1)
    return (tr.rolling(p).mean() / c.replace(0, np.nan)).fillna(0)

# ── Load model ────────────────────────────────────────────────────────────────
print("Loading model...")
booster = xgb.Booster()
booster.load_model(MODEL)
FEATS = booster.feature_names
print(f"Features ({len(FEATS)}): {FEATS}\n")

# ── Fetch SPY market data ─────────────────────────────────────────────────────
print("Fetching SPY...")
spy_df = fetch_ohlcv("SPY", START, END)
time.sleep(0.5)
if spy_df.empty:
    print("WARNING: SPY data unavailable — SPY features will be 0")
    spy_close = None
else:
    spy_close = spy_df["Close"]
    print(f"SPY: {len(spy_df)} rows\n")

# ── Evaluate per symbol ───────────────────────────────────────────────────────
all_probs, all_labels = [], []
results = []

for sym in SYMBOLS:
    print(f"Fetching {sym}...", end=" ", flush=True)
    time.sleep(0.5)
    df = fetch_ohlcv(sym, START, END)
    if df.empty or len(df) < 60:
        print("SKIP (no data)")
        continue

    c, h, l, v = df["Close"], df["High"], df["Low"], df["Volume"]

    df["return_1d"]      = c.pct_change(1)
    df["return_2d"]      = c.pct_change(2)
    df["return_5d"]      = c.pct_change(5)
    ma5 = c.rolling(5).mean(); ma20 = c.rolling(20).mean()
    df["price_to_ma5"]   = c / ma5 - 1
    df["price_to_ma20"]  = c / ma20 - 1
    df["ma5_to_ma20"]    = ma5 / ma20 - 1
    df["rsi"]            = rsi(c)
    df["macd_diff"]      = macd_diff(c)
    df["stoch_k"], df["stoch_d"] = stoch(h, l, c)
    df["bb_width"], df["bb_pct"] = bollinger(c)
    df["atr_pct"]        = atr_pct(h, l, c)
    df["volume_ratio"]   = (v / v.rolling(20).mean().replace(0, np.nan)).fillna(1)
    df["return_lag1"]    = df["return_1d"].shift(1)
    df["return_lag2"]    = df["return_1d"].shift(2)
    df["return_lag3"]    = df["return_1d"].shift(3)
    df["rsi_lag1"]       = df["rsi"].shift(1)

    # SPY market features
    if spy_close is not None:
        al = spy_close.reindex(df.index, method="ffill")
        df["spy_return_1d"] = al.pct_change(1)
        df["spy_return_5d"] = al.pct_change(5)
        df["spy_ma_ratio"]  = al / al.rolling(20).mean() - 1
    else:
        df["spy_return_1d"] = df["spy_return_5d"] = df["spy_ma_ratio"] = 0.0

    # Sentiment zeroed (no live news for historical eval)
    for col in ["finbert_score_mean","finbert_pos_mean","finbert_neg_mean",
                "news_count","sentiment_lag1","sentiment_lag2"]:
        df[col] = 0.0

    # Label: did the stock close UP next trading day?
    df["label"] = (c.shift(-1) > c).astype(int)
    df = df.dropna(subset=FEATS + ["label"]).iloc[:-1]

    if len(df) < 20:
        print("SKIP (insufficient rows after dropna)")
        continue

    X = xgb.DMatrix(df[FEATS].values.astype(np.float32), feature_names=FEATS)
    probs = booster.predict(X)
    preds = (probs >= 0.5).astype(int)

    sym_auc = roc_auc_score(df["label"], probs)
    sym_acc = accuracy_score(df["label"], preds)
    sym_f1  = f1_score(df["label"], preds)
    base    = df["label"].mean()

    results.append({"symbol": sym, "n": len(df), "auc": sym_auc,
                    "acc": sym_acc, "f1": sym_f1, "base": base})
    all_probs.extend(probs.tolist())
    all_labels.extend(df["label"].tolist())
    print(f"n={len(df):3d}  AUC={sym_auc:.4f}  Acc={sym_acc:.4f}  F1={sym_f1:.4f}  base={base:.4f}")

# ── Aggregate results ─────────────────────────────────────────────────────────
print("\n" + "="*60)
if not all_labels:
    print("No data collected — yfinance may be rate-limited. Try again in a few minutes.")
else:
    y_true = np.array(all_labels)
    y_prob = np.array(all_probs)
    y_pred = (y_prob >= 0.5).astype(int)
    cm = confusion_matrix(y_true, y_pred)
    base = y_true.mean()

    print(f"{'AGGREGATE RESULTS':^60}")
    print("="*60)
    print(f"  Total samples    : {len(y_true)}")
    print(f"  Symbols evaluated: {len(results)}/{len(SYMBOLS)}")
    print()
    print(f"  AUC              : {roc_auc_score(y_true, y_prob):.4f}")
    print(f"  Accuracy         : {accuracy_score(y_true, y_pred):.4f}")
    print(f"  Precision        : {precision_score(y_true, y_pred):.4f}")
    print(f"  Recall           : {recall_score(y_true, y_pred):.4f}")
    print(f"  F1 Score         : {f1_score(y_true, y_pred):.4f}")
    print()
    print(f"  Base rate        : {base:.4f}  ({base*100:.1f}% of days go up)")
    print(f"  Lift vs baseline : {accuracy_score(y_true, y_pred) - base:+.4f}")
    print()
    print(f"  Confusion matrix :")
    print(f"    Pred DOWN | TN={cm[0][0]:4d}  FP={cm[0][1]:4d}")
    print(f"    Pred UP   | FN={cm[1][0]:4d}  TP={cm[1][1]:4d}")
    print()

    # Feature importance
    scores = booster.get_score(importance_type="gain")
    top = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:10]
    print("  Top 10 features by gain:")
    for feat, gain in top:
        print(f"    {feat:<22} {gain:.2f}")
    print("="*60)
