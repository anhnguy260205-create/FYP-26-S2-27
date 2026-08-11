import { authFetch } from "./apiClient.js";

const API_BASE = import.meta.env.VITE_API_URL;

// Send a message to another user.
export const sendChatMessage = async (recipientId, content) => {
  const res = await authFetch(`${API_BASE}/chat/send`, {
    method: "POST",
    body: JSON.stringify({ recipient_id: recipientId, content }),
  });
  return res.json();
};

// Get the user's conversations.
export const getConversations = async () => {
  const res = await authFetch(`${API_BASE}/chat/conversations`);
  return res.json();
};

// Get messages from a conversation.
export const getChatMessages = async (convId) => {
  const res = await authFetch(`${API_BASE}/chat/messages/${convId}`);
  return res.json();
};

// Get the number of unread messages.
export const getUnreadCount = async () => {
  const res = await authFetch(`${API_BASE}/chat/unread-count`);
  return res.json();
};

// Search for users by name or other details.
export const searchChatUsers = async (query) => {
  const res = await authFetch(`${API_BASE}/chat/users/search?q=${encodeURIComponent(query)}`);
  return res.json();
};
