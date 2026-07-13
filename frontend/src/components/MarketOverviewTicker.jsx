import { useEffect, useState } from "react";
import { fetchStockSnapshot } from "../api/stockApi.js";
import useLiveStocks from "../api/useLiveStocks.js";
import { SYMBOLS as STOCK_SYMBOLS, getLatestStockSnapshot } from "../utils/stockSnapshot.js";
import MarketTicker from "./MarketTicker.jsx";

// Uses the same generic /stocks/snapshot/{symbol} endpoint the rest of the app
// already calls for individual stocks — yfinance resolves index/crypto tickers
// (^GSPC, ^IXIC, ^DJI, ^VIX, BTC-USD) the same as equities, so this needs no
// backend changes. Rendered once from GeneralHeader.jsx so it appears directly
// under the nav bar on every investor page instead of being wired into each page.
const MARKET_INDEXES = [
    { symbol: "^GSPC", label: "S&P 500" },
    { symbol: "^IXIC", label: "NASDAQ" },
    { symbol: "^DJI", label: "DOW" },
    { symbol: "^VIX", label: "VIX" },
    { symbol: "BTC-USD", label: "BTC", prefix: "$" },
];

function MarketOverviewTicker() {
    const { stocks, candles } = useLiveStocks();
    const [indexData, setIndexData] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        Promise.all(
            MARKET_INDEXES.map(({ symbol }) =>
                fetchStockSnapshot(symbol)
                    .then((res) => ({ symbol, snap: res.success ? res.data : null }))
                    .catch(() => ({ symbol, snap: null }))
            )
        ).then((results) => {
            if (cancelled) return;
            const next = {};
            results.forEach((r) => { next[r.symbol] = r.snap; });
            setIndexData(next);
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, []);

    if (loading) {
        return (
            <div className="w-full bg-slate-950/60 border-b border-white/[0.06] backdrop-blur-sm">
                <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-2">
                    <div className="h-4 w-full max-w-md rounded bg-white/5 animate-pulse" />
                </div>
            </div>
        );
    }

    const indexItems = MARKET_INDEXES.map(({ symbol, label, prefix }) => {
        const snap = indexData[symbol];
        const price = snap?.p ?? null;
        const prev = snap?.previousClose ?? null;
        const change = price != null && prev != null ? price - prev : null;
        const percent = change != null && prev ? (change / prev) * 100 : null;
        return {
            key: symbol,
            label,
            priceText: price != null ? `${prefix ?? ""}${price.toFixed(2)}` : "—",
            changeText: percent != null ? `${Math.abs(percent).toFixed(2)}%` : null,
            isUp: percent == null || percent >= 0,
        };
    });

    // Individual stocks read from the already-open live WebSocket feed — no extra fetches.
    const stockItems = STOCK_SYMBOLS.map((symbol) => {
        const snapshot = getLatestStockSnapshot(stocks, candles, symbol);
        if (!snapshot) return null;
        return {
            key: symbol,
            label: symbol,
            priceText: `$${snapshot.price.toFixed(2)}`,
            changeText: `${Math.abs(snapshot.pct).toFixed(2)}%`,
            isUp: snapshot.pct >= 0,
        };
    }).filter(Boolean);

    return <MarketTicker items={[...indexItems, ...stockItems]} />;
}

export default MarketOverviewTicker;
