import { authFetch } from "./apiClient";

const BASE = `${import.meta.env.VITE_API_URL}/knowledge`;

// ── Public reads ───────────────────────────────────────────────────────────────

export const getArticles = async ({ category, tag, limit = 50 } = {}) => {
  const params = new URLSearchParams({ limit });
  if (category) params.append("category", category);
  if (tag) params.append("tag", tag);
  const res = await fetch(`${BASE}/articles?${params}`);
  return res.json();
};

export const getArticle = async (articleId) => {
  const res = await fetch(`${BASE}/articles/${articleId}`);
  return res.json();
};

// ── Auth required ──────────────────────────────────────────────────────────────

export const getMyArticles = async (userId) => {
  const res = await authFetch(`${BASE}/my-articles/${userId}`);
  return res.json();
};

export const createArticle = async (data) => {
  const res = await authFetch(`${BASE}/articles`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateArticle = async (articleId, data) => {
  const res = await authFetch(`${BASE}/articles/${articleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteArticle = async (articleId) => {
  const res = await authFetch(`${BASE}/articles/${articleId}`, {
    method: "DELETE",
  });
  return res.json();
};
