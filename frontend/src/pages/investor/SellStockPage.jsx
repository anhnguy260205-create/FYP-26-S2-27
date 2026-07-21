import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import useLiveStocks from "../../api/useLiveStocks.js";
import { sellStock, getPortfolio } from "../../api/tradingApi.js";
import { calculatePlatformFee, PLATFORM_FEE_LABEL } from "../../utils/platformFee.js";

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
function SellStockPage() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const selectedStock = symbol?.toUpperCase();

  const { marketStatus, stocks, lastUpdated } = useLiveStocks();
  const stock = stocks[selectedStock];

  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");

  const [quantity, setQuantity] = useState(1);
  const [holding, setHolding] = useState(null);
  const [paperMoney, setPaperMoney] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const price = stock?.price ?? null;
  const previousClose = stock?.previousClose ?? null;
  const chg = price != null && previousClose != null ? price - previousClose : null;
  const pctChg = chg != null && previousClose ? (chg / previousClose) * 100 : null;
  const isUp = chg === null ? true : chg >= 0;
  const changeColor = isUp ? "#0F9D58" : "#DC2626";
  const isMarketOpen = marketStatus === "OPEN";

  const ownedShares = holding?.quantity ?? 0;
  const avgCost = holding?.average_cost ?? 0;
  const estimatedTotal = price != null ? price * quantity : 0;
  // Commission comes out of the proceeds on a sell, so it reduces both what
  // lands in the account and the realised gain.
  const platformFee = calculatePlatformFee(estimatedTotal);
  const netProceeds = estimatedTotal - platformFee;
  const estimatedGainLoss = price != null ? (price - avgCost) * quantity - platformFee : 0;
  const exceedsHoldings = quantity > ownedShares;

  const fetchPortfolio = () => {
    if (!currentUser?.user_id) return;
    getPortfolio(currentUser.user_id).then((res) => {
      if (res.success) {
        setPaperMoney(res.portfolio.paper_money);
        const found = res.portfolio.holdings.find((h) => h.symbol === selectedStock);
        setHolding(found || { quantity: 0, average_cost: 0 });
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, selectedStock]);

  const handleQuantityChange = (val) => {
    const num = Math.max(1, Math.floor(Number(val) || 1));
    setQuantity(num);
  };

  const handleSell = async () => {
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
    if (exceedsHoldings) {
      alert("You don't own enough shares for this order.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await sellStock(currentUser.user_id, selectedStock, quantity, price);
      if (!result.success) {
        alert(result.message || "Sell order failed");
        return;
      }
      setPaperMoney(result.paper_money);
      alert(
        `Sold ${quantity} share(s) of ${selectedStock} at ${formatCurrency(price)} each.\n` +
        `Gross proceeds: ${formatCurrency(result.total_amount)}\n` +
        `Platform fee: ${formatCurrency(result.platform_fee ?? 0)}\n` +
        `Net credited: ${formatCurrency(result.net_amount ?? result.total_amount)}`
      );
      navigate(`/realtimedashboard/astockdashboard/${selectedStock}`);
    } catch (error) {
      console.error(error);
      alert("Failed to execute sell order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>

      <motion.div
        className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

        <GeneralHeader />

        <main className="flex-1 p-4 md:p-7 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              width: "100%", maxWidth: "560px",
              background: "#FFFFFF",
              border: "1px solid rgba(11,29,79,0.25)", borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
              padding: "28px",            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
                  <h1 style={{
                    fontFamily: "'DM Mono', monospace", fontSize: "30px", fontWeight: 700,
                    letterSpacing: "0.04em", color: "#0B1D4F", margin: 0, lineHeight: 1,
                  }}>
                    {selectedStock}
                  </h1>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    color: "#5B6C88", fontWeight: 400, letterSpacing: "0.02em",
                  }}>
                    {companyName(selectedStock)}
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
                </div>
              </div>

              <span style={{
                fontFamily: "'DM Mono', monospace", fontWeight: 700, fontSize: "11px",
                color: "#DC2626", letterSpacing: "0.12em", textTransform: "uppercase",
                background: "rgba(220,38,38,0.08)",
                border: "1px solid rgba(220,38,38,0.35)", borderRadius: "6px",
                padding: "4px 10px",
              }}>
                Sell Order
              </span>
            </div>

            {!isMarketOpen && (
              <div style={{
                display: "flex", alignItems: "center", gap: "10px",
                background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
                borderRadius: "10px", padding: "12px 14px", marginBottom: "20px",
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

            {/* Price */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 0", borderTop: "1px solid rgba(15,23,42,0.1)",
              borderBottom: "1px solid rgba(15,23,42,0.1)", marginBottom: "20px",
            }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#5B6C88", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Current Price
              </span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "24px", fontWeight: 700, color: changeColor }}>
                  {price != null ? formatCurrency(price) : "—"} USD
                </div>
                {chg !== null && (
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "13px", color: changeColor }}>
                    {isUp ? "+" : ""}{chg.toFixed(3)} ({isUp ? "+" : ""}{pctChg.toFixed(3)}%)
                  </div>
                )}
              </div>
            </div>

            {/* Holdings info */}
            <div style={{
              background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.08)", borderRadius: "10px", padding: "16px",
              display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                <span style={{ color: "#5B6C88" }}>Shares Owned</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#0F172A" }}>
                  {loading ? "—" : ownedShares}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                <span style={{ color: "#5B6C88" }}>Average Cost</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#0F172A" }}>
                  {loading ? "—" : formatCurrency(avgCost)}
                </span>
              </div>
            </div>

            {!loading && ownedShares === 0 ? (
              <div style={{
                background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
                borderRadius: "10px", padding: "16px", marginBottom: "20px",
                fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#DC2626", textAlign: "center",
              }}>
                You don't own any shares of {selectedStock} to sell.
              </div>
            ) : (
              <>
                {/* Quantity input */}
                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block", fontFamily: "'DM Mono', monospace", fontSize: "10px",
                    color: "#5B6C88", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px",
                  }}>
                    Quantity (Shares) — Max {ownedShares}
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      style={{
                        width: "40px", height: "40px", borderRadius: "8px",
                        border: "1px solid rgba(15,23,42,0.15)", background: "#F1F5F9",
                        color: "#0B1D4F", fontSize: "18px", cursor: "pointer",
                      }}
                    >−</button>
                    <input
                      type="number"
                      min={1}
                      max={ownedShares}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(e.target.value)}
                      style={{
                        flex: 1, height: "44px", borderRadius: "8px", textAlign: "center",
                        border: exceedsHoldings ? "1px solid rgba(220,38,38,0.5)" : "1px solid rgba(15,23,42,0.15)",
                        background: "#FFFFFF",
                        color: "#0F172A", fontFamily: "'DM Mono', monospace", fontSize: "18px", fontWeight: 600,
                      }}
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      style={{
                        width: "40px", height: "40px", borderRadius: "8px",
                        border: "1px solid rgba(15,23,42,0.15)", background: "#F1F5F9",
                        color: "#0B1D4F", fontSize: "18px", cursor: "pointer",
                      }}
                    >+</button>
                    <button
                      onClick={() => handleQuantityChange(ownedShares)}
                      style={{
                        height: "40px", padding: "0 14px", borderRadius: "8px",
                        border: "1px solid rgba(15,23,42,0.15)", background: "#F1F5F9",
                        color: "#5B6C88", fontFamily: "'DM Mono', monospace", fontSize: "11px",
                        letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                      }}
                    >All</button>
                  </div>
                  {exceedsHoldings && (
                    <p style={{ color: "#DC2626", fontSize: "12px", marginTop: "6px", fontFamily: "'DM Sans', sans-serif" }}>
                      You only own {ownedShares} share(s).
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div style={{
                  background: "#F1F5F9", border: "1px solid rgba(15,23,42,0.08)", borderRadius: "10px", padding: "16px",
                  display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    <span style={{ color: "#5B6C88" }}>Gross Proceeds</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#0F172A" }}>{formatCurrency(estimatedTotal)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    <span style={{ color: "#5B6C88" }}>
                      Platform Fee
                      <span style={{ fontSize: "11px", color: "#94A3B8", marginLeft: "6px" }}>
                        ({PLATFORM_FEE_LABEL})
                      </span>
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#DC2626" }}>
                      −{formatCurrency(platformFee)}
                    </span>
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
                    paddingTop: "10px", borderTop: "1px solid rgba(15,23,42,0.10)",
                  }}>
                    <span style={{ color: "#0F172A", fontWeight: 600 }}>Net Proceeds</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 700, color: "#0F172A" }}>
                      {formatCurrency(netProceeds)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    <span style={{ color: "#5B6C88" }}>Estimated Gain/Loss</span>
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontWeight: 600,
                      color: estimatedGainLoss >= 0 ? "#0F9D58" : "#DC2626",
                    }}>
                      {estimatedGainLoss >= 0 ? "+" : ""}{formatCurrency(estimatedGainLoss)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Sans', sans-serif", fontSize: "14px" }}>
                    <span style={{ color: "#5B6C88" }}>Paper Funds After Sale</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, color: "#0F172A" }}>
                      {paperMoney != null ? formatCurrency(paperMoney + netProceeds) : "—"}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => navigate(`/realtimedashboard/astockdashboard/${selectedStock}`)}
                style={{
                  flex: 1, padding: "14px", borderRadius: "8px",
                  border: "1px solid rgba(15,23,42,0.15)", background: "#F1F5F9",
                  color: "#5B6C88", fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={submitting || !isMarketOpen || price == null || ownedShares === 0 || exceedsHoldings}
                style={{
                  flex: 2, padding: "14px", borderRadius: "8px",
                  border: "1px solid rgba(220,38,38,0.4)",
                  background: "linear-gradient(135deg, #DC2626, #E4453F)",
                  color: "#FFFFFF", fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  fontSize: "13px", letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                  opacity: (submitting || !isMarketOpen || price == null || ownedShares === 0 || exceedsHoldings) ? 0.5 : 1,
                }}
              >
                {submitting ? "Processing..." : `Confirm Sell ${quantity} Share${quantity > 1 ? "s" : ""}`}
              </button>
            </div>

            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#5B6C88", marginTop: "16px", textAlign: "center" }}>
              Last update: {lastUpdated || "Loading..."}
            </p>
          </motion.div>
        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default SellStockPage;
