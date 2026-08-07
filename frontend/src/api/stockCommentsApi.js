// Per-stock "Expert Ideas" comments — dedicated, symbol-scoped endpoints
// backed by the Forum's forum_post/forum_reply tables (category="Stock
// Discussion", never exposed through the general community Forum). Posting
// is server-side restricted to verified experts; reading is server-side
// gated to premium/expert/admin viewers. Replies/likes/deletes are reused
// as-is from the general forum API since the backend gates those the same
// way for Stock Discussion posts.
import { requestJson } from "./apiClient";
import {
  replyForumPost,
  toggleForumLike,
  deleteForumPost,
  deleteForumReply,
} from "./expertApi";

const FORUM_BASE_URL = `${import.meta.env.VITE_API_URL}/consultant-forum`;

export const getStockComments = (symbol) =>
  requestJson(`${FORUM_BASE_URL}/stock-comments/${encodeURIComponent(symbol)}`);

export const postStockComment = (symbol, content) =>
  requestJson(`${FORUM_BASE_URL}/stock-comments/${encodeURIComponent(symbol)}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export { replyForumPost, toggleForumLike, deleteForumPost, deleteForumReply };
