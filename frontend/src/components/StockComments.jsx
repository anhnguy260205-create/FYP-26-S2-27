import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  getStockComments,
  postStockComment,
  replyForumPost,
  toggleForumLike,
  deleteForumPost,
} from "../api/stockCommentsApi";

// Only verified professionals may comment on stocks.
const EXPERT_ROLES = ["expert", "consultant", "admin"];

const CARD = { background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px" };

const ROLE_BADGE = {
  expert:     { label: "Expert",     color: "#B45309", bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.3)" },
  consultant: { label: "Consultant", color: "#7C3AED", bg: "rgba(124,58,237,0.1)", border: "rgba(124,58,237,0.3)" },
  admin:      { label: "Admin",      color: "#0E7490", bg: "rgba(14,116,144,0.1)", border: "rgba(14,116,144,0.3)" },
  premium:    { label: "Premium",    color: "#0092b8", bg: "rgba(0,146,184,0.1)", border: "rgba(0,146,184,0.3)" },
};
const isExpert = (role) => EXPERT_ROLES.includes((role || "").toLowerCase());

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
  try { return JSON.parse(sessionStorage.getItem("currentUser") || "{}"); }
  catch { return {}; }
}

function Avatar({ name, role }) {
  const expert = isExpert(role);
  return (
    <div className="flex items-center justify-center rounded-full shrink-0 text-xs font-bold"
      style={{
        width: 38, height: 38, color: "#fff",
        background: expert ? "linear-gradient(135deg,#f59e0b,#b45309)" : "linear-gradient(135deg,#0092b8,#155dfc)",
      }}>
      {initials(name)}
    </div>
  );
}
function RoleBadge({ role }) {
  const b = ROLE_BADGE[(role || "").toLowerCase()];
  if (!b) return null;
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ color: b.color, background: b.bg, border: `1px solid ${b.border}` }}>{b.label}</span>
  );
}

function CommentCard({ post, me, canPost, onChanged }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const expert = isExpert(post.author_role);
  const mine = me?.user_id && post.user_id === me.user_id;

  const like = async () => { try { await toggleForumLike(post.post_id); onChanged(); } catch { /* */ } };
  const submitReply = async () => {
    if (!replyText.trim()) return;
    setBusy(true);
    try { await replyForumPost(post.post_id, { content: replyText.trim() }); setReplyText(""); setShowReply(false); onChanged(); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this comment?")) return;
    try { await deleteForumPost(post.post_id); onChanged(); } catch { /* */ }
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border p-3.5"
      style={{ background: expert ? "rgba(180,83,9,0.08)" : "#F8FAFC", borderColor: expert ? "rgba(180,83,9,0.3)" : "rgba(11,29,79,0.15)" }}>
      <div className="flex gap-3">
        <Avatar name={post.author_name} role={post.author_role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{post.author_name}</span>
            <RoleBadge role={post.author_role} />
            <span className="text-[11px] text-slate-500">· {timeAgo(post.created_at)}</span>
          </div>
          <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{post.content}</p>

          <div className="flex items-center gap-4 mt-2 text-slate-500">
            <button onClick={like}
              className={`flex items-center gap-1 text-xs transition hover:text-rose-500 ${post.liked_by_me ? "text-rose-500" : ""}`}>
              <span>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes || 0}
            </button>
            {canPost && (
              <button onClick={() => setShowReply((s) => !s)} className="text-xs hover:text-cyan-600 transition">
                Reply{post.reply_count ? ` (${post.reply_count})` : ""}
              </button>
            )}
            {mine && <button onClick={remove} className="text-xs hover:text-red-600 transition ml-auto">Delete</button>}
          </div>

          {post.replies?.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
              {post.replies.map((r) => (
                <div key={r.reply_id} className="flex gap-2">
                  <Avatar name={r.author_name} role={r.author_role} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">{r.author_name}</span>
                      <RoleBadge role={r.author_role} />
                      <span className="text-[10px] text-slate-500">· {timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 whitespace-pre-wrap break-words">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showReply && canPost && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={2}
                  placeholder={`Reply to ${post.author_name}…`}
                  className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500" />
                <div className="flex justify-end gap-2 mt-1.5">
                  <button onClick={() => setShowReply(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancel</button>
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

/* CourseHero-style premium gate: real posts render blurred underneath a
   lock overlay, so basic users see that content exists but can't read it. */
function PremiumBlurGate({ children, count, symbol }) {
  return (
    <div className="relative rounded-xl overflow-hidden">
      <div style={{ filter: "blur(7px)", userSelect: "none", pointerEvents: "none" }} aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center p-5"
        style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.92))" }}>
        <div className="flex items-center justify-center rounded-full"
          style={{ width: 50, height: 50, fontSize: 22, background: "#fef3c7", border: "1px solid #fcd34d" }}>
          🔒
        </div>
        <div className="text-slate-900 font-semibold text-sm">
          {count > 0
            ? `${count} expert post${count === 1 ? "" : "s"} on ${symbol} — Premium only`
            : `Expert commentary on ${symbol} — Premium only`}
        </div>
        <div className="text-slate-500 text-xs max-w-70">
          Upgrade to Premium to read what verified experts are saying about {symbol}.
        </div>
        <Link to="/investor/subscription"
          className="text-sm font-semibold px-5 py-2 rounded-xl text-white hover:opacity-90 active:scale-[0.99] transition"
          style={{ background: "linear-gradient(90deg, #d4a017, #b8860b)", boxShadow: "0 8px 18px rgba(212,160,23,0.25)" }}>
          Upgrade to Premium →
        </Link>
      </div>
    </div>
  );
}

export default function StockComments({ symbol }) {
  const me = currentUser();
  // Posting is server-side restricted to verified experts only.
  const canPost = me.is_expert === true;
  const [posts, setPosts] = useState([]);
  // Reflects the server's own gating decision (res.gated) rather than a
  // possibly-stale local guess, since the backend now redacts content for
  // non-privileged viewers regardless of what the UI shows.
  const [gated, setGated] = useState(true);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    if (!symbol) return;
    try {
      const res = await getStockComments(symbol);
      setPosts(res.success ? (res.posts || []) : []);
      setGated(res.success ? !!res.gated : true);
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, [symbol]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try { await postStockComment(symbol, text.trim()); setText(""); await load(); }
    finally { setPosting(false); }
  };

  return (
    <div style={CARD} className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-900">
          Expert Ideas <span className="text-cyan-600">· {symbol}</span>
        </h2>
        <span className="text-xs text-slate-500">{posts.length} posts</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Verified experts share their view on {symbol}.</p>

      {/* Composer — verified experts only */}
      {canPost ? (
        <div className="rounded-xl bg-slate-100 border border-slate-200 p-3 mb-5">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder={`Share your expert view on ${symbol}…`}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none resize-none" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-500">Not investment advice.</span>
            <button onClick={submit} disabled={posting || !text.trim()}
              className="text-sm px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium transition">
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      ) : gated ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-5 text-center text-sm text-slate-600">
          Only <span className="font-semibold text-amber-600">verified experts</span> can post here.{" "}
          <Link to="/investor/subscription" className="font-semibold text-cyan-600 hover:underline">
            Upgrade to Premium
          </Link>{" "}
          to read what they're saying about {symbol}.
        </div>
      ) : (
        <div className="rounded-xl bg-slate-100 border border-slate-200 p-4 mb-5 text-center text-sm text-slate-600">
          Only <span className="font-semibold text-amber-600">verified experts</span> can post here. You can read the discussion below.
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-200 animate-pulse" />)}
        </div>
      ) : gated ? (
        // Basic users always see the paywall, even with zero posts today —
        // otherwise an empty state would leak "nothing to unlock here" info
        // and undercut the upgrade prompt.
        <PremiumBlurGate count={posts.length} symbol={symbol}>
          <div className="space-y-3">
            {posts.slice(0, 3).map((p) => (
              <CommentCard key={p.post_id} post={p} me={me} canPost={false} onChanged={() => {}} />
            ))}
          </div>
        </PremiumBlurGate>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">No expert posts on {symbol} yet.</div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <CommentCard key={p.post_id} post={p} me={me} canPost={canPost} onChanged={load} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
