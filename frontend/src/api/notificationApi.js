import { authFetch } from "./apiClient";

const BASE = import.meta.env.VITE_API_URL;

export async function getNotifications(userId) {
  const res = await authFetch(`${BASE}/notification/list/${userId}`);
  return res.json();
}

export async function markNotificationRead(notificationId) {
  const res = await authFetch(`${BASE}/notification/${notificationId}/read`, {
    method: "POST",
  });
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await authFetch(`${BASE}/notification/mark-all-read`, {
    method: "POST",
  });
  return res.json();
}

export async function deleteNotification(notificationId) {
  const res = await authFetch(`${BASE}/notification/${notificationId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function broadcastNotification({ audience, title, message }) {
  const res = await authFetch(`${BASE}/notification/broadcast`, {
    method: "POST",
    body: JSON.stringify({ audience, title, message }),
  });
  return res.json();
}

export async function getBroadcastHistory(search) {
  const qs = search ? `?q=${encodeURIComponent(search)}` : "";
  const res = await authFetch(`${BASE}/notification/broadcast/history${qs}`);
  return res.json();
}

export async function updateBroadcast(broadcastId, { title, message }) {
  const res = await authFetch(`${BASE}/notification/broadcast/${broadcastId}`, {
    method: "PUT",
    body: JSON.stringify({ title, message }),
  });
  return res.json();
}

export async function deleteBroadcast(broadcastId) {
  const res = await authFetch(`${BASE}/notification/broadcast/${broadcastId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function getAdminNotifications(search) {
  const qs = search ? `?q=${encodeURIComponent(search)}` : "";
  const res = await authFetch(`${BASE}/notification/admin/all${qs}`);
  return res.json();
}

export async function updateAdminNotification(notificationId, { title, message }) {
  const res = await authFetch(`${BASE}/notification/admin/${notificationId}`, {
    method: "PUT",
    body: JSON.stringify({ title, message }),
  });
  return res.json();
}

export async function getNotificationTemplates() {
  const res = await authFetch(`${BASE}/notification/templates`);
  return res.json();
}

export async function updateNotificationTemplate(templateId, { title, message }) {
  const res = await authFetch(`${BASE}/notification/templates/${templateId}`, {
    method: "PUT",
    body: JSON.stringify({ title, message }),
  });
  return res.json();
}
