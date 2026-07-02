import { authFetch } from "./apiClient.js";

const BASE = import.meta.env.VITE_API_URL;

// Company key stats, upcoming earnings and profile for the Overview tab.
export const fetchOverview = async (symbol) => {
  const res = await authFetch(`${BASE}/predict/overview/${encodeURIComponent(symbol)}`);
  return res.json();
};
