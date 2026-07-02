import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  getStockComments,
  postStockComment,
  replyForumPost,
  toggleForumLike,
  deleteForumPost,
} from "../api/stockCommentsApi";

// Only verified professionals may comment on stocks.
const EXPERT_ROLES = ["expert", "consultant", "admin"];

const CARD = { background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))", border: "1px solid rgba(99,179,237,0.15)", borderRadius: "12px" };

const ROLE_BADGE = {
  expert:     { label: "Expert",     color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)" },
  consultant: { label: "Consultant", color: "#c4b5fd", bg: "rgba(196,181,253,0.12)", border: "rgba(196,181,253,0.35)" },
  admin:      { label: "Admin",      color: "#67e8f9", bg: "rgba(103,232,249,0.12)", border: "rgba(103,232,249,0.35)" },
  premium:    { label: "Premium",    color: "#7dd3fc", bg: "rgba(125,211,252,0.12)", border: "rgba(125,211,252,0.35)" },
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
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); }
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
      style={{ background: expert ? "rgba(180,83,9,0.12)" : "rgba(15,23,42,0.6)", borderColor: expert ? "rgba(252,211,77,0.35)" : "rgba(99,179,237,0.15)" }}>
      <div className="flex gap-3">
        <Avatar name={post.author_name} role={post.author_role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-100">{post.author_name}</span>
            <RoleBadge role={post.author_role} />
            <span className="text-[11px] text-slate-500">· {timeAgo(post.created_at)}</span>
          </div>
          <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap break-words">{post.content}</p>

          <div className="flex items-center gap-4 mt-2 text-slate-500">
            <button onClick={like}
              className={`flex items-center gap-1 text-xs transition hover:text-rose-500 ${post.liked_by_me ? "text-rose-500" : ""}`}>
              <span>{post.liked_by_me ? "♥" : "♡"}</span>{post.likes || 0}
            </button>
            {canPost && (
              <button onClick={() => setShowReply((s) => !s)} className="text-xs hover:text-cyan-400 transition">
                Reply{post.reply_count ? ` (${post.reply_count})` : ""}
              </button>
            )}
            {mine && <button onClick={remove} className="text-xs hover:text-red-400 transition ml-auto">Delete</button>}
          </div>

          {post.replies?.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-slate-800 pl-3">
              {post.replies.map((r) => (
                <div key={r.reply_id} className="flex gap-2">
                  <Avatar name={r.author_name} role={r.author_role} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-200">{r.author_name}</span>
                      <RoleBadge role={r.author_role} />
                      <span className="text-[10px] text-slate-500">· {timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 whitespace-pre-wrap break-words">{r.content}</p>
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
                  className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500" />
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
  const navigate = useNavigate();
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
          {count} expert post{count === 1 ? "" : "s"} on {symbol} — Premium only
        </div>
        <div className="text-slate-500 text-xs max-w-70">
          Upgrade to Premium to read what verified experts are saying about {symbol}.
        </div>
        <button onClick={() => navigate("/investor/subscription")}
          className="text-sm font-semibold px-5 py-2 rounded-xl text-white hover:opacity-90 active:scale-[0.99] transition"
          style={{ background: "linear-gradient(90deg, #d4a017, #b8860b)", boxShadow: "0 8px 18px rgba(212,160,23,0.25)" }}>
          Upgrade to Premium →
        </button>
      </div>
    </div>
  );
}

export default function StockComments({ symbol }) {
  const me = currentUser();
  const canPost = isExpert(me.role);
  // Reading expert ideas is a premium perk; experts/consultants/admins always can.
  const canRead = canPost || (me.subscription_status || "").toLowerCase() === "premium";
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

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

  return (
    <div style={CARD} className="p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-100">
          Expert Ideas <span className="text-cyan-400">· {symbol}</span>
        </h2>
        <span className="text-xs text-slate-500">{posts.length} posts</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">Verified experts share their view on {symbol}.</p>

      {/* Composer — verified experts only */}
      {canPost ? (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3 mb-5">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
            placeholder={`Share your expert view on ${symbol}…`}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-slate-500">Not investment advice.</span>
            <button onClick={submit} disabled={posting || !text.trim()}
              className="text-sm px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-medium transition">
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 mb-5 text-center text-sm text-slate-400">
          Only <span className="font-semibold text-amber-400">verified experts</span> can post here. You can read the discussion below.
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-slate-800/40 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">No expert posts on {symbol} yet.</div>
      ) : canRead ? (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {posts.map((p) => (
              <CommentCard key={p.post_id} post={p} me={me} canPost={canPost} onChanged={load} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <PremiumBlurGate count={posts.length} symbol={symbol}>
          <div className="space-y-3">
            {posts.slice(0, 3).map((p) => (
              <CommentCard key={p.post_id} post={p} me={me} canPost={false} onChanged={() => {}} />
            ))}
          </div>
        </PremiumBlurGate>
      )}
    </div>
  );
}
