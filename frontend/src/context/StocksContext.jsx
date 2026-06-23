import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const StocksContext = createContext(null);

/* ── helpers (identical to former useLiveStocks internals) ── */

function normalizeCandles(candles) {
    const byTime = new Map();
    candles.forEach((candle) => {
        const time = Number(candle.time);
        const close = Number(candle.close);
        if (!Number.isFinite(time) || !Number.isFinite(close)) return;
        byTime.set(time, {
            ...candle,
            time,
            open:   Number(candle.open   ?? close),
            high:   Number(candle.high   ?? close),
            low:    Number(candle.low    ?? close),
            close,
            volume: Number(candle.volume ?? 0),
        });
    });
    return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

function parseStockMessage(rawMessage) {
    try {
        return JSON.parse(rawMessage);
    } catch {
        const sanitized = rawMessage.replace(
            /:\s*(NaN|Infinity|-Infinity)(\s*[,}])/g,
            ": null$2"
        );
        return JSON.parse(sanitized);
    }
}

function applyTradeCandleUpdate(list, trade) {
    const tradeMs = new Date(trade.t).getTime();
    const bucket  = Math.floor(tradeMs / 60000) * 60000;
    const price   = Number(trade.p);
    const size    = Number(trade.size ?? 0);
    const next    = list ? [...list] : [];
    const last    = next.at(-1);
    if (!Number.isFinite(bucket) || !Number.isFinite(price)) return next;
    if (last && last.time === bucket) {
        next[next.length - 1] = {
            ...last,
            high:   Math.max(last.high, price),
            low:    Math.min(last.low,  price),
            close:  price,
            volume: Number(last.volume ?? 0) + size,
        };
    } else {
        next.push({ time: bucket, open: price, high: price, low: price, close: price, volume: size });
    }
    return next;
}

function applyBarCandleUpdate(list, bar) {
    const barMs  = new Date(bar.t).getTime();
    const bucket = Math.floor(barMs / 60000) * 60000;
    const next   = list ? [...list] : [];
    const nextBar = {
        time:   bucket,
        open:   Number(bar.open),
        high:   Number(bar.high),
        low:    Number(bar.low),
        close:  Number(bar.close),
        volume: Number(bar.volume ?? 0),
    };
    if (!Number.isFinite(nextBar.time) || !Number.isFinite(nextBar.close)) return next;
    const last = next.at(-1);
    if (last && last.time === bucket) {
        next[next.length - 1] = nextBar;
    } else {
        next.push(nextBar);
    }
    return next;
}

const LIVE_UPDATE_FLUSH_MS = 300;

/* ── Provider ── */

export function StocksProvider({ children }) {
    const [stocks,           setStocks]           = useState({});
    const [candles,          setCandles]          = useState({});
    const [candleRanges,     setCandleRanges]     = useState({});
    const [marketStatus,     setMarketStatus]     = useState("");
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [error,            setError]            = useState("");
    const [lastUpdated,      setLastUpdated]      = useState("");

    const socketRef        = useRef(null);
    const pendingPricesRef = useRef({});
    const pendingTradesRef = useRef([]);
    const pendingBarsRef   = useRef([]);
    const flushTimerRef    = useRef(null);

    const requestRangeData = useCallback((symbol, range) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: "range", symbol, range }));
        }
    }, []);

    const flushLiveUpdates = useCallback(() => {
        flushTimerRef.current = null;
        const pendingPrices = pendingPricesRef.current;
        const pendingTrades = pendingTradesRef.current;
        const pendingBars   = pendingBarsRef.current;
        pendingPricesRef.current = {};
        pendingTradesRef.current = [];
        pendingBarsRef.current   = [];

        if (
            Object.keys(pendingPrices).length === 0 &&
            pendingTrades.length === 0 &&
            pendingBars.length === 0
        ) return;

        setLastUpdated(new Date().toLocaleTimeString());

        if (Object.keys(pendingPrices).length > 0) {
            setStocks((prev) => {
                let changed = false;
                const updated = { ...prev };
                Object.entries(pendingPrices).forEach(([symbol, price]) => {
                    if (!updated[symbol] || updated[symbol].price === price) return;
                    changed = true;
                    updated[symbol] = { ...updated[symbol], price };
                });
                return changed ? updated : prev;
            });
        }

        if (pendingTrades.length > 0 || pendingBars.length > 0) {
            setCandles((prev) => {
                const updated       = { ...prev };
                const changedSymbols = new Set();
                pendingTrades.forEach((trade) => {
                    if (!trade.s) return;
                    updated[trade.s] = applyTradeCandleUpdate(updated[trade.s], trade);
                    changedSymbols.add(trade.s);
                });
                pendingBars.forEach((bar) => {
                    if (!bar.s) return;
                    updated[bar.s] = applyBarCandleUpdate(updated[bar.s], bar);
                    changedSymbols.add(bar.s);
                });
                changedSymbols.forEach((symbol) => {
                    updated[symbol] = normalizeCandles(updated[symbol]);
                });
                return changedSymbols.size > 0 ? updated : prev;
            });
        }
    }, []);

    const scheduleLiveFlush = useCallback(() => {
        if (flushTimerRef.current) return;
        flushTimerRef.current = window.setTimeout(flushLiveUpdates, LIVE_UPDATE_FLUSH_MS);
    }, [flushLiveUpdates]);

    useEffect(() => {
        const socket = new WebSocket(`${import.meta.env.VITE_WS_URL}/ws/stocks`);
        socketRef.current = socket;

        socket.onopen = () => {
            setConnectionStatus("Connected");
            setError("");
        };

        socket.onmessage = (event) => {
            let response;
            try {
                response = parseStockMessage(event.data);
            } catch (parseError) {
                console.error("Invalid stock websocket message", parseError, event.data);
                setError("Received invalid stock data from backend");
                return;
            }

            if (response.type === "market_status") { setMarketStatus(response.status); return; }
            if (response.type === "error")          { setError(response.message);       return; }

            if (response.type === "snapshot") {
                setLastUpdated(new Date().toLocaleTimeString());
                setStocks((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((stock) => {
                        updated[stock.s] = {
                            symbol:        stock.s,
                            price:         stock.p,
                            open:          stock.open,
                            high:          stock.high,
                            low:           stock.low,
                            close:         stock.close ?? stock.p,
                            previousClose: stock.previousClose,
                            volume:        stock.volume,
                            avgVolume:     stock.avgVolume,
                        };
                    });
                    return updated;
                });
                return;
            }

            if (response.type === "history") {
                setLastUpdated(new Date().toLocaleTimeString());
                setCandles((prev) => {
                    const updated = { ...prev };
                    Object.entries(response.data ?? {}).forEach(([symbol, bars]) => {
                        if (!Array.isArray(bars)) return;
                        updated[symbol] = normalizeCandles(bars.map((bar) => ({
                            time:   Number(bar.time),
                            open:   Number(bar.open),
                            high:   Number(bar.high),
                            low:    Number(bar.low),
                            close:  Number(bar.close),
                            volume: Number(bar.volume ?? 0),
                        })));
                    });
                    return updated;
                });
                setCandleRanges((prev) => {
                    const updated = { ...prev };
                    Object.keys(response.data ?? {}).forEach((symbol) => {
                        updated[symbol] = response.range ?? "1D";
                    });
                    return updated;
                });
                return;
            }

            if (response.type === "trade") {
                const trade = response.data;
                if (trade?.s) {
                    pendingPricesRef.current[trade.s] = trade.p;
                    pendingTradesRef.current.push(trade);
                    scheduleLiveFlush();
                }
                return;
            }

            if (response.type === "bar") {
                const bar = response.data;
                if (bar?.s) {
                    pendingBarsRef.current.push(bar);
                    scheduleLiveFlush();
                }
                return;
            }
        };

        socket.onerror = () => {
            setError("Could not connect to stock websocket");
            setConnectionStatus("Error");
        };

        socket.onclose = () => setConnectionStatus("Disconnected");

        return () => {
            if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
            socket.close();
        };
    }, [scheduleLiveFlush]);

    const value = {
        stocks,
        candles,
        candleRanges,
        marketStatus,
        connectionStatus,
        error,
        lastUpdated,
        requestRangeData,
    };

    return <StocksContext.Provider value={value}>{children}</StocksContext.Provider>;
}

export function useStocksContext() {
    return useContext(StocksContext);
}
