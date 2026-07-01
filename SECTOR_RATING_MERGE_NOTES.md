# Sector Quant Ratings — merge notes

Adds a Seeking-Alpha-style **Quant Rating** feature powered by your 11 per-sector
calibrated models. It sits alongside the existing AI Price Forecast (it does not
replace it): the forecast answers *"which way next session?"*, the rating answers
*"is this a buy right now?"*.

## What the models are

Each `sector_<Sector>.pkl` is a `CalibratedClassifierCV(XGBClassifier,
method="isotonic")` — an isotonic-calibrated **BUY classifier**.
`predict_proba(...)[:, 1]` returns a *calibrated probability that the stock is a
BUY*. That probability is the single source of truth and is mapped to a 0-100
score, a 1-5 star rating, and a Strong Buy / Buy / Hold / Sell / Strong Sell
label (anchored on each model's stored `threshold`).

## Files added

Backend
- `backend/ml_models/sector/sector_*.pkl` — the 11 models.
- `backend/app/control/services/sector_model.py` — loads models, computes the
  feature set, runs inference, maps to rating + factor grades + sector ranking.
- `backend/app/control/controller/ratingc.py` — thin controller.
- `backend/app/boundary/ratingb.py` — routes (auth-protected).
- `backend/scripts/verify_sector_models.py` — local sanity-check script.

Backend edits
- `backend/app/main.py` — imports and registers `rating_router`.
- `backend/requirements.txt` — adds `scikit-learn`, `joblib`, `pandas`, `numpy`.

Frontend
- `frontend/src/api/ratingApi.js` — API helper.
- `frontend/src/pages/investor/QuantRatingPage.jsx` — the page (gauge, factor
  grades, sector leaderboard).

Frontend edits
- `frontend/src/routes.jsx` — route `/investor/quantrating`.
- `frontend/src/layout/GeneralHeader.jsx` — "AI Prediction" is now a dropdown
  with "Price Forecast" + "Sector Quant Ratings".

> Leftover file `frontend/src/__verify_routes.jsx` is a harmless verification
> scratch file (not imported anywhere) — safe to delete.

## API

- `GET /rating/{symbol}` → full rating for one ticker.
- `GET /rating/sector/{sectorKey}` → leaderboard for a sector cohort.
- `GET /rating/sectors` → available sectors.

Sector keys: `Technology, Financials, Healthcare, ConsumerDisc, ConsumerStaples,
Energy, Industrials, Materials, RealEstate, Utilities, CommServices`.

## Run it

```bash
cd backend
pip install -r requirements.txt
# IMPORTANT: verify the models load and infer before trusting the API
python -m scripts.verify_sector_models AAPL JPM XOM
uvicorn app.main:app --reload
```

Frontend: `npm run dev` in `frontend/`, then open **AI Prediction → Sector Quant
Ratings**.

## One thing to verify (important)

This was built without a runtime to execute inference, so confirm locally:

1. **Feature alignment.** The service reads the exact ordered feature list from
   the model (`feature_names_in_`) and reindexes its computed features to match;
   anything it can't compute is left as `NaN` (XGBoost handles missing values).
   Run `verify_sector_models.py` and check the printed `features` list against
   what the service computes in `compute_features()` — if a feature shows as
   consistently NaN, either add its computation or confirm the model tolerates
   it. The training feature names found in the pkls are momentum (`mom_*`),
   technicals (`rsi_*`, `macd_*`, `bb_*`, `atr_pct`, `stoch_*`, MA ratios, 52w
   ratios, vol ratios), relative strength (`rs_vs_spy_*`, `rs_vs_sect_*`,
   `spy_*`), fundamentals (`pe_*`, `peg`, `ev_ebitda`, `fcf_yield`, `roe`,
   `roa`, margins, growth, `debt_to_equity`, `current_ratio`, dividend),
   ownership (`insider_pct`, `inst_pct`, `short_*`), analyst (`analyst_mean`,
   `num_analysts`, `price_to_target`), and macro (`yield_10y`, `yield_chg_21d`,
   correlations).

2. **`threshold` / `metrics` location.** `_unwrap()` handles both a bare
   estimator and a `{"model": ..., "threshold": ..., "metrics": ...}` dict. The
   verify script prints what it found — if your threshold/metrics aren't picked
   up, tell me the exact pkl structure and I'll adjust `_unwrap()`.

## Design rationale (vs Seeking Alpha)

SA's Quant Rating is a factor composite presented as a 1-5 rating + letter
grades. We mirror that layout but lead with the model's **calibrated
probability** (a true probability, not a black-box index) and surface each
model's cross-validated **buy precision / AUC** as a reliability badge — the
transparency edge SA doesn't give. Factor grades are percentile ranks within the
stock's sector cohort, which is natural because the models are sector-specific.
