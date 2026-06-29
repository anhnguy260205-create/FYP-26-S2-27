import { authFetch } from "./apiClient";

const BASE_URL = `${import.meta.env.VITE_API_URL}/user`;

// ── Public ─────────────────────────────────────────────────────────────────────

export const createAccount = async (formData) => {
  const response = await fetch(`${BASE_URL}/create-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return response.json();
};

export const checkEmailExists = async (email) => {
  const response = await fetch(
    `${BASE_URL}/check-email?email=${encodeURIComponent(email)}`
  );
  return response.json();
};

export const lookupAccount = async (emailAddress) => {
  const response = await fetch(`${BASE_URL}/lookup-account`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: emailAddress }),
  });
  return response.json();
};

export const requestPasswordResetOtp = async (emailAddress) => {
  const response = await fetch(`${BASE_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: emailAddress }),
  });
  return response.json();
};

export const verifyPasswordResetOtp = async (emailAddress, otpCode) => {
  const response = await fetch(`${BASE_URL}/verify-reset-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email_address: emailAddress, otp_code: otpCode }),
  });
  return response.json();
};

export const resetPassword = async (emailAddress, otpCode, newPassword) => {
  const response = await fetch(`${BASE_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email_address: emailAddress,
      otp_code: otpCode,
      new_password: newPassword,
    }),
  });
  return response.json();
};

// ── Auth required ──────────────────────────────────────────────────────────────

/** Exchange a verified Firebase session for the full internal user profile. */
export const firebaseLogin = async () => {
  const response = await authFetch(`${BASE_URL}/firebase-login`, {
    method: "POST",
  });
  return response.json();
};

export const logoutAccount = async () => {
  const response = await authFetch(`${BASE_URL}/logout`, { method: "POST" });
  return response.json();
};

export const getInvestorInformation = async (userId) => {
  const response = await authFetch(`${BASE_URL}/investor-information/${userId}`);
  return response.json();
};

export const getExpertInformation = async (userId) => {
  const response = await authFetch(`${BASE_URL}/expert-information/${userId}`);
  return response.json();
};

export const updateUserInformation = async (
  userId,
  user_name,
  fullName,
  emailAddress,
  phoneNumber,
  address
) => {
  const response = await authFetch(`${BASE_URL}/update-information/${userId}`, {
    method: "POST",
    body: JSON.stringify({
      user_name,
      full_name: fullName,
      email_address: emailAddress,
      phone_number: phoneNumber != null ? String(phoneNumber) : null,
      address,
    }),
  });
  return response.json();
};

export const deleteInvestor = async (userId) => {
  const response = await authFetch(`${BASE_URL}/delete-investor/${userId}`, {
    method: "DELETE",
  });
  return response.json();
};

export const getWatchlist = async (userId) => {
  const response = await authFetch(`${BASE_URL}/investor-watchlist/${userId}`);
  return response.json();
};

export const addStockToWatchlist = async (userId, stock_symbol) => {
  const response = await authFetch(`${BASE_URL}/investor-watchlist/${userId}`, {
    method: "POST",
    body: JSON.stringify({ stock_symbol }),
  });
  return response.json();
};

export const removeStockFromWatchlist = async (userId, stock_symbol) => {
  const response = await authFetch(
    `${BASE_URL}/investor-watchlist/${userId}/${stock_symbol}`,
    { method: "DELETE" }
  );
  return response.json();
};

export const updateInvestorInterests = async (userId, interests) => {
  const response = await authFetch(`${BASE_URL}/update-interests`, {
    method: "POST",
    body: JSON.stringify({ interests }),
  });
  return response.json();
};

export const updateRiskTolerance = async (userId, riskTolerance) => {
  const response = await authFetch(`${BASE_URL}/update-risk-tolerance`, {
    method: "POST",
    body: JSON.stringify({ risk_tolerance: riskTolerance }),
  });
  return response.json();
};

export const getSubscriptionStatus = async (userId) => {
  const response = await authFetch(`${BASE_URL}/subscription-status/${userId}`);
  return response.json();
};

export const updateSubscriptionStatus = async (userId, planType) => {
  const response = await authFetch(`${BASE_URL}/create-checkout-session`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, plan_type: planType }),
  });
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

export const changePassword = async (newPassword) => {
  const response = await authFetch(`${BASE_URL}/change-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });
  return response.json();
};

export const verifySession = async (sessionId) => {
  let response;
  try {
    response = await authFetch(`${BASE_URL}/verify-session`, {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  } catch (e) {
    return { success: false, message: `Network error: ${e.message}` };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => "(no body)");
    return {
      success: false,
      message: `Server returned non-JSON (${response.status}): ${text.slice(0, 200)}`,
    };
  }
  return data;
};
