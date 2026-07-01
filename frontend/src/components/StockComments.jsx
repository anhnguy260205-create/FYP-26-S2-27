import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getStockComments,
  postStockComment,
  replyForumPost,
  toggleForumLike,
  deleteForumPost,
} from "../api/stockCommentsApi";

// ─── Role → badge style (experts highlighted, TradingView-style) ───────────────

const ROLE_BADGE = {
  expert:     { label: "Expert",     color: "#fbbf24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.4)" },
  consultant: { label: "Consultant", color: "#c084fc", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.4)" },
  premium:    { label: "Premium",    color: "#22d3ee", bg: "rgba(34,211,238,0.14)", border: "rgba(34,211,238,0.35)" },
};

const isExpert = (role) => role === "expert" || role === "consultant";

function initials(name = "?") {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
  catch { return {}; }
}

// ─── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, role }) {
  const expert = isExpert(role);
  return (
    <div className="flex items-center justify-center rounded-full shrink-0 text-xs font-bold"
      style={{
        width: 38, height: 38, color: "#fff",
        background: expert ? "linear-gradient(135deg,#f59e0b,#b45309)" : "linear-gradient(135deg,#0092b8,#155dfc)",
        boxShadow: expert ? "0 0 0 2px rgba(251,191,36,0.35)" : "none",
      }}>
      {initials(name)}
    </div>
  );
}

function RoleBadge({ role }) {
  const b = ROLE_BADGE[role];
  if (!b) return null;
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color: b.color, background: b.bg, border: `1px solid ${b.border}` }}>
      {b.label}
    </span>
  );
}

// ─── One comment (with replies) ────────────────────────────────────────────────

function CommentCard({ post, symbol, me, onChanged }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const expert = isExpert(post.author_role);
  const mine = me?.user_id && post.user_id === me.user_id;

  const like = async () => {
    try { await toggleForumLike(post.post_id); onChanged(); } catch { /* ignore */ }
  };
  const submitReply = async () => {
    if (!replyText.trim()) return;
    setBusy(true);
    try {
      await replyForumPost(post.post_id, { content: replyText.trim() });
      setReplyText(""); setShowReply(false); onChanged();
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this comment?")) return;
    try { await deleteForumPost(post.post_id); onChanged(); } catch { /* ignore */ }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-3.5"
      style={{
        background: expert ? "rgba(251,191,36,0.05)" : "rgba(15,23,42,0.55)",
        borderColor: expert ? "rgba(251,191,36,0.3)" : "rgba(51,65,85,0.6)",
      }}>
      <div className="flex gap-3">
        <Avatar name={post.author_name} role={post.author_role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">{post.author_name}</span>
            <RoleBadge role={post.author_role} />
            <span className="text-[11px] text-slate-500">· {timeAgo(post.created_at)}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap break-words">{post.content}</p>

          <div className="flex items-center gap-4 mt-2 text-slate-400">
            <button onClick={like}
              className={`flex items-center gap-1 text-xs transition hover:text-rose-400 ${post.liked_by_me ? "text-rose-400" : ""}`}>
              <span>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes || 0}
            </button>
            <button onClick={() => setShowReply((s) => !s)}
              className="text-xs hover:text-cyan-400 transition">
              Reply{post.reply_count ? ` (${post.reply_count})` : ""}
            </button>
            {mine && (
              <button onClick={remove} className="text-xs hover:text-red-400 transition ml-auto">Delete</button>
            )}
          </div>

          {/* Replies */}
          {post.replies?.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-700/50 pl-3">
              {post.replies.map((r) => (
                <div key={r.reply_id} className="flex gap-2">
                  <Avatar name={r.author_name} role={r.author_role} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">{r.author_name}</span>
                      <RoleBadge role={r.author_role} />
                      <span className="text-[10px] text-slate-500">· {timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 whitespace-pre-wrap break-words">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply composer */}
          <AnimatePresence>
            {showReply && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  rows={2} placeholder={`Reply to ${post.author_name}…`}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
                <div className="flex justify-end gap-2 mt-1.5">
                  <button onClick={() => setShowReply(false)} className="text-xs text-slate-400 px-3 py-1.5">Cancel</button>
                  <button onClick={submitReply} disabled={busy || !replyText.trim()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white">
                    {busy ? "Posting…" : "Reply"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main widget ───────────────────────────────────────────────────────────────

export default function StockComments({ symbol }) {
  const me = currentUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [expertsOnly, setExpertsOnly] = useState(false);

  const load = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await getStockComments(symbol, me?.user_id);
      setPosts(res.success ? (res.posts || []) : []);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, [symbol, me?.user_id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try { await postStockComment(symbol, text.trim()); setText(""); await load(); }
    finally { setPosting(false); }
  };

  const shown = expertsOnly ? posts.filter((p) => isExpert(p.author_role)) : posts;
  const expertCount = posts.filter((p) => isExpert(p.author_role)).length;

  return (
    <div className="rounded-2xl border border-slate-700/60 p-5" style={{ background: "rgba(15,23,42,0.5)" }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-200">
          Community & Expert Ideas <span className="text-cyan-400">· {symbol}</span>
        </h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">{posts.length} posts · {expertCount} expert</span>
          <button onClick={() => setExpertsOnly((v) => !v)}
            className={`px-2.5 py-1 rounded-full border transition ${
              expertsOnly ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-slate-700 text-slate-400 hover:border-slate-500"
            }`}>
            Experts only
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mb-4">Share your take on {symbol}. Verified experts are highlighted in gold.</p>

      {/* Composer */}
      <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-3 mb-5">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
          placeholder={`What's your view on ${symbol}?`}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-slate-600">Be respectful — not investment advice.</span>
          <button onClick={submit} disabled={posting || !text.trim()}
            className="text-sm px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium transition">
            {posting ? "Posting…" : "Post"}
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          {expertsOnly ? `No expert posts on ${symbol} yet.` : `Be the first to share an idea on ${symbol}.`}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <CommentCard key={p.post_id} post={p} symbol={symbol} me={me} onChanged={load} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
