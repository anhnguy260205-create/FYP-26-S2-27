// Utility functions for managing stock snapshots and related information.
export const SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "AMD"];
// Mapping of stock symbols to their respective company names for display purposes.
export const COMPANY_NAMES = {
    AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet/Google", AMZN: "Amazon",
    NVDA: "NVIDIA", META: "Meta", TSLA: "Tesla", AVGO: "Broadcom",
    ORCL: "Oracle", AMD: "AMD",
};

export function getLatestStockSnapshot(liveStocks, liveCandles, symbol) {
    const quote = liveStocks?.[symbol];
    const candles = liveCandles?.[symbol];

    // Prefer the websocket snapshot because it has price/open/high/low/volume immediately.
    if (quote && (quote.price || quote.p || quote.close)) {
        const price = Number(quote.price ?? quote.p ?? quote.close ?? 0);
        const open = Number(quote.open ?? quote.previousClose ?? quote.close ?? price);
        const high = Number(quote.high ?? Math.max(price, open));
        const low = Number(quote.low ?? Math.min(price, open));
        const volume = Number(quote.volume ?? quote.avgVolume ?? 0);
        const change = price - open;
        const pct = open ? (change / open) * 100 : 0;

        if (Number.isFinite(price) && price > 0) {
            return {
                symbol,
                name: COMPANY_NAMES[symbol] || symbol,
                price,
                open,
                high,
                low,
                volume,
                change,
                pct,
            };
        }
    }

    // Fallback to candles if the snapshot object is not ready yet.
    if (!Array.isArray(candles) || candles.length === 0) return null;

    const last = candles[candles.length - 1] || {};
    const prev = candles.length >= 2 ? candles[candles.length - 2] || {} : {};
    const price = Number(last.close ?? last.price ?? last.c ?? 0);
    const open = Number(last.open ?? last.o ?? prev.close ?? prev.price ?? price);
    const high = Number(last.high ?? last.h ?? Math.max(price, open));
    const low = Number(last.low ?? last.l ?? Math.min(price, open));
    const volume = Number(last.volume ?? last.v ?? 0);
    const change = price - open;
    const pct = open ? (change / open) * 100 : 0;

    if (!Number.isFinite(price) || price <= 0) return null;

    return {
        symbol,
        name: COMPANY_NAMES[symbol] || symbol,
        price,
        open,
        high,
        low,
        volume,
        change,
        pct,
    };
}
