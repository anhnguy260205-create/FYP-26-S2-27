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

export async function getForumPosts() {
  const res = await fetch(`${API_BASE}/expert/forum/questions?limit=100`);
  return readJson(res);
}

export async function getForumPost(questionId, incrementViews = true) {
  const res = await fetch(`${API_BASE}/expert/forum/question/${questionId}?increment_views=${incrementViews}`);
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
