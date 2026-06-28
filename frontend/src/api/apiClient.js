import { auth } from "../firebase";

async function getAuthHeader() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
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
