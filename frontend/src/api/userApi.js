import { signOut } from "firebase/auth";
import { authFetch, requestJson } from "./apiClient";
import { auth } from "../firebase";

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


export const firebaseLogin = async () => {
  const response = await authFetch(`${BASE_URL}/firebase-login`, {
    method: "POST",
  });
  return response.json();
};


export const refreshSessionUser = async () => {
  const stored = JSON.parse(sessionStorage.getItem("currentUser") || "null");
  if (!stored) return null;
  try {
    const response = await authFetch(`${BASE_URL}/session`);
    const data = await response.json();
    if (!data.success) return null;
    const merged = { ...stored, ...data.user };
    sessionStorage.setItem("currentUser", JSON.stringify(merged));
    return merged;
  } catch {
    return null;
  }
};


export const verifyLoginOtp = async (otpCode) => {
  const response = await authFetch(`${BASE_URL}/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp_code: otpCode }),
  });
  return response.json();
};


export const resendLoginOtp = async () => {
  const response = await authFetch(`${BASE_URL}/mfa/resend`, { method: "POST" });
  return response.json();
};

export const logoutAccount = async () => {
  const response = await authFetch(`${BASE_URL}/logout`, { method: "POST" });
  const result = await response.json();
  // End the Firebase session too — otherwise auth_time (and the email-OTP
  // verification tied to it) survives the app-level logout, letting the
  // next login skip the OTP step.
  await signOut(auth).catch(() => {});
  return result;
};


export const logoutOnUnload = () => {
  authFetch(`${BASE_URL}/logout`, { method: "POST", keepalive: true });
};

export const getInvestorInformation = async (userId) => {
  return requestJson(`${BASE_URL}/investor-information/${userId}`);
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


export const requestDeleteOtp = async () => {
  const response = await authFetch(`${BASE_URL}/delete-investor/request-otp`, {
    method: "POST",
  });
  return response.json();
};


export const deleteInvestor = async (userId, pin = null, otp = null) => {
  let response;
  try {
    response = await authFetch(`${BASE_URL}/delete-investor/${userId}`, {
      method: "DELETE",
      body: JSON.stringify({ pin, otp }),
    });
  } catch (networkError) {
    return { success: false, message: `Network error: ${networkError.message}` };
  }
  try {
    return await response.json();
  } catch {
    return {
      success: false,
      message: `Server returned an unreadable response (HTTP ${response.status}).`,
    };
  }
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

// ── Transaction PIN ─────────────────────────────────────────────────────────


export const getPinStatus = async () => {
  return requestJson(`${BASE_URL}/pin/status`);
};


export const setTransactionPin = async (pin, confirmPin) => {
  const response = await authFetch(`${BASE_URL}/pin/set`, {
    method: "POST",
    body: JSON.stringify({ pin, confirm_pin: confirmPin }),
  });
  return response.json();
};

export const getSubscriptionStatus = async (userId) => {
  const response = await authFetch(`${BASE_URL}/subscription-status/${userId}`);
  return response.json();
};

export const getSubscriptionDetails = async (userId) => {
  const response = await authFetch(`${BASE_URL}/subscription-details/${userId}`);
  return response.json();
};

export const cancelSubscription = async (userId) => {
  const response = await authFetch(`${BASE_URL}/cancel-subscription/${userId}`, {
    method: "POST",
  });
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

export const changePassword = async (currentPassword, newPassword) => {
  const response = await authFetch(`${BASE_URL}/change-password`, {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
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
