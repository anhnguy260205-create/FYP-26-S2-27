import { motion, AnimatePresence } from "framer-motion";
import RoleHeader from "../../layout/RoleHeader.jsx";
import { isExpertUser, getPageBackground } from "../../utils/userRole.js";
import Footer from "../../layout/Footer.jsx";
import { useState, useCallback, useEffect } from "react";
import useLiveStocks from "../../api/useLiveStocks.js";
import { useNavigate } from "react-router-dom";
import { getWatchlist, addStockToWatchlist, removeStockFromWatchlist } from "../../api/userApi.js";

const BASIC_WATCHLIST_LIMIT = 3;

// ── Design tokens — matches the light theme used across ForumPage.jsx /
// PortfolioOverviewPage.jsx / LoggedInHomePage.jsx ─────────────────────────
const C = {
    card: "#FFFFFF",
    card2: "#F1F5F9",
    border: "rgba(11,29,79,0.25)",
    rowBorder: "rgba(15,23,42,0.08)",
    divider: "rgba(15,23,42,0.15)",
    accent: "#00D3F2",
    accentText: "#004450",
    accentRgb: "0,211,242",
    success: "#0F9D58",
    danger: "#DC2626",
    heading: "#0B1D4F",
    text: "#0F172A",
    textSecondary: "#33477A",
    muted: "#5B6C88",
    mutedLight: "rgba(15,23,42,0.45)",
    gold: "#92700C",
};

function Sparkline({ data, positive }) {
    const w = 80, h = 28, pad = 2;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + ((max - v) / range) * (h - pad * 2);
        return `${x},${y}`;
    });
    const color = positive ? C.success : C.danger;
    const fillId = `sf-${data[0]}-${data[data.length - 1]}`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
            <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`${pad},${h} ${pts.join(" ")} ${w - pad},${h}`} fill={`url(#${fillId})`} />
            <polyline points={pts.join(" ")} stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

const COMPANY_NAMES = {
    AAPL: "Apple Inc.", TSLA: "Tesla Inc.", NVDA: "NVIDIA Corporation",
    MSFT: "Microsoft Corp.", GOOGL: "Alphabet Inc.", AMZN: "Amazon.com Inc.",
    META: "Meta Platforms", AMD: "Advanced Micro Devices", NFLX: "Netflix Inc.", INTC: "Intel Corp.",
};

export default function Watchlist() {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const userId = currentUser?.user_id;
    const isPremium = currentUser?.subscription_status?.toLowerCase() === "premium";
    const isExpert = isExpertUser(currentUser);

    const { stocks: liveStocks, candles } = useLiveStocks();

    const [symbols, setSymbols] = useState([]);

    const isAtLimit = !isPremium && !isExpert && symbols.length >= BASIC_WATCHLIST_LIMIT;
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");

    useEffect(() => {
        if (!userId) { setLoading(false); return; }
        getWatchlist(userId).then(res => {
            if (res.success) {
                setSymbols(res.watchlist.map(e => e.stock_symbol));
            }
        }).finally(() => setLoading(false));
    }, [userId]);

    const handleAdd = useCallback(async () => {
        const sym = newSymbol.trim().toUpperCase();
        if (!sym) return;
        if (symbols.includes(sym)) {
            alert(`${sym} is already in your watchlist.`);
            return;
        }
        if (!isPremium && !isExpert && symbols.length >= BASIC_WATCHLIST_LIMIT) {
            alert(`Basic plan is limited to ${BASIC_WATCHLIST_LIMIT} watchlist stocks. Upgrade to Premium for unlimited.`);
            return;
        }
        const res = await addStockToWatchlist(userId, sym);
        if (res.success) {
            setSymbols(prev => [...prev, sym]);
            setNewSymbol("");
            setAdding(false);
        } else {
            alert(res.message || "Failed to add stock.");
        }
    }, [newSymbol, symbols, userId, isPremium, isExpert]);

    const handleRemove = useCallback(async (sym) => {
        try {
            const res = await removeStockFromWatchlist(userId, sym);
            if (res.success) {
                setSymbols(prev => prev.filter(s => s !== sym));
            } else {
                alert(res.message || "Failed to remove stock.");
            }
        } catch (error) {
            console.error("Failed to remove stock:", error);
            alert("Failed to remove stock. Check your connection and try again.");
        }
    }, [userId]);
    const navigate = useNavigate();
    const handleSelect = useCallback((symbol) => {
        navigate(`/realtimedashboard/astockdashboard/${symbol}`, {
            state: { from: "/watchlist", fromLabel: "Watchlist" },
        });
    }, [navigate]);
    const rows = symbols.map(sym => {
        const live = liveStocks[sym];
        const price = live?.price ?? null;
        const prev = live?.previousClose ?? null;
        const change = price != null && prev != null ? price - prev : null;
        const percent = change != null && prev ? (change / prev) * 100 : null;
        const positive = change === null ? true : change >= 0;
        const symCandles = candles[sym];
        const spark = symCandles && symCandles.length >= 2
            ? symCandles.slice(-8).map(c => c.close)
            : [50, 50, 50, 50, 50, 50, 50, 50];
        return { sym, price, change, percent, positive, spark };
    });
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
                            My Watchlist
                        </h1>
                        <p className="mt-1.5 text-sm" style={{ color: C.muted }}>
                            Track your favourite stocks and market trends
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {adding && !isAtLimit && (
                                <div
                                    className="flex items-center gap-2"

                                >
                                    <input
                                        autoFocus
                                        value={newSymbol}
                                        onChange={e => setNewSymbol(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleAdd()}
                                        placeholder="e.g. META"
                                        className="px-3 py-2 rounded-lg text-sm font-mono outline-none"
                                        style={{
                                            background: C.card2,
                                            border: `1px solid ${C.border}`,
                                            color: C.text,
                                            width: "120px",
                                        }}
                                    />
                                    <button
                                        onClick={() => { setAdding(false); setNewSymbol(""); }}
                                        className="text-xs px-3 py-2 rounded-lg"
                                        style={{
                                            background: "rgba(239,68,68,0.1)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            color: C.danger,
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </AnimatePresence>

                        {!isPremium && !isExpert && (
                            <span style={{
                                fontFamily: "'DM Mono', monospace", fontSize: "11px",
                                color: isAtLimit ? C.danger : C.muted,
                                letterSpacing: "0.06em",
                            }}>
                                {symbols.length}/{BASIC_WATCHLIST_LIMIT}
                            </span>
                        )}

                        <button
                            onClick={() => {
                                if (isAtLimit) return;
                                adding ? handleAdd() : setAdding(true);
                            }}
                            disabled={isAtLimit}
                            title={isAtLimit ? `Basic plan limit: ${BASIC_WATCHLIST_LIMIT} stocks` : undefined}
                            className="group relative overflow-hidden text-sm font-semibold px-4 py-2 rounded-lg"
                            style={{
                                background: isAtLimit ? C.card2 : C.success,
                                color: isAtLimit ? C.muted : "white",
                                cursor: isAtLimit ? "not-allowed" : "pointer",
                            }}
                        >
                            {!isAtLimit && (
                                <span
                                    aria-hidden="true"
                                    className="absolute inset-0 origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100"
                                    style={{ background: "linear-gradient(90deg, #22C55E, #0F9D58)" }}
                                />
                            )}
                            <span className="relative">+ Add Symbol</span>
                        </button>
                    </div>
                </div>
                <hr style={{ border: "none", borderTop: `1px solid ${C.divider}`, marginBottom: 20 }} />

                {/* Basic plan limit banner */}
                {isAtLimit && (
                    <div

                        style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            gap: "12px", marginBottom: "20px",
                            background: "rgba(255,215,0,0.12)",
                            border: "1px solid rgba(255,215,0,0.4)",
                            borderRadius: "10px", padding: "12px 16px",
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "16px" }}>🔒</span>
                            <div>
                                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 600, color: C.gold }}>
                                    Watchlist limit reached ({BASIC_WATCHLIST_LIMIT}/{BASIC_WATCHLIST_LIMIT})
                                </div>
                                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: C.textSecondary, marginTop: "2px" }}>
                                    Basic plan supports up to {BASIC_WATCHLIST_LIMIT} stocks. Upgrade to Premium for unlimited.
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/investor/subscription")}
                            style={{
                                padding: "7px 16px", borderRadius: "8px", whiteSpace: "nowrap",
                                background: "linear-gradient(90deg, rgba(255,215,0,0.3), rgba(255,165,0,0.3))",
                                border: "1px solid rgba(255,215,0,0.5)", color: C.gold,
                                fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: "11px",
                                letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer",
                            }}
                        >
                            ★ Upgrade
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${C.border}`, background: C.card, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    {/* Header row */}
                    <div
                        className="grid text-xs uppercase tracking-widest px-5 py-3"
                        style={{
                            gridTemplateColumns: "2fr 1.1fr 1.1fr 1.1fr 90px 60px",
                            color: C.muted,
                            background: C.card2,
                            borderBottom: `1px solid ${C.border}`,
                            flexShrink: 0,
                        }}
                    >
                        <span>Symbol</span>
                        <span className="text-right">Price</span>
                        <span className="text-right">Change</span>
                        <span className="text-right">% Change</span>
                        <span className="text-center">Trend (1D)</span>
                        <span />
                    </div>

                    {/* Data rows */}
                    <AnimatePresence initial={false}>
                        {loading && (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: C.muted, background: C.card }}>
                                Loading watchlist...
                            </div>
                        )}

                        {!loading && !userId && (
                            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: C.muted, background: C.card }}>
                                Please log in to view your watchlist.
                            </div>
                        )}

                        {!loading && userId && rows.length === 0 && (
                            <div
                                className="flex-1 flex items-center justify-center text-sm"
                                style={{ color: C.muted, background: C.card }}

                            >
                                Your watchlist is empty — add a symbol above.
                            </div>
                        )}

                        {rows.map((row, index) => (
                            <div
                                key={row.sym}
                                layout

                                className="grid items-center px-5 py-3.5 group"
                                style={{
                                    gridTemplateColumns: "2fr 1.1fr 1.1fr 1.1fr 90px 60px",
                                    borderTop: `1px solid ${C.rowBorder}`,
                                    background: C.card,
                                    transition: "background 0.15s",
                                    cursor: "pointer",
                                }}
                                onClick={() => handleSelect(row.sym)}
                                onMouseEnter={e => e.currentTarget.style.background = `rgba(${C.accentRgb},0.06)`}
                                onMouseLeave={e => e.currentTarget.style.background = C.card}
                            >
                                {/* Symbol + company */}
                                <div className="flex items-center gap-3">
                                    <span style={{ color: C.accent, fontSize: "14px" }}>★</span>
                                    <div>
                                        <div className="text-sm font-semibold font-mono tracking-wide" style={{ color: C.text }}>{row.sym}</div>
                                        <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                                            {COMPANY_NAMES[row.sym] ?? "—"}
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="text-right text-sm font-mono font-medium" style={{ color: C.text }}>
                                    {row.price != null ? `$${row.price.toFixed(2)}` : "—"}
                                </div>

                                {/* Change */}
                                <div className="text-right text-sm font-mono" style={{ color: row.positive ? C.success : C.danger }}>
                                    {row.change != null ? `${row.change > 0 ? "+" : ""}${row.change.toFixed(2)}` : "—"}
                                </div>

                                {/* % Change */}
                                <div className="flex justify-end">
                                    <span
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full font-mono"
                                        style={{
                                            color: row.positive ? C.success : C.danger,
                                            background: row.positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                        }}
                                    >
                                        {row.percent != null ? `${row.percent > 0 ? "+" : ""}${row.percent.toFixed(2)}%` : "—"}
                                    </span>
                                </div>

                                {/* Sparkline */}
                                <div className="flex justify-center">
                                    <Sparkline data={row.spark} positive={row.positive} />
                                </div>

                                {/* Remove */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={e => { e.stopPropagation(); if (!isAtLimit) handleRemove(row.sym); }}
                                        disabled={isAtLimit}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg text-xs"
                                        style={{
                                            width: "30px", height: "30px",
                                            background: isAtLimit ? C.card2 : "rgba(239,68,68,0.1)",
                                            border: isAtLimit ? `1px solid ${C.border}` : "1px solid rgba(239,68,68,0.25)",
                                            color: isAtLimit ? C.muted : C.danger,
                                            cursor: isAtLimit ? "not-allowed" : "pointer",
                                        }}
                                        title={isAtLimit ? `Basic plan limit: ${BASIC_WATCHLIST_LIMIT} stocks. Upgrade to Premium to manage your watchlist freely.` : "Remove"}
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center mt-4 text-xs" style={{ color: C.muted }}>
                    <span>
                        Showing {rows.length} entr{rows.length === 1 ? "y" : "ies"}
                        {!isPremium && !isExpert && (
                            <span style={{ color: isAtLimit ? C.danger : C.mutedLight, marginLeft: "8px" }}>
                                · {symbols.length}/{BASIC_WATCHLIST_LIMIT} Basic plan slots used
                            </span>
                        )}
                    </span>
                    <span style={{ color: C.mutedLight }}>Live prices via WebSocket</span>
                </div>

            </main>

            <Footer />
        </motion.div>
    );
}
