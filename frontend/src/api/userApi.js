import { signOut } from "firebase/auth";
import { authFetch } from "./apiClient";
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

/** Re-check role/is_expert/verification/subscription against the backend and
 * patch sessionStorage's cached currentUser — catches admin-side changes
 * (e.g. a cancelled expert verification) without requiring a re-login.
 * Returns the merged user, or null if the check couldn't run. */
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

/** Verify the emailed login OTP (2nd factor; admins never need this). */
export const verifyLoginOtp = async (otpCode) => {
  const response = await authFetch(`${BASE_URL}/mfa/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp_code: otpCode }),
  });
  return response.json();
};

/** Ask the backend to email a fresh login OTP. */
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

/** Fire-and-forget logout for tab close/navigation-away — keepalive lets the
 * request finish after the page starts unloading. This fires on every
 * pagehide (refresh, HMR reload, actual tab close) so it must NOT sign out
 * of Firebase — that would kill the session on every reload, not just real
 * logouts. Only the explicit logoutAccount() ends the Firebase session. */
export const logoutOnUnload = () => {
  authFetch(`${BASE_URL}/logout`, { method: "POST", keepalive: true });
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

/** Step 1 of secured deletion — email a 6-digit OTP to the account holder. */
export const requestDeleteOtp = async () => {
  const response = await authFetch(`${BASE_URL}/delete-investor/request-otp`, {
    method: "POST",
  });
  return response.json();
};

/** Step 2 — delete, confirmed with the transaction PIN and the email OTP. */
export const deleteInvestor = async (userId, pin = null, otp = null) => {
  const response = await authFetch(`${BASE_URL}/delete-investor/${userId}`, {
    method: "DELETE",
    body: JSON.stringify({ pin, otp }),
  });
  return response.json();
};

export const deleteExpert = async (userId) => {
  const response = await authFetch(`${BASE_URL}/delete-expert/${userId}`, {
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

// ── Transaction PIN ─────────────────────────────────────────────────────────

/** Whether the current user has set a 6-digit transaction PIN. */
export const getPinStatus = async () => {
  const response = await authFetch(`${BASE_URL}/pin/status`);
  return response.json();
};

/** Set (or reset) the 6-digit transaction PIN — requires it entered twice. */
export const setTransactionPin = async (pin, confirmPin) => {
  const response = await authFetch(`${BASE_URL}/pin/set`, {
    method: "POST",
    body: JSON.stringify({ pin, confirm_pin: confirmPin }),
  });
  return response.json();
};

/** Verify a 6-digit PIN. Returns { success, valid }. */
export const verifyTransactionPin = async (pin) => {
  const response = await authFetch(`${BASE_URL}/pin/verify`, {
    method: "POST",
    body: JSON.stringify({ pin }),
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
