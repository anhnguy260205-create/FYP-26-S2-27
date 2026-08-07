import RoleHeader from "../../layout/RoleHeader.jsx";
import { getPageBackground } from "../../utils/userRole.js";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useLiveStocks from "../../api/useLiveStocks.js";
import InteractiveChart from "../../components/InteractiveChart.jsx";
import StockComments from "../../components/StockComments.jsx";
import StockOverview from "../../components/StockOverview.jsx";
import StockQuantRating from "../../components/StockQuantRating.jsx";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { createAlert, getAlerts, deleteAlert } from "../../api/alertApi.js";
import { conditionLabel } from "../../utils/alertFormat.js";
import { addStockToWatchlist } from "../../api/userApi.js";
import { fetchStockSnapshot, fetchStockCandles, checkDashboardAccess } from "../../api/stockApi.js";
import { getPortfolio, submitOrder, getOrders, cancelOrder } from "../../api/tradingApi.js";
import PinModal from "../../components/PinModal.jsx";

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

/*  Trade Buttons */
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
          background: "rgba(15,157,88,0.1)",
          color: "#0F9D58", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em",
          cursor: isOpen ? "pointer" : "not-allowed",
          transition: "all 0.2s ease", textTransform: "uppercase",
          opacity: isOpen ? 1 : 0.4,
        }}
        onMouseEnter={e => {
          if (!isOpen) return;
          e.currentTarget.style.background = "rgba(15,157,88,0.18)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(15,157,88,0.2)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(15,157,88,0.1)";
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
          border: "1px solid rgba(220,38,38,0.4)",
          background: "rgba(220,38,38,0.1)",
          color: "#DC2626", fontFamily: "'DM Mono', monospace", fontWeight: 600,
          fontSize: "13px", letterSpacing: "0.08em",
          cursor: isOpen ? "pointer" : "not-allowed",
          transition: "all 0.2s ease", textTransform: "uppercase",
          opacity: isOpen ? 1 : 0.4,
        }}
        onMouseEnter={e => {
          if (!isOpen) return;
          e.currentTarget.style.background = "rgba(220,38,38,0.18)";
          e.currentTarget.style.boxShadow = "0 4px 14px rgba(220,38,38,0.2)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "rgba(220,38,38,0.1)";
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
  const [submitting, setSubmitting] = useState(false);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
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
    } finally {
      setSubmitting(false);
    }
  };

  const feedbackColors = {
    success: { bg: "rgba(15,157,88,0.1)", border: "rgba(15,157,88,0.3)", text: "#0F9D58" },
    error: { bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.3)", text: "#DC2626" },
    limit: { bg: "rgba(255,215,0,0.1)", border: "rgba(255,215,0,0.4)", text: "#92700C" },
  };

  return (
    <div style={{ position: "relative", marginTop: "16px" }}>
      <button onClick={handleSubmit} disabled={submitting}
        style={{
          width: "200px", padding: "11px", borderRadius: "8px",
          background: submitting ? "#94a3b8" : "linear-gradient(90deg, #0F9D58, #16a34a)", color: "#fff",
          fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", border: "none",
          cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 4px 16px rgba(15,157,88,0.3)", transition: "all 0.2s",
        }}>
        {submitting ? "Adding..." : "+ Add to Watchlist"}
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
                color: "#92700C", background: "none", border: "none",
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
/*  First Level  */
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
  const changeColor = isUp ? "#0F9D58" : "#DC2626";
  const isMarketOpen = marketStatus === "OPEN";


  return (
    <div

      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: "20px", borderBottom: "1px solid rgba(11,29,79,0.25)", marginBottom: "24px",
      }}
    >
      {/* Left: symbol + company name + market status */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
          <h1 style={{
            fontFamily: "'DM Mono', monospace", fontSize: "36px", fontWeight: 700,
            letterSpacing: "0.04em", color: "#0B1D4F", margin: 0, lineHeight: 1,
          }}>
            {symbol}
          </h1>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: "15px",
            color: "#5B6C88", fontWeight: 400, letterSpacing: "0.02em",
          }}>
            {stock?.name ?? companyName(selectedStock)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: isMarketOpen ? "#0F9D58" : "#DC2626",
            boxShadow: isMarketOpen ? "0 0 8px rgba(15,157,88,0.5)" : "0 0 8px rgba(220,38,38,0.5)",
            display: "inline-block",
          }} />
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px",
            color: isMarketOpen ? "#0F9D58" : "#DC2626",
            letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            Market {marketStatus || "Loading"}
          </span>
          <p className="text-slate-400">|</p>
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#5B6C88",
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

/*  Stat Pill  */
function StatPill({ label, value }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", padding: "12px 20px", flex: 1 }}>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: "10px",
        color: "#5B6C88", letterSpacing: "0.12em", textTransform: "uppercase",
      }}>
        {label}
      </span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: "17px",
        color: "#0F172A", fontWeight: 600, letterSpacing: "0.03em",
      }}>
        {value}
      </span>
    </div>
  );
}

/*  Alert Board  */
function AlertBoard({ symbol }) {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const userEmail = currentUser?.email || "";

  const { stocks } = useLiveStocks();
  const currentPrice = stocks[symbol]?.price ?? null;

  const [formData, setFormData] = useState({
    price_above: "", price_below: "", pct_increase: "", pct_decrease: "",
    notification_email: userEmail,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [existingAlerts, setExistingAlerts] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(true);

  const fetchExisting = useCallback(() => {
    if (!userId) { setLoadingExisting(false); return; }
    setLoadingExisting(true);
    getAlerts(userId).then(res => {
      if (res.success) {
        setExistingAlerts(res.alerts.filter(a => a.stock_symbol === symbol));
      }
    }).finally(() => setLoadingExisting(false));
  }, [userId, symbol]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  const handleDeleteExisting = useCallback(async (alertId) => {
    try {
      const res = await deleteAlert(alertId);
      if (res.success) {
        setExistingAlerts(prev => prev.filter(a => a.alert_id !== alertId));
      } else {
        window.alert(res.detail || res.message || "Failed to delete alert.");
      }
    } catch {
      window.alert("Failed to delete alert. Check your connection and try again.");
    }
  }, []);

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
    if (price_above && currentPrice != null && parseFloat(price_above) <= currentPrice) {
      setError(`Price above must be higher than the current price ($${currentPrice.toFixed(2)}).`);
      return;
    }
    if (price_below && currentPrice != null && parseFloat(price_below) >= currentPrice) {
      setError(`Price below must be lower than the current price ($${currentPrice.toFixed(2)}).`);
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
        fetchExisting();
      } else {
        setError(result.detail || "Failed to create alert. Try again.");
      }
    } catch {
      setError("Could not reach server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: "7px",
    border: "1px solid rgba(11,29,79,0.25)", background: "#F1F5F9",
    color: "#0F172A", fontFamily: "'DM Mono', monospace", fontSize: "13px",
    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
  };
  const labelStyle = {
    fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#5B6C88",
    letterSpacing: "0.05em", marginBottom: "4px", textTransform: "uppercase",
  };
  const sectionHeadStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0092b8",
    letterSpacing: "0.12em", textTransform: "uppercase",
    margin: "16px 0 10px", borderBottom: "1px solid rgba(0,146,184,0.25)", paddingBottom: "6px",
  };

  return (
    <div
      style={{
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px",
        padding: "24px",
      }}
    >
      <p style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0092b8",
        letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 10px",
      }}>
        🔔 Stock Alerts
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#5B6C88", margin: "0 0 4px", lineHeight: 1.5 }}>
        Get notified when <span style={{ color: "#0092b8", fontWeight: 600 }}>{symbol}</span> hits your target.
      </p>

      {loadingExisting ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#5B6C88", padding: "24px 0", textAlign: "center" }}>
          Checking existing alerts...
        </p>
      ) : existingAlerts.length > 0 ? (
        <div>
          <p style={sectionHeadStyle}>Active Alert</p>
          {existingAlerts.map(alert => (
            <div key={alert.alert_id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "12px", padding: "14px 16px", borderRadius: "8px",
              background: "#F1F5F9", border: "1px solid rgba(11,29,79,0.15)", marginBottom: "10px",
            }}>
              <div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#0F172A", margin: 0 }}>
                  {conditionLabel(alert)}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#5B6C88", margin: "4px 0 0" }}>
                  {alert.is_triggered ? "Already triggered" : `Emails ${alert.notification_email}`}
                </p>
              </div>
              <button
                onClick={() => handleDeleteExisting(alert.alert_id)}
                style={{
                  padding: "7px 14px", borderRadius: "7px", whiteSpace: "nowrap",
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#DC2626", fontFamily: "'DM Mono', monospace", fontSize: "11px",
                  letterSpacing: "0.04em", cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          ))}
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#5B6C88", margin: "4px 0 0" }}>
            Delete the alert above to set a new one for {symbol}.
          </p>
        </div>
      ) : (
        <form id="alert-form" onSubmit={handleSubmit}>
          <p style={sectionHeadStyle}>
            Price Alerts
            {currentPrice != null && (
              <span style={{ color: "#5B6C88", textTransform: "none", letterSpacing: "normal", marginLeft: "8px" }}>
                — current price ${currentPrice.toFixed(2)}
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Price above ($)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.price_above}
                placeholder={currentPrice != null ? currentPrice.toFixed(2) : "e.g. 200.00"}
                onChange={(e) => handleChange("price_above", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(0,146,184,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(11,29,79,0.25)"} />
            </div>
            <div>
              <p style={labelStyle}>Price below ($)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.price_below}
                placeholder={currentPrice != null ? currentPrice.toFixed(2) : "e.g. 150.00"}
                onChange={(e) => handleChange("price_below", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(0,146,184,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(11,29,79,0.25)"} />
            </div>
          </div>
          <p style={sectionHeadStyle}>% Change Alerts</p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Increase by (%)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.pct_increase} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_increase", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(0,146,184,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(11,29,79,0.25)"} />
            </div>
            <div>
              <p style={labelStyle}>Decrease by (%)</p>
              <input style={inputStyle} type="number" step="0.01" min="0" value={formData.pct_decrease} placeholder="e.g. 5"
                onChange={(e) => handleChange("pct_decrease", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(0,146,184,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(11,29,79,0.25)"} />
            </div>
          </div>
          <p style={sectionHeadStyle}>Notification</p>
          <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: "12px" }}>
            <div>
              <p style={labelStyle}>Send email to</p>
              <input style={inputStyle} type="email" required value={formData.notification_email} placeholder="your@email.com"
                onChange={(e) => handleChange("notification_email", e.target.value)}
                onFocus={e => e.target.style.borderColor = "rgba(0,146,184,0.6)"}
                onBlur={e => e.target.style.borderColor = "rgba(11,29,79,0.25)"} />
            </div>
          </div>
          {error && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#f87171", marginTop: "8px" }}>
              {error}
            </p>
          )}
        </form>
      )}

      {!loadingExisting && existingAlerts.length === 0 && (
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

/*  Premium Lock Card  */
function PremiumLockCard() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        width: "100%",
        background: "#FFFFFF",
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
        fontFamily: "'DM Mono', monospace", fontSize: "14px", color: "#92700C",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
      }}>
        Premium Feature
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        color: "#5B6C88", lineHeight: 1.6, margin: 0, maxWidth: "360px",
      }}>
        Custom stock alerts are available for <span style={{ color: "#92700C" }}>Premium</span> members only.
        Upgrade to get notified when prices hit your targets.
      </p>
      <button
        onClick={() => navigate("/investor/subscription")}
        style={{
          marginTop: "6px", padding: "11px 28px", borderRadius: "8px",
          background: "linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))",
          border: "1px solid rgba(255,215,0,0.4)", color: "#92700C",
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

/*  Dashboard Lock Card (basic plan: 3-stock lifetime limit)  */
function DashboardLockCard({ symbol, viewsUsed, viewsLimit }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        width: "100%", maxWidth: 480, margin: "48px auto",
        background: "#FFFFFF",
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
        fontFamily: "'DM Mono', monospace", fontSize: "14px", color: "#92700C",
        fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0,
      }}>
        Free Limit Reached
      </h2>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        color: "#5B6C88", lineHeight: 1.6, margin: 0, maxWidth: "360px",
      }}>
        Basic plan includes real-time dashboards for {viewsLimit ?? 3} stocks. You've already unlocked{" "}
        {viewsUsed ?? viewsLimit ?? 3} of {viewsLimit ?? 3}, and <span style={{ color: "#92700C" }}>{symbol}</span> isn't one of them.
        Upgrade to Premium for unlimited real-time dashboards on every stock.
      </p>
      <button
        onClick={() => navigate("/investor/subscription")}
        style={{
          marginTop: "6px", padding: "11px 28px", borderRadius: "8px",
          background: "linear-gradient(90deg, rgba(255,215,0,0.2), rgba(255,165,0,0.2))",
          border: "1px solid rgba(255,215,0,0.4)", color: "#92700C",
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

/*  Second + Third Level (two-column layout)  */
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
          background: "#FFFFFF",
          border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px",
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
            background: "#FFFFFF",
            border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px",
            padding: "20px",
          }}
        >
          <p style={{
            fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#0092b8",
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

/*  Paper Exchange Panel  */
function PaperExchangePanel({ symbol, livePrice, marketStatus }) {
  const isMarketOpen = marketStatus === "OPEN";
  const userId = JSON.parse(sessionStorage.getItem("currentUser") || "{}").user_id;

  const [side, setSide] = useState("buy"); // "buy" | "sell"
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [orders, setOrders] = useState([]);
  const [tradeLoading, setTradeLoading] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState("");

  const qty = parseInt(quantity, 10);
  const limitPriceNum = parseFloat(limitPrice);
  const effectivePrice = limitPriceNum > 0 ? limitPriceNum : livePrice;
  const estimatedTotal = effectivePrice && qty > 0 ? (effectivePrice * qty).toFixed(2) : null;
  const currentHolding = (portfolio?.holdings || []).find(h => h.symbol === symbol);
  const sharesOwned = currentHolding?.quantity || 0;
  const buyingPower = portfolio?.assets != null ? Number(portfolio.assets) : null;
  const isBuy = side === "buy";
  const accent = isBuy ? "#0F9D58" : "#DC2626";
  const accentSoft = isBuy ? "rgba(15,157,88,0.10)" : "rgba(220,38,38,0.10)";
  const accentBorder = isBuy ? "rgba(15,157,88,0.35)" : "rgba(220,38,38,0.35)";

  // Max quantity affordable / sellable, used by the quick-percentage chips.
  const maxQty = isBuy
    ? (buyingPower && effectivePrice ? Math.floor(buyingPower / effectivePrice) : 0)
    : sharesOwned;

  function setQtyPct(pct) {
    if (!maxQty) return;
    const n = pct >= 1 ? maxQty : Math.floor(maxQty * pct);
    setQuantity(String(Math.max(0, n)));
  }
  function bumpQty(delta) {
    setQuantity(prev => {
      const n = Math.max(0, (parseInt(prev, 10) || 0) + delta);
      return n ? String(n) : "";
    });
  }
  function bumpPrice(delta) {
    setLimitPrice(prev => {
      const base = parseFloat(prev) || livePrice || 0;
      return Math.max(0.01, base + delta).toFixed(2);
    });
  }

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

  function handleTrade() {
    if (!isMarketOpen) { setMessage({ type: "error", text: "Market is closed. Trading resumes Mon–Fri, 9:30am–4:00pm ET." }); return; }
    if (!userId || !qty || qty <= 0) return;
    const price = limitPriceNum > 0 ? limitPriceNum : livePrice;
    if (!price) { setMessage({ type: "error", text: "No price available. Enter a limit price." }); return; }
    if (!isBuy && qty > sharesOwned) { setMessage({ type: "error", text: `You only own ${sharesOwned} share(s).` }); return; }
    // Every buy and sell is confirmed with the 6-digit transaction PIN.
    setPinError("");
    setMessage(null);
    setPinOpen(true);
  }

  async function executeTrade(pin) {
    const price = limitPriceNum > 0 ? limitPriceNum : livePrice;
    setTradeLoading(side);
    setPinError("");
    try {
      const result = await submitOrder(userId, symbol, side, qty, price, pin);
      if (result.success) {
        setPinOpen(false);
        setMessage({ type: "success", text: result.message || `Order submitted.` });
        setQuantity("");
        await Promise.all([refreshPortfolio(), refreshOrders()]);
      } else {
        const msg = result.message || result.detail || "Order failed.";
        // A wrong / missing PIN comes back as a 403|428 with a PIN message —
        // keep the modal open so the user can retry.
        if (/pin/i.test(msg)) { setPinError(msg); return; }
        setPinOpen(false);
        setMessage({ type: "error", text: msg });
      }
    } catch {
      setPinOpen(false);
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
    fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#5B6C88",
    letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px",
  };
  const statusColor = { pending: "#B45309", partial: "#1D4ED8", filled: "#0F9D58", cancelled: "#5B6C88" };
  const openOrders = (orders || []).filter(o => o.status === "pending" || o.status === "partial");

  // A moomoo-style ±stepper: [ − ][ value ][ + ]
  const stepperWrap = {
    display: "flex", alignItems: "stretch", height: "46px",
    border: "1px solid rgba(11,29,79,0.18)", borderRadius: "10px",
    overflow: "hidden", background: "#F8FAFC",
    opacity: isMarketOpen ? 1 : 0.5,
  };
  const stepBtn = {
    width: "46px", border: "none", background: "#EEF2F7", color: "#0B1D4F",
    fontSize: "20px", fontWeight: 600, cursor: isMarketOpen ? "pointer" : "not-allowed",
    display: "flex", alignItems: "center", justifyContent: "center", userSelect: "none",
  };
  const stepInput = {
    flex: 1, minWidth: 0, textAlign: "center", border: "none", background: "transparent",
    fontFamily: "'DM Mono', monospace", fontSize: "17px", fontWeight: 700, color: "#0F172A", outline: "none",
  };
  const chipBtn = (active) => ({
    flex: 1, height: "32px", borderRadius: "8px", cursor: isMarketOpen ? "pointer" : "not-allowed",
    border: `1px solid ${active ? accentBorder : "rgba(11,29,79,0.15)"}`,
    background: active ? accentSoft : "#F8FAFC",
    color: active ? accent : "#5B6C88",
    fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 600,
  });

  return (
    <div
      style={{
        marginTop: "16px",
        background: "#FFFFFF",
        border: "1px solid rgba(11,29,79,0.25)", borderRadius: "14px", padding: "20px 22px",
        maxWidth: "460px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#0092b8", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
          Hybrid Trading Engine
        </p>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "12px", fontWeight: 700, color: "#0092b8" }}>
          {symbol} · {livePrice ? `$${livePrice.toFixed(2)}` : "—"}
        </span>
      </div>

      {!isMarketOpen && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.3)",
          borderRadius: "10px", padding: "12px 14px", marginBottom: "18px",
        }}>
          <span style={{ fontSize: "16px" }}>🔒</span>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: "#DC2626" }}>
              Market closed — trading unavailable
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#5B6C88", marginTop: "2px" }}>
              US markets are open Mon–Fri, 9:30am–4:00pm ET (about 9:30pm–4:00am Singapore time).
            </div>
          </div>
        </div>
      )}

      {/* Buy / Sell segmented toggle */}
      <div style={{ display: "flex", background: "#EEF2F7", borderRadius: "12px", padding: "4px", marginBottom: "18px" }}>
        {["buy", "sell"].map((s) => {
          const on = side === s;
          const c = s === "buy" ? "#0F9D58" : "#DC2626";
          return (
            <button
              key={s}
              onClick={() => { setSide(s); setMessage(null); }}
              style={{
                flex: 1, height: "40px", borderRadius: "9px", border: "none", cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 700,
                textTransform: "capitalize", transition: "all 0.15s",
                background: on ? c : "transparent",
                color: on ? "#fff" : "#5B6C88",
                boxShadow: on ? "0 2px 8px rgba(15,23,42,0.15)" : "none",
              }}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Buying power / position */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "18px" }}>
        <div style={{ flex: 1, background: "#F8FAFC", border: "1px solid rgba(11,29,79,0.12)", borderRadius: "10px", padding: "10px 12px" }}>
          <p style={lbl}>{isBuy ? "Available Assets" : "Cash Available"}</p>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "16px", fontWeight: 700, color: "#0F9D58" }}>
            {buyingPower != null ? `$${buyingPower.toFixed(2)}` : "—"}
          </span>
        </div>
        <div style={{ flex: 1, background: "#F8FAFC", border: "1px solid rgba(11,29,79,0.12)", borderRadius: "10px", padding: "10px 12px" }}>
          <p style={lbl}>Position</p>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "16px", fontWeight: 700, color: sharesOwned ? "#0B1D4F" : "#5B6C88" }}>
            {sharesOwned} shares
          </span>
        </div>
      </div>

      {/* Limit price stepper */}
      <p style={lbl}>Limit Price ($)</p>
      <div style={{ ...stepperWrap, marginBottom: "14px" }}>
        <button type="button" style={stepBtn} disabled={!isMarketOpen} onClick={() => bumpPrice(-0.01)}>−</button>
        <input
          type="number" min={0.01} step="0.01" value={limitPrice}
          onChange={e => setLimitPrice(e.target.value)}
          placeholder={livePrice ? livePrice.toFixed(2) : "0.00"}
          disabled={!isMarketOpen}
          style={stepInput}
        />
        <button type="button" style={stepBtn} disabled={!isMarketOpen} onClick={() => bumpPrice(0.01)}>+</button>
      </div>

      {/* Quantity stepper */}
      <p style={lbl}>Quantity (shares)</p>
      <div style={{ ...stepperWrap, marginBottom: "10px" }}>
        <button type="button" style={stepBtn} disabled={!isMarketOpen} onClick={() => bumpQty(-1)}>−</button>
        <input
          type="number" min={0} value={quantity}
          onChange={e => setQuantity(e.target.value.replace(/\D/g, ""))}
          placeholder="0"
          disabled={!isMarketOpen}
          style={stepInput}
        />
        <button type="button" style={stepBtn} disabled={!isMarketOpen} onClick={() => bumpQty(1)}>+</button>
      </div>

      {/* Quick percentage chips */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[["25%", 0.25], ["50%", 0.5], ["75%", 0.75], ["Max", 1]].map(([label, pct]) => (
          <button
            key={label} type="button" disabled={!isMarketOpen || !maxQty}
            onClick={() => setQtyPct(pct)}
            style={chipBtn(maxQty > 0 && qty === (pct >= 1 ? maxQty : Math.floor(maxQty * pct)))}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Order value */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 14px", borderRadius: "10px", background: accentSoft,
        border: `1px solid ${accentBorder}`, marginBottom: "16px",
      }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#5B6C88", fontWeight: 600 }}>
          Estimated {isBuy ? "Cost" : "Proceeds"}
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 700, color: estimatedTotal ? accent : "#5B6C88" }}>
          {estimatedTotal ? `$${estimatedTotal}` : "—"}
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={handleTrade}
        disabled={!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null}
        style={{
          width: "100%", height: "50px", borderRadius: "12px", border: "none",
          background: accent, color: "#fff",
          fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "16px",
          letterSpacing: "0.02em", transition: "all 0.15s",
          cursor: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? "not-allowed" : "pointer",
          opacity: (!isMarketOpen || !qty || qty <= 0 || tradeLoading !== null) ? 0.5 : 1,
          boxShadow: `0 6px 16px ${accentSoft}`,
        }}
      >
        {tradeLoading ? "Submitting…" : `${isBuy ? "Buy" : "Sell"} ${symbol}`}
      </button>

      {/* Feedback */}
      {message && (
        <div style={{
          marginTop: "14px", padding: "11px 16px", borderRadius: "10px",
          background: message.type === "success" ? "rgba(15,157,88,0.08)" : "rgba(220,38,38,0.08)",
          border: `1px solid ${message.type === "success" ? "rgba(15,157,88,0.3)" : "rgba(220,38,38,0.3)"}`,
          color: message.type === "success" ? "#0F9D58" : "#DC2626",
          fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
        }}>
          {message.type === "success" ? "✓ " : "⚠ "}{message.text}
        </div>
      )}

      {/* Open orders */}
      {openOrders.length > 0 && (
        <div style={{ marginTop: "18px", borderTop: "1px solid rgba(11,29,79,0.1)", paddingTop: "14px" }}>
          <p style={lbl}>Open Orders</p>
          {openOrders.map((o) => (
            <div key={o.order_id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "9px 0", borderBottom: "1px solid rgba(11,29,79,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: "11px", fontWeight: 700,
                  color: o.order_type === "buy" ? "#0F9D58" : "#DC2626",
                  textTransform: "uppercase",
                }}>{o.order_type}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: "#0F172A" }}>
                  {o.quantity} @ ${Number(o.limit_price).toFixed(2)}
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: statusColor[o.status] || "#5B6C88" }}>
                  {o.status}
                </span>
              </div>
              <button
                onClick={() => handleCancel(o.order_id)}
                disabled={cancellingId === o.order_id}
                style={{
                  border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)",
                  color: "#DC2626", borderRadius: "7px", padding: "4px 10px",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 600,
                  cursor: cancellingId === o.order_id ? "not-allowed" : "pointer",
                }}
              >
                {cancellingId === o.order_id ? "…" : "Cancel"}
              </button>
            </div>
          ))}
        </div>
      )}

      <PinModal
        open={pinOpen}
        title={isBuy ? "Confirm Purchase" : "Confirm Sale"}
        subtitle={
          qty > 0 && effectivePrice
            ? `${isBuy ? "Buy" : "Sell"} ${qty} ${symbol} · est. $${estimatedTotal}`
            : "Confirm this action with your 6-digit PIN."
        }
        confirmLabel={isBuy ? "Confirm Buy" : "Confirm Sell"}
        loading={tradeLoading !== null}
        error={pinError}
        onSubmit={executeTrade}
        onClose={() => { if (tradeLoading === null) { setPinOpen(false); setPinError(""); } }}
      />
    </div>
  );
}

/*  Page  */
function AStockDashBoardPage() {
  const { symbol } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedStock = symbol?.toUpperCase();
  const { marketStatus, stocks, candles, candleRanges, requestRangeData, lastUpdated } = useLiveStocks();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const isPremium = currentUser?.subscription_status?.toLowerCase() === "premium";

  const fromPath = location.state?.from || "/realtimedashboard";
  const fromLabel = location.state?.fromLabel || "Real-time Dashboard";


  const [dashboardAccess, setDashboardAccess] = useState(null);
  useEffect(() => {
    if (!selectedStock) return;
    let cancelled = false;
    setDashboardAccess(null);
    checkDashboardAccess(selectedStock)
      .then((res) => { if (!cancelled) setDashboardAccess(res); })
      .catch(() => { if (!cancelled) setDashboardAccess({ success: true, limit_reached: false }); });
    return () => { cancelled = true; };
  }, [selectedStock]);

  // Pool membership is dynamic: any symbol present in the live snapshot(all 503 S&P 500 stocks) uses websocket data; anything else falls back to a one-off REST fetch.
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
        className="min-h-screen flex flex-col"
        style={{ background: getPageBackground() }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>


        <RoleHeader />

        <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px", position: "relative", zIndex: 1 }}>

          <button
            onClick={() => navigate(fromPath)}
            style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 16,
              background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: 13, fontWeight: 600, color: "#5B6C88",
            }}
          >
            <ArrowLeft size={14} />
            {fromLabel}
            <span style={{ color: "#94A3B8", fontWeight: 400 }}>/</span>
            <span style={{ color: "#0B1D4F" }}>{selectedStock}</span>
          </button>

          {dashboardAccess?.limit_reached ? (
            <DashboardLockCard
              symbol={selectedStock}
              viewsUsed={dashboardAccess.views_used}
              viewsLimit={dashboardAccess.views_limit}
            />
          ) : (
            <>
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
                  background: "#FFFFFF",
                  border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px",
                  padding: "20px", marginTop: "16px",
                }}>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#0092b8",
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
                borderBottom: "1px solid rgba(11,29,79,0.25)"
              }}>
                {TABS.map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{
                      padding: "10px 18px", fontSize: "14px", fontWeight: 600, background: "transparent",
                      cursor: "pointer", color: tab === t.key ? "#0B1D4F" : "#5B6C88",
                      borderBottom: tab === t.key ? "2px solid #0092b8" : "2px solid transparent",
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
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                  <PaperExchangePanel symbol={selectedStock} livePrice={stock?.price ?? null} marketStatus={marketStatus} />
                </div>
              )}

              {tab === "prediction" && (
                <div className="flex flex-col gap-6">
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
            </>
          )}

        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default AStockDashBoardPage;
