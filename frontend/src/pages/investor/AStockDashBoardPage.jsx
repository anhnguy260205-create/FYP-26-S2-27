import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

/* ─── Helpers ─────────────────────────────────────────────── */
function formatNumber(num) {
  if (!Number.isFinite(Number(num))) return "0";
  num = Number(num);
  const fmt = (v, s) => parseFloat(v.toFixed(1)) + s;
  if (num >= 1_000_000_000) return fmt(num / 1_000_000_000, "B");
  if (num >= 1_000_000)     return fmt(num / 1_000_000, "M");
  if (num >= 1_000)         return fmt(num / 1_000, "K");
  return num.toString();
}
function companyName(symbol) {
  const names = {
    AAPL: "Apple",     TSLA: "Tesla",     NVDA: "NVIDIA",
    MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    META: "Meta",      AMD: "AMD",        NFLX: "Netflix", INTC: "Intel",
  };
  return names[symbol] ?? "";
}

/* ─── Trade Buttons ────────────────────────────────────────── */
function Button({ marketStatus }) {
  const navigate = useNavigate();
  const isOpen = marketStatus === "open";
  const handleTrade = (type) => {
    if (!isOpen) { alert("Market is closed. Cannot make any transactions."); return; }
    navigate(`/${type}`);
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

/* ─── First Level ──────────────────────────────────────────── */
// selectedStock = symbol string ("NVDA"), stock = live data object from useLiveStocks
function FirstLevel({ symbol, selectedStock, stock, marketStatus }) {
  //            Price data lives in `stock` (passed from stocks[selectedStock] in the page).
  const chg = stock?.price != null && stock?.previousClose != null
    ? (stock.price - stock.previousClose).toFixed(3)
    : null;
  const pctChg = stock?.price != null && stock?.previousClose != null
    ? (((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(3)
    : null;
  const isUp = chg === null ? true : Number(chg) >= 0;
  const changeColor = isUp ? "#34d399" : "#f87171";

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
            background: marketStatus === "open" ? "#34d399" : "#ef4444",
            boxShadow: marketStatus === "open" ? "0 0 8px #34d399" : "0 0 8px #ef4444",
            display: "inline-block",
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px",
            color: marketStatus === "open" ? "#34d399" : "#ef4444",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Market {marketStatus}
          </span>
        </div>
      </div>

      {/* Centre: live price + change */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
        {/* BUG FIX 3: was toFix(3) — method is toFixed */}
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: "28px", fontWeight: 700,
          color: changeColor, letterSpacing: "0.02em",
        }}>
          {stock?.price != null ? `$${stock.price.toFixed(3)}` : "—"}
        </span>
        <span className="inline"style={{
          color: changeColor, letterSpacing: "0.04em",
        }}>
          {chg !== null ? `${isUp ? "+" : ""}${chg}` : "—"}

          {pctChg !== null ? `(${isUp ? "+" : ""}${pctChg}%)` : ""}
        </span>
      </div>

      <Button marketStatus={marketStatus} />
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
  const [formData, setFormData] = useState({
    price_above: "", price_below: "", pct_increase: "", pct_decrease: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleSubmit = async (e) => { e.preventDefault(); };

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
          <p style={{ color: "#34d399", fontFamily: "'DM Mono', monospace", fontSize: "13px" }}>Alert activated</p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              marginTop: "12px", padding: "8px 20px", borderRadius: "7px",
              background: "rgba(37,99,235,0.2)", border: "1px solid rgba(59,130,246,0.4)",
              color: "#60a5fa", fontFamily: "'DM Mono', monospace", fontSize: "12px", cursor: "pointer",
            }}
          >
            Edit Alerts
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={sectionHeadStyle}>Price Alerts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <p style={labelStyle}>Price above ($)</p>
              <input style={inputStyle} type="text" value={formData.price_above} placeholder="e.g. 200.00"
                onChange={(e) => handleChange("price_above", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
            <div>
              <p style={labelStyle}>Price below ($)</p>
              <input style={inputStyle} type="text" value={formData.price_below} placeholder="e.g. 150.00"
                onChange={(e) => handleChange("price_below", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
          </div>
          <p style={sectionHeadStyle}>% Change Alerts</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div>
              <p style={labelStyle}>Increase by (%)</p>
              <input style={inputStyle} type="text" value={formData.pct_increase} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_increase", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
            <div>
              <p style={labelStyle}>Decrease by (%)</p>
              <input style={inputStyle} type="text" value={formData.pct_decrease} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_decrease", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(59,130,246,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(99,179,237,0.2)"} />
            </div>
          </div>
        </form>
      )}

      <button
        style={{
          width: "100%", marginTop: "16px", padding: "11px", borderRadius: "8px",
          background: "linear-gradient(90deg, #0284c7, #2563eb)", color: "#fff",
          fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px",
          letterSpacing: "0.1em", textTransform: "uppercase", border: "none",
          cursor: "pointer", boxShadow: "0 4px 16px rgba(37,99,235,0.3)", transition: "all 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(37,99,235,0.5)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(37,99,235,0.3)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        Turn On Alerts
      </button>
    </motion.div>
  );
}

/* ─── Second + Third Level (two-column layout) ─────────────── */
function SecondAndThirdLevel({ symbol, stock, stockCandles }) {
  if (!stock) return null;
  const { open, high, low, volume, avgVolume } = stock;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}
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
            { label: "Open",       value: `$${open.toFixed(2)}` },
            { label: "High",       value: `$${high.toFixed(2)}` },
            { label: "Low",        value: `$${low.toFixed(2)}` },
            { label: "Volume",     value: formatNumber(volume) },
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
          <InteractiveChart data={stockCandles} />
        </motion.div>
      </div>

      {/* RIGHT COLUMN: alerts board (spans full height) */}
      <AlertBoard symbol={symbol} />
    </motion.div>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
function AStockDashBoardPage() {
  const { symbol } = useParams();
  const selectedStock = symbol?.toUpperCase();     // string, e.g. "NVDA"
  const { marketStatus, stocks, candles } = useLiveStocks();
  const stock = stocks[selectedStock];             // the live data object for this symbol
  const stockCandles = candles?.[selectedStock] ?? [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>

      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }}animate={{ opacity: 1, y:0 }} transition={{ duration: 0.6 }}>
    

        <GeneralHeader/>

        <main style={{ flex: 1, padding: "28px 32px", position: "relative", zIndex: 1 }}>

          <FirstLevel
            symbol={symbol}
            selectedStock={selectedStock}
            stock={stock}
            marketStatus={marketStatus}
          />
          <SecondAndThirdLevel
            symbol={symbol}
            stock={stock}
            stockCandles={stockCandles}
          />
        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default AStockDashBoardPage;
