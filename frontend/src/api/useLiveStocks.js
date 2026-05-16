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

            // market status
            if (response.type === "market_status") {
                setMarketStatus(response.status);
                return;
            }

            // backend errors
            if (response.type === "error") {
                setError(response.message);
                return;
            }

            // ── snapshot (on connect) ──────────────────────────────
            if (response.type === "snapshot") {
                setLastUpdated(new Date().toLocaleTimeString());

                setStocks((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((stock) => {
                        updated[stock.s] = {
                            symbol: stock.s,
                            price: stock.p,
                            open: stock.open,
                            high: stock.high,
                            low: stock.low,
                            close: stock.close ?? stock.p,
                            previousClose: stock.previousClose,
                            volume: stock.v ?? stock.volume,
                        };
                    });
                    return updated;
                });

                setCandles((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((stock) => {
                        if (!updated[stock.s]) {
                            updated[stock.s] = [{
                                time: Math.floor(Date.now() / 300000) * 300000,
                                open: stock.open,
                                high: stock.high,
                                low: stock.low,
                                close: stock.close ?? stock.p,
                            }];
                        }
                    });
                    return updated;
                });
            }

            // ── live trades ───────────────────────────────────────
            if (response.type === "trade") {
                setLastUpdated(new Date().toLocaleTimeString());

                setStocks((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((trade) => {
                        if (updated[trade.s]) {
                            updated[trade.s] = {
                                ...updated[trade.s],
                                price: trade.p,
                                volume: trade.v,
                            };
                        }
                    });
                    return updated;
                });

                setCandles((prev) => {
                    const updated = { ...prev };
                    response.data.forEach((trade) => {
                        const { s, p, t, v } = trade;
                        const bucket = Math.floor(t / 300000) * 300000;
                        const list = updated[s] ? [...updated[s]] : [];
                        const last = list.at(-1);

                        if (last && last.time === bucket) {
                            list[list.length - 1] = {
                                ...last,
                                high: Math.max(last.high, p),
                                low: Math.min(last.low, p),
                                close: p,
                            };
                        } else {
                            list.push({ time: bucket, open: p, high: p, low: p, close: p });
                        }

                        updated[s] = list;
                    });
                    return updated;
                });
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
        candles,              // ← export it
        marketStatus,
        connectionStatus,
        error,
        lastUpdated,
    };
}

export default useLiveStocks;