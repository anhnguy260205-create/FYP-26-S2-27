const API_BASE = "http://127.0.0.1:8000";

async function readJson(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    const text = await response.text().catch(() => "");
    throw new Error(`Server returned ${response.status}: ${text.slice(0, 160)}`);
  }
  if (!response.ok || data?.success === false) {
    throw new Error(data?.detail || data?.message || `Request failed with ${response.status}`);
  }
  return data;
}

export async function getForumPosts(userId = null, savedOnly = false) {
  const params = new URLSearchParams({ limit: "100" });
  if (userId) params.set("user_id", userId);
  if (savedOnly) params.set("saved_only", "true");
  const res = await fetch(`${API_BASE}/expert/forum/questions?${params.toString()}`);
  return readJson(res);
}

export async function getForumPost(questionId, incrementViews = true, userId = null) {
  const params = new URLSearchParams({ increment_views: String(incrementViews) });
  if (userId) params.set("user_id", userId);
  const res = await fetch(`${API_BASE}/expert/forum/question/${questionId}?${params.toString()}`);
  return readJson(res);
}

export async function createForumPost(payload) {
  const res = await fetch(`${API_BASE}/expert/forum/question/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function updateForumPost(questionId, userId, payload) {
  const res = await fetch(`${API_BASE}/expert/forum/question/${questionId}/update?user_id=${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}


export async function toggleForumPostLike(questionId, userId) {
  const res = await fetch(`${API_BASE}/expert/forum/question/${questionId}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return readJson(res);
}

export async function toggleForumPostSave(questionId, userId) {
  const res = await fetch(`${API_BASE}/expert/forum/question/${questionId}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId }),
  });
  return readJson(res);
}

export async function seedDemoForumQuestions(expertId = null) {
  const params = new URLSearchParams();
  if (expertId) params.set("expert_id", expertId);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/expert/forum/seed-demo-questions${qs ? `?${qs}` : ""}`, { method: "POST" });
  return readJson(res);
}

export async function createForumReply(payload) {
  const res = await fetch(`${API_BASE}/expert/forum/reply/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function getExpertPortfolioByUser(userId) {
  const res = await fetch(`${API_BASE}/expert/portfolio/by-user/${userId}`);
  return readJson(res);
}

export async function getExpertPortfolios() {
  const res = await fetch(`${API_BASE}/expert/portfolios`);
  return readJson(res);
}

export async function createExpertPortfolio(payload) {
  const res = await fetch(`${API_BASE}/expert/portfolio/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function updateExpertPortfolio(portfolioId, userId, payload) {
  const res = await fetch(`${API_BASE}/expert/portfolio/${portfolioId}/update?user_id=${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function getExpertQuestions(expertId) {
  const res = await fetch(`${API_BASE}/expert/${expertId}/questions`);
  return readJson(res);
}
