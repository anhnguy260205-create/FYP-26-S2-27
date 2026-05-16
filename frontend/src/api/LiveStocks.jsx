import { useEffect, useState } from "react";

function LiveStocks() {

  const [stocks, setStocks] = useState({});
  const [status, setStatus] = useState("Connecting to stock stream...");
  const [error, setError] = useState("");

  useEffect(() => {

    const socket = new WebSocket(
      "ws://127.0.0.1:8000/ws/stocks"
    );

    socket.onopen = () => {
      console.log("Stock websocket connected");
      setStatus("Connected. Waiting for live trades...");
      setError("");
    };

    socket.onmessage = (event) => {

      const response = JSON.parse(event.data);

      console.log("Stock websocket message:", response);

      if (response.type === "error") {
        setError(response.message || "Stock stream error");
        setStatus("Stock stream error");
        return;
      }

      if (response.data) {

        setStatus("Live stock prices");

        setStocks((prev) => {

          const updated = { ...prev };

          response.data.forEach((stock) => {

            updated[stock.s] = {
              price: stock.p,
              close: stock.close ?? stock.p,
              previousClose: stock.previousClose,
              volume: stock.v ?? stock.volume
            };

          });

          return updated;

        });

      }

    };

    socket.onerror = (event) => {
      console.error("Stock websocket error:", event);
      setError("Could not connect to backend stock websocket.");
      setStatus("Connection failed");
    };

    socket.onclose = () => {
      setStatus("Stock stream disconnected");
    };

    return () => socket.close();

  }, []);

  return (
    <div>

      <h1>{status}</h1>

      {error && <p>{error}</p>}

      {Object.entries(stocks).map(
        ([symbol, stock]) => (

        <div key={symbol}>

          <h2>{symbol}</h2>

          <p>
            Price: ${stock.price?.toFixed(2)}
          </p>

          {stock.close !== undefined && (
          <p>
            Closing price: ${stock.close?.toFixed(2)}
          </p>
          )}

          {stock.previousClose !== undefined && (
          <p>
            Previous close: ${stock.previousClose?.toFixed(2)}
          </p>
          )}

        </div>

      ))}

    </div>
  );
}

export default LiveStocks;
