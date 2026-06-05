import {
  useEffect,
  useRef,
  useState,
} from "react";

/* NORMALIZE + REMOVE DUPLICATES */
function normalizeCandles(candles) {
  const byTime = new Map();

  candles.forEach((candle) => {
    const time = Number(candle.time);

    const close = Number(candle.close);

    if (
      !Number.isFinite(time) ||
      !Number.isFinite(close)
    ) {
      return;
    }

    byTime.set(time, {
      ...candle,

      time,

      open: Number(
        candle.open ?? close
      ),

      high: Number(
        candle.high ?? close
      ),

      low: Number(
        candle.low ?? close
      ),

      close,

      volume: Number(
        candle.volume ?? 0
      ),
    });
  });

  return Array.from(byTime.values()).sort(
    (a, b) => a.time - b.time
  );
}

function parseStockMessage(rawMessage) {
  try {
    return JSON.parse(rawMessage);
  } catch (parseError) {
    const sanitizedMessage = rawMessage.replace(
      /:\s*(NaN|Infinity|-Infinity)(\s*[,}])/g,
      ": null$2"
    );

    return JSON.parse(sanitizedMessage);
  }
}

function useLiveStocks() {
  const [stocks, setStocks] = useState(
    {}
  );

  const [candles, setCandles] =
    useState({});

  const [candleRanges, setCandleRanges] =
    useState({});

  const [marketStatus, setMarketStatus] =
    useState("");

  const [
    connectionStatus,
    setConnectionStatus,
  ] = useState("Connecting...");

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState("");

  const socketRef = useRef(null);

  /* SEND RANGE REQUEST */
  const requestRangeData = (
    symbol,
    range
  ) => {
    if (
      socketRef.current &&
      socketRef.current.readyState ===
      WebSocket.OPEN
    ) {
      socketRef.current.send(
        JSON.stringify({
          type: "range",
          symbol,
          range,
        })
      );
    }
  };

  useEffect(() => {
    const socket = new WebSocket(
      "ws://127.0.0.1:8000/ws/stocks"
    );

    socketRef.current = socket;

    /* CONNECT */
    socket.onopen = () => {
      console.log("Connected");

      setConnectionStatus(
        "Connected"
      );

      setError("");
    };

    /* RECEIVE DATA */
    socket.onmessage = (event) => {
      let response;

      try {
        response = parseStockMessage(
          event.data
        );
      } catch (parseError) {
        console.error(
          "Invalid stock websocket message",
          parseError,
          event.data
        );

        setError(
          "Received invalid stock data from backend"
        );

        return;
      }

      console.log(response);

      /* MARKET STATUS */
      if (
        response.type ===
        "market_status"
      ) {
        setMarketStatus(
          response.status
        );

        return;
      }

      /* BACKEND ERROR */
      if (
        response.type === "error"
      ) {
        setError(response.message);

        return;
      }

      /* SNAPSHOT */
      if (
        response.type ===
        "snapshot"
      ) {
        setLastUpdated(
          new Date().toLocaleTimeString()
        );

        setStocks((prev) => {
          const updated = {
            ...prev,
          };

          response.data.forEach(
            (stock) => {
              updated[stock.s] = {
                symbol: stock.s,

                price: stock.p,

                open: stock.open,

                high: stock.high,

                low: stock.low,

                close:
                  stock.close ??
                  stock.p,

                previousClose:
                  stock.previousClose,

                volume:
                  stock.volume,

                avgVolume:
                  stock.avgVolume,
              };
            }
          );

          return updated;
        });

        return;
      }

      /* HISTORICAL DATA */
      if (
        response.type ===
        "history"
      ) {
        setLastUpdated(
          new Date().toLocaleTimeString()
        );

        setCandles((prev) => {
          const updated = {
            ...prev,
          };

          Object.entries(
            response.data ?? {}
          ).forEach(
            ([symbol, bars]) => {
              if (
                !Array.isArray(
                  bars
                )
              )
                return;

              updated[symbol] =
                normalizeCandles(
                  bars.map((bar) => ({
                    time: Number(
                      bar.time
                    ),

                    open: Number(
                      bar.open
                    ),

                    high: Number(
                      bar.high
                    ),

                    low: Number(
                      bar.low
                    ),

                    close: Number(
                      bar.close
                    ),

                    volume: Number(
                      bar.volume ??
                      0
                    ),
                  }))
                );
            }
          );

          return updated;
        });

        setCandleRanges((prev) => {
          const updated = {
            ...prev,
          };

          Object.keys(response.data ?? {}).forEach((symbol) => {
            updated[symbol] = response.range ?? "1D";
          });

          return updated;
        });

        return;
      }

      /* LIVE TRADE */
      if (
        response.type === "trade"
      ) {
        setLastUpdated(
          new Date().toLocaleTimeString()
        );

        const trade =
          response.data;

        const tradeMs =
          new Date(
            trade.t
          ).getTime();

        /* 1 MINUTE BUCKET */
        const bucket =
          Math.floor(
            tradeMs / 60000
          ) * 60000;

        /* UPDATE PRICE */
        setStocks((prev) => {
          if (!prev[trade.s])
            return prev;

          return {
            ...prev,

            [trade.s]: {
              ...prev[
              trade.s
              ],

              price: trade.p,
            },
          };
        });

        /* UPDATE CANDLE */
        setCandles((prev) => {
          const list = prev[
            trade.s
          ]
            ? [
              ...prev[
              trade.s
              ],
            ]
            : [];

          const last =
            list.at(-1);

          if (
            last &&
            last.time ===
            bucket
          ) {
            list[
              list.length - 1
            ] = {
              ...last,

              high:
                Math.max(
                  last.high,
                  trade.p
                ),

              low:
                Math.min(
                  last.low,
                  trade.p
                ),

              close:
                trade.p,

              volume:
                Number(
                  last.volume ??
                  0
                ) +
                Number(
                  trade.size ??
                  0
                ),
            };
          } else {
            list.push({
              time: bucket,

              open:
                trade.p,

              high:
                trade.p,

              low:
                trade.p,

              close:
                trade.p,

              volume:
                Number(
                  trade.size ??
                  0
                ),
            });
          }

          return {
            ...prev,

            [trade.s]:
              normalizeCandles(
                list
              ),
          };
        });

        return;
      }

      /* ALPACA BAR */
      if (
        response.type === "bar"
      ) {
        setLastUpdated(
          new Date().toLocaleTimeString()
        );

        const bar =
          response.data;

        const barMs =
          new Date(
            bar.t
          ).getTime();

        const bucket =
          Math.floor(
            barMs / 60000
          ) * 60000;

        setCandles((prev) => {
          const list = prev[
            bar.s
          ]
            ? [
              ...prev[
              bar.s
              ],
            ]
            : [];

          const last =
            list.at(-1);

          if (
            last &&
            last.time ===
            bucket
          ) {
            list[
              list.length - 1
            ] = {
              time: bucket,

              open:
                Number(
                  bar.open
                ),

              high:
                Number(
                  bar.high
                ),

              low: Number(
                bar.low
              ),

              close:
                Number(
                  bar.close
                ),

              volume:
                Number(
                  bar.volume ??
                  0
                ),
            };
          } else {
            list.push({
              time: bucket,

              open: Number(bar.open),

              high:
                Number(
                  bar.high
                ),

              low: Number(
                bar.low
              ),

              close:
                Number(
                  bar.close
                ),

              volume:
                Number(
                  bar.volume ??
                  0
                ),
            });
          }

          return {
            ...prev,

            [bar.s]:
              normalizeCandles(
                list
              ),
          };
        });

        return;
      }
    };

    /* SOCKET ERROR */
    socket.onerror = () => {
      setError(
        "Could not connect to stock websocket"
      );

      setConnectionStatus(
        "Error"
      );
    };

    /* SOCKET CLOSE */
    socket.onclose = () => {
      setConnectionStatus(
        "Disconnected"
      );
    };

    return () => {
      socket.close();
    };
  }, []);

  return {
    stocks,
    candles,
    candleRanges,
    marketStatus,
    connectionStatus,
    error,
    lastUpdated,
    requestRangeData,
  };
}

export default useLiveStocks;
