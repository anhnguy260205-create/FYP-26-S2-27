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

export const getReviews = ({ sort = "latest", page = 1, pageSize = 10, rating } = {}) => {
  const params = new URLSearchParams({ sort, page: String(page), page_size: String(pageSize) });
  if (rating) params.set("rating", String(rating));
  // Uses authFetch (not plain fetch) so the backend can identify the logged-in user
  // and correctly mark "is_mine" on their own review — while still working for guests,
  // since authFetch sends no Authorization header when nobody's logged in.
  return requestJson(`${REVIEW_BASE_URL}?${params.toString()}`);
};

// ── Authenticated user actions ─────────────────────────────────────────────────

export const getMyReview = () =>
  requestJson(`${REVIEW_BASE_URL}/mine`);

export const getRemovalNotice = () =>
  requestJson(`${REVIEW_BASE_URL}/removal-notice`);

export const acknowledgeRemoval = (removalId) =>
  requestJson(`${REVIEW_BASE_URL}/removal-notice/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ removal_id: removalId }),
  });

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
