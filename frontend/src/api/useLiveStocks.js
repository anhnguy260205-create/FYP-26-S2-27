import { useEffect, useState } from "react";

function useLiveStocks() {
    const [stocks, setStocks] = useState({});
    const [candles, setCandles] = useState({});
    const [marketStatus, setMarketStatus] = useState("");
    const [connectionStatus, setConnectionStatus] = useState("Connecting...");
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState("");

    useEffect(() => {
        const socket = new WebSocket("ws://127.0.0.1:8000/ws/stocks");

        socket.onopen = () => {
            console.log("Connected");
            setConnectionStatus("Connected");
            setError("");
        };

        socket.onmessage = (event) => {
            const response = JSON.parse(event.data);
            console.log(response);

            // ── market status ─────────────────────────────────────
            if (response.type === "market_status") {
                setMarketStatus(response.status);
                return;
            }

            // ── backend errors ────────────────────────────────────
            if (response.type === "error") {
                setError(response.message);
                return;
            }

            // ── snapshot (on connect) ─────────────────────────────
            // response.data is an ARRAY of stock objects
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
                        };
                    });
                    return updated;
                });

                setCandles((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((stock) => {
                        if (!updated[stock.s]) {
                            // Seed an initial candle from the snapshot data
                            const bucket = Math.floor(Date.now() / 300000) * 300000;
                            updated[stock.s] = [{
                                time:  bucket,
                                open:  stock.open,
                                high:  stock.high,
                                low:   stock.low,
                                close: stock.close ?? stock.p,
                            }];
                        }
                    });
                    return updated;
                });

                return;
            }

            // ── live trade tick ───────────────────────────────────
            // FIX: response.data is a SINGLE object from Alpaca, not an array
            if (response.type === "trade") {
                setLastUpdated(new Date().toLocaleTimeString());

                const trade = response.data; // { s, p, v, t }

                // FIX: Alpaca sends t as ISO string → convert to ms first
                const tradeMs = new Date(trade.t).getTime();
                const bucket  = Math.floor(tradeMs / 300000) * 300000;

                setStocks((prev) => {
                    if (!prev[trade.s]) return prev;
                    return {
                        ...prev,
                        [trade.s]: {
                            ...prev[trade.s],
                            price:  trade.p,
                            volume: trade.v,
                        },
                    };
                });

                setCandles((prev) => {
                    const list = prev[trade.s] ? [...prev[trade.s]] : [];
                    const last = list.at(-1);

                    if (last && last.time === bucket) {
                        // Update the current candle
                        list[list.length - 1] = {
                            ...last,
                            high:  Math.max(last.high, trade.p),
                            low:   Math.min(last.low,  trade.p),
                            close: trade.p,
                        };
                    } else {
                        // Open a new candle
                        list.push({
                            time:  bucket,
                            open:  trade.p,
                            high:  trade.p,
                            low:   trade.p,
                            close: trade.p,
                        });
                    }

                    return { ...prev, [trade.s]: list };
                });

                return;
            }

            // ── minute bar (OHLCV) ────────────────────────────────
            // FIX: this message type was completely missing — it's the
            // most reliable source for candlestick data from Alpaca
            if (response.type === "bar") {
                setLastUpdated(new Date().toLocaleTimeString());

                const bar = response.data; // { s, open, high, low, close, volume, t }

                // FIX: t is ISO string → convert to ms for candle time key
                const barMs  = new Date(bar.t).getTime();
                const bucket = Math.floor(barMs / 60000) * 60000; // 1-min buckets for bars

                setStocks((prev) => {
                    if (!prev[bar.s]) return prev;
                    return {
                        ...prev,
                        [bar.s]: {
                            ...prev[bar.s],
                            price:  bar.close,
                            open:   bar.open,
                            high:   bar.high,
                            low:    bar.low,
                            close:  bar.close,
                            volume: bar.volume,
                        },
                    };
                });

                setCandles((prev) => {
                    const list = prev[bar.s] ? [...prev[bar.s]] : [];
                    const last = list.at(-1);

                    if (last && last.time === bucket) {
                        // Replace with authoritative OHLCV from Alpaca
                        list[list.length - 1] = {
                            time:  bucket,
                            open:  bar.open,
                            high:  bar.high,
                            low:   bar.low,
                            close: bar.close,
                        };
                    } else {
                        list.push({
                            time:  bucket,
                            open:  bar.open,
                            high:  bar.high,
                            low:   bar.low,
                            close: bar.close,
                        });
                    }

                    return { ...prev, [bar.s]: list };
                });

                return;
            }
        };

        socket.onerror = () => {
            setError("Could not connect to stock websocket");
            setConnectionStatus("Error");
        };

        socket.onclose = () => {
            setConnectionStatus("Disconnected");
        };

        return () => {
            socket.close();
        };
    }, []);

    return {
        stocks,
        candles,
        marketStatus,
        connectionStatus,
        error,
        lastUpdated,
    };
}

export default useLiveStocks;