import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPortalTransactions, getPortalSummary, getPortfolio } from "../../api/tradingApi.js";
import useLiveStocks from "../../api/useLiveStocks.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

const C = {
  card:         "#161f38",
  border:       "#232d4a",
  rowBorder:    "#1e2740",
  accent:       "#378ADD",
  accentText:   "#6fb3f0",
  accentCardBg: "#17223f",
  success:      "#4dd68c",
  danger:       "#ff6b6b",
  muted:        "#8b92a8",
};

const PIE_COLORS = ["#378ADD","#EF9F27","#E24B4A","#639922","#9b59b6","#1abc9c","#e67e22","#e91e63"];

function fmt$(n) {
  const abs = Math.abs(Number(n));
  return `${Number(n) < 0 ? "-" : ""}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSigned$(n) {
  const v = Number(n);
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-SG", { day: "2-digit", month: "short" });
}

/* ─── SVG: cumulative P&L trend (last 30 days) ────────────────────────── */
function TrendChart({ transactions }) {
  const points = useMemo(() => {
    const now = new Date();
    const map = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    transactions.forEach(t => {
      const key = (t.transaction_date || "").slice(0, 10);
      if (key in map) map[key] += t.transaction_type === "sell" ? t.total_amount : -t.total_amount;
    });
    let running = 0;
    return Object.keys(map).sort().map(k => { running += map[k]; return running; });
  }, [transactions]);

  const W = 500, H = 130, PL = 8, PR = 8, PT = 12, PB = 8;
  const cW = W - PL - PR, cH = H - PT - PB;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 1);
  const range = max - min || 1;
  const toX = i => PL + (i / (points.length - 1)) * cW;
  const toY = v => PT + ((max - v) / range) * cH;
  const pts = points.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1).x.toFixed(1)},${H - PB} L${PL},${H - PB} Z`;
  const zeroY = toY(0).toFixed(1);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={C.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={PL} y1={zeroY} x2={W - PR} y2={zeroY} stroke={C.border} strokeWidth="1" strokeDasharray="4 4" />
      <path d={area} fill="url(#tg)" />
      <path d={line} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── SVG: donut diversification chart ────────────────────────────────── */
function arcPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const toRad = deg => ((deg - 90) * Math.PI) / 180;
  const p = (r, deg) => ({ x: cx + r * Math.cos(toRad(deg)), y: cy + r * Math.sin(toRad(deg)) });
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const [o1, o2, i1, i2] = [p(outerR, startDeg), p(outerR, endDeg), p(innerR, endDeg), p(innerR, startDeg)];
  return `M${o1.x.toFixed(2)},${o1.y.toFixed(2)} A${outerR},${outerR} 0 ${large} 1 ${o2.x.toFixed(2)},${o2.y.toFixed(2)} L${i1.x.toFixed(2)},${i1.y.toFixed(2)} A${innerR},${innerR} 0 ${large} 0 ${i2.x.toFixed(2)},${i2.y.toFixed(2)} Z`;
}

function DonutChart({ holdings, liveStocks }) {
  const segments = useMemo(() => {
    const items = holdings
      .map((h, i) => {
        const price = liveStocks[h.symbol]?.price ?? h.average_cost;
        return { sym: h.symbol, value: price * h.quantity, color: PIE_COLORS[i % PIE_COLORS.length] };
      })
      .filter(s => s.value > 0);
    const total = items.reduce((s, x) => s + x.value, 0) || 1;
    let cumDeg = 0;
    return items.map(s => {
      const deg = (s.value / total) * 360;
      const seg = { ...s, pct: (s.value / total) * 100, startDeg: cumDeg, endDeg: cumDeg + deg - 0.5 };
      cumDeg += deg;
      return seg;
    });
  }, [holdings, liveStocks]);

  const SZ = 160, cx = SZ / 2, cy = SZ / 2;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`} style={{ flexShrink: 0 }}>
        {segments.length === 0
          ? <circle cx={cx} cy={cy} r={55} fill="none" stroke={C.border} strokeWidth={22} />
          : segments.map((seg, i) => (
            <path key={i} d={arcPath(cx, cy, 66, 44, seg.startDeg, seg.endDeg)} fill={seg.color} />
          ))
        }
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
            <span style={{ fontFamily: mono, fontSize: 11, color: "#e2e8f0" }}>
              {seg.sym} <span style={{ color: C.muted }}>{seg.pct.toFixed(1)}%</span>
            </span>
          </div>
        ))}
        {segments.length === 0 && (
          <span style={{ fontFamily: sans, fontSize: 12, color: C.muted }}>No holdings</span>
        )}
      </div>
    </div>
  );
}

/* ─── Stat card ────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, highlighted = false, valueColor }) {
  return (
    <div style={{
      background: highlighted ? C.accentCardBg : C.card,
      border: `${highlighted ? 2 : 1}px solid ${highlighted ? C.accent : C.border}`,
      borderRadius: 12, padding: "16px 18px",
    }}>
      <p style={{ fontFamily: sans, fontSize: 13, color: highlighted ? C.accentText : C.muted, margin: "0 0 8px" }}>{label}</p>
      <p style={{ fontFamily: mono, fontSize: highlighted ? 22 : 18, fontWeight: 600, color: valueColor ?? (highlighted ? C.accentText : "#e2e8f0"), margin: 0 }}>
        {value}
      </p>
      {sub && <p style={{ fontFamily: sans, fontSize: 11, color: highlighted ? C.accentText : C.muted, margin: "6px 0 0" }}>{sub}</p>}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */
function TransactionPortalPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const { stocks: liveStocks } = useLiveStocks();

  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary]           = useState(null);
  const [portfolio, setPortfolio]       = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!currentUser?.user_id) { setLoading(false); return; }
    const uid = currentUser.user_id;
    Promise.all([
      getPortalTransactions(uid, { limit: 200 }),
      getPortalSummary(uid),
      getPortfolio(uid),
    ]).then(([txRes, sumRes, portRes]) => {
      if (txRes.success)   setTransactions(txRes.transactions);
      if (sumRes.success)  setSummary(sumRes.summary);
      if (portRes.success) setPortfolio(portRes.portfolio);
    }).finally(() => setLoading(false));
  }, [currentUser?.user_id]);

  const holdings    = portfolio?.holdings ?? [];
  const paperMoney  = portfolio?.paper_money ?? 0;

  const unrealisedPnL = useMemo(() =>
    holdings.reduce((sum, h) => {
      const price = liveStocks[h.symbol]?.price ?? h.average_cost;
      return sum + (price - h.average_cost) * h.quantity;
    }, 0),
  [holdings, liveStocks]);

  const holdingsValue = useMemo(() =>
    holdings.reduce((sum, h) => {
      const price = liveStocks[h.symbol]?.price ?? h.average_cost;
      return sum + price * h.quantity;
    }, 0),
  [holdings, liveStocks]);

  const totalValue  = paperMoney + holdingsValue;
  const realisedPnL = summary?.realised_pnl ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900">
        <GeneralHeader />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 40, height: 40, border: `3px solid rgba(55,138,221,0.2)`, borderTopColor: C.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />

      <main style={{ flex: 1, padding: "28px 32px", maxWidth: 1100, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px", letterSpacing: "0.03em" }}>
            Transaction Portal
          </h1>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>
            Full trading analytics, holdings, and order history
          </p>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatCard label="Total portfolio value" value={fmt$(totalValue)} sub="Cash + holdings" highlighted />
          <StatCard label="Available funds" value={fmt$(paperMoney)} />
          <StatCard label="Unrealized P&L" value={fmtSigned$(unrealisedPnL)} valueColor={unrealisedPnL >= 0 ? C.success : C.danger} />
          <StatCard label="Realized P&L"   value={fmtSigned$(realisedPnL)}  valueColor={realisedPnL  >= 0 ? C.success : C.danger} />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 12, marginBottom: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 10px" }}>Cumulative P&L, last 30 days</p>
            <TrendChart transactions={transactions} />
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 12px" }}>Diversification</p>
            <DonutChart holdings={holdings} liveStocks={liveStocks} />
          </div>
        </div>

        {/* Holdings table */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>Current holdings</p>
            <span style={{ fontFamily: sans, fontSize: 13, color: "#475569" }}>
              {holdings.length} position{holdings.length !== 1 ? "s" : ""}
            </span>
          </div>
          {holdings.length === 0 ? (
            <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 0", margin: 0 }}>No open positions</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Symbol","Shares","Avg cost","Price","Market value","Unrealized P&L"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 6px", fontFamily: sans, fontSize: 12, fontWeight: 400, color: C.muted, textAlign: i === 0 ? "left" : "right" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, idx) => {
                    const price  = liveStocks[h.symbol]?.price ?? h.average_cost;
                    const mktVal = price * h.quantity;
                    const upnl   = (price - h.average_cost) * h.quantity;
                    const isLast = idx === holdings.length - 1;
                    return (
                      <tr key={h.symbol}
                        style={{ borderBottom: isLast ? "none" : `1px solid ${C.rowBorder}`, cursor: "pointer" }}
                        onClick={() => navigate(`/investor/realtimedashboard/astockdashboard/${h.symbol}`)}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(55,138,221,0.05)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <td style={{ padding: "10px 6px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{h.symbol}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#e2e8f0" }}>{h.quantity}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#94a3b8" }}>{fmt$(h.average_cost)}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#e2e8f0" }}>{fmt$(price)}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#e2e8f0" }}>{fmt$(mktVal)}</td>
                        <td style={{ padding: "10px 6px", fontFamily: mono, fontSize: 13, fontWeight: 600, textAlign: "right", color: upnl >= 0 ? C.success : C.danger }}>
                          {fmtSigned$(upnl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>Recent orders</p>
            <button onClick={() => navigate("/investor/transaction-history")}
              style={{ fontFamily: sans, fontSize: 13, color: C.accentText, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              View all →
            </button>
          </div>
          {transactions.length === 0 ? (
            <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, textAlign: "center", padding: "24px 0", margin: 0 }}>No orders yet</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["Date","Symbol","Side","Qty","Price"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 6px", fontFamily: sans, fontSize: 12, fontWeight: 400, color: C.muted, textAlign: i <= 2 ? "left" : "right" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map((tx, i) => {
                    const buy    = tx.transaction_type === "buy";
                    const isLast = i === Math.min(transactions.length, 5) - 1;
                    return (
                      <tr key={tx.transaction_id} style={{ borderBottom: isLast ? "none" : `1px solid ${C.rowBorder}` }}>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, color: "#94a3b8" }}>{fmtDate(tx.transaction_date)}</td>
                        <td style={{ padding: "10px 6px", fontFamily: mono, fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{tx.symbol}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, color: buy ? C.success : C.danger }}>
                          {buy ? "Buy" : "Sell"}
                        </td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#e2e8f0" }}>{tx.quantity}</td>
                        <td style={{ padding: "10px 6px", fontFamily: sans, fontSize: 13, textAlign: "right", color: "#94a3b8" }}>{fmt$(tx.price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ fontFamily: mono, fontSize: 9, color: "#475569", textAlign: "center", marginTop: 16 }}>
          Paper trading only · Prices are simulated · Not financial advice
        </p>
      </main>

      <Footer />
    </motion.div>
  );
}

export default TransactionPortalPage;
