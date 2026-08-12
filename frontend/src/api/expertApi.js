import { requestJson } from "./apiClient";

const EXPERT_BASE_URL = `${import.meta.env.VITE_API_URL}/expert`;
const FORUM_BASE_URL = `${import.meta.env.VITE_API_URL}/consultant-forum`;

export const getExpertPortfolio = (userId) =>
  requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`);

export const saveExpertPortfolio = (userId, portfolio) =>
  requestJson(`${EXPERT_BASE_URL}/portfolio/${userId || "demo"}`, {
    method: "POST",
    body: JSON.stringify(portfolio),
  });

export const publishPortfolio = (published) =>
  requestJson(`${EXPERT_BASE_URL}/portfolio-publish`, {
    method: "POST",
    body: JSON.stringify({ published }),
  });

export const setChatAvailability = (available) =>
  requestJson(`${EXPERT_BASE_URL}/chat-availability`, {
    method: "POST",
    body: JSON.stringify({ available }),
  });


// Public expert directory
export const getPublicExpertStats = () =>
  requestJson(`${EXPERT_BASE_URL}/public-stats`);

// ── Follow / unfollow an expert ──────────────────────────────────────────────

export const followExpert = (expertUserId) =>
  requestJson(`${EXPERT_BASE_URL}/${expertUserId}/follow`, { method: "POST" });

export const unfollowExpert = (expertUserId) =>
  requestJson(`${EXPERT_BASE_URL}/${expertUserId}/follow`, { method: "DELETE" });

export const getFollowedExperts = () =>
  requestJson(`${EXPERT_BASE_URL}/my-follows`);

// Portfolio ratings and reviews
export const getPortfolioReviews = (expertUserId) =>
  requestJson(`${EXPERT_BASE_URL}/${expertUserId}/portfolio-reviews`);

export const submitPortfolioReview = (expertUserId, { rating, comment }) =>
  requestJson(`${EXPERT_BASE_URL}/${expertUserId}/portfolio-reviews`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });

export const deletePortfolioReview = (expertUserId) =>
  requestJson(`${EXPERT_BASE_URL}/${expertUserId}/portfolio-reviews`, { method: "DELETE" });

// Expert compensation

export const getExpertCompensationSummary = () =>
  requestJson(`${EXPERT_BASE_URL}/compensation/summary`);

// Forum reads are public, while changes require authentication
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

export const updateForumPost = (postId, payload) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const replyForumPost = (postId, payload) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/reply`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const toggleForumLike = (postId, userId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/like`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId || "" }),
  });

export const toggleForumSave = (postId, userId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/save`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId || "" }),
  });

export const deleteForumPost = (postId, userId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId || "" }),
  });

export const updateForumReply = (postId, replyId, content, userId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
    method: "PUT",
    body: JSON.stringify({ content, user_id: userId || "" }),
  });

export const deleteForumReply = (postId, replyId, userId) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/replies/${replyId}`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: userId || "" }),
  });

// Flag posts or replies for moderation

export const flagForumPost = (postId, reason) =>
  requestJson(`${FORUM_BASE_URL}/posts/${postId}/flag`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Inappropriate content" }),
  });

export const flagForumReply = (replyId, reason) =>
  requestJson(`${FORUM_BASE_URL}/replies/${replyId}/flag`, {
    method: "POST",
    body: JSON.stringify({ reason: reason || "Inappropriate content" }),
  });

export const getForumRemovalNotice = () =>
  requestJson(`${FORUM_BASE_URL}/removal-notice`);

export const acknowledgeForumRemoval = (removalId) =>
  requestJson(`${FORUM_BASE_URL}/removal-notice/acknowledge`, {
    method: "POST",
    body: JSON.stringify({ removal_id: removalId }),
  });

// Admin forum moderation
export const adminGetFlaggedPosts = () =>
  requestJson(`${FORUM_BASE_URL}/admin/flagged`);

export const adminGetAllPosts = () =>
  requestJson(`${FORUM_BASE_URL}/admin/all`);

export const adminClearForumFlags = (postId) =>
  requestJson(`${FORUM_BASE_URL}/admin/${postId}/flags`, {
    method: "DELETE",
  });

export const adminDeleteForumPost = (postId, reason) =>
  requestJson(`${FORUM_BASE_URL}/admin/${postId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason: reason || "Violated community guidelines" }),
  });


export const adminDeleteForumReply = (postId, replyId, reason) =>
  requestJson(`${FORUM_BASE_URL}/admin/posts/${postId}/replies/${replyId}`, {
    method: "DELETE",
    body: JSON.stringify({ reason: reason || "Violated community guidelines" }),
  });
