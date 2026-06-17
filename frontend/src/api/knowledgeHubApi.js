const BASE = "http://127.0.0.1:8000/knowledge";

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

export const getMyArticles = async (userId) => {
  const res = await fetch(`${BASE}/my-articles/${userId}`);
  return res.json();
};

export const createArticle = async (data) => {
  const res = await fetch(`${BASE}/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateArticle = async (articleId, data) => {
  const res = await fetch(`${BASE}/articles/${articleId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteArticle = async (articleId, userId) => {
  const res = await fetch(`${BASE}/articles/${articleId}?user_id=${userId}`, {
    method: "DELETE",
  });
  return res.json();
};
