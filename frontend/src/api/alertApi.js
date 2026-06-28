import { authFetch } from "./apiClient";

const BASE = import.meta.env.VITE_API_URL;

export async function createAlert(data) {
  const res = await authFetch(`${BASE}/alert/create`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getAlerts(userId) {
  const res = await authFetch(`${BASE}/alert/list/${userId}`);
  return res.json();
}

export async function deleteAlert(alertId) {
  const res = await authFetch(`${BASE}/alert/delete/${alertId}`, {
    method: "DELETE",
  });
  return res.json();
}
