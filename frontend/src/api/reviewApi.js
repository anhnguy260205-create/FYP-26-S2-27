import { authFetch } from "./apiClient";

const REVIEW_BASE_URL = `${import.meta.env.VITE_API_URL}/reviews`;

async function requestJson(url, options = {}) {
  const response = await authFetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

// ── Public reads (no auth needed — used on the landing page too) ──────────────

export const getReviewStats = () =>
  fetch(`${REVIEW_BASE_URL}/stats`).then((r) => r.json());

export const getReviews = ({ sort = "latest", page = 1, pageSize = 10, rating, userId } = {}) => {
  const params = new URLSearchParams({ sort, page: String(page), page_size: String(pageSize) });
  if (rating) params.set("rating", String(rating));
  if (userId) params.set("user_id", userId);
  return fetch(`${REVIEW_BASE_URL}?${params.toString()}`).then((r) => r.json());
};

// ── Authenticated user actions ─────────────────────────────────────────────────

export const getMyReview = () =>
  requestJson(`${REVIEW_BASE_URL}/mine`);

export const createReview = (payload) =>
  requestJson(REVIEW_BASE_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateReview = (reviewId, payload) =>
  requestJson(`${REVIEW_BASE_URL}/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const deleteReview = (reviewId) =>
  requestJson(`${REVIEW_BASE_URL}/${reviewId}`, {
    method: "DELETE",
  });

export const toggleReviewHelpful = (reviewId) =>
  requestJson(`${REVIEW_BASE_URL}/${reviewId}/helpful`, {
    method: "POST",
  });

// ── Admin moderation ────────────────────────────────────────────────────────────

export const flagReview = (reviewId, reason) =>
  requestJson(`${REVIEW_BASE_URL}/${reviewId}/flag`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Inappropriate content" }),
  });

export const adminGetFlaggedReviews = () =>
  requestJson(`${REVIEW_BASE_URL}/admin/flagged`);

export const adminGetAllReviews = () =>
  requestJson(`${REVIEW_BASE_URL}/admin/all`);

export const adminDeleteReview = (reviewId, reason) =>
  requestJson(`${REVIEW_BASE_URL}/admin/${reviewId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason: reason || "Violated community guidelines" }),
  });
