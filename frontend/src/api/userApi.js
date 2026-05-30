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

export const logoutAccount = async (userId) => {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return await response.json();

}

export const updateSubscriptionStatus = async (
  userId,
  planType
) => {
  const response = await fetch(
    `${BASE_URL}/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        plan_type: planType,
      }),
    }
  );

  const result = await response.json();

  if (!result.success) {
    alert(result.message);
    return result;
  }

  if (result.checkout_url) {
    window.location.href = result.checkout_url;
  }

  return result;
};