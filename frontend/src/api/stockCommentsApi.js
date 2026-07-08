// Symbol-scoped wrapper over the existing consultant-forum API.
// Reuses the forum's create/reply/like/delete so per-stock comments get
// threading, likes and moderation for free.
import {
  createForumPost,
  replyForumPost,
  toggleForumLike,
  deleteForumPost,
  deleteForumReply,
} from "./expertApi";

const FORUM_BASE_URL = `${import.meta.env.VITE_API_URL}/consultant-forum`;

// Public read — returns only posts tied to this ticker (symbol column or tag match).
export const getStockComments = (symbol, userId) => {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  if (symbol) params.set("symbol", symbol);
  const q = params.toString();
  return fetch(`${FORUM_BASE_URL}/posts${q ? `?${q}` : ""}`).then((r) => r.json());
};

export const postStockComment = (symbol, content) => {
  const title = content.trim().slice(0, 70) || `${symbol} discussion`;
  return createForumPost({ title, content, symbol, category: "Stock Discussion" });
};

export { replyForumPost, toggleForumLike, deleteForumPost, deleteForumReply };
