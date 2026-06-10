import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useState, useCallback } from "react";

// Tiny sparkline SVG rendered from a series of relative values
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
    const color = positive ? "#22c55e" : "#ef4444";
    const fillId = `sf-${data[0]}-${data[data.length - 1]}`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
            <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={`${pad},${h} ${pts.join(" ")} ${w - pad},${h}`}
                fill={`url(#${fillId})`}
            />
            <polyline
                points={pts.join(" ")}
                stroke={color}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
}

const INITIAL_STOCKS = [
    { id: 1, symbol: "AAPL", company: "Apple Inc.", price: 195.89, change: +2.35, percent: +1.21, positive: true, spark: [188, 190, 191, 189, 192, 194, 193, 196] },
    { id: 2, symbol: "MSFT", company: "Microsoft Corp.", price: 415.32, change: +4.13, percent: +1.00, positive: true, spark: [408, 410, 411, 412, 409, 413, 414, 415] },
    { id: 3, symbol: "NVDA", company: "NVIDIA Corporation", price: 432.10, change: -3.45, percent: -0.79, positive: false, spark: [438, 437, 436, 435, 434, 436, 433, 432] },
    { id: 4, symbol: "TSLA", company: "Tesla Inc.", price: 171.95, change: +1.26, percent: +0.74, positive: true, spark: [168, 169, 170, 168, 170, 171, 171, 172] },
    { id: 5, symbol: "AMZN", company: "Amazon.com Inc.", price: 186.21, change: -0.98, percent: -0.52, positive: false, spark: [189, 188, 187, 186, 187, 186, 186, 186] },
    { id: 6, symbol: "GOOGL", company: "Alphabet Inc.", price: 162.48, change: +0.85, percent: +0.53, positive: true, spark: [160, 160, 161, 161, 162, 161, 162, 163] },
];

export default function Watchlist() {
    const [stocks, setStocks] = useState(INITIAL_STOCKS);
    const [adding, setAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState("");

    const removeStock = useCallback((id) => {
        setStocks(prev => prev.filter(s => s.id !== id));
    }, []);

    const handleAdd = () => {
        const sym = newSymbol.trim().toUpperCase();
        if (!sym) return;
        setStocks(prev => [
            ...prev,
            {
                id: Date.now(),
                symbol: sym,
                company: "—",
                price: 0,
                change: 0,
                percent: 0,
                positive: true,
                spark: [50, 50, 50, 50, 50, 50, 50, 50],
            }
        ]);
        setNewSymbol("");
        setAdding(false);
    };

    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} >
            <GeneralHeader />

            <main className="flex-1 p-7">

                {/* Page header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>

                            My Watchlist
                        </h1>
                        <p className="mt-1.5 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                            Track your favourite stocks and market trends
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <AnimatePresence>
                            {adding && (
                                <motion.div
                                    className="flex items-center gap-2"
                                    initial={{ opacity: 0, x: 12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 12 }}
                                >
                                    <input
                                        autoFocus
                                        value={newSymbol}
                                        onChange={e => setNewSymbol(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleAdd()}
                                        placeholder="e.g. META"
                                        className="px-3 py-2 rounded-lg text-sm font-mono outline-none"
                                        style={{
                                            background: "rgba(255,255,255,0.07)",
                                            border: "1px solid rgba(255,255,255,0.15)",
                                            color: "white",
                                            width: "120px",
                                        }}
                                    />
                                    <button
                                        onClick={() => setAdding(false)}
                                        className="text-xs px-3 py-2 rounded-lg"
                                        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                                    >
                                        Cancel
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={() => adding ? handleAdd() : setAdding(true)}
                            className="text-sm font-semibold px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                            style={{ background: "linear-gradient(90deg, #155dfc, #0092b8)" }}
                        >
                            + Add Symbol
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    {/* Header row */}
                    <div
                        className="grid text-xs uppercase tracking-widest px-5 py-3"
                        style={{
                            gridTemplateColumns: "2fr 1.1fr 1.1fr 1.1fr 90px 60px",
                            color: "rgba(255,255,255,0.35)",
                            background: "rgba(255,255,255,0.03)",
                            borderBottom: "1px solid rgba(255,255,255,0.07)",
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
                        {stocks.length === 0 && (
                            <motion.div
                                className="text-center py-16 text-sm"
                                style={{ color: "rgba(255,255,255,0.3)" }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                Your watchlist is empty — add a symbol above.
                            </motion.div>
                        )}

                        {stocks.map((stock, index) => (
                            <motion.div
                                key={stock.id}
                                layout
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2, delay: index * 0.04 }}
                                className="grid items-center px-5 py-3.5 group"
                                style={{
                                    gridTemplateColumns: "2fr 1.1fr 1.1fr 1.1fr 90px 60px",
                                    borderTop: "1px solid rgba(255,255,255,0.05)",
                                    transition: "background 0.15s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.025)"}
                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                            >
                                {/* Symbol + company */}
                                <div className="flex items-center gap-3">
                                    <span style={{ color: "#3b82f6", fontSize: "14px" }}>★</span>
                                    <div>
                                        <div className="text-sm font-semibold font-mono tracking-wide">
                                            {stock.symbol}
                                        </div>
                                        <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                            {stock.company}
                                        </div>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="text-right text-sm font-mono font-medium">
                                    {stock.price ? `$${stock.price.toFixed(2)}` : "—"}
                                </div>

                                {/* Change */}
                                <div
                                    className="text-right text-sm font-mono"
                                    style={{ color: stock.positive ? "#22c55e" : "#ef4444" }}
                                >
                                    {stock.change ? `${stock.change > 0 ? "+" : ""}${stock.change.toFixed(2)}` : "—"}
                                </div>

                                {/* % Change */}
                                <div className="flex justify-end">
                                    <span
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full font-mono"
                                        style={{
                                            color: stock.positive ? "#22c55e" : "#ef4444",
                                            background: stock.positive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                                        }}
                                    >
                                        {stock.percent ? `${stock.percent > 0 ? "+" : ""}${stock.percent.toFixed(2)}%` : "—"}
                                    </span>
                                </div>

                                {/* Sparkline */}
                                <div className="flex justify-center">
                                    <Sparkline data={stock.spark} positive={stock.positive} />
                                </div>

                                {/* Remove */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => removeStock(stock.id)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg text-xs"
                                        style={{
                                            width: "30px",
                                            height: "30px",
                                            background: "rgba(239,68,68,0.1)",
                                            border: "1px solid rgba(239,68,68,0.25)",
                                            color: "#ef4444",
                                        }}
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div
                    className="flex justify-between items-center mt-4 text-xs"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                >
                    <span>Showing {stocks.length} entr{stocks.length === 1 ? "y" : "ies"}</span>
                    <span style={{ color: "rgba(255,255,255,0.2)" }}>
                        Last updated: just now
                    </span>
                </div>

            </main>

            <Footer />
        </motion.div>
    );
}