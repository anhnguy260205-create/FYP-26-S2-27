import numpy as np
import pandas as pd
import pytest

from app.control.services import ml_model


# Confidence Tier

def test_confidence_tier_no_edge_is_low_confidence():
    result = ml_model.confidence_tier(0.5)
    assert result["direction"] == "up"
    assert result["signal_strength"] == 0.0
    assert result["confidence_pct"] == 50.0
    assert result["tier_label"] == "Low"


def test_confidence_tier_down_direction():
    result = ml_model.confidence_tier(0.3)
    assert result["direction"] == "down"
    assert result["signal_strength"] == pytest.approx(0.4)


def test_confidence_tier_max_edge_hits_auc_ceiling():
    result = ml_model.confidence_tier(1.0)
    assert result["signal_strength"] == 1.0
    assert result["confidence_pct"] == pytest.approx(ml_model.MODEL_VALIDATION_AUC * 100)
    assert result["tier_label"] == "High"


@pytest.mark.parametrize("prob_up, expected_tier", [
    (0.5, "Low"),        # signal_strength 0.00
    (0.59, "Low"),       # signal_strength 0.18
    (0.61, "Moderate"),  # signal_strength 0.22
    (0.74, "Moderate"),  # signal_strength 0.48
    (0.76, "High"),      # signal_strength 0.52
])
def test_confidence_tier_boundaries(prob_up, expected_tier):
    assert ml_model.confidence_tier(prob_up)["tier_label"] == expected_tier


def test_confidence_tier_never_exceeds_model_auc():
    for prob_up in np.linspace(0.0, 1.0, 21):
        result = ml_model.confidence_tier(float(prob_up))
        assert 50.0 <= result["confidence_pct"] <= ml_model.MODEL_VALIDATION_AUC * 100 + 1e-9


# expected_profit_margin_pct

def test_expected_profit_margin_pct_zero_at_coin_flip():
    assert ml_model.expected_profit_margin_pct(0.5, 2.0) == 0.0


def test_expected_profit_margin_pct_positive_when_bullish():
    assert ml_model.expected_profit_margin_pct(1.0, 2.0) == 2.0


def test_expected_profit_margin_pct_negative_when_bearish():
    assert ml_model.expected_profit_margin_pct(0.0, 2.0) == -2.0


def test_expected_profit_margin_pct_scales_with_typical_move():
    small_move = ml_model.expected_profit_margin_pct(0.8, 1.0)
    large_move = ml_model.expected_profit_margin_pct(0.8, 4.0)
    assert large_move == pytest.approx(small_move * 4)


#technical indicator helpers

@pytest.fixture
def rising_prices():
    # Small amount of noise so there are occasional down-ticks — a perfectly
    # monotonic series has zero average loss, which _rsi's zero-division
    # guard (avg_loss.replace(0, nan) -> fillna(50)) maps to a neutral 50
    # instead of the expected ~100, which would make this fixture a poor
    # stand-in for a realistic uptrend.
    rng = np.random.default_rng(0)
    return pd.Series(np.linspace(100, 150, 40) + rng.normal(0, 2.0, 40))


@pytest.fixture
def falling_prices():
    return pd.Series(np.linspace(150, 100, 40))


def test_rsi_high_for_steadily_rising_prices(rising_prices):
    rsi = ml_model._rsi(rising_prices)
    assert len(rsi) == len(rising_prices)
    assert rsi.iloc[-1] > 70


def test_rsi_low_for_steadily_falling_prices(falling_prices):
    rsi = ml_model._rsi(falling_prices)
    assert rsi.iloc[-1] < 10


def test_rsi_never_nan_or_out_of_bounds(rising_prices):
    rsi = ml_model._rsi(rising_prices)
    assert not rsi.isna().any()
    assert rsi.between(0, 100).all()


def test_macd_diff_positive_when_trending_up(rising_prices):
    macd_diff = ml_model._macd_diff(rising_prices)
    assert macd_diff.iloc[-1] > 0


def test_bollinger_width_non_negative(rising_prices):
    width, pct = ml_model._bollinger(rising_prices)
    assert (width.fillna(0) >= 0).all()
    assert not pct.isna().any()


def test_atr_pct_non_negative(rising_prices):
    high = rising_prices + 1
    low = rising_prices - 1
    atr_pct = ml_model._atr_pct(high, low, rising_prices)
    assert (atr_pct >= 0).all()


def test_stochastic_within_bounds(rising_prices):
    high = rising_prices + 1
    low = rising_prices - 1
    stoch_k, stoch_d = ml_model._stochastic(high, low, rising_prices)
    assert stoch_k.between(0, 100).all()
    assert stoch_d.between(0, 100).all()


# compute features 

@pytest.fixture(autouse=True)
def _stub_network_features(monkeypatch):
    """compute_features pulls sentiment (yfinance news) and SPY history
    (yfinance) — neither is available/deterministic in a test environment,
    so stub both to neutral values."""
    monkeypatch.setattr(ml_model, "_get_sentiment_features", lambda symbol: dict(ml_model._NEUTRAL_SENTIMENT))
    monkeypatch.setattr(ml_model, "_get_spy_features", lambda: {
        "spy_return_1d": 0.0, "spy_return_5d": 0.0, "spy_ma_ratio": 0.0,
    })


def _synthetic_history(rows: int = 40) -> pd.DataFrame:
    rng = np.random.default_rng(42)
    close = 100 + np.cumsum(rng.normal(0, 1, rows))
    return pd.DataFrame({
        "Close": close,
        "High": close + rng.uniform(0.5, 1.5, rows),
        "Low": close - rng.uniform(0.5, 1.5, rows),
        "Volume": rng.integers(1_000_000, 5_000_000, rows),
    })


def test_compute_features_returns_none_when_history_too_short():
    history = _synthetic_history(rows=10)
    assert ml_model.compute_features(history, "AAPL") is None


def test_compute_features_returns_finite_values_for_sufficient_history():
    history = _synthetic_history(rows=40)
    features = ml_model.compute_features(history, "AAPL")

    assert features is not None
    for key in ("rsi", "macd_diff", "stoch_k", "stoch_d", "bb_width", "bb_pct", "atr_pct", "volume_ratio"):
        assert key in features
        assert np.isfinite(features[key])

    # stubbed sentiment/SPY features merged in
    assert features["spy_return_1d"] == 0.0
    assert features["finbert_score_mean"] == 0.0
