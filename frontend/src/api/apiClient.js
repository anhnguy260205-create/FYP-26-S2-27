import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";

// Wait for Firebase to finish checking the current login state.
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

// Log out the user if their account was suspended during the session.
async function kickOutSuspendedUser() {
  if (kickingOut) return;
  kickingOut = true;
  sessionStorage.removeItem("currentUser");
  try { await signOut(auth); } catch { /* ignore */ }
  window.location.href = "/login?suspended=1";
}

// Add the Firebase Bearer token to protected requests.
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
        // Convert object-based error details into a simple message.
        return new Response(
          JSON.stringify({ ...body, detail: body.detail.message }),
          { status: response.status, statusText: response.statusText, headers: response.headers },
        );
      }
    } catch { /* not JSON, so leave the response unchanged */ }
  }

  return response;
}

// Send a request with authFetch and return the parsed JSON.
export async function requestJson(url, options = {}) {
  const response = await authFetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.detail || `Request failed with status ${response.status}`);
  }
  return data;
}
