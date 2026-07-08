import { authFetch } from "./apiClient.js";

const BASE = import.meta.env.VITE_API_URL;

// Full Quant Rating for one ticker.
export const fetchRating = async (symbol) => {
  const res = await authFetch(`${BASE}/rating/${encodeURIComponent(symbol)}`);
  return res.json();
};

// Leaderboard for a sector cohort.
export const fetchSectorRanking = async (sectorKey) => {
  const res = await authFetch(`${BASE}/rating/sector/${encodeURIComponent(sectorKey)}`);
  return res.json();
};

// List of available sectors.
export const fetchSectors = async () => {
  const res = await authFetch(`${BASE}/rating/sectors`);
  return res.json();
};
