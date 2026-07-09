import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPortalTransactions, getPortalSummary } from "../../api/tradingApi.js";

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

const C = {
    bg:      "#0d1526",
    card:    "#161f38",
    border:  "#232d4a",
    row:     "#1e2740",
    accent:  "#378ADD",
    success: "#4dd68c",
    danger:  "#ff6b6b",
    muted:   "#8b92a8",
    text:    "#e2e8f0",
};

function fmt$(n) {
    return `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" })
        + " " + d.toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit" });
}

function StatCard({ label, value, colour }) {
    return (
        <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "20px 24px", flex: 1, minWidth: 150,
        }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, fontFamily: sans, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: colour || C.text, fontFamily: mono }}>{value}</div>
        </div>
    );
}

export default function TransactionPortalPage() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "null");
    const userId = currentUser?.user_id;

    const [stats,   setStats]   = useState(null);
    const [txns,    setTxns]    = useState([]);
    const [filter,  setFilter]  = useState("all");
    const [search,  setSearch]  = useState("");
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState(null);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        setLoading(true);
        setError(null);

        Promise.all([
            getPortalSummary(userId).catch(() => null),
            getPortalTransactions(userId, { limit: 100 }).catch(() => ({ transactions: [] })),
        ]).then(([summaryData, txnData]) => {
            if (summaryData?.success) setStats(summaryData.stats || summaryData.summary || summaryData);
            setTxns(txnData?.transactions || []);
        }).catch(e => setError(String(e)))
          .finally(() => setLoading(false));
    }, [userId]);

    const filtered = txns.filter(t => {
        const matchType   = filter === "all" || t.transaction_type === filter;
        const matchSearch = !search || t.symbol?.toLowerCase().includes(search.toLowerCase());
        return matchType && matchSearch;
    });

    return (
        <motion.div
            style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", flexDirection: "column", fontFamily: sans }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
        >
            <GeneralHeader />
            <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1100, margin: "0 auto", width: "100%" }}>

                {/* Page header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Transaction Portal</h1>
                        <p style={{ color: C.muted, margin: "4px 0 0", fontSize: 13 }}>
                            Full overview of your paper trading activity
                        </p>
                    </div>
                    <button
                        onClick={() => navigate("/investor/transaction-history")}
                        style={{
                            padding: "9px 18px", borderRadius: 10, border: `1px solid ${C.border}`,
                            background: C.card, color: C.text, cursor: "pointer", fontSize: 13, fontFamily: sans,
                        }}
                    >
                        View History →
                    </button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", color: C.muted, padding: 60 }}>Loading transactions…</div>
                ) : error ? (
                    <div style={{ textAlign: "center", color: C.danger, padding: 40 }}>{error}</div>
                ) : (
                    <>
                        {/* Stat cards */}
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
                            <StatCard label="Total Trades"   value={stats?.total_trades ?? txns.length} />
                            <StatCard label="Total Invested" value={fmt$(stats?.total_buy_amount)}  colour={C.danger} />
                            <StatCard label="Total Proceeds" value={fmt$(stats?.total_sell_amount)} colour={C.success} />
                            <StatCard label="Realised P&L"
                                value={stats ? fmt$(stats.realised_pnl) : "—"}
                                colour={(stats?.realised_pnl ?? 0) >= 0 ? C.success : C.danger}
                            />
                            <StatCard label="Most Traded" value={stats?.most_traded_symbol ?? "—"} colour={C.accent} />
                        </div>

                        {/* Filters */}
                        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                            <input
                                placeholder="Search ticker…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                style={{
                                    padding: "8px 14px", borderRadius: 9, border: `1px solid ${C.border}`,
                                    background: C.card, color: C.text, fontSize: 13, width: 180,
                                    outline: "none", fontFamily: sans,
                                }}
                            />
                            {["all", "buy", "sell"].map(f => (
                                <button key={f} onClick={() => setFilter(f)} style={{
                                    padding: "8px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
                                    border: `1px solid ${filter === f ? C.accent : C.border}`,
                                    background: filter === f ? `${C.accent}22` : C.card,
                                    color: filter === f ? C.accent : C.muted,
                                    textTransform: "capitalize", fontFamily: sans,
                                }}>{f}</button>
                            ))}
                            <span style={{ marginLeft: "auto", color: C.muted, fontSize: 12 }}>
                                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {/* Table */}
                        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: "#1a2540" }}>
                                        {["Date", "Symbol", "Type", "Qty", "Price", "Total"].map(h => (
                                            <th key={h} style={{
                                                padding: "12px 18px", textAlign: "left",
                                                color: C.muted, fontWeight: 600, fontSize: 11,
                                                letterSpacing: "0.07em", fontFamily: sans, textTransform: "uppercase",
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: C.muted }}>
                                            No transactions found
                                        </td></tr>
                                    ) : filtered.map((t, i) => (
                                        <tr key={t.transaction_id || i} style={{ borderTop: `1px solid ${C.row}` }}>
                                            <td style={{ padding: "12px 18px", color: C.muted, fontSize: 12, fontFamily: mono }}>{fmtDate(t.transaction_date)}</td>
                                            <td style={{ padding: "12px 18px", fontWeight: 700, color: C.accent, fontFamily: mono }}>{t.symbol}</td>
                                            <td style={{ padding: "12px 18px" }}>
                                                <span style={{
                                                    padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                                                    background: t.transaction_type === "buy" ? `${C.success}22` : `${C.danger}22`,
                                                    color: t.transaction_type === "buy" ? C.success : C.danger,
                                                    textTransform: "uppercase", fontFamily: sans,
                                                }}>{t.transaction_type}</span>
                                            </td>
                                            <td style={{ padding: "12px 18px", fontFamily: mono }}>{t.quantity}</td>
                                            <td style={{ padding: "12px 18px", fontFamily: mono }}>{fmt$(t.price)}</td>
                                            <td style={{ padding: "12px 18px", fontWeight: 600, fontFamily: mono }}>{fmt$(t.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </main>
            <Footer />
        </motion.div>
    );
}
