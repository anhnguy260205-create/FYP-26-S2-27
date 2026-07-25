import { authFetch } from "./apiClient.js";

const BASE = import.meta.env.VITE_API_URL;

export const fetchStockSnapshot = async (symbol) => {
  const res = await fetch(`${BASE}/stocks/snapshot/${encodeURIComponent(symbol)}`);
  return res.json();
};

export const fetchStockCandles = async (symbol, range = "1D") => {
  const res = await fetch(`${BASE}/stocks/candles/${encodeURIComponent(symbol)}?range=${range}`);
  return res.json();
};

// Basic investors: lifetime limit of 3 distinct stocks' real-time dashboards.
// Re-opening an already-unlocked stock is free; premium/expert/admin are unlimited.
export const checkDashboardAccess = async (symbol) => {
  const res = await authFetch(`${BASE}/stocks/dashboard-access/${encodeURIComponent(symbol)}`);
  return res.json();
};

// Read-only quota summary — does NOT consume/unlock a stock, unlike
// checkDashboardAccess. Used to render locked/unlocked state in lists.
export const fetchDashboardUsage = async () => {
  const res = await authFetch(`${BASE}/stocks/dashboard-usage`);
  return res.json();
};
