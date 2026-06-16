// src/api/tradingApi.js

const BASE_URL = "http://127.0.0.1:8000/trading";

export const buyStock = async (userId, symbol, quantity, price) => {
  const response = await fetch(`${BASE_URL}/buy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      symbol,
      quantity,
      price,
    }),
  });
  return await response.json();
};

export const sellStock = async (userId, symbol, quantity, price) => {
  const response = await fetch(`${BASE_URL}/sell`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      symbol,
      quantity,
      price,
    }),
  });
  return await response.json();
};

export const getPortfolio = async (userId) => {
  const response = await fetch(`${BASE_URL}/portfolio/${userId}`);
  return await response.json();
};

export const getTransactionHistory = async (investorId) => {
  const response = await fetch(`${BASE_URL}/transactions/${investorId}`);
  return await response.json();
};
