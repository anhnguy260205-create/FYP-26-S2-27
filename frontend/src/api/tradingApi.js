import { authFetch } from "./apiClient";

const BASE_URL = `${import.meta.env.VITE_API_URL}/trading`;

export const buyStock = async (userId, symbol, quantity, pin = null) => {
  const response = await authFetch(`${BASE_URL}/buy`, {
    method: "POST",
    body: JSON.stringify({ symbol, quantity, pin }),
  });
  return response.json();
};

export const sellStock = async (userId, symbol, quantity, pin = null) => {
  const response = await authFetch(`${BASE_URL}/sell`, {
    method: "POST",
    body: JSON.stringify({ symbol, quantity, pin }),
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

export const addAssets = async (userId, amount) => {
  const response = await authFetch(`${BASE_URL}/add-assets`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
  return response.json();
};

export const submitOrder = async (userId, symbol, orderType, quantity, limitPrice) => {
  const response = await authFetch(`${BASE_URL}/order`, {
    method: "POST",
    body: JSON.stringify({
      symbol,
      order_type: orderType,
      quantity,
      limit_price: limitPrice,
    }),
  });
  return response.json();
};

export const getOrders = async (userId, symbol = null) => {
  const params = new URLSearchParams();
  if (symbol) params.append("symbol", symbol);
  const qs = params.toString() ? `?${params}` : "";
  const response = await authFetch(`${BASE_URL}/orders/${userId}${qs}`);
  return response.json();
};

export const cancelOrder = async (orderId) => {
  const response = await authFetch(`${BASE_URL}/orders/${orderId}`, {
    method: "DELETE",
  });
  return response.json();
};
