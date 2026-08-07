import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

// Resolves once Firebase has confirmed the auth state (handles page-refresh timing).
function waitForAuth() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user);
    });
  });
}

async function getAuthHeader() {
  const user = auth.currentUser ?? await waitForAuth();
  const headers = {};

  if (user?.email && import.meta.env.DEV) {
    headers["X-Dev-Email"] = user.email;
  }

  if (!user) return headers;

  try {
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  } catch (error) {
    console.warn("Failed to get Firebase ID token, continuing with dev fallback headers:", error);
  }

  return headers;
}

let kickingOut = false;

/** An admin suspended this account mid-session — force a clean logout instead
 * of leaving the page silently failing every subsequent request. */
async function kickOutSuspendedUser() {
  if (kickingOut) return;
  kickingOut = true;
  sessionStorage.removeItem("currentUser");
  try { await signOut(auth); } catch { /* ignore */ }
  window.location.href = "/login?suspended=1";
}

/**
 * fetch() wrapper that automatically adds the Firebase Bearer token.
 * Use this for any request to a protected backend endpoint.
 */
export async function authFetch(url, options = {}) {
  const authHeader = await getAuthHeader();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
  });

  if (response.status === 403) {
    try {
      const body = await response.clone().json();
      if (body?.detail?.code === "account_suspended") {
        kickOutSuspendedUser();
      } else if (body && typeof body.detail === "object" && body.detail !== null
        && typeof body.detail.message === "string") {
        // Some auth checks (e.g. mfa_required) return detail as
        // {code, message} instead of a plain string. Callers throughout the
        // app assume `detail` is always a string and render it directly, so
        // flatten it here rather than fixing every call site individually.
        return new Response(
          JSON.stringify({ ...body, detail: body.detail.message }),
          { status: response.status, statusText: response.statusText, headers: response.headers },
        );
      }
    } catch { /* not JSON, or body already consumed -- fall through untouched */ }
  }

  return response;
}

/** authFetch() + JSON parsing, throwing on a non-OK response. */
export async function requestJson(url, options = {}) {
  const response = await authFetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.detail || `Request failed with status ${response.status}`);
  }
  return data;
}
