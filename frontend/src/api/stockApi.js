const BASE = import.meta.env.VITE_API_URL;

export const fetchStockSnapshot = async (symbol) => {
  const res = await fetch(`${BASE}/stocks/snapshot/${encodeURIComponent(symbol)}`);
  return res.json();
};

export const fetchStockCandles = async (symbol, range = "1D") => {
  const res = await fetch(`${BASE}/stocks/candles/${encodeURIComponent(symbol)}?range=${range}`);
  return res.json();
};
