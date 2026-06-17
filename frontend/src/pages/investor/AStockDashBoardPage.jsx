import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createAlert } from "../../api/alertApi.js";
import { addStockToWatchlist } from "../../api/userApi.js";

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
    if (!isOpen) { alert("Market is closed. Cannot make any transactions."); return; }
    navigate(`/${type}/${symbol}`);
  };
  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
      <button
        onClick={() => handleTrade("buy")}
        style={{
          padding: "10px 32px", borderRadius: "8px",
          border: "1px solid rgba(52,211,153,0.4)",
          background: "linear-gradient(135deg, rgba(6,78,59,0.8), rgba(16,185,129,0.25))",
          color: "#6ee7b7", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer",
          backdropFilter: "blur(8px)", transition: "all 0.2s ease", textTransform: "uppercase",
        }}
        onMouseEnter={e => {
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
        style={{
          padding: "10px 32px", borderRadius: "8px",
          border: "1px solid rgba(239,68,68,0.4)",
          background: "linear-gradient(135deg, rgba(127,29,29,0.8), rgba(239,68,68,0.25))",
          color: "#fca5a5", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer",
          backdropFilter: "blur(8px)", transition: "all 0.2s ease", textTransform: "uppercase",
        }}
        onMouseEnter={e => {
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
  const user_id = currentUser?.user_id
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await addStockToWatchlist(user_id, stock_symbol);
      if (result.success) {
        alert("Stock is updated to watchlist");
      } else {
        alert("Stock is already in the watchlist");
      }
    } catch (error) {
      console.error(error);
      alert("Fail to add to watchlist")
    }
  }
  return (
    <button onClick={handleSubmit}
      style={{
        width: "200px", marginTop: "16px", padding: "11px", borderRadius: "8px",
        background: "linear-gradient(90deg, #0284c7, #2563eb)", color: "#fff",
        fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", border: "none",
        cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", transition: "all 0.2s",
      }}>
      + Add to Watchlist
    </button>
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
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
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
            {companyName(selectedStock)}
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
      <Button marketStatus={marketStatus} symbol={selectedStock} />

    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        width: "300px", flexShrink: 0,
        background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
        border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
        padding: "20px", backdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{ fontSize: "16px" }}>🔔</span>
        <h2 style={{
          fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#e2e8f0",
          fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
        }}>
          Stock Alerts
        </h2>
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#475569", margin: "0 0 4px", lineHeight: 1.5 }}>
        Get notified when <span style={{ color: "#60a5fa" }}>{symbol}</span> hits your target.
      </p>

      {submitted ? (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
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
          <p style={{ color: "#475569", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", marginTop: "4px" }}>
            Email will be sent to {formData.notification_email}
          </p>
          <button
            onClick={() => { setSubmitted(false); setFormData(p => ({ ...p, price_above: "", price_below: "", pct_increase: "", pct_decrease: "" })); }}
            style={{
              marginTop: "12px", padding: "8px 20px", borderRadius: "7px",
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
          <div>
            <p style={labelStyle}>Send email to</p>
            <input style={inputStyle} type="email" required value={formData.notification_email} placeholder="your@email.com"
              onChange={(e) => handleChange("notification_email", e.target.value)}
              onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
              onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
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
            width: "100%", marginTop: "16px", padding: "11px", borderRadius: "8px",
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
    </motion.div>
  );
}

/* ─── Premium Lock Card ────────────────────────────────────── */
function PremiumLockCard() {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        width: "300px", flexShrink: 0,
        background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
        border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px",
        padding: "20px", backdropFilter: "blur(12px)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: "12px", textAlign: "center",
      }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "50%",
        background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px",
      }}>
        🔒
      </div>
      <h2 style={{
        fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#FFD700",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
      }}>
        Premium Feature
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "12px",
        color: "#64748b", lineHeight: 1.6, margin: 0,
      }}>
        Custom stock alerts are available for <span style={{ color: "#FFD700" }}>Premium</span> members only.
        Upgrade to get notified when prices hit your targets.
      </p>
      <button
        onClick={() => navigate("/investor/subscription")}
        style={{
          marginTop: "4px", padding: "10px 24px", borderRadius: "8px",
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
    </motion.div>
  );
}

/* ─── Second + Third Level (two-column layout) ─────────────── */
function SecondAndThirdLevel({ symbol, stock, stockCandles, requestRangeData, stockList, candles, candleRanges, isPremium }) {
  if (!stock) return null;
  const { open, high, low, volume, avgVolume } = stock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ display: "flex", gap: "16px", alignItems: "flex-start", flexShrink: 0 }}
    >
      {/* LEFT COLUMN: stats strip + chart stacked */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
        {/* Stats strip */}
        <div style={{
          display: "flex",
          background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
          border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
          backdropFilter: "blur(12px)", overflow: "hidden",
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
            border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px",
            padding: "20px", backdropFilter: "blur(12px)",
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
        </motion.div>
      </div>

      {/* RIGHT COLUMN: alerts board (premium only) */}
      {isPremium ? <AlertBoard symbol={symbol} /> : <PremiumLockCard />}
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
function AStockDashBoardPage() {
  const { symbol } = useParams();
  const selectedStock = symbol?.toUpperCase();     // string, e.g. "NVDA"
  const { marketStatus, stocks, candles, candleRanges, requestRangeData, lastUpdated } = useLiveStocks();
  const stock = stocks[selectedStock];             // the live data object for this symbol
  const stockCandles = candles?.[selectedStock] ?? [];
  const stockList = Object.values(stocks ?? {});
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const isPremium = currentUser?.subscription_status?.toLowerCase() === "premium";


  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>

      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>


        <GeneralHeader />

        <main style={{ flex: 1, padding: "28px 32px", position: "relative", zIndex: 1 }}>

          <FirstLevel
            symbol={symbol}
            selectedStock={selectedStock}
            stock={stock}
            marketStatus={marketStatus}
            lastUpdated={lastUpdated}
            currentUser={currentUser}
          />
          <SecondAndThirdLevel
            symbol={symbol}
            stock={stock}
            stockCandles={stockCandles}
            requestRangeData={requestRangeData}
            stockList={stockList}
            candles={candles}
            candleRanges={candleRanges}
            isPremium={isPremium}
          />

        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default AStockDashBoardPage;
