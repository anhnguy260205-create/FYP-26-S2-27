import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPortalTransactions } from "../../api/tradingApi.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "AMD"];

const C = {
  card: "#161f38",
  border: "#232d4a",
  rowBorder: "#1e2740",
  accent: "#378ADD",
  accentText: "#6fb3f0",
  success: "#4dd68c",
  danger: "#ff6b6b",
  muted: "#8b92a8",
};

function fmt$(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSigned$(n) {
  const v = Number(n);
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

/* ─── Type badge ───────────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const buy = type === "buy";
  return (
    <span style={{
      fontFamily: mono, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase",
      padding: "3px 10px", borderRadius: 20,
      color: buy ? C.success : C.danger,
      background: buy ? "rgba(77,214,140,0.1)" : "rgba(255,107,107,0.1)",
      border: `1px solid ${buy ? "rgba(77,214,140,0.3)" : "rgba(255,107,107,0.3)"}`,
    }}>
      {buy ? "▲ BUY" : "▼ SELL"}
    </span>
  );
}

/* ─── Table row ────────────────────────────────────────────────────────── */
function TxRow({ tx, index }) {
  const buy = tx.transaction_type === "buy";
  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      style={{
        borderBottom: `1px solid ${C.rowBorder}`,
        background: index % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
      }}
    >
      <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 11, color: C.muted }}>{fmtDate(tx.transaction_date)}</td>
      <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "0.05em" }}>{tx.symbol}</td>
      <td style={{ padding: "12px 14px" }}><TypeBadge type={tx.transaction_type} /></td>
      <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 13, color: "#e2e8f0", textAlign: "right" }}>{tx.quantity}</td>
      <td style={{ padding: "12px 14px", fontFamily: mono, fontSize: 13, color: "#94a3b8", textAlign: "right" }}>{fmt$(tx.price)}</td>
      <td style={{
        padding: "12px 14px", fontFamily: mono, fontSize: 13, fontWeight: 700, textAlign: "right",
        color: buy ? C.danger : C.success
      }}>
        {buy ? "-" : "+"}{fmt$(tx.total_amount)}
      </td>
    </motion.tr>
  );
}

/* ─── Empty state ──────────────────────────────────────────────────────── */
function Empty({ navigate }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <svg width="44" height="44" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto 14px", opacity: 0.2 }}>
        <rect x="8" y="12" width="32" height="28" rx="3" stroke={C.accent} strokeWidth="1.5" />
        <path d="M16 20h16M16 27h10" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p style={{ fontFamily: mono, fontSize: 13, color: C.muted, margin: "0 0 4px" }}>No transactions yet</p>
      <p style={{ fontFamily: sans, fontSize: 12, color: "#64748b", margin: "0 0 20px" }}>Start trading to see your history here</p>
      <button onClick={() => navigate("/realtimedashboard")}
        style={{
          padding: "9px 22px", borderRadius: 8, cursor: "pointer",
          border: `1px solid rgba(55,138,221,0.4)`, background: "rgba(55,138,221,0.1)",
          color: C.accentText, fontFamily: mono, fontSize: 12, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
        Go to Markets
      </button>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
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
  const netPnL = totalSell - totalBuy;
  const hasFilter = filterSymbol !== "ALL" || filterType !== "ALL" || !!search;

  const inputStyle = {
    height: 36, padding: "0 12px", borderRadius: 8,
    border: `1px solid ${C.border}`, background: "rgba(22,31,56,0.8)",
    color: "#e2e8f0", fontFamily: mono, fontSize: 12, outline: "none",
  };

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px", letterSpacing: "0.03em" }}>
            Transaction History
          </h1>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>
            All executed buy &amp; sell orders
          </p>
          <hr style={{ marginTop: 16, border: "none", borderTop: "1px solid rgba(255,255,255,0.1)" }} />
        </div>


        {/* Quick stats */}
        {!loading && transactions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Showing", value: filtered.length, color: "#e2e8f0", suffix: " trades" },
              { label: "Buy volume", value: fmt$(totalBuy), color: C.danger },
              { label: "Sell volume", value: fmt$(totalSell), color: C.success },
              {
                label: hasFilter ? "Net P&L (filtered)" : "Net P&L",
                value: fmtSigned$(netPnL), color: netPnL >= 0 ? C.success : C.danger
              },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
                <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: "0 0 6px" }}>{s.label}</p>
                <p style={{ fontFamily: mono, fontSize: 18, fontWeight: 600, color: s.color, margin: 0 }}>
                  {s.value}{s.suffix ?? ""}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, padding: "12px 16px", marginBottom: 12,
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          <input placeholder="Search symbol…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
          <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)}
            style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="ALL">All Symbols</option>
            {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {["ALL", "buy", "sell"].map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{
              height: 36, padding: "0 14px", borderRadius: 8, cursor: "pointer",
              border: filterType === t ? `1px solid rgba(55,138,221,0.5)` : `1px solid ${C.border}`,
              background: filterType === t ? "rgba(55,138,221,0.14)" : "rgba(22,31,56,0.6)",
              color: filterType === t ? C.accentText : C.muted,
              fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
            }}>
              {t === "ALL" ? "All" : t === "buy" ? "▲ Buys" : "▼ Sells"}
            </button>
          ))}
          {hasFilter && (
            <button onClick={() => { setFilterSymbol("ALL"); setFilterType("ALL"); setSearch(""); }}
              style={{
                height: 36, padding: "0 12px", borderRadius: 8, cursor: "pointer",
                border: `1px solid rgba(255,107,107,0.25)`, background: "transparent",
                color: C.danger, fontFamily: mono, fontSize: 11,
              }}>
              Clear
            </button>
          )}
          <span style={{ fontFamily: mono, fontSize: 11, color: "#475569", marginLeft: "auto" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
              <div style={{ width: 36, height: 36, border: `3px solid rgba(55,138,221,0.2)`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <Empty navigate={navigate} />
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Date & Time", "Symbol", "Type", "Qty", "Price", "Total"].map((h, i) => (
                      <th key={h} style={{
                        padding: "11px 14px", fontFamily: sans, fontSize: 12, fontWeight: 400,
                        color: C.muted, textAlign: i >= 3 ? "right" : "left",
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
  );
}

export default TransactionHistoryPage;
