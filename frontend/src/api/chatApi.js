import { authFetch } from "./apiClient.js";

const API_BASE = import.meta.env.VITE_API_URL;

export const sendChatMessage = async (recipientId, content) => {
  const res = await authFetch(`${API_BASE}/chat/send`, {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId, content }),
  });
  return res.json();
};

export const getConversations = async () => {
  const res = await authFetch(`${API_BASE}/chat/conversations`);
  return res.json();
};

export const getChatMessages = async (convId) => {
  const res = await authFetch(`${API_BASE}/chat/messages/${convId}`);
  return res.json();
};

export const getUnreadCount = async () => {
  const res = await authFetch(`${API_BASE}/chat/unread-count`);
  return res.json();
};

export const searchChatUsers = async (query) => {
  const res = await authFetch(`${API_BASE}/chat/users/search?q=${encodeURIComponent(query)}`);
  return res.json();
};
