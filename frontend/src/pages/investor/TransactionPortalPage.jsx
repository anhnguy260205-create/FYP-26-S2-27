import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPortalTransactions, getPortalSummary, getPortfolio } from "../../api/tradingApi.js";

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

function fmt$(n) {
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short" })
    + " " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

const COMPANY = {
  AAPL: "Apple", TSLA: "Tesla", NVDA: "NVIDIA", MSFT: "Microsoft",
  GOOGL: "Alphabet", AMZN: "Amazon", META: "Meta", AMD: "AMD",
  AVGO: "Broadcom", ORCL: "Oracle",
};
const SYMBOLS = Object.keys(COMPANY);

/* ─── Summary stat card ────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color = "#e2e8f0", icon }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
        padding: "18px 20px", backdropFilter: "blur(12px)",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>{label}</p>
        {icon && <span style={{ fontSize: 18, opacity: 0.4 }}>{icon}</span>}
      </div>
      <p style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontFamily: sans, fontSize: 11, color: "#94a3b8", margin: "4px 0 0" }}>{sub}</p>}
    </motion.div>
  );
}

/* ─── Mini bar chart for symbol breakdown ──────────────────────────────────── */
function SymbolBreakdownChart({ transactions }) {
  const counts = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      map[t.symbol] = (map[t.symbol] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [transactions]);

  const max = counts[0]?.[1] || 1;

  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
      padding: "18px 20px", backdropFilter: "blur(12px)",
    }}>
      <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>
        Trades by Symbol
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {counts.map(([sym, count]) => (
          <div key={sym} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#e2e8f0", minWidth: 44 }}>{sym}</span>
            <div style={{ flex: 1, height: 6, background: "rgba(99,179,237,0.1)", borderRadius: 3 }}>
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${(count / max) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
                style={{ height: "100%", background: "linear-gradient(90deg,#3b82f6,#63b3ed)", borderRadius: 3 }}
              />
            </div>
            <span style={{ fontFamily: mono, fontSize: 10, color: "#94a3b8", minWidth: 20, textAlign: "right" }}>{count}</span>
          </div>
        ))}
        {counts.length === 0 && (
          <p style={{ fontFamily: sans, fontSize: 12, color: "#64748b" }}>No trades yet</p>
        )}
      </div>
    </div>
  );
}

/* ─── P&L per symbol chart ─────────────────────────────────────────────────── */
function PnLBySymbolChart({ transactions }) {
  const pnl = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.symbol]) map[t.symbol] = { buy: 0, sell: 0 };
      if (t.transaction_type === "buy") map[t.symbol].buy += t.total_amount;
      else map[t.symbol].sell += t.total_amount;
    });
    return Object.entries(map)
      .map(([sym, v]) => ({ sym, pnl: v.sell - v.buy }))
      .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
      .slice(0, 8);
  }, [transactions]);

  const maxAbs = Math.max(...pnl.map(p => Math.abs(p.pnl)), 1);

  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
      padding: "18px 20px", backdropFilter: "blur(12px)",
    }}>
      <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>
        Realised P&amp;L by Symbol
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {pnl.map(({ sym, pnl: val }) => {
          const pos = val >= 0;
          const pct = (Math.abs(val) / maxAbs) * 100;
          return (
            <div key={sym} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, color: "#e2e8f0", minWidth: 44 }}>{sym}</span>
              <div style={{ flex: 1, height: 6, background: "rgba(99,179,237,0.1)", borderRadius: 3, position: "relative" }}>
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  style={{
                    height: "100%", borderRadius: 3,
                    background: pos ? "linear-gradient(90deg,rgba(52,211,153,0.6),#34d399)" : "linear-gradient(90deg,rgba(248,113,113,0.6),#f87171)",
                  }}
                />
              </div>
              <span style={{ fontFamily: mono, fontSize: 10, color: pos ? "#34d399" : "#f87171", minWidth: 72, textAlign: "right" }}>
                {pos ? "+" : ""}{fmt$(val)}
              </span>
            </div>
          );
        })}
        {pnl.length === 0 && (
          <p style={{ fontFamily: sans, fontSize: 12, color: "#64748b" }}>No completed round-trips yet</p>
        )}
      </div>
    </div>
  );
}

/* ─── Volume over time sparkline ───────────────────────────────────────────── */
function VolumeSparkline({ transactions }) {
  const days = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!t.transaction_date) return;
      const day = t.transaction_date.slice(0, 10);
      map[day] = (map[day] || 0) + t.total_amount;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
  }, [transactions]);

  if (days.length < 2) return null;

  const W = 820, H = 120, PAD = { top: 10, right: 16, bottom: 24, left: 60 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const maxV = Math.max(...days.map(d => d[1]));
  const toX = (i) => PAD.left + (i / (days.length - 1)) * cW;
  const toY = (v) => PAD.top + ((maxV - v) / (maxV || 1)) * cH;
  const pts = days.map(([, v], i) => ({ x: toX(i), y: toY(v) }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = path + ` L ${pts.at(-1).x.toFixed(1)},${H - PAD.bottom} L ${pts[0].x.toFixed(1)},${H - PAD.bottom} Z`;

  return (
    <div style={{
      background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
      padding: "18px 20px 10px", backdropFilter: "blur(12px)", overflow: "hidden",
    }}>
      <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px" }}>
        Daily Trade Volume (Last 30 days)
      </p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#vg)" />
        <path d={path} fill="none" stroke="#63b3ed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {[0, Math.floor(days.length / 2), days.length - 1].map(i => (
          <text key={i} x={toX(i)} y={H - PAD.bottom + 14} textAnchor="middle" fill="#475569" fontSize="9" fontFamily={mono}>
            {days[i][0].slice(5)}
          </text>
        ))}
        <text x={PAD.left - 8} y={PAD.top + 4} textAnchor="end" fill="#475569" fontSize="9" fontFamily={mono}>
          {fmt$(maxV)}
        </text>
      </svg>
    </div>
  );
}

/* ─── Transaction row ──────────────────────────────────────────────────────── */
function PortalRow({ tx, index }) {
  const buy = tx.transaction_type === "buy";
  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      style={{ borderBottom: "1px solid rgba(99,179,237,0.07)" }}>
      <td style={{ padding: "12px 16px", fontFamily: mono, fontSize: 10, color: "#64748b" }}>
        {fmtDate(tx.transaction_date)}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{tx.symbol}</span>
          <span style={{ fontFamily: sans, fontSize: 10, color: "#64748b" }}>{COMPANY[tx.symbol] ?? ""}</span>
        </div>
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{
          fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 20,
          color: buy ? "#6ee7b7" : "#fca5a5",
          background: buy ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
          border: `1px solid ${buy ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
        }}>
          {buy ? "▲ BUY" : "▼ SELL"}
        </span>
      </td>
      <td style={{ padding: "12px 16px", fontFamily: mono, fontSize: 13, color: "#e2e8f0", textAlign: "right" }}>{tx.quantity}</td>
      <td style={{ padding: "12px 16px", fontFamily: mono, fontSize: 12, color: "#94a3b8", textAlign: "right" }}>{fmt$(tx.price)}</td>
      <td style={{ padding: "12px 16px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: buy ? "#f87171" : "#34d399", textAlign: "right" }}>
        {buy ? "-" : "+"}{fmt$(tx.total_amount)}
      </td>
    </motion.tr>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
function TransactionPortalPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filterSymbol, setFilterSymbol] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "history"

  useEffect(() => {
    if (!currentUser?.user_id) { setLoading(false); return; }
    const uid = currentUser.user_id;
    Promise.all([
      getPortalTransactions(uid, { limit: 200 }),
      getPortalSummary(uid),
      getPortfolio(uid),
    ]).then(([txRes, sumRes, portRes]) => {
      if (txRes.success) setTransactions(txRes.transactions);
      if (sumRes.success) setSummary(sumRes.summary);
      if (portRes.success) setPortfolio(portRes.portfolio);
    }).finally(() => setLoading(false));
  }, [currentUser?.user_id]);

  const filtered = useMemo(() => transactions.filter(tx => {
    if (filterSymbol !== "ALL" && tx.symbol !== filterSymbol) return false;
    if (filterType !== "ALL" && tx.transaction_type !== filterType) return false;
    if (search && !tx.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [transactions, filterSymbol, filterType, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900">
        <GeneralHeader />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, border: "3px solid rgba(99,179,237,0.2)", borderTopColor: "#63b3ed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </main>
        <Footer />
      </div>
    );
  }

  const pnl = summary ? summary.realised_pnl : 0;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
      <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <GeneralHeader />

        <main className="flex-1 p-4 md:p-7">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
            style={{ paddingBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: "#e2e8f0", margin: 0, letterSpacing: "0.04em" }}>
                Transaction Portal
              </h1>
              <p style={{ fontFamily: sans, fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                Full trading analytics, P&amp;L breakdown, and order history
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => navigate("/investor/transaction-history")}
                style={{
                  padding: "9px 18px", borderRadius: 8, cursor: "pointer",
                  border: "1px solid rgba(99,179,237,0.25)", background: "transparent",
                  color: "#64748b", fontFamily: mono, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                History View
              </button>
              <button onClick={() => navigate("/investor/realtimedashboard")}
                style={{
                  padding: "9px 18px", borderRadius: 8, cursor: "pointer",
                  border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.1)",
                  color: "#63b3ed", fontFamily: mono, fontSize: 11, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                Trade Now →
              </button>
            </div>
          </motion.div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.12)" }}>
            {[["overview", "Overview"], ["history", "Order History"]].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} style={{
                padding: "10px 20px", borderRadius: "8px 8px 0 0", cursor: "pointer",
                border: "none", outline: "none",
                background: activeTab === id ? "rgba(99,179,237,0.12)" : "transparent",
                borderBottom: activeTab === id ? "2px solid #63b3ed" : "2px solid transparent",
                color: activeTab === id ? "#63b3ed" : "#64748b",
                fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                transition: "all 0.2s",
              }}>
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
              <motion.div key="overview"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}>

                {/* Summary stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
                  <StatCard label="Total Trades" value={summary?.total_trades ?? 0} icon="📊" />
                  <StatCard label="Buy Volume" value={fmt$(summary?.total_buy_amount ?? 0)} color="#f87171" icon="▲" />
                  <StatCard label="Sell Volume" value={fmt$(summary?.total_sell_amount ?? 0)} color="#34d399" icon="▼" />
                  <StatCard
                    label="Realised P&L"
                    value={`${pnl >= 0 ? "+" : ""}${fmt$(pnl)}`}
                    color={pnl >= 0 ? "#34d399" : "#f87171"}
                    sub={pnl >= 0 ? "Overall profit" : "Overall loss"}
                    icon="💰"
                  />
                  <StatCard
                    label="Available Funds"
                    value={portfolio ? fmt$(portfolio.paper_money) : "—"}
                    sub="Paper money remaining"
                    icon="🏦"
                  />
                </div>

                {/* Charts row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <SymbolBreakdownChart transactions={transactions} />
                  <PnLBySymbolChart transactions={transactions} />
                </div>

                {/* Volume sparkline */}
                <VolumeSparkline transactions={transactions} />

                {/* Holdings snapshot */}
                {portfolio?.holdings?.length > 0 && (
                  <div style={{
                    background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
                    border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
                    padding: "18px 20px", backdropFilter: "blur(12px)", marginTop: 16,
                  }}>
                    <p style={{ fontFamily: mono, fontSize: 9, color: "#64748b", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 14px" }}>
                      Current Holdings
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      {portfolio.holdings.map(h => (
                        <div key={h.symbol} style={{
                          background: "rgba(15,23,42,0.5)", borderRadius: 8, padding: "12px 14px",
                          border: "1px solid rgba(99,179,237,0.08)",
                          cursor: "pointer",
                        }} onClick={() => navigate(`/investor/realtimedashboard/astockdashboard/${h.symbol}`)}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{h.symbol}</span>
                            <span style={{ fontFamily: mono, fontSize: 11, color: "#64748b" }}>{h.quantity} sh</span>
                          </div>
                          <p style={{ fontFamily: mono, fontSize: 11, color: "#94a3b8", margin: 0 }}>
                            Avg {fmt$(h.average_cost)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {transactions.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0" }}>
                    <p style={{ fontFamily: mono, fontSize: 13, color: "#94a3b8" }}>No trading activity yet</p>
                    <button onClick={() => navigate("/investor/realtimedashboard")}
                      style={{
                        marginTop: 16, padding: "10px 24px", borderRadius: 8,
                        border: "1px solid rgba(99,179,237,0.4)", background: "rgba(99,179,237,0.1)",
                        color: "#63b3ed", fontFamily: mono, fontSize: 12, fontWeight: 700,
                        letterSpacing: "0.06em", textTransform: "uppercase", cursor: "pointer",
                      }}>
                      Start Trading
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Order History Tab ── */}
            {activeTab === "history" && (
              <motion.div key="history"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}>

                {/* Filters */}
                <div style={{
                  background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
                  border: "1px solid rgba(99,179,237,0.12)", borderRadius: 10,
                  padding: "14px 18px", marginBottom: 14, backdropFilter: "blur(12px)",
                  display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
                }}>
                  <input placeholder="Search symbol…" value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                      flex: 1, minWidth: 150, height: 36, padding: "0 14px", borderRadius: 8,
                      border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.6)",
                      color: "#e2e8f0", fontFamily: mono, fontSize: 12,
                    }} />
                  <select value={filterSymbol} onChange={e => setFilterSymbol(e.target.value)} style={{
                    height: 36, padding: "0 12px", borderRadius: 8,
                    border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.9)",
                    color: "#e2e8f0", fontFamily: mono, fontSize: 12, cursor: "pointer",
                  }}>
                    <option value="ALL">All Symbols</option>
                    {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  <span style={{ fontFamily: mono, fontSize: 11, color: "#475569", marginLeft: "auto" }}>
                    {filtered.length} records
                  </span>
                </div>

                {/* Table */}
                <div style={{
                  background: "linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.65))",
                  border: "1px solid rgba(99,179,237,0.12)", borderRadius: 12,
                  backdropFilter: "blur(12px)", overflow: "hidden",
                }}>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                      <p style={{ fontFamily: mono, fontSize: 13, color: "#94a3b8" }}>No matching transactions</p>
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(99,179,237,0.15)" }}>
                            {["Date", "Stock", "Type", "Qty", "Price / Share", "Total"].map((h, i) => (
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
                            {filtered.map((tx, i) => <PortalRow key={tx.transaction_id} tx={tx} index={i} />)}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p style={{ fontFamily: mono, fontSize: 9, color: "#475569", textAlign: "center", marginTop: 20 }}>
            Paper trading only · Prices are simulated · Not financial advice
          </p>
        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default TransactionPortalPage;
