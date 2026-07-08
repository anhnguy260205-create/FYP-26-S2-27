import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
import StockComments from "../../components/StockComments.jsx";
import StockOverview from "../../components/StockOverview.jsx";
import StockQuantRating from "../../components/StockQuantRating.jsx";
import StockPrediction from "../../components/StockPrediction.jsx";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, memo } from "react";
import { createAlert } from "../../api/alertApi.js";
import { addStockToWatchlist } from "../../api/userApi.js";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";
import { getPortfolio, submitOrder, getOrders, cancelOrder } from "../../api/tradingApi.js";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";

/* ─── Helpers ─────────────────────────────────────────────── */
function formatNumber(num) {
  if (!Number.isFinite(Number(num))) return "0";
  num = Number(num);
  const fmt = (v, s) => parseFloat(v.toFixed(1)) + s;
  if (num >= 1_000_000_000) return fmt(num / 1_000_000_000, "B");
  if (num >= 1_000_000) return fmt(num / 1_000_000, "M");
  if (num >= 1_000) return fmt(num / 1_000, "K");
  return num.toString();
}
function companyName(symbol) {
  const names = {
    AAPL: "Apple", TSLA: "Tesla", NVDA: "NVIDIA",
    MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    META: "Meta", AMD: "AMD", NFLX: "Netflix", INTC: "Intel",
  };
  return names[symbol] ?? "";
}

/* ─── Trade Buttons ────────────────────────────────────────── */
function Button({ marketStatus, symbol }) {
  const navigate = useNavigate();
  const isOpen = marketStatus === "OPEN";
  const handleTrade = (type) => {
    if (!isOpen) return;
    navigate(`/${type}/${symbol}`);
  };
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <button
        onClick={() => handleTrade("buy")}
        disabled={!isOpen}
        style={{
          padding: "10px 32px", borderRadius: "8px",
          border: "1px solid rgba(52,211,153,0.4)",
          background: "linear-gradient(135deg, rgba(6,78,59,0.8), rgba(16,185,129,0.25))",
          color: "#6ee7b7", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em",
          cursor: isOpen ? "pointer" : "not-allowed",
          transition: "all 0.2s ease", textTransform: "uppercase",
          opacity: isOpen ? 1 : 0.4,
        }}
        onMouseEnter={e => {
          if (!isOpen) return;
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,78,59,0.95), rgba(16,185,129,0.5))";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(52,211,153,0.3)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(6,78,59,0.8), rgba(16,185,129,0.25))";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        ▲ Buy
      </button>
      <button
        onClick={() => handleTrade("sell")}
        disabled={!isOpen}
        style={{
          padding: "10px 32px", borderRadius: "8px",
          border: "1px solid rgba(239,68,68,0.4)",
          background: "linear-gradient(135deg, rgba(127,29,29,0.8), rgba(239,68,68,0.25))",
          color: "#fca5a5", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em",
          cursor: isOpen ? "pointer" : "not-allowed",
          transition: "all 0.2s ease", textTransform: "uppercase",
          opacity: isOpen ? 1 : 0.4,
        }}
        onMouseEnter={e => {
          if (!isOpen) return;
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(127,29,29,0.95), rgba(239,68,68,0.5))";
          e.currentTarget.style.boxShadow = "0 0 20px rgba(239,68,68,0.3)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "linear-gradient(135deg, rgba(127,29,29,0.8), rgba(239,68,68,0.25))";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        ▼ Sell
      </button>
    </div>
  );
}
/* Watchlist Feature */
function WatchlistButton({ stock_symbol, currentUser }) {
  const navigate = useNavigate();
  const user_id = currentUser?.user_id;
  const [feedback, setFeedback] = useState(null);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await addStockToWatchlist(user_id, stock_symbol);
      if (result.success) {
        showFeedback("success", "Added to watchlist");
      } else if (result.limit_reached) {
        showFeedback("limit", result.message);
      } else {
        showFeedback("error", result.message || "Already in watchlist");
      }
    } catch (error) {
      console.error(error);
      showFeedback("error", "Failed to add to watchlist");
    }
  };

  const feedbackColors = {
    success: { bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)", text: "#34d399" },
    error: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)", text: "#f87171" },
    limit: { bg: "rgba(255,215,0,0.08)", border: "rgba(255,215,0,0.3)", text: "#FFD700" },
  };

  return (
    <div style={{ position: "relative", marginTop: "16px" }}>
      <button onClick={handleSubmit}
        style={{
          width: "200px", padding: "11px", borderRadius: "8px",
          background: "linear-gradient(90deg, #0284c7, #2563eb)", color: "#fff",
          fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", border: "none",
          cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", transition: "all 0.2s",
        }}>
        + Add to Watchlist
      </button>

      {feedback && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", right: 0,
          width: "200px", padding: "10px 12px", borderRadius: "8px",
          background: feedbackColors[feedback.type].bg,
          border: `1px solid ${feedbackColors[feedback.type].border}`,
          backdropFilter: "blur(8px)",
          fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
          color: feedbackColors[feedback.type].text,
          lineHeight: 1.4, zIndex: 50,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {feedback.text}
          {feedback.type === "limit" && (
            <button
              onClick={() => navigate("/investor/subscription")}
              style={{
                display: "block", marginTop: "6px", fontSize: "10px", fontWeight: 700,
                color: "#FFD700", background: "none", border: "none",
                cursor: "pointer", padding: 0, textDecoration: "underline",
                fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
              }}
            >
              ★ Upgrade to Premium
            </button>
          )}
        </div>
      )}
    </div>
  );
}
/* ─── First Level ──────────────────────────────────────────── */
// selectedStock = symbol string ("NVDA"), stock = live data object from useLiveStocks
function FirstLevel({ symbol, selectedStock, stock, marketStatus, lastUpdated, currentUser }) {
  //Price data lives in `stock` (passed from stocks[selectedStock] in the page).
  const chg = stock?.price != null && stock?.previousClose != null
    ? (stock.price - stock.previousClose).toFixed(3)
    : null;
  const pctChg = stock?.price != null && stock?.previousClose != null
    ? (((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(3)
    : null;
  const isUp = chg === null ? true : Number(chg) >= 0;
  const changeColor = isUp ? "#34d399" : "#f87171";
  const isMarketOpen = marketStatus === "OPEN";


  return (
    <div

      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: "20px", borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: "24px",
      }}
    >
      {/* Left: symbol + company name + market status */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <h1 style={{
            fontFamily: "'DM Mono', monospace", fontSize: "36px", fontWeight: 700,
            letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1,
          }}>
            {symbol}
          </h1>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
            color: "#64748b", fontWeight: 400, letterSpacing: "0.02em",
          }}>
            {stock?.name ?? companyName(selectedStock)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: isMarketOpen ? "#34d399" : "#ef4444",
            boxShadow: isMarketOpen ? "0 0 8px #34d399" : "0 0 8px #ef4444",
            display: "inline-block",
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px",
            color: isMarketOpen ? "#34d399" : "#ef4444",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Market {marketStatus || "Loading"}
          </span>
          <p className="text-gray-400">|</p>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px"
          }}>
            Lasted update: {lastUpdated || "Loading..."}
          </span>
        </div>
      </div>

      {/* Centre: live price + change */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>

        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: "28px", fontWeight: 700,
          color: changeColor, letterSpacing: "0.02em",
        }}>
          {stock?.price != null ? `$${stock.price.toFixed(3)}` : "—"} USD
        </span>
        <span className="inline" style={{
          color: changeColor, letterSpacing: "0.04em",
        }}>
          {chg !== null ? `${isUp ? "+" : ""}${chg}` : "—"}

          {pctChg !== null ? `(${isUp ? "+" : ""}${pctChg}%)` : ""}
        </span>
      </div>
      <WatchlistButton stock_symbol={selectedStock} currentUser={currentUser} />

    </div>
  );
}

/* ─── Stat Pill ────────────────────────────────────────────── */
function StatPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 20px", flex: 1 }}>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px",
        color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: "17px",
        color: "#cbd5e1", fontWeight: 600, letterSpacing: "0.03em",
      }}>
        {value}
      </span>
    </div>
  );
}

/* ─── Alert Board ──────────────────────────────────────────── */
function AlertBoard({ symbol }) {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const userEmail = currentUser?.email || "";

  const [formData, setFormData] = useState({
    price_above: "", price_below: "", pct_increase: "", pct_decrease: "",
    notification_email: userEmail,
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const { price_above, price_below, pct_increase, pct_decrease, notification_email } = formData;
    const hasCondition = price_above || price_below || pct_increase || pct_decrease;
    if (!hasCondition) {
      setError("Set at least one condition.");
      return;
    }
    if (!notification_email) {
      setError("Email is required.");
      return;
    }

    const payload = {
      user_id: userId,
      stock_symbol: symbol,
      notification_email,
      price_above: price_above ? parseFloat(price_above) : null,
      price_below: price_below ? parseFloat(price_below) : null,
      increase_percent: pct_increase ? parseFloat(pct_increase) : null,
      decrease_percent: pct_decrease ? parseFloat(pct_decrease) : null,
      custom_message: null,
    };

    setLoading(true);
    try {
      const result = await createAlert(payload);
      if (result.success) {
        setSubmitted(true);
      } else {
        setError("Failed to create alert. Try again.");
      }
    } catch {
      setError("Could not reach server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "7px",
    border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.6)",
    color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "13px",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#475569",
    letterSpacing: "0.05em", marginBottom: "4px", textTransform: "uppercase",
  };
  const sectionHeadStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#3b82f6",
    letterSpacing: "0.12em", textTransform: "uppercase",
    margin: "16px 0 10px", borderBottom: "1px solid rgba(59,130,246,0.2)", paddingBottom: "6px",
  };

  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
        padding: "24px",
      }}
    >
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6",
        letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px",
      }}>
        🔔 Stock Alerts
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#94a3b8", margin: "0 0 4px", lineHeight: 1.5 }}>
        Get notified when <span style={{ color: "#60a5fa", fontWeight: 600 }}>{symbol}</span> hits your target.
      </p>

      {submitted ? (
        <div style={{ textAlign: "center", padding: "36px 0" }}>
          <div style={{
            width: "48px", height: "48px", borderRadius: "50%",
            background: "linear-gradient(135deg, #0284c7, #2563eb)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px", boxShadow: "0 0 24px rgba(37,99,235,0.4)",
          }}>
            <svg width="22" height="22" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p style={{ color: "#34d399", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Alert activated!</p>
          <p style={{ color: "#64748b", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", marginTop: "4px" }}>
            Email will be sent to {formData.notification_email}
          </p>
          <button
            onClick={() => { setSubmitted(false); setFormData(p => ({ ...p, price_above: "", price_below: "", pct_increase: "", pct_decrease: "" })); }}
            style={{
              marginTop: "16px", padding: "8px 20px", borderRadius: "7px",
              background: "rgba(37,99,235,0.2)", border: "1px solid rgba(59,130,246,0.4)",
              color: "#60a5fa", fontFamily: "'DM Mono', monospace", fontSize: "12px", cursor: "pointer",
            }}
          >
            Add Another
          </button>
        </div>
      ) : (
        <form id="alert-form" onSubmit={handleSubmit}>
          <p style={sectionHeadStyle}>Price Alerts</p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Price above ($)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.price_above} placeholder="e.g. 200.00"
                onChange={(e) => handleChange("price_above", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
            <div>
              <p style={labelStyle}>Price below ($)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.price_below} placeholder="e.g. 150.00"
                onChange={(e) => handleChange("price_below", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
          </div>
          <p style={sectionHeadStyle}>% Change Alerts</p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Increase by (%)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.pct_increase} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_increase", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
            <div>
              <p style={labelStyle}>Decrease by (%)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.pct_decrease} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_decrease", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
          </div>
          <p style={sectionHeadStyle}>Notification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Send email to</p>
              <input style={inputStyle} type="email" required value={formData.notification_email} placeholder="your@email.com"
                onChange={(e) => handleChange("notification_email", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
          </div>
          {error && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#f87171", marginTop: "8px" }}>
              {error}
            </p>
          )}
        </form>
      )}

      {!submitted && (
        <button
          type="submit"
          form="alert-form"
          disabled={loading}
          style={{
            width: "100%", marginTop: "20px", padding: "12px", borderRadius: "8px",
            background: "linear-gradient(90deg, #0284c7, #2563eb)", color: "#fff",
            fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px",
            letterSpacing: "0.1em", textTransform: "uppercase", border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)", transition: "all 0.2s",
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {loading ? "Saving..." : "Turn On Alerts"}
        </button>
      )}
    </div>
  );
}

/* ─── Premium Lock Card ────────────────────────────────────── */
function PremiumLockCard() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        width: "100%",
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px",
        padding: "48px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "14px", textAlign: "center",
      }}
    >
      <div style={{
        width: "60px", height: "60px", borderRadius: "50%",
        background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px",
      }}>
        🔒
      </div>
      <h2 style={{
        fontFamily: "'DM Mono', monospace", fontSize: "14px", color: "#FFD700",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
      }}>
        Premium Feature
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        color: "#94a3b8", lineHeight: 1.6, margin: 0, maxWidth: "360px",
      }}>
        Custom stock alerts are available for <span style={{ color: "#FFD700" }}>Premium</span> members only.
        Upgrade to get notified when prices hit your targets.
      </p>
      <button
        onClick={() => navigate("/investor/subscription")}
        style={{
          marginTop: "6px", padding: "11px 28px", borderRadius: "8px",
          background: "linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))",
          border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700",
          fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px",
          letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "linear-gradient(90deg, rgba(255,215,0,0.35), rgba(255,165,0,0.35))"}
        onMouseLeave={e => e.currentTarget.style.background = "linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))"}
      >
        ★ Upgrade to Premium
      </button>
    </div>
  );
}

/* ─── Second + Third Level (two-column layout) ─────────────── */
const SecondAndThirdLevel = memo(function SecondAndThirdLevel({ symbol, stock, stockCandles, requestRangeData, stockList, candles, candleRanges, isPremium, showAlerts = true }) {
  if (!stock) return null;
  const { open, high, low, volume, avgVolume } = stock;

  return (
    <div
      style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexShrink: 0 }}
    >
      {/* LEFT COLUMN: stats strip + chart stacked */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
        {/* Stats strip */}
        <div style={{
          display: "flex",
          background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
          border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
        }}>
          {[
            // Ensure the system work smoothly even if some data points are missing by showing "N/A"
            { label: "Open", value: open != null ? `$${open.toFixed(2)}` : "N/A" },
            { label: "High", value: high != null ? `$${high.toFixed(2)}` : "N/A" },
            { label: "Low", value: low != null ? `$${low.toFixed(2)}` : "N/A" },
            { label: "Volume", value: formatNumber(volume) },
            { label: "Avg Volume", value: formatNumber(avgVolume) },
          ].map((s, i, arr) => (
            <div key={s.label} style={{
              display: "flex", flex: 1,
              borderRight: i < arr.length - 1 ? "1px solid rgba(99,179,237,0.1)" : "none",
            }}>
              <StatPill label={s.label} value={s.value} />
            </div>
          ))}
        </div>

        {/* Chart */}
        <div

          style={{
            background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
            border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
            padding: "20px",
          }}
        >
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3b82f6",
            letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 16px",
          }}>
            Price Chart
          </p>
          <InteractiveChart
            data={stockCandles}
            symbol={symbol}
            requestRangeData={requestRangeData}
            stockList={stockList}
            compareDataBySymbol={candles}
            candleRanges={candleRanges}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: alerts board (premium only) — hidden when alerts have their own tab */}
      {showAlerts && (isPremium ? <AlertBoard symbol={symbol} /> : <PremiumLockCard />)}
    </div>
  );
});

/* ─── Paper Exchange Panel ──────────────────────────────────── */
function PaperExchangePanel({ symbol, livePrice, marketStatus }) {
  const isMarketOpen = marketStatus === "OPEN";
  const userId = JSON.parse(localStorage.getItem("currentUser") || "{}").user_id;

  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tradeLoading, setTradeLoading] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState(null);

  const qty = parseInt(quantity, 10);
  const limitPriceNum = parseFloat(limitPrice);
  const effectivePrice = limitPriceNum > 0 ? limitPriceNum : livePrice;
  const estimatedTotal = effectivePrice && qty > 0 ? (effectivePrice * qty).toFixed(2) : null;
  const currentHolding = (portfolio?.holdings || []).find(h => h.symbol === symbol);

  async function refreshPortfolio() {
    if (!userId) return;
    try {
      const data = await getPortfolio(userId);
      if (data?.success !== false) setPortfolio(data);
    } catch { }
  }

  async function refreshOrders() {
    if (!userId) return;
    try {
      const data = await getOrders(userId, symbol);
      setOrders(data?.orders || []);
    } catch { }
  }

  useEffect(() => {
    refreshPortfolio();
    refreshOrders();
    setQuantity("");
    setLimitPrice("");
    setMessage(null);
  }, [symbol]);

  // Keep limit price input in sync with live price when empty
  useEffect(() => {
    if (!limitPrice && livePrice) setLimitPrice(livePrice.toFixed(2));
  }, [livePrice]);

  async function handleTrade(action) {
    if (!isMarketOpen) { setMessage({ type: "error", text: "Market is closed. Trading resumes Mon–Fri, 9:30am–4:00pm ET." }); return; }
    if (!userId || !qty || qty <= 0) return;
    const price = limitPriceNum > 0 ? limitPriceNum : livePrice;
    if (!price) { setMessage({ type: "error", text: "No price available. Enter a limit price." }); return; }
    setTradeLoading(action);
    setMessage(null);
    try {
      const result = await submitOrder(userId, symbol, action, qty, price);
      if (result.success) {
        setMessage({ type: "success", text: result.message || `Order submitted.` });
        setQuantity("");
        await Promise.all([refreshPortfolio(), refreshOrders()]);
      } else {
        setMessage({ type: "error", text: result.message || result.detail || "Order failed." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setTradeLoading(null);
    }
  }

  async function handleCancel(orderId) {
    setCancellingId(orderId);
    try {
      const result = await cancelOrder(orderId);
      if (result.success) {
        setOrders(prev => prev.map(o => o.order_id === orderId ? { ...o, status: "cancelled" } : o));
      } else {
        setMessage({ type: "error", text: result.message || "Could not cancel order." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error cancelling order." });
    } finally {
      setCancellingId(null);
    }
  }

  const lbl = {
    fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#475569",
    letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px",
  };
  const inputStyle = {
    height: "42px", padding: "0 14px", borderRadius: "8px",
    background: "rgba(15,23,42,0.6)", border: "1px solid rgba(99,179,237,0.2)",
    color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontSize: "15px", fontWeight: 600, outline: "none",
  };

  const statusColor = { pending: "#fbbf24", partial: "#60a5fa", filled: "#34d399", cancelled: "#64748b" };

  return (
    <div

      style={{
        marginTop: "16px",
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px", padding: "20px 24px",
      }}
    >
      {/* Header */}
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 4px" }}>
        Hybrid Trading Engine
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#475569", margin: "0 0 16px", lineHeight: 1.5 }}>
        Submit limit orders for <span style={{ color: "#60a5fa" }}>{symbol}</span>. Orders match between investors first; remainder fills at live market price.
      </p>

      {!isMarketOpen && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)",
          borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
        }}>
          <span style={{ fontSize: "16px" }}>🔒</span>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: "#fca5a5" }}>
              Market closed — trading unavailable
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
              US markets are open Mon–Fri, 9:30am–4:00pm ET (about 9:30pm–4:00am Singapore time).
            </div>
          </div>
        </div>
      )}

      {/* Info tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p style={lbl}>Live Price</p>
          <div style={{ background: "rgba(0,211,243,0.06)", border: "1px solid rgba(0,211,243,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 700, color: livePrice ? "#00D3F2" : "#475569" }}>
              {livePrice ? `$${livePrice.toFixed(2)}` : "—"}
            </span>
          </div>
        </div>
        <div>
          <p style={lbl}>Paper Balance</p>
          <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 700, color: "#34d399" }}>
              {portfolio?.paper_money != null ? `$${Number(portfolio.paper_money).toFixed(2)}` : "—"}
            </span>
          </div>
        </div>
        <div>
          <p style={lbl}>You Own</p>
          <div style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: "8px", padding: "10px 14px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 700, color: currentHolding ? "#fbbf24" : "#475569" }}>
              {currentHolding ? `${currentHolding.quantity} shares` : "0 shares"}
            </span>
          </div>
        </div>
        <div>
          <p style={lbl}>Order Value</p>
          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "10px 14px" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 700, color: estimatedTotal ? "#e2e8f0" : "#475569" }}>
              {estimatedTotal ? `$${estimatedTotal}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Order form */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px" }}>
        <div>
          <p style={lbl}>Quantity</p>
          <input
            type="number" min={1} value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="0"
            disabled={!isMarketOpen}
            style={{ ...inputStyle, width: "100px", opacity: isMarketOpen ? 1 : 0.45, cursor: isMarketOpen ? "text" : "not-allowed" }}
            onFocus={e => { if (isMarketOpen) e.target.style.borderColor = "rgba(59,130,246,0.6)"; }}
            onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"}
          />
        </div>
        <div>
          <p style={lbl}>Limit Price ($)</p>
          <input
            type="number" min={0.01} step="0.01" value={limitPrice}
            onChange={e => setLimitPrice(e.target.value)}
            placeholder={livePrice ? livePrice.toFixed(2) : "0.00"}
            disabled={!isMarketOpen}
            style={{ ...inputStyle, width: "120px", opacity: isMarketOpen ? 1 : 0.45, cursor: isMarketOpen ? "text" : "not-allowed" }}
            onFocus={e => { if (isMarketOpen) e.target.style.borderColor = "rgba(59,130,246,0.6)"; }}
            onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"}
          />
        </div>

        <button
          onClick={() => handleTrade("buy")}
          disabled={!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null}
          style={{
            height: "42px", padding: "0 28px", borderRadius: "8px",
            border: "1px solid rgba(52,211,153,0.4)",
            background: "linear-gradient(135deg, rgba(6,78,59,0.8), rgba(16,185,129,0.25))",
            color: "#6ee7b7", fontFamily: "'DM Mono', monospace", fontWeight: 600,
            fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? "not-allowed" : "pointer",
            opacity: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? 0.45 : 1,
            transition: "all 0.2s",
          }}
        >
          {tradeLoading === "buy" ? "Submitting…" : "▲ Buy"}
        </button>

        <button
          onClick={() => handleTrade("sell")}
          disabled={!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null}
          style={{
            height: "42px", padding: "0 28px", borderRadius: "8px",
            border: "1px solid rgba(239,68,68,0.4)",
            background: "linear-gradient(135deg, rgba(127,29,29,0.8), rgba(239,68,68,0.25))",
            color: "#fca5a5", fontFamily: "'DM Mono', monospace", fontWeight: 600,
            fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase",
            cursor: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? "not-allowed" : "pointer",
            opacity: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? 0.45 : 1,
            transition: "all 0.2s",
          }}
        >
          {tradeLoading === "sell" ? "Submitting…" : "▼ Sell"}
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div style={{
          marginTop: "14px", padding: "11px 16px", borderRadius: "8px",
          background: message.type === "success" ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
          border: `1px solid ${message.type === "success" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
          color: message.type === "success" ? "#34d399" : "#f87171",
          fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        }}>
          {message.type === "success" ? "✓ " : "⚠ "}{message.text}
        </div>
      )}

    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
function AStockDashBoardPage() {
  const { symbol } = useParams();
  const selectedStock = symbol?.toUpperCase();
  const { marketStatus, stocks, candles, candleRanges, requestRangeData, lastUpdated } = useLiveStocks();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isPremium = currentUser?.subscription_status?.toLowerCase() === "premium";
  const role = String(currentUser?.role || "").toLowerCase();
  const isExpert = role === "expert";

  // Pool membership is dynamic: any symbol present in the live snapshot
  // (all 503 S&P 500 stocks) uses websocket data; anything else falls back
  // to a one-off REST fetch.
  const isPoolStock = Boolean(stocks?.[selectedStock]);

  // For non-pool stocks, fetch snapshot + candles via REST
  const [externalStock, setExternalStock] = useState(null);
  const [externalCandles, setExternalCandles] = useState([]);

  useEffect(() => {
    if (isPoolStock) return;
    setExternalStock(null);
    setExternalCandles([]);
    Promise.all([
      fetchStockSnapshot(selectedStock),
      fetchStockCandles(selectedStock, "1D"),
    ]).then(([snapRes, candlesRes]) => {
      if (snapRes.success) {
        const d = snapRes.data;
        setExternalStock({
          symbol: d.s, price: d.p, open: d.open, high: d.high,
          low: d.low, close: d.close, previousClose: d.previousClose,
          volume: d.volume, avgVolume: d.avgVolume,
        });
      }
      if (candlesRes.success) setExternalCandles(candlesRes.candles);
    });
  }, [selectedStock, isPoolStock]);

  // Use pool data or external REST data
  const stock = isPoolStock ? stocks[selectedStock] : externalStock;
  const stockCandles = isPoolStock ? (candles?.[selectedStock] ?? []) : externalCandles;
  const stockList = useMemo(() => Object.values(stocks ?? {}), [stocks]);

  // TradingView-style tab bar: everything for this stock lives on one page.
  const [tab, setTab] = useState("overview");
  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "trading", label: "Trading" },
    { key: "prediction", label: "Prediction" },
    { key: "comments", label: "Comments" },
    { key: "alerts", label: "Alerts" },
  ];


  return (
    <>
      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>


        {isExpert ? <ConsultantHeader /> : <GeneralHeader />}

        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px", position: "relative", zIndex: 1 }}>

          <FirstLevel
            symbol={symbol}
            selectedStock={selectedStock}
            stock={stock}
            marketStatus={marketStatus}
            lastUpdated={lastUpdated}
            currentUser={currentUser}
          />
          {/* Persistent price chart — stays fixed above the tabs on every view */}
          {stock && (
            <div style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
              border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
              padding: "20px", marginTop: "16px",
            }}>
              <p style={{
                fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#3b82f6",
                letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 16px"
              }}>
                Price Chart
              </p>
              <InteractiveChart
                data={stockCandles}
                symbol={symbol}
                requestRangeData={requestRangeData}
                stockList={stockList}
                compareDataBySymbol={candles}
                candleRanges={candleRanges}
              />
            </div>
          )}

          {/* Tab bar — chart above stays put; only the panel below switches */}
          <div style={{
            display: "flex", gap: "4px", marginTop: "20px", marginBottom: "20px",
            borderBottom: "1px solid rgba(99,179,237,0.15)"
          }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  padding: "10px 18px", fontSize: "14px", fontWeight: 600, background: "transparent",
                  cursor: "pointer", color: tab === t.key ? "#fff" : "#94a3b8",
                  borderBottom: tab === t.key ? "2px solid #3b82f6" : "2px solid transparent",
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <StockOverview symbol={selectedStock || symbol} live={stock} />
            </div>
          )}

          {tab === "trading" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <PaperExchangePanel symbol={selectedStock} livePrice={stock?.price ?? null} marketStatus={marketStatus} />
            </div>
          )}

          {tab === "prediction" && (
            <div className="max-w mx-auto flex flex-col gap-6">
              <StockPrediction symbol={selectedStock || symbol} livePrice={stock?.price ?? null} />
              <StockQuantRating symbol={selectedStock || symbol} />
            </div>
          )}

          {tab === "comments" && (
            <div className="max-w mx-auto">
              <StockComments symbol={selectedStock || symbol} />
            </div>
          )}

          {tab === "alerts" && (
            <div className="max-w mx-auto">
              {isPremium ? <AlertBoard symbol={selectedStock || symbol} /> : <PremiumLockCard />}
            </div>
          )}

        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default AStockDashBoardPage;
