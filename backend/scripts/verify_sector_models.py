import os
import sys
import pickle

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models", "sector")


def load(path):
    try:
        import joblib
        return joblib.load(path)
    except Exception:
        with open(path, "rb") as fh:
            return pickle.load(fh)


def inspect_all():
    from app.control.services import sector_model as sm
    print("=" * 70)
    print("INSPECTING SECTOR MODELS")
    print("=" * 70)
    for key, stem in sm._SECTOR_FILES.items():
        path = os.path.join(MODEL_DIR, f"{stem}.pkl")
        if not os.path.exists(path):
            print(f"[MISSING] {key}: {path}")
            continue
        model = load(path)
        est, threshold, metrics = sm._unwrap(model)
        feats = sm._model_feature_names(model, est)
        print(f"\n● {key}  ({stem}.pkl)")
        print(f"   raw type  : {type(model).__name__}")
        if isinstance(model, dict):
            print(f"   dict keys : {list(model.keys())}")
        print(f"   estimator : {type(est).__name__}")
        print(f"   classes_  : {getattr(est, 'classes_', '?')}")
        print(f"   buy class idx: {sm._buy_class_index(est)}")
        print(f"   threshold : {threshold}")
        print(f"   metrics   : {metrics}")
        print(f"   n_features: {len(feats) if feats else 'UNKNOWN'}")
        if feats:
            print(f"   features  : {feats}")


def report_missing_features(symbols):
    #Print expected features that compute_features() does not produce (would be NaN).
    import yfinance as yf
    from app.control.services import sector_model as sm
    print("\n" + "=" * 70)
    print("FEATURE COVERAGE (expected vs computed)")
    print("=" * 70)
    for sym in symbols:
        sector = sm.resolve_sector(sym)
        if not sector:
            print(f"{sym}: no sector"); continue
        model = sm._load_model(sector)
        est, _, _ = sm._unwrap(model)
        expected = sm._model_feature_names(model, est) or []
        tk = yf.Ticker(sym)
        feats = sm.compute_features(tk.history(period="2y", interval="1d"), tk.info or {}, sector)
        missing = [f for f in expected if f not in feats or feats.get(f) is None]
        extra = [f for f in feats if f not in expected]
        print(f"\n{sym} ({sector}): expected={len(expected)} computed={len(feats)}")
        print(f"  MISSING (expected but not computed -> NaN): {missing}")
        if extra:
            print(f"  EXTRA (computed but not used by model): {extra}")


def run_ratings(symbols):
    from app.control.services import sector_model as sm
    report_missing_features(symbols)
    print("\n" + "=" * 70)
    print("LIVE RATINGS")
    print("=" * 70)
    for sym in symbols:
        print(f"\n--- {sym} ---")
        try:
            r = sm.rate_symbol(sym)
        except Exception as e:
            print(f"   ERROR: {e!r}")
            continue
        if not r:
            print("   No rating (unsupported sector or no data).")
            continue
        print(f"   sector : {r['sectorLabel']}")
        print(f"   score  : {r['score']}/100   label: {r['label']}   stars: {r['stars']}")
        print(f"   buyProb: {r['buyProbability']}   threshold: {r['threshold']}")
        print(f"   metrics: {r['modelMetrics']}")
        for g in r["factorGrades"]:
            print(f"     {g['factor']:<14} {g['grade']}  ({g['percentile']})")


if __name__ == "__main__":
    inspect_all()
    extra = sys.argv[1:]
    if extra:
        run_ratings([s.upper() for s in extra])
    else:
        print("\n(Pass tickers as args to run live ratings, e.g. "
              "`python -m scripts.verify_sector_models AAPL JPM XOM`)")
