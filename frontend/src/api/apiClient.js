import { onAuthStateChanged } from "firebase/auth";
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

/**
 * fetch() wrapper that automatically adds the Firebase Bearer token.
 * Use this for any request to a protected backend endpoint.
 */
export async function authFetch(url, options = {}) {
  const authHeader = await getAuthHeader();
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(options.headers || {}),
    },
  });
}
