import { motion, AnimatePresence } from "framer-motion";
import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getPageBackground } from "../../utils/userRole.js";
import { COMPANY_NAMES } from "../../utils/stockSnapshot.js";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAlerts, deleteAlert } from "../../api/alertApi.js";
import { conditionLabel } from "../../utils/alertFormat.js";

// ── Design tokens — matches AlertBoard's accent (AStockDashBoardPage.jsx) ──
const C = {
    card: "#FFFFFF",
    card2: "#F1F5F9",
    border: "rgba(11,29,79,0.25)",
    rowBorder: "rgba(15,23,42,0.08)",
    divider: "rgba(15,23,42,0.15)",
    accent: "#0092b8",
    accentRgb: "0,146,184",
    success: "#0F9D58",
    danger: "#DC2626",
    heading: "#0B1D4F",
    text: "#0F172A",
    textSecondary: "#33477A",
    muted: "#5B6C88",
    mutedLight: "rgba(15,23,42,0.45)",
};

function ConditionRow({ alert, onDelete }) {
    const [deleting, setDeleting] = useState(false);
    const handleDelete = useCallback(async (e) => {
        e.stopPropagation();
        setDeleting(true);
        try {
            const res = await deleteAlert(alert.alert_id);
            if (res.success) {
                onDelete(alert.alert_id);
            } else {
                window.alert(res.message || "Failed to delete alert.");
                setDeleting(false);
            }
        } catch {
            window.alert("Failed to delete alert. Check your connection and try again.");
            setDeleting(false);
        }
    }, [alert, onDelete]);

    return (
        <div className="flex items-center gap-2" style={{ opacity: deleting ? 0.5 : 1 }}>
            <span
                className="text-xs font-mono px-2 py-1 rounded-md"
                style={{
                    color: alert.is_triggered ? C.muted : C.accent,
                    background: alert.is_triggered ? C.card2 : `rgba(${C.accentRgb},0.1)`,
                    border: `1px solid ${alert.is_triggered ? C.rowBorder : `rgba(${C.accentRgb},0.3)`}`,
                }}
            >
                {conditionLabel(alert)}
                {alert.is_triggered && <span style={{ marginLeft: 6, color: C.muted }}>· Triggered</span>}
            </span>
            <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center rounded-md text-xs"
                style={{
                    width: "22px", height: "22px",
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.25)",
                    color: C.danger,
                    cursor: deleting ? "not-allowed" : "pointer",
                }}
                title="Delete alert"
            >
                ✕
            </button>
        </div>
    );
}

export default function MyAlertsPage() {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const userId = currentUser?.user_id;
    const navigate = useNavigate();

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        getAlerts(userId).then(res => {
            if (res.success) {
                setAlerts(res.alerts);
            }
        }).finally(() => setLoading(false));
    }, [userId]);

    const handleRemove = useCallback((alertId) => {
        setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    }, []);

    const handleSelect = useCallback((symbol) => {
        navigate(`/realtimedashboard/astockdashboard/${symbol}`, {
            state: { from: "/investor/alerts", fromLabel: "My Alerts" },
        });
    }, [navigate]);

    const groups = useMemo(() => {
        const bySymbol = {};
        for (const a of alerts) {
            (bySymbol[a.stock_symbol] ||= []).push(a);
        }
        return Object.entries(bySymbol).map(([symbol, list]) => ({ symbol, list }));
    }, [alerts]);

    return (
        <motion.div className="min-h-screen flex flex-col"
            style={{ background: getPageBackground() }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <RoleHeader />

            <main style={{ flex: 1, maxWidth: 1100, minHeight: "100vh", margin: "0 auto", width: "100%", padding: "88px 24px 48px", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>

                {/* Page header */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, letterSpacing: "0.04em", color: C.heading, margin: 0, lineHeight: 1 }}>
                            My Alerts
                        </h1>
                        <p className="mt-1.5 text-sm" style={{ color: C.muted }}>
                            Stocks you've set price alerts on
                        </p>
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `1px solid ${C.divider}`, marginBottom: 20 }} />

                {/* Table */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.card, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    {/* Header row */}
                    <div
                        className="grid text-xs uppercase tracking-widest px-5 py-3"
                        style={{
                            gridTemplateColumns: "1.4fr 1fr",
                            color: C.muted,
                            background: C.card2,
                            borderBottom: `1px solid ${C.border}`,
                            flexShrink: 0,
                        }}
                    >
                        <span>Symbol</span>
                        <span>Conditions</span>
                    </div>

                    {/* Data rows */}
                    <AnimatePresence initial={false}>
                        {loading && (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: C.muted, background: C.card }}>
                                Loading alerts...
                            </div>
                        )}

                        {!loading && !userId && (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: C.muted, background: C.card }}>
                                Please log in to view your alerts.
                            </div>
                        )}

                        {!loading && userId && groups.length === 0 && (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: C.muted, background: C.card }}>
                                You haven't set any alerts yet — open a stock's dashboard to create one.
                            </div>
                        )}

                        {groups.map(({ symbol, list }) => (
                            <div
                                key={symbol}
                                className="grid items-center px-5 py-3.5 group"
                                style={{
                                    gridTemplateColumns: "1.4fr 1fr",
                                    borderTop: `1px solid ${C.rowBorder}`,
                                    background: C.card,
                                    transition: "background 0.15s",
                                    cursor: "pointer",
                                }}
                                onClick={() => handleSelect(symbol)}
                                onMouseEnter={e => e.currentTarget.style.background = `rgba(${C.accentRgb},0.06)`}
                                onMouseLeave={e => e.currentTarget.style.background = C.card}
                            >
                                {/* Symbol + company */}
                                <div className="flex items-center gap-3">
                                    <span style={{ color: C.accent, fontSize: "14px" }}>🔔</span>
                                    <div>
                                        <div className="text-sm font-semibold font-mono tracking-wide" style={{ color: C.text }}>{symbol}</div>
                                        <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                                            {COMPANY_NAMES[symbol] || symbol}
                                        </div>
                                    </div>
                                </div>

                                {/* Conditions */}
                                <div className="flex flex-wrap gap-2">
                                    {list.map(alert => (
                                        <ConditionRow key={alert.alert_id} alert={alert} onDelete={handleRemove} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 text-xs" style={{ color: C.muted }}>
                    <span>
                        Showing {groups.length} stock{groups.length === 1 ? "" : "s"} with alerts
                    </span>
                </div>

            </main>

            <Footer />
        </motion.div>
    );
}
