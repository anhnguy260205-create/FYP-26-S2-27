import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPortalTransactions } from "../../api/tradingApi.js";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

const SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","NVDA","META","TSLA","AVGO","ORCL","AMD"];

function fmt$(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

/* ─── Badge ────────────────────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const buy = type === "buy";
  return (
    <span style={{
      fontFamily: mono, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: 20,
      color: buy ? "#6ee7b7" : "#fca5a5",
      background: buy ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
      border: `1px solid ${buy ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"}`,
    }}>
      {buy ? "▲ BUY" : "▼ SELL"}
    </span>
  );
}

/* ─── Row ──────────────────────────────────────────────────────────────────── */
function TxRow({ tx, index }) {
  const buy = tx.transaction_type === "buy";
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.025 }}
      style={{
        borderBottom: "1px solid rgba(99,179,237,0.07)",
        background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)",
      }}
    >
      <td style={{ padding: "14px 16px", fontFamily: mono, fontSize: 11, color: "#64748b" }}>
        {fmtDate(tx.transaction_date)}
      </td>
      <td style={{ padding: "14px 16px" }}>
        <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.06em" }}>
          {tx.symbol}
        </span>
      </td>
      <td style={{ padding: "14px 16px" }}>
        <TypeBadge type={tx.transaction_type} />
      </td>
      <td style={{ padding: "14px 16px", fontFamily: mono, fontSize: 13, color: "#e2e8f0", textAlign: "right" }}>
        {tx.quantity}
      </td>
      <td style={{ padding: "14px 16px", fontFamily: mono, fontSize: 13, color: "#94a3b8", textAlign: "right" }}>
        {fmt$(tx.price)}
      </td>
      <td style={{ padding: "14px 16px", fontFamily: mono, fontSize: 13, fontWeight: 700, textAlign: "right",
        color: buy ? "#34d399" : "#f87171" }}>
        {buy ? "-" : "+"}{fmt$(tx.total_amount)}
      </td>
    </motion.tr>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────────────── */
function Empty() {
  const navigate = useNavigate();
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto 16px", opacity: 0.25 }}>
        <rect x="8" y="12" width="32" height="28" rx="3" stroke="#63b3ed" strokeWidth="1.5" />
        <path d="M16 20h16M16 27h10" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p style={{ fontFamily: mono, fontSize: 13, color: "#94a3b8", margin: "0 0 4px" }}>No transactions yet</p>
      <p style={{ fontFamily: sans, fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>
        Start trading to see your history here
      </p>
      <button onClick={() => navigate("/investor/realtimedashboard")}
        style={{
          padding: "10px 24px", borderRadius: 8,
          border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.1)",
          color: "#63b3ed", fontFamily: mono, fontSize: 12, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
        }}>
        Go to Markets
      </button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
function TransactionHistoryPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!currentUser?.user_id) { setLoading(false); return; }
    getPortalTransactions(currentUser.user_id, { limit: 200 })
      .then(res => { if (res.success) setTransactions(res.transactions); })
      .finally(() => setLoading(false));
  }, [currentUser?.user_id]);

  const filtered = transactions.filter(tx => {
    if (filterSymbol !== "ALL" && tx.symbol !== filterSymbol) return false;
    if (filterType !== "ALL" && tx.transaction_type !== filterType) return false;
    if (search && !tx.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalBuy = filtered.filter(t => t.transaction_type === "buy").reduce((s, t) => s + t.total_amount, 0);
  const totalSell = filtered.filter(t => t.transaction_type === "sell").reduce((s, t) => s + t.total_amount, 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        @media (max-width: 640px) {
          .tx-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tx-page-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
        }
      `}</style>
      <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <GeneralHeader />

        <main className="flex-1 p-4 md:p-7">

          {/* Page header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            className="tx-page-header"
            style={{ paddingBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "0.04em" }}>
                Transaction History
              </h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                All executed buy &amp; sell orders
              </p>
            </div>
            <button onClick={() => navigate("/investor/transaction-portal")}
              style={{
                padding: "10px 20px", borderRadius: 8,
                border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.1)",
                color: "#63b3ed", fontFamily: mono, fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
              }}>
              Open Portal →
            </button>
          </motion.div>

          {/* Quick stats */}
          {!loading && transactions.length > 0 && (
            <div className="tx-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Total Trades", value: filtered.length, color: "#e2e8f0" },
                { label: "Buy Volume", value: fmt$(totalBuy), color: "#34d399" },
                { label: "Sell Volume", value: fmt$(totalSell), color: "#f87171" },
                { label: "Net P&L", value: fmt$(totalSell - totalBuy), color: (totalSell - totalBuy) >= 0 ? "#34d399" : "#f87171" },
              ].map(s => (
                <div key={s.label} style={{
                  background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
                  border: "1px solid rgba(99,179,237,0.12)", borderRadius: 10,
                  padding: "14px 18px", backdropFilter: "blur(12px)",
                }}>
                  <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 6px" }}>{s.label}</p>
                  <p style={{ fontFamily: mono, fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div style={{
            background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
            border: "1px solid rgba(99,179,237,0.12)", borderRadius: 10,
            padding: "14px 18px", marginBottom: 16, backdropFilter: "blur(12px)",
            display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
          }}>
            {/* Search */}
            <input
              placeholder="Search symbol…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 160, height: 36, padding: "0 14px", borderRadius: 8,
                border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.6)",
                color: "#e2e8f0", fontFamily: mono, fontSize: 12,
              }}
            />
            {/* Symbol filter */}
            <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} style={{
              height: 36, padding: "0 12px", borderRadius: 8,
              border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.9)",
              color: "#e2e8f0", fontFamily: mono, fontSize: 12, cursor: "pointer",
            }}>
              <option value="ALL">All Symbols</option>
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Type filter */}
            {["ALL", "buy", "sell"].map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{
                height: 36, padding: "0 16px", borderRadius: 8, cursor: "pointer",
                border: filterType === t ? "1px solid rgba(99,179,237,0.5)" : "1px solid rgba(99,179,237,0.12)",
                background: filterType === t ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.5)",
                color: filterType === t ? "#63b3ed" : "#64748b",
                fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              }}>
                {t === "ALL" ? "All" : t === "buy" ? "▲ Buys" : "▼ Sells"}
              </button>
            ))}
            {(filterSymbol !== "ALL" || filterType !== "ALL" || search) && (
              <button onClick={() => { setFilterSymbol("ALL"); setFilterType("ALL"); setSearch(""); }}
                style={{
                  height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer",
                  border: "1px solid rgba(248,113,113,0.25)", background: "transparent",
                  color: "#f87171", fontFamily: mono, fontSize: 11,
                }}>
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{
            background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
            border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
            backdropFilter: "blur(12px)", overflow: "hidden",
          }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
                <div style={{ width: 36, height: 36, border: "3px solid rgba(99,179,237,0.2)", borderTopColor: "#63b3ed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : filtered.length === 0 ? (
              <Empty />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.15)" }}>
                      {["Date & Time", "Symbol", "Type", "Qty", "Price", "Total"].map((h, i) => (
                        <th key={h} style={{
                          padding: "12px 16px", fontFamily: mono, fontSize: 9, fontWeight: 600,
                          color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase",
                          textAlign: i >= 3 ? "right" : "left",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filtered.map((tx, i) => <TxRow key={tx.transaction_id} tx={tx} index={i} />)}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p style={{ fontFamily: mono, fontSize: 9, color: "#475569", textAlign: "center", marginTop: 16 }}>
            Showing {filtered.length} of {transactions.length} transactions · Paper trading only · Not financial advice
          </p>
        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default TransactionHistoryPage;
