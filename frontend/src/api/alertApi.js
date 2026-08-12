import { authFetch } from "./apiClient";

const BASE = import.meta.env.VITE_API_URL;

// Create a new alert.
export async function createAlert(data) {
  const res = await authFetch(`${BASE}/alert/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

// Get alerts for a user.
export async function getAlerts(userId) {
  const res = await authFetch(`${BASE}/alert/list/${userId}`);
  return res.json();
}

// Delete an existing alert.
export async function deleteAlert(alertId) {
  const res = await authFetch(`${BASE}/alert/delete/${alertId}`, {
    method: "DELETE",
  });
  return res.json();
}
