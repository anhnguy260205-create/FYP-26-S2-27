import { authFetch } from "./apiClient";

const EXPERT_BASE_URL = `${import.meta.env.VITE_API_URL}/expert`;
const FORUM_BASE_URL = `${import.meta.env.VITE_API_URL}/consultant-forum`;

async function requestJson(url, options = {}) {
  const response = await authFetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const getExpertPortfolio = (userId) =>
  requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`);

export const saveExpertPortfolio = (userId, portfolio) =>
  requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`, {
    method: "POST",
    body: JSON.stringify(portfolio),
  });

export const getExpertQuestions = (userId) =>
  requestJson(`${EXPERT_BASE_URL}/questions/${userId || "demo"}`);

export const getExpertQuestionDetail = (questionId) =>
  requestJson(`${EXPERT_BASE_URL}/questions/detail/${questionId}`);

export const replyExpertQuestion = (questionId, replyText) =>
  requestJson(`${EXPERT_BASE_URL}/questions/${questionId}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply_text: replyText }),
  });

export const deleteExpertQuestionReply = (questionId) =>
  requestJson(`${EXPERT_BASE_URL}/questions/${questionId}/reply`, {
    method: "DELETE",
  });

// ── Forum (public reads use plain fetch; writes use authFetch via requestJson) ──

export const getForumPosts = (userId) => {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  // Public read — no auth needed
  return fetch(`${FORUM_BASE_URL}/posts${query}`).then((r) => r.json());
};

export const getForumPost = (postId, userId) => {
  const query = userId ? `?user_id=${encodeURIComponent(userId)}` : "";
  return fetch(`${FORUM_BASE_URL}/posts/${postId}${query}`).then((r) => r.json());
};

export const createForumPost = (payload) =>
  requestJson(`${FORUM_BASE_URL}/posts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const replyForumPost = (postId, payload) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/reply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const toggleForumLike = (postId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/like`, { method: "POST" });

export const toggleForumSave = (postId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/save`, { method: "POST" });

export const deleteForumPost = (postId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}`, { method: "DELETE" });

export const updateForumReply = (postId, replyId, content) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  });

export const deleteForumReply = (postId, replyId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
    method: "DELETE",
  });
