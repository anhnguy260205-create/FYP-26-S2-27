// src/api/userapi.js

const BASE_URL = "http://127.0.0.1:8000/user";

export const createAccount = async (formData) => {
  const response = await fetch(`${BASE_URL}/create-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return await response.json();
};

export const loginAccount = async (formData) => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return await response.json();
};