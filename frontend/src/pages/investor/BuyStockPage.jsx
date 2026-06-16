import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useLiveStocks from "../../api/useLiveStocks.js";
import { buyStock } from "../../api/tradingApi.js";
import { getInvestorInformation } from "../../api/userApi.js";

/* ─── Helpers ─────────────────────────────────────────────── */
function companyName(symbol) {
  const names = {
    AAPL: "Apple", TSLA: "Tesla", NVDA: "NVIDIA",
    MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    META: "Meta", AMD: "AMD", NFLX: "Netflix", INTC: "Intel",
  };
  return names[symbol] ?? "";
}

function formatCurrency(num) {
  if (!Number.isFinite(Number(num))) return "$0.00";
  return `$${Number(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/* ─── Page ─────────────────────────────────────────────────── */
function BuyStockPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const selectedStock = symbol?.toUpperCase();

  const { marketStatus, stocks, lastUpdated } = useLiveStocks();
  const stock = stocks[selectedStock];

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [quantity, setQuantity] = useState(1);
  const [paperMoney, setPaperMoney] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const price = stock?.price ?? null;
  const previousClose = stock?.previousClose ?? null;
  const chg = price != null && previousClose != null ? price - previousClose : null;
  const pctChg = chg != null && previousClose ? (chg / previousClose) * 100 : null;
  const isUp = chg === null ? true : chg >= 0;
  const changeColor = isUp ? "#34d399" : "#f87171";
  const isMarketOpen = marketStatus === "OPEN";

  const estimatedTotal = price != null ? price * quantity : 0;
  const insufficientFunds = paperMoney != null && estimatedTotal > paperMoney;

  useEffect(() => {
    if (!currentUser?.user_id) return;
    getInvestorInformation(currentUser.user_id).then((res) => {
      if (res.success) {
        setPaperMoney(res.investor_information.paper_money);
      }
    });
  }, [currentUser?.user_id]);

  const handleQuantityChange = (val) => {
    const num = Math.max(1, Math.floor(Number(val) || 1));
    setQuantity(num);
  };

  const handleBuy = async () => {
    if (!currentUser?.user_id) {
      alert("Please log in to trade.");
      navigate("/login");
      return;
    }
    if (!isMarketOpen) {
      alert("Market is closed. Cannot make any transactions.");
      return;
    }
    if (price == null) {
      alert("Price unavailable. Please wait for live data.");
      return;
    }
    if (insufficientFunds) {
      alert("Insufficient paper funds for this order.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await buyStock(currentUser.user_id, selectedStock, quantity, price);
      if (!result.success) {
        alert(result.message || "Buy order failed");
        return;
      }
      setPaperMoney(result.paper_money);
      alert(`Bought ${quantity} share(s) of ${selectedStock} at ${formatCurrency(price)} each. Total: ${formatCurrency(result.total_amount)}`);
      navigate(`/investor/realtimedashboard/astockdashboard/${selectedStock}`);
    } catch (error) {
      console.error(error);
      alert("Failed to execute buy order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>

      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>

        <GeneralHeader />

        <main style={{ flex: 1, padding: "28px 32px", display: "flex", justifyContent: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              width: "100%", maxWidth: "560px",
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
              border: "1px solid rgba(99,179,237,0.15)", borderRadius: "16px",
              padding: "28px", backdropFilter: "blur(12px)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                  <h1 style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "30px", fontWeight: 700,
                    letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1,
                  }}>
                    {selectedStock}
                  </h1>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
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
                </div>
              </div>

              <span style={{
                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "11px",
                color: "#6ee7b7", letterSpacing: "0.12em", textTransform: "uppercase",
                border: "1px solid rgba(52,211,153,0.4)", borderRadius: "6px",
                padding: "4px 10px",
              }}>
                Buy Order
              </span>
            </div>

            {/* Price */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 0", borderTop: "1px solid rgba(99,179,237,0.1)",
              borderBottom: "1px solid rgba(99,179,237,0.1)", marginBottom: "20px",
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Current Price
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "24px", fontWeight: 700, color: changeColor }}>
                  {price != null ? formatCurrency(price) : "—"} USD
                </div>
                {chg !== null && pctChg !== null && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: changeColor }}>
                    {isUp ? "+" : ""}{chg.toFixed(3)} ({isUp ? "+" : ""}{pctChg.toFixed(3)}%)
                  </div>
                )}
              </div>
            </div>

            {/* Quantity input */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px",
                color: "#475569", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px",
              }}>
                Quantity (Shares)
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  style={{
                    width: "40px", height: "40px", borderRadius: "8px",
                    border: "1px solid rgba(99,179,237,0.2)", background: "rgba(30,41,59,0.6)",
                    color: "#e2e8f0", fontSize: "18px", cursor: "pointer",
                  }}
                >−</button>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  style={{
                    flex: 1, height: "44px", borderRadius: "8px", textAlign: "center",
                    border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.6)",
                    color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 600,
                  }}
                />
                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  style={{
                    width: "40px", height: "40px", borderRadius: "8px",
                    border: "1px solid rgba(99,179,237,0.2)", background: "rgba(30,41,59,0.6)",
                    color: "#e2e8f0", fontSize: "18px", cursor: "pointer",
                  }}
                >+</button>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              background: "rgba(15,23,42,0.5)", borderRadius: "10px", padding: "16px",
              display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                <span style={{ color: "#94a3b8" }}>Estimated Total</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#e2e8f0" }}>{formatCurrency(estimatedTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                <span style={{ color: "#94a3b8" }}>Available Paper Funds</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#e2e8f0" }}>
                  {paperMoney != null ? formatCurrency(paperMoney) : "—"}
                </span>
              </div>
              {insufficientFunds && (
                <div style={{ color: "#f87171", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                  Insufficient funds for this order.
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => navigate(`/investor/realtimedashboard/astockdashboard/${selectedStock}`)}
                style={{
                  flex: 1, padding: "14px", borderRadius: "8px",
                  border: "1px solid rgba(99,179,237,0.2)", background: "rgba(30,41,59,0.6)",
                  color: "#94a3b8", fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBuy}
                disabled={submitting || !isMarketOpen || price == null}
                style={{
                  flex: 2, padding: "14px", borderRadius: "8px",
                  border: "1px solid rgba(52,211,153,0.4)",
                  background: "linear-gradient(135deg, rgba(6,78,59,0.8), rgba(16,185,129,0.25))",
                  color: "#6ee7b7", fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                  opacity: (submitting || !isMarketOpen || price == null) ? 0.5 : 1,
                }}
              >
                {submitting ? "Processing..." : `Confirm Buy ${quantity} Share${quantity > 1 ? "s" : ""}`}
              </button>
            </div>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#475569", marginTop: "16px", textAlign: "center" }}>
              Last update: {lastUpdated || "Loading..."}
            </p>
          </motion.div>
        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default BuyStockPage;
