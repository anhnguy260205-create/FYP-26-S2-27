import { authFetch } from "./apiClient";

const BASE_URL = `${import.meta.env.VITE_API_URL}/trading`;

export const buyStock = async (userId, symbol, quantity) => {
  const response = await authFetch(`${BASE_URL}/buy`, {
    method: "POST",
    body: JSON.stringify({ symbol, quantity }),
  });
  return response.json();
};

export const sellStock = async (userId, symbol, quantity) => {
  const response = await authFetch(`${BASE_URL}/sell`, {
    method: "POST",
    body: JSON.stringify({ symbol, quantity }),
  });
  return response.json();
};

export const getPortfolio = async (userId) => {
  const response = await authFetch(`${BASE_URL}/portfolio/${userId}`);
  return response.json();
};

export const getTransactionHistory = async (investorId) => {
  const response = await authFetch(`${BASE_URL}/transactions/${investorId}`);
  return response.json();
};

export const getPortalTransactions = async (
  userId,
  { limit = 100, symbol = null, transactionType = null } = {}
) => {
  const params = new URLSearchParams({ limit });
  if (symbol) params.append("symbol", symbol);
  if (transactionType) params.append("transaction_type", transactionType);
  const response = await authFetch(`${BASE_URL}/portal/${userId}?${params}`);
  return response.json();
};

export const getPortalSummary = async (userId) => {
  const response = await authFetch(`${BASE_URL}/portal/${userId}/summary`);
  return response.json();
};

export const addPaperMoney = async (userId, amount) => {
  const response = await authFetch(`${BASE_URL}/add-paper-money`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
  return response.json();
};
