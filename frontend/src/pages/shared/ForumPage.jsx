import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle,
  Edit3,
  Eye,
  Heart,
  MessageSquare,
  Plus,
  Search,
  Send,
  X,
} from "lucide-react";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import {
  createForumPost,
  createForumReply,
  getForumPost,
  getForumPosts,
  updateForumPost,
  toggleForumPostLike,
  toggleForumPostSave,
} from "../../api/expertApi.js";

const CATEGORIES = [
  { id: "all", label: "All Posts", icon: "🗂️", color: "#00D3F2" },
  { id: "technical-analysis", label: "Technical Analysis", icon: "📈", color: "#00D3F2" },
  { id: "ai-predictions", label: "AI Predictions", icon: "🤖", color: "#51A2FF" },
  { id: "portfolio-strategy", label: "Portfolio Strategy", icon: "💼", color: "#a78bfa" },
  { id: "market-news", label: "Market News", icon: "📰", color: "#22c55e" },
  { id: "beginners-corner", label: "Beginners Corner", icon: "🔰", color: "#f97316" },
  { id: "trading-tips", label: "Trading Tips", icon: "💡", color: "#fbbf24" },
  { id: "global-markets", label: "Global Markets", icon: "🌏", color: "#ec4899" },
  { id: "general", label: "General Discussion", icon: "💬", color: "#51A2FF" },
];

function text(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function getInitials(name) {
  return text(name, "User")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function formatTime(value) {
  if (!value) return "just now";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return text(value, "just now");
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

function getCurrentForumUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (stored?.user_id) {
      const name = stored.full_name || stored.username || "User";
      const role = stored.role === "expert" ? "expert" : stored.role === "admin" ? "admin" : "investor";
      return {
        id: stored.user_id,
        name,
        role,
        title: role === "expert" ? "Consultant / Expert" : stored.subscription_status === "premium" ? "Premium Member" : "Member",
        avatar: getInitials(name),
        verified: role === "expert",
      };
    }
  } catch (error) {
    console.error("Unable to read current user", error);
  }
  return { id: "guest", name: "Guest", role: "investor", title: "Member", avatar: "G", verified: false };
}

function getBackToAppPath() {
  return getCurrentForumUser().role === "expert" ? "/expert" : "/investor/loggedhome";
}

function categoryMeta(id) {
  return CATEGORIES.find((cat) => cat.id === id) || CATEGORIES.find((cat) => cat.id === "general");
}

function safeAuthor(raw, fallback = {}) {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const name = text(raw.name || raw.full_name || raw.username, fallback.name || "User");
    const role = text(raw.role, fallback.role || "investor");
    return {
      id: text(raw.id || raw.user_id, fallback.id || ""),
      name,
      role,
      title: text(raw.title, role === "expert" ? "Consultant / Expert" : "Member"),
      avatar: text(raw.avatar, getInitials(name)),
      verified: Boolean(raw.verified || role === "expert"),
    };
  }
  if (typeof raw === "string") {
    return { id: fallback.id || "", name: raw, role: fallback.role || "investor", title: "Member", avatar: getInitials(raw), verified: false };
  }
  const name = fallback.name || "User";
  return { id: fallback.id || "", name, role: fallback.role || "investor", title: fallback.title || "Member", avatar: getInitials(name), verified: false };
}

function normalizeReply(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: text(raw.id || raw.reply_id, `reply-${Math.random().toString(36).slice(2)}`),
    reply_id: text(raw.reply_id || raw.id, ""),
    author: safeAuthor(raw.author, { role: raw.is_expert_reply ? "expert" : "investor" }),
    content: text(raw.content),
    created_at: raw.created_at || raw.time || null,
    time: formatTime(raw.created_at || raw.time),
    likes: num(raw.likes),
    is_expert_reply: Boolean(raw.is_expert_reply),
    isNew: Boolean(raw.isNew),
  };
}

function replyCount(raw) {
  if (!raw) return 0;
  if (typeof raw.reply_count === "number") return raw.reply_count;
  if (Array.isArray(raw.replies)) return raw.replies.length;
  if (typeof raw.replies === "number") return raw.replies;
  return num(raw.replies, 0);
}

function normalizePost(raw, { detail = false } = {}) {
  const content = text(raw?.content);
  const id = text(raw?.id || raw?.question_id);
  const repliesArray = Array.isArray(raw?.replies) ? raw.replies.map(normalizeReply).filter(Boolean) : [];
  const count = typeof raw?.reply_count === "number" ? raw.reply_count : (Array.isArray(raw?.replies) ? raw.replies.length : num(raw?.replies, 0));
  return {
    id,
    question_id: id,
    user_id: text(raw?.user_id),
    title: text(raw?.title, "Untitled post"),
    content,
    preview: text(raw?.preview, content.slice(0, 180) + (content.length > 180 ? "…" : "")),
    category: text(raw?.category, "general"),
    tags: parseTags(raw?.tags),
    author: safeAuthor(raw?.author, { id: raw?.user_id, name: raw?.username || "User" }),
    created_at: raw?.created_at || raw?.time || null,
    time: formatTime(raw?.created_at || raw?.time),
    views: num(raw?.views),
    likes: num(raw?.likes),
    save_count: num(raw?.save_count),
    liked_by_me: Boolean(raw?.liked_by_me),
    saved_by_me: Boolean(raw?.saved_by_me),
    reply_count: count,
    replies: detail ? repliesArray : [],
    image: text(raw?.image || raw?.image_url) || null,
    edited: Boolean(raw?.edited),
    pinned: Boolean(raw?.pinned),
    featured: Boolean(raw?.featured),
  };
}

function listCopy(post) {
  const p = normalizePost(post, { detail: false });
  return { ...p, replies: [], reply_count: replyCount(post) || p.reply_count };
}

function Avatar({ author, size = 36 }) {
  const a = safeAuthor(author);
  const gradients = {
    expert: "linear-gradient(135deg,#7c3aed,#06b6d4)",
    admin: "linear-gradient(135deg,#f59e0b,#ef4444)",
    investor: "linear-gradient(135deg,#0092b8,#155dfc)",
  };
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: gradients[a.role] || gradients.investor, color: "white", fontWeight: 800, fontSize: size * 0.34 }}>
      {text(a.avatar, getInitials(a.name))}
    </div>
  );
}

function RoleBadge({ role }) {
  const cfg = {
    expert: { label: "Expert", color: "#00D3F2", bg: "rgba(0,211,243,0.12)", border: "rgba(0,211,243,0.3)" },
    admin: { label: "Admin", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" },
    investor: { label: "Member", color: "#51A2FF", bg: "rgba(81,162,255,0.12)", border: "rgba(81,162,255,0.25)" },
  }[role] || { label: "Member", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)" };
  return <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>{cfg.label}</span>;
}

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 22, right: 24, zIndex: 10000, display: "flex", flexDirection: "column", gap: 10 }}>
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div key={toast.id} initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }} onClick={() => onDismiss(toast.id)} style={{ minWidth: 280, padding: "12px 16px", borderRadius: 12, background: toast.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.12)", border: `1px solid ${toast.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.35)"}`, color: "white", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", backdropFilter: "blur(12px)" }}>
            <CheckCircle size={16} /> <span style={{ fontSize: 13, fontWeight: 700 }}>{text(toast.message)}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

const inputStyle = (hasError = false) => ({ width: "100%", minHeight: 46, padding: "0 14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: `1px solid ${hasError ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`, color: "white", fontSize: 14, outline: "none", fontFamily: "inherit" });
const primaryBtn = { height: 44, borderRadius: 12, border: "none", color: "white", background: "linear-gradient(90deg,#0092b8,#155dfc)", fontSize: 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" };
const secondaryBtn = { height: 44, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.72)", background: "rgba(255,255,255,0.05)", fontSize: 14, fontWeight: 700, cursor: "pointer" };
const iconBtn = { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, padding: 0 };

function ContentRenderer({ content }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.78, color: "rgba(255,255,255,0.82)" }}>
      {text(content).split("\n").map((line, index) => {
        if (!line.trim()) return <br key={index} />;
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return (
          <p key={index} style={{ margin: "8px 0" }}>
            {parts.map((part, partIndex) => {
              if (part.startsWith("**") && part.endsWith("**")) return <strong key={partIndex} style={{ color: "white" }}>{part.slice(2, -2)}</strong>;
              if (part.startsWith("*") && part.endsWith("*")) return <em key={partIndex} style={{ color: "#00D3F2" }}>{part.slice(1, -1)}</em>;
              return <span key={partIndex}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

function CreatePostModal({ onClose, onPublish, submitting }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [errors, setErrors] = useState({});

  function submit(e) {
    e.preventDefault();
    const nextErrors = {};
    if (!title.trim()) nextErrors.title = "Post title is required.";
    if (!content.trim()) nextErrors.content = "Post content cannot be empty.";
    else if (content.trim().length < 20) nextErrors.content = "Content must be at least 20 characters.";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onPublish({ title: title.trim(), content: content.trim(), category, tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean), image_url: image.trim() || null });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: "rgba(2,6,24,0.86)", backdropFilter: "blur(8px)", zIndex: 1000, padding: 24 }} onClick={(e) => e.target === e.currentTarget && !submitting && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 16 }} style={{ width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", background: "linear-gradient(145deg,#0a1330,#0d1a40 60%,#080f28)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, padding: 28, color: "white", boxShadow: "0 32px 80px rgba(0,0,0,0.55)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div><h2 style={{ fontSize: 20, fontWeight: 800 }}>Create New Post</h2><p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>Share your trading insights with the community.</p></div>
          <button onClick={onClose} disabled={submitting} style={{ width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="flex flex-col" style={{ gap: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>POST TITLE *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. My analysis of NVDA ahead of earnings" disabled={submitting} style={inputStyle(Boolean(errors.title))} />
          {errors.title && <p style={{ fontSize: 11, color: "#ef4444", marginTop: -10 }}>⚠ {errors.title}</p>}
          <label style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>CATEGORY *</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} disabled={submitting} style={inputStyle(false)}>
            {CATEGORIES.filter((cat) => cat.id !== "all").map((cat) => <option key={cat.id} value={cat.id} style={{ background: "#0a1330" }}>{cat.icon} {cat.label}</option>)}
          </select>
          <label style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>CONTENT *</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value.slice(0, 3000))} rows={10} placeholder="Write your analysis, question, or idea..." disabled={submitting} style={{ ...inputStyle(Boolean(errors.content)), height: "auto", paddingTop: 12, resize: "vertical", lineHeight: 1.65 }} />
          {errors.content && <p style={{ fontSize: 11, color: "#ef4444", marginTop: -10 }}>⚠ {errors.content}</p>}
          <label style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>TAGS</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AAPL, technical-analysis, earnings" disabled={submitting} style={inputStyle(false)} />
          <label style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>IMAGE URL</label>
          <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." disabled={submitting} style={inputStyle(false)} />
          <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(251,191,36,0.18)", background: "rgba(251,191,36,0.05)", color: "rgba(255,255,255,0.58)", fontSize: 12, lineHeight: 1.55 }}>⚠️ Posts should be educational and should not be treated as guaranteed financial advice.</div>
          <div className="flex gap-3"><button type="button" onClick={onClose} disabled={submitting} style={{ ...secondaryBtn, flex: 1 }}>Cancel</button><button type="submit" disabled={submitting} style={{ ...primaryBtn, flex: 2 }}><Send size={16} /> {submitting ? "Publishing..." : "Publish Post"}</button></div>
        </form>
      </motion.div>
    </div>
  );
}

function PostCard({ post, onClick, onLike, onSave }) {
  const p = normalizePost(post);
  const cat = categoryMeta(p.category);
  return (
    <motion.div onClick={() => onClick(p)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} style={{ padding: 24, borderRadius: 16, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
      <div className="flex items-start gap-3" style={{ marginBottom: 14 }}>
        <Avatar author={p.author} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap"><span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>{p.author.name}</span><RoleBadge role={p.author.role} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>· {p.time}</span>{p.saved_by_me && <span style={{ fontSize: 10, color: "#00D3F2", fontWeight: 900 }}>SAVED</span>}</div>
          <div style={{ marginTop: 7 }}><span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, color: cat.color, background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>{cat.icon} {cat.label}</span></div>
        </div>
      </div>
      <h3 style={{ fontSize: 18, lineHeight: 1.35, fontWeight: 800, color: "white", marginBottom: 10 }}>{p.title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.62)", marginBottom: 14 }}>{p.preview}</p>
      {p.tags.length > 0 && <div className="flex flex-wrap gap-2" style={{ marginBottom: 14 }}>{p.tags.map((tag) => <span key={tag} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.48)" }}>#{tag}</span>)}</div>}
      {p.image && <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 14 }}><ImageWithFallback src={p.image} alt={p.title} style={{ width: "100%", height: 180, objectFit: "cover" }} /></div>}
      <div className="flex items-center gap-5" style={{ color: "rgba(255,255,255,0.45)" }}>
        <span className="flex items-center gap-1.5" style={{ fontSize: 12 }}><Eye size={14} /> {p.views.toLocaleString()}</span>
        <button type="button" onClick={(event) => { event.stopPropagation(); onLike(p); }} style={{ ...iconBtn, color: p.liked_by_me ? "#fb7185" : "rgba(255,255,255,0.45)" }} aria-label="Like post"><Heart size={14} fill={p.liked_by_me ? "#fb7185" : "none"} /> {p.likes}</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onSave(p); }} style={{ ...iconBtn, color: p.saved_by_me ? "#00D3F2" : "rgba(255,255,255,0.45)" }} aria-label="Save post"><Bookmark size={14} fill={p.saved_by_me ? "#00D3F2" : "none"} /> {p.saved_by_me ? "Saved" : "Save"}</button>
        <span className="flex items-center gap-1.5" style={{ fontSize: 12 }}><MessageSquare size={14} /> {replyCount(p)}</span>
      </div>
    </motion.div>
  );
}

function ReplyCard({ reply }) {
  const r = normalizeReply(reply);
  if (!r) return null;
  return (
    <motion.div initial={r.isNew ? { opacity: 0, y: 12 } : false} animate={{ opacity: 1, y: 0 }} style={{ padding: 16, borderRadius: 14, background: r.is_expert_reply ? "rgba(0,211,243,0.06)" : "rgba(255,255,255,0.035)", border: `1px solid ${r.is_expert_reply ? "rgba(0,211,243,0.18)" : "rgba(255,255,255,0.07)"}` }}>
      <div className="flex items-start gap-3"><Avatar author={r.author} size={34} /><div style={{ flex: 1 }}><div className="flex items-center gap-2 flex-wrap"><span style={{ color: "white", fontSize: 13, fontWeight: 800 }}>{r.author.name}</span><RoleBadge role={r.author.role} /><span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>· {r.time}</span>{r.isNew && <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 800 }}>NEW</span>}</div><p style={{ fontSize: 14, color: "rgba(255,255,255,0.72)", lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 8 }}>{r.content}</p></div></div>
    </motion.div>
  );
}

function PostDetail({ post, onBack, onPostUpdated, onToast, onLike, onSave }) {
  const currentUser = getCurrentForumUser();
  const p = normalizePost(post, { detail: true });
  const cat = categoryMeta(p.category);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState(p.title);
  const [editContent, setEditContent] = useState(p.content);
  const [saving, setSaving] = useState(false);
  const isOwn = p.author.id && p.author.id === currentUser.id;

  async function reloadDetail() {
    const result = await getForumPost(p.id, false, currentUser.id);
    const updated = normalizePost(result.question, { detail: true });
    onPostUpdated(updated);
    return updated;
  }

  async function handleReply() {
    if (!replyText.trim()) {
      onToast("Please write a comment before posting.", "error");
      return;
    }
    setReplySubmitting(true);
    try {
      await createForumReply({ question_id: p.id, content: replyText.trim(), user_id: currentUser.id, is_expert_reply: currentUser.role === "expert" });
      setReplyText("");
      await reloadDetail();
      onToast("Comment posted successfully.");
    } catch (error) {
      onToast(error.message || "Could not post comment.", "error");
    } finally {
      setReplySubmitting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editTitle.trim() || editContent.trim().length < 20) {
      onToast("Please enter a title and at least 20 characters of content.", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await updateForumPost(p.id, currentUser.id, { title: editTitle.trim(), content: editContent.trim(), category: p.category, tags: p.tags, image_url: p.image });
      onPostUpdated(normalizePost(result.question, { detail: true }));
      setEditMode(false);
      onToast("Post updated successfully.");
    } catch (error) {
      onToast(error.message || "Could not update post.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: "24px 32px 48px" }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <button onClick={onBack} className="flex items-center gap-2" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}><ArrowLeft size={16} /> Back to Forum</button>
        {isOwn && !editMode && <button onClick={() => setEditMode(true)} style={{ ...secondaryBtn, padding: "0 14px" }}><Edit3 size={15} /> Edit Post</button>}
      </div>

      <div style={{ borderRadius: 18, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", padding: 28 }}>
        {editMode ? (
          <div className="flex flex-col" style={{ gap: 16 }}>
            <h2 style={{ color: "white", fontSize: 18, fontWeight: 800 }}>Edit Post</h2>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={inputStyle(false)} disabled={saving} />
            <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={12} style={{ ...inputStyle(false), height: "auto", paddingTop: 12, resize: "vertical", lineHeight: 1.65 }} disabled={saving} />
            <div className="flex gap-3"><button onClick={() => setEditMode(false)} disabled={saving} style={{ ...secondaryBtn, flex: 1 }}>Discard Changes</button><button onClick={handleSaveEdit} disabled={saving} style={{ ...primaryBtn, flex: 2 }}>{saving ? "Saving..." : "Save Changes"}</button></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: 16 }}><span style={{ fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 999, color: cat.color, background: `${cat.color}15`, border: `1px solid ${cat.color}30` }}>{cat.icon} {cat.label}</span>{p.tags.map((tag) => <span key={tag} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 7, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>#{tag}</span>)}</div>
            <h1 style={{ color: "white", fontSize: 26, fontWeight: 900, lineHeight: 1.25, marginBottom: 18 }}>{p.title}</h1>
            <div className="flex items-center justify-between flex-wrap gap-3" style={{ padding: 16, borderRadius: 14, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 22 }}>
              <div className="flex items-center gap-3"><Avatar author={p.author} size={44} /><div><div className="flex items-center gap-2"><span style={{ color: "white", fontWeight: 800, fontSize: 14 }}>{p.author.name}</span><RoleBadge role={p.author.role} /></div><p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{p.author.title} · {p.time}</p></div></div>
              <div className="flex items-center gap-3" style={{ color: "rgba(255,255,255,0.42)", fontSize: 12 }}>
                <span>👁 {p.views.toLocaleString()}</span>
                <button type="button" onClick={() => onLike(p)} style={{ ...iconBtn, color: p.liked_by_me ? "#fb7185" : "rgba(255,255,255,0.55)" }}><Heart size={14} fill={p.liked_by_me ? "#fb7185" : "none"} /> {p.likes}</button>
                <button type="button" onClick={() => onSave(p)} style={{ ...iconBtn, color: p.saved_by_me ? "#00D3F2" : "rgba(255,255,255,0.55)" }}><Bookmark size={14} fill={p.saved_by_me ? "#00D3F2" : "none"} /> {p.saved_by_me ? "Saved" : "Save"}</button>
                <span>💬 {p.replies.length}</span>
              </div>
            </div>
            {p.image && <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 24 }}><ImageWithFallback src={p.image} alt={p.title} style={{ width: "100%", height: 280, objectFit: "cover" }} /></div>}
            <div style={{ padding: 22, borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", marginBottom: 28 }}><ContentRenderer content={p.content} /></div>
          </>
        )}
      </div>

      {!editMode && (
        <div style={{ marginTop: 26 }}>
          <h2 className="flex items-center gap-2" style={{ color: "white", fontSize: 17, fontWeight: 800, marginBottom: 14 }}><MessageSquare size={18} /> Comments ({p.replies.length})</h2>
          <div className="flex flex-col gap-3" style={{ marginBottom: 18 }}>{p.replies.length === 0 ? <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16 }}>No comments yet — be the first to reply.</div> : p.replies.map((reply) => <ReplyCard key={reply.id} reply={reply} />)}</div>
          <div style={{ padding: 18, borderRadius: 16, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 10 }}><Avatar author={currentUser} size={30} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>Comment as</span><span style={{ fontSize: 12, color: "white", fontWeight: 800 }}>{currentUser.name}</span><RoleBadge role={currentUser.role} /></div>
            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={4} placeholder="Share your thoughts..." style={{ ...inputStyle(false), height: "auto", paddingTop: 12, resize: "vertical", lineHeight: 1.6 }} disabled={replySubmitting} />
            <div className="flex justify-end" style={{ marginTop: 10 }}><button onClick={handleReply} disabled={replySubmitting} style={primaryBtn}><Send size={16} /> {replySubmitting ? "Posting..." : "Post Comment"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForumPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("post");
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [toasts, setToasts] = useState([]);

  function addToast(message, type = "success") {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3500);
  }

  async function loadPosts(silent = false) {
    if (!silent) setLoading(true);
    try {
      const currentUser = getCurrentForumUser();
      const userId = currentUser.id && currentUser.id !== "guest" ? currentUser.id : null;
      const data = await getForumPosts(userId, false);
      setPosts((data.questions || []).map((item) => listCopy(item)));
    } catch (error) {
      addToast(error.message || "Could not load forum posts.", "error");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadDetail() {
      if (!selectedId) {
        setSelectedPost(null);
        loadPosts(true);
        return;
      }
      setDetailLoading(true);
      try {
        const currentUser = getCurrentForumUser();
        const result = await getForumPost(selectedId, true, currentUser.id);
        const normalized = normalizePost(result.question, { detail: true });
        setSelectedPost(normalized);
        setPosts((prev) => {
          const row = listCopy(normalized);
          const exists = prev.some((p) => p.id === row.id);
          return exists ? prev.map((p) => p.id === row.id ? row : p) : [row, ...prev];
        });
      } catch (error) {
        addToast(error.message || "Could not load post.", "error");
        setSearchParams({});
      } finally {
        setDetailLoading(false);
      }
    }
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  function selectPost(post) {
    setSearchParams({ post: post.id });
  }

  function backToList() {
    setSelectedPost(null);
    setSearchParams({});
    loadPosts(true);
  }

  function updatePostInState(updated) {
    const detailed = normalizePost(updated, { detail: true });
    setSelectedPost(detailed);
    const row = listCopy(detailed);
    setPosts((prev) => {
      const exists = prev.some((p) => p.id === row.id);
      return exists ? prev.map((p) => p.id === row.id ? row : p) : [row, ...prev];
    });
  }

  async function publishPost(partial) {
    const currentUser = getCurrentForumUser();
    setPublishing(true);
    try {
      const result = await createForumPost({ ...partial, user_id: currentUser.id });
      const saved = normalizePost(result.question, { detail: true });
      setPosts((prev) => [listCopy(saved), ...prev]);
      setShowCreateModal(false);
      addToast("Your post has been published.");
      setSearchParams({ post: saved.id });
    } catch (error) {
      addToast(error.message || "Could not publish post.", "error");
    } finally {
      setPublishing(false);
    }
  }

  async function handleToggleLike(post) {
    const currentUser = getCurrentForumUser();
    if (!currentUser.id || currentUser.id === "guest") {
      addToast("Please log in to like posts.", "error");
      return;
    }
    const original = normalizePost(post, { detail: Boolean(selectedPost) });
    const optimistic = { ...original, liked_by_me: !original.liked_by_me, likes: Math.max(0, original.likes + (original.liked_by_me ? -1 : 1)) };
    if (selectedPost && selectedPost.id === original.id) setSelectedPost((prev) => ({ ...normalizePost(prev, { detail: true }), ...optimistic, replies: normalizePost(prev, { detail: true }).replies }));
    setPosts((prev) => prev.map((p) => p.id === original.id ? listCopy(optimistic) : p));
    try {
      const result = await toggleForumPostLike(original.id, currentUser.id);
      updatePostInState(result.question);
    } catch (error) {
      setPosts((prev) => prev.map((p) => p.id === original.id ? listCopy(original) : p));
      if (selectedPost && selectedPost.id === original.id) setSelectedPost(original);
      addToast(error.message || "Could not update like.", "error");
    }
  }

  async function handleToggleSave(post) {
    const currentUser = getCurrentForumUser();
    if (!currentUser.id || currentUser.id === "guest") {
      addToast("Please log in to save posts.", "error");
      return;
    }
    const original = normalizePost(post, { detail: Boolean(selectedPost) });
    const optimistic = { ...original, saved_by_me: !original.saved_by_me, save_count: Math.max(0, original.save_count + (original.saved_by_me ? -1 : 1)) };
    if (selectedPost && selectedPost.id === original.id) setSelectedPost((prev) => ({ ...normalizePost(prev, { detail: true }), ...optimistic, replies: normalizePost(prev, { detail: true }).replies }));
    setPosts((prev) => prev.map((p) => p.id === original.id ? listCopy(optimistic) : p));
    try {
      const result = await toggleForumPostSave(original.id, currentUser.id);
      updatePostInState(result.question);
      addToast(result.saved ? "Post saved." : "Post removed from saved.");
    } catch (error) {
      setPosts((prev) => prev.map((p) => p.id === original.id ? listCopy(original) : p));
      if (selectedPost && selectedPost.id === original.id) setSelectedPost(original);
      addToast(error.message || "Could not update saved post.", "error");
    }
  }

  const filteredPosts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = posts
      .map((post) => listCopy(post))
      .filter((p) => activeCategory === "all" || p.category === activeCategory)
      .filter((p) => sortBy !== "saved" || p.saved_by_me)
      .filter((p) => !q || p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q) || p.tags.some((tag) => tag.toLowerCase().includes(q)) || p.author.name.toLowerCase().includes(q));
    return [...list].sort((a, b) => {
      if (sortBy === "popular") return b.likes - a.likes;
      if (sortBy === "replies") return replyCount(b) - replyCount(a);
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [posts, activeCategory, searchQuery, sortBy]);

  const categoryCount = (id) => id === "all" ? posts.length : posts.filter((p) => listCopy(p).category === id).length;

  return (
    <div className="flex min-h-screen" style={{ backgroundImage: "linear-gradient(144deg,#020618 0%,#162456 50%,#0f172b 100%)", color: "white" }}>
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))} />
      <AnimatePresence>{showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onPublish={publishPost} submitting={publishing} />}</AnimatePresence>

      <aside style={{ width: 270, minHeight: "100vh", borderRight: "1px solid rgba(255,255,255,0.07)", background: "rgba(2,6,24,0.42)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 18, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={() => navigate(getBackToAppPath())} className="flex items-center gap-2" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 12, fontWeight: 700, marginBottom: 18 }}><ArrowLeft size={15} /> Back to app</button>
          <div className="flex items-center gap-3"><div style={{ width: 34, height: 34, borderRadius: 12, background: "linear-gradient(135deg,#0092b8,#155dfc)", display: "flex", alignItems: "center", justifyContent: "center" }}>💬</div><div><h1 style={{ fontSize: 16, fontWeight: 900 }}>Community Forum</h1><p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Persistent posts & saved discussions</p></div></div>
        </div>
        <div style={{ padding: 14, flex: 1 }}>
          <p style={{ fontSize: 10, fontWeight: 900, color: "rgba(255,255,255,0.32)", letterSpacing: 1, margin: "0 0 8px 8px" }}>CATEGORIES</p>
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); backToList(); }} className="w-full flex items-center gap-3" style={{ height: 39, padding: "0 11px", borderRadius: 11, marginBottom: 4, background: activeCategory === cat.id ? `${cat.color}12` : "transparent", border: activeCategory === cat.id ? `1px solid ${cat.color}30` : "1px solid transparent", color: activeCategory === cat.id ? cat.color : "rgba(255,255,255,0.46)", fontSize: 12, fontWeight: activeCategory === cat.id ? 800 : 600, cursor: "pointer" }}>
              <span>{cat.icon}</span><span style={{ flex: 1, textAlign: "left" }}>{cat.label}</span><span style={{ fontSize: 10, borderRadius: 999, padding: "1px 6px", background: "rgba(255,255,255,0.07)" }}>{categoryCount(cat.id)}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: 16, borderTop: "1px solid rgba(255,255,255,0.07)" }}><div className="flex items-center gap-2"><Avatar author={getCurrentForumUser()} size={30} /><div><p style={{ fontSize: 12, fontWeight: 800 }}>{getCurrentForumUser().name}</p><p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Logged in</p></div></div></div>
      </aside>

      <main className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
        <div className="flex items-center justify-between gap-4" style={{ height: 68, padding: "0 28px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div className="flex items-center gap-3"><h2 style={{ fontSize: 18, fontWeight: 900 }}>{selectedId ? "Post Details" : "Forum Posts"}</h2><span style={{ fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "3px 9px", background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>● Saved to DB</span></div>
          {!selectedId && <div className="flex items-center gap-2" style={{ flex: 1, maxWidth: 390, height: 38, padding: "0 12px", borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}><Search size={15} color="rgba(255,255,255,0.38)" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search posts..." style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "white", fontSize: 13 }} /></div>}
          <button onClick={() => setShowCreateModal(true)} style={{ ...primaryBtn, height: 38, padding: "0 16px" }}><Plus size={16} /> New Post</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {selectedId ? (
            detailLoading || !selectedPost ? <div style={{ padding: 48, color: "rgba(255,255,255,0.5)" }}>Loading post...</div> : <PostDetail post={selectedPost} onBack={backToList} onPostUpdated={updatePostInState} onToast={addToast} onLike={handleToggleLike} onSave={handleToggleSave} />
          ) : (
            <div style={{ padding: "24px 28px 48px" }}>
              <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: 18 }}>
                <div><span style={{ fontSize: 13, fontWeight: 800 }}>{activeCategory === "all" ? "All Posts" : categoryMeta(activeCategory).label}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>{filteredPosts.length} posts</span></div>
                <div className="flex items-center gap-2"><span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>View:</span>{[
                  { id: "latest", label: "Latest" },
                  { id: "popular", label: "Popular" },
                  { id: "replies", label: "Replies" },
                  { id: "saved", label: "Saved Posts" },
                ].map((tab) => <button key={tab.id} onClick={() => setSortBy(tab.id)} className="flex items-center gap-1.5" style={{ height: 31, borderRadius: 999, padding: "0 13px", background: sortBy === tab.id ? "rgba(0,211,243,0.12)" : "rgba(255,255,255,0.04)", color: sortBy === tab.id ? "#00D3F2" : "rgba(255,255,255,0.45)", border: sortBy === tab.id ? "1px solid rgba(0,211,243,0.25)" : "1px solid rgba(255,255,255,0.08)", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>{tab.id === "saved" && <Bookmark size={13} fill={sortBy === "saved" ? "#00D3F2" : "none"} />}{tab.label}</button>)}</div>
              </div>
              {loading ? <div style={{ padding: 48, color: "rgba(255,255,255,0.5)" }}>Loading forum posts...</div> : filteredPosts.length ? <div className="flex flex-col gap-3">{filteredPosts.map((post) => <PostCard key={post.id} post={post} onClick={selectPost} onLike={handleToggleLike} onSave={handleToggleSave} />)}</div> : <div style={{ padding: 64, textAlign: "center", borderRadius: 16, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>{sortBy === "saved" ? "No saved posts yet. Click Save on a post to store it here." : "No posts found. Create the first one."}</div>}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
