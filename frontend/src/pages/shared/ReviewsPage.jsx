import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ThumbsUp, Pencil, Trash2, Check, X, Flag, AlertCircle } from "lucide-react";
import RoleHeader from "../../layout/RoleHeader.jsx";
import { isExpertUser, getPageBackground } from "../../utils/userRole.js";
import Footer from "../../layout/Footer.jsx";
import {
  acknowledgeRemoval, createReview, deleteReview, flagReview, getMyReview,
  getRemovalNotice, getReviewStats, getReviews, toggleReviewHelpful, updateReview,
} from "../../api/reviewApi.js";

// ── Design tokens — matches the light theme used across ForumPage.jsx /
// Watchlist.jsx / LoggedInHomePage.jsx ─────────────────────────────────────────
const C = {
  card: "#FFFFFF",
  card2: "#F1F5F9",
  border: "rgba(11,29,79,0.25)",
  rowBorder: "rgba(15,23,42,0.08)",
  divider: "rgba(15,23,42,0.15)",
  accent: "#00D3F2",
  accentText: "#004450",
  accentRgb: "0,211,242",
  success: "#0F9D58",
  danger: "#DC2626",
  heading: "#0B1D4F",
  text: "#0F172A",
  textSecondary: "#33477A",
  muted: "#5B6C88",
  mutedLight: "rgba(15,23,42,0.45)",
};

// Tokens for text/controls that sit directly on the page's blue-to-white
// gradient (outside any white card).
const PAGE = {
  heading: "#0B1D4F",
  sub: "#33477A",
};

// ── helpers ───────────────────────────────────────────────────────────────────
function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "{}"); }
  catch { return {}; }
}

function formatDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  if (diff < 86400000) return `${Math.floor(diff / 3600000) || 1}h ago`;
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function roleBadge(role) {
  const r = String(role || "").toLowerCase();
  if (r === "expert") return { label: "Expert", bg: "rgba(0,211,242,0.14)", color: "#0092b8", border: "rgba(0,211,242,0.35)" };
  if (r === "premium") return { label: "Premium", bg: "rgba(180,83,9,0.12)", color: "#B45309", border: "rgba(180,83,9,0.35)" };
  return { label: "Member", bg: "#F1F5F9", color: "#5B6C88", border: "rgba(15,23,42,0.15)" };
}

function initials(name) {
  return String(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}
function avatarBg(name) {
  const palette = ["#155dfc", "#0092b8", "#7c3aed", "#059669", "#d97706", "#be185d"];
  let h = 0;
  for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
}

// ── skeleton loaders ────────────────────────────────────────────────────────────
function SkeletonLine({ width = "100%", height = 12, mb = 0 }) {
  return (
    <div style={{
      width, height, borderRadius: 6, marginBottom: mb,
      background: "linear-gradient(90deg, #F1F5F9 25%, #E2E8F0 50%, #F1F5F9 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

function SkeletonReviewCard() {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "20px 22px",
    }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: C.card2 }} />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="35%" height={13} mb={8} />
          <SkeletonLine width="20%" height={10} />
        </div>
      </div>
      <SkeletonLine width="55%" height={14} mb={10} />
      <SkeletonLine width="100%" height={11} mb={6} />
      <SkeletonLine width="90%" height={11} mb={6} />
      <SkeletonLine width="70%" height={11} mb={14} />
      <SkeletonLine width="100px" height={28} />
    </div>
  );
}

// ── sub-components ────────────────────────────────────────────────────────────
function Stars({ value, size = 16, onChange }) {
  const [hov, setHov] = useState(0);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onClick={() => onChange?.(n)}
          onMouseEnter={() => onChange && setHov(n)}
          onMouseLeave={() => onChange && setHov(0)}
          style={{
            background: "none", border: "none", padding: 1,
            cursor: onChange ? "pointer" : "default",
            color: n <= (hov || Math.round(value)) ? "#fbbf24" : "#CBD5E1",
            transition: "color 0.1s"
          }}>
          <Star size={size} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

function DistBar({ star, count, total, active, onClick }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      background: "none", border: "none", cursor: "pointer", width: "100%", padding: "3px 0",
    }}>
      <span style={{ fontSize: 12, color: active ? "#D97706" : C.muted, width: 32, textAlign: "right", fontWeight: 600 }}>
        {star} ★
      </span>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.card2, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.4s",
          background: active ? "#fbbf24" : "linear-gradient(90deg,#0092b8,#155dfc)"
        }} />
      </div>
      <span style={{ fontSize: 12, color: C.muted, width: 28 }}>{count}</span>
    </button>
  );
}

function Avatar({ name, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: avatarBg(name), display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: size * 0.36, color: "white"
    }}>
      {initials(name)}
    </div>
  );
}

function RemovalNoticeBanner({ notice, onDismiss }) {
  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)",
        borderRadius: 16, padding: "18px 20px", marginBottom: 24,
        display: "flex", gap: 14, alignItems: "flex-start",
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: "rgba(220,38,38,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <AlertCircle size={18} color={C.danger} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: C.heading }}>
          Your review was removed
        </h3>
        {notice.review_title && (
          <p style={{ margin: "0 0 6px", fontSize: 13, color: C.textSecondary }}>
            "{notice.review_title}"
          </p>
        )}
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.textSecondary }}>
          <strong style={{ color: C.danger }}>Reason:</strong> {notice.reason}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: C.muted }}>
          If you believe this was a mistake, please contact support. You're welcome to submit a new review that follows our community guidelines.
        </p>
      </div>
      <button onClick={onDismiss} style={{
        background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4, flexShrink: 0,
      }}>
        <X size={16} />
      </button>
    </motion.div>
  );
}

const REPORT_REASONS = [
  "Spam or promotional content",
  "Fake or misleading review",
  "Offensive or inappropriate language",
  "Irrelevant to the platform",
  "Other",
];

function ReportModal({ review, onConfirm, onCancel, reporting }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [custom, setCustom] = useState("");
  const finalReason = reason === "Other" ? custom.trim() : reason;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,23,42,0.55)", padding: 20
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 20,
        padding: 24, width: "100%", maxWidth: 420, boxShadow: "0 20px 50px rgba(15,23,42,0.2)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.heading }}>Report Review</h3>
          <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
          Why are you reporting this review by <strong style={{ color: C.textSecondary }}>{review.author}</strong>?
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {REPORT_REASONS.map(r => (
            <label key={r} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <input type="radio" name="reportReason" value={r}
                checked={reason === r} onChange={() => setReason(r)}
                style={{ accentColor: "#dc2626" }} />
              <span style={{ fontSize: 13, color: reason === r ? C.heading : C.muted, fontWeight: reason === r ? 600 : 400 }}>
                {r}
              </span>
            </label>
          ))}
        </div>
        {reason === "Other" && (
          <textarea value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Describe the issue…" rows={3}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 14,
              background: C.card2, border: `1px solid ${C.border}`,
              color: C.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box"
            }} />
        )}
        <div style={{
          background: "rgba(0,211,242,0.1)", border: "1px solid rgba(0,211,242,0.3)",
          borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.accentText, marginBottom: 16
        }}>
          Our moderation team will review your report and take action if needed.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={reporting}
            style={{
              padding: "9px 18px", borderRadius: 10, background: C.card2,
              border: `1px solid ${C.border}`, color: C.textSecondary, cursor: "pointer", fontSize: 13
            }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(finalReason)} disabled={reporting || (reason === "Other" && !custom.trim())}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10,
              background: "#dc2626", border: "none", color: "white", cursor: "pointer",
              fontSize: 13, fontWeight: 700, opacity: reporting ? 0.6 : 1
            }}>
            <Flag size={13} /> {reporting ? "Reporting…" : "Submit Report"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ review, onHelpful, onEdit, onDelete, onReport }) {
  const badge = roleBadge(review.author_role);
  return (
    <article style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "20px 22px", transition: "border-color 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(11,29,79,0.4)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Avatar name={review.author} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{review.author}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                padding: "2px 8px", borderRadius: 20, color: badge.color,
                background: badge.bg, border: `1px solid ${badge.border}`
              }}>
                {badge.label}
              </span>
              {review.is_edited && <span style={{ fontSize: 11, color: C.muted }}>(edited)</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Stars value={review.rating} size={13} />
              <span style={{ fontSize: 12, color: C.muted }}>{formatDate(review.created_at)}</span>
            </div>
          </div>
        </div>

        {review.is_mine && (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => onEdit(review)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
              background: "rgba(0,146,184,0.1)", border: "1px solid rgba(0,146,184,0.3)",
              color: "#0092b8", cursor: "pointer", fontSize: 12, fontWeight: 600
            }}>
              <Pencil size={12} /> Edit
            </button>
            <button onClick={() => onDelete(review)} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8,
              background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)",
              color: C.danger, cursor: "pointer", fontSize: 12, fontWeight: 600
            }}>
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>

      {review.title && (
        <h3 style={{ margin: "12px 0 6px", fontSize: 15, fontWeight: 700, color: C.heading }}>
          {review.title}
        </h3>
      )}
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: C.textSecondary, whiteSpace: "pre-line" }}>
        {review.comment}
      </p>

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {review.is_mine ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20,
            background: C.card2, border: `1px solid ${C.rowBorder}`,
            color: C.muted, fontSize: 12, fontWeight: 600
          }}>
            <ThumbsUp size={12} />
            {review.helpful_count > 0 ? `${review.helpful_count} found this helpful` : "No votes yet"}
          </span>
        ) : (
          <button onClick={() => onHelpful(review.review_id)} style={{
            display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20,
            background: review.helpful_by_me ? "rgba(0,146,184,0.12)" : C.card2,
            border: `1px solid ${review.helpful_by_me ? "rgba(0,146,184,0.35)" : C.rowBorder}`,
            color: review.helpful_by_me ? "#0092b8" : C.muted, cursor: "pointer", fontSize: 12, fontWeight: 600,
            transition: "all 0.15s"
          }}>
            <ThumbsUp size={12} fill={review.helpful_by_me ? "currentColor" : "none"} />
            Helpful{review.helpful_count > 0 ? ` (${review.helpful_count})` : ""}
          </button>
        )}
        {!review.is_mine && (
          <button onClick={() => onReport(review)} style={{
            display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 20,
            background: review.flagged_by_me ? "rgba(220,38,38,0.08)" : C.card2,
            border: `1px solid ${review.flagged_by_me ? "rgba(220,38,38,0.3)" : C.rowBorder}`,
            color: review.flagged_by_me ? C.danger : C.muted,
            cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all 0.15s"
          }}>
            <Flag size={11} fill={review.flagged_by_me ? "currentColor" : "none"} />
            {review.flagged_by_me ? "Reported" : "Report"}
          </button>
        )}
      </div>
    </article>
  );
}

function ReviewForm({ existing, onCancel, onSubmit, submitting, message }) {
  const [form, setForm] = useState({
    rating: existing?.rating || 5,
    title: existing?.title || "",
    comment: existing?.comment || "",
  });
  const [err, setErr] = useState("");

  function submit() {
    if (!form.comment.trim()) { setErr("Please write a comment before submitting."); return; }
    if (!form.rating) { setErr("Please select a star rating."); return; }
    setErr("");
    onSubmit({ rating: form.rating, title: form.title.trim(), comment: form.comment.trim() });
  }

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: C.card, border: "1px solid rgba(0,146,184,0.35)",
        borderRadius: 18, padding: 24, marginBottom: 24
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.heading }}>
          {existing ? "Edit Your Review" : "Write a Review"}
        </h2>
        <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 6 }}>Your Rating</label>
        <Stars value={form.rating} size={28} onChange={r => setForm(p => ({ ...p, rating: r }))} />
      </div>

      <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
        placeholder="Review title (optional)"
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 10, marginBottom: 12,
          background: C.card2, border: `1px solid ${C.border}`,
          color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box"
        }} />

      <textarea value={form.comment} onChange={e => setForm(p => ({ ...p, comment: e.target.value }))}
        placeholder="Share your experience with RocketTrade — what worked well, what could improve?"
        rows={5} style={{
          width: "100%", padding: "11px 14px", borderRadius: 10, resize: "vertical",
          background: C.card2, border: `1px solid ${C.border}`,
          color: C.text, fontSize: 14, outline: "none", lineHeight: 1.6, boxSizing: "border-box"
        }} />

      {(err || message) && (
        <p style={{ fontSize: 12, margin: "8px 0 0", color: !err && message?.type === "success" ? C.success : C.danger }}>
          {err || message?.text}
        </p>
      )}

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={onCancel} style={{
          padding: "9px 18px", borderRadius: 10,
          background: C.card2, border: `1px solid ${C.border}`,
          color: C.textSecondary, cursor: "pointer", fontSize: 13
        }}>
          Cancel
        </button>
        <button onClick={submit} disabled={submitting} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "9px 22px", borderRadius: 10,
          background: "linear-gradient(135deg,#0092b8,#155dfc)", border: "none", color: "white",
          cursor: submitting ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, opacity: submitting ? 0.6 : 1
        }}>
          <Check size={14} /> {submitting ? "Saving…" : existing ? "Update Review" : "Submit Review"}
        </button>
      </div>
    </motion.div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "latest", label: "Most Recent" },
  { value: "helpful", label: "Most Helpful" },
  { value: "highest", label: "Highest Rated" },
  { value: "lowest", label: "Lowest Rated" },
];

export default function ReviewsPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isExpert = isExpertUser(currentUser);

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0, distribution: {} });
  const [myReview, setMyReview] = useState(null);
  const [removalNotice, setRemovalNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sort, setSort] = useState("latest");
  const [starFilter, setStarFilter] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [toReport, setToReport] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [r, s, m] = await Promise.all([
        getReviews({ sort, pageSize: 50, rating: starFilter }).catch(() => null),
        getReviewStats().catch(() => null),
        getMyReview().catch(() => null),
      ]);
      if (r?.success) setReviews(r.reviews || []);
      if (s?.success) setStats(s);
      if (m?.review) setMyReview(m.review);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [sort, starFilter]);

  // Fetch removal notice once on mount — independent of sort/filter changes
  useEffect(() => {
    getRemovalNotice()
      .then((res) => { if (res?.success && res.notice) setRemovalNotice(res.notice); })
      .catch(() => { });
  }, []);

  async function handleDismissRemovalNotice() {
    if (!removalNotice) return;
    setRemovalNotice(null);
    try { await acknowledgeRemoval(removalNotice.id); } catch { }
  }

  async function handleSubmit(payload) {
    setSubmitting(true);
    setMessage(null);
    try {
      const data = editing
        ? await updateReview(editing.review_id, payload)
        : await createReview(payload);
      if (data?.success) {
        setMessage({ type: "success", text: editing ? "Review updated!" : "Review submitted! Thank you!" });
        setShowForm(false);
        setEditing(null);
        await load();
      } else {
        setMessage({ type: "error", text: data?.message || "Unable to save review." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Something went wrong." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(review) {
    if (!window.confirm("Delete your review? This can't be undone.")) return;
    try {
      const data = await deleteReview(review.review_id);
      if (data?.success) { setMyReview(null); setMessage({ type: "success", text: "Review deleted." }); await load(); }
      else setMessage({ type: "error", text: data?.message || "Could not delete review." });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Could not delete review." });
    }
  }

  async function handleHelpful(reviewId) {
    setReviews(prev => prev.map(r => r.review_id === reviewId
      ? { ...r, helpful_by_me: !r.helpful_by_me, helpful_count: (r.helpful_count || 0) + (r.helpful_by_me ? -1 : 1) }
      : r
    ));
    try { await toggleReviewHelpful(reviewId); } catch { }
  }

  async function handleReport(review, reason) {
    setReporting(true);
    try {
      const data = await flagReview(review.review_id, reason);
      if (data?.success) {
        setReviews(prev => prev.map(r => r.review_id === review.review_id
          ? { ...r, flagged_by_me: !r.flagged_by_me }
          : r
        ));
        setToReport(null);
        if (data.flagged) setMessage({ type: "success", text: "Report submitted. Please wait patiently while our team reviews it." });
        else setMessage({ type: "success", text: "Report removed." });
      } else {
        setMessage({ type: "error", text: data?.message || "Could not submit report." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Could not submit report." });
    }
    setReporting(false);
  }

  const avg = Number(stats?.average || 0).toFixed(1);
  const dist = stats?.distribution || {};
  const total = stats?.total || 0;
  // The backend's general list includes the caller's own review, but it's
  // already pinned separately above as "Your Review" — exclude it here so
  // it doesn't render twice.
  const otherReviews = myReview
    ? reviews.filter(r => r.review_id !== myReview.review_id)
    : reviews;

  return (
    <motion.div className="min-h-screen flex flex-col"
      style={{ background: getPageBackground() }}
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <RoleHeader />

      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>

        <AnimatePresence>
          {removalNotice && (
            <RemovalNoticeBanner notice={removalNotice} onDismiss={handleDismissRemovalNotice} />
          )}
        </AnimatePresence>

        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, letterSpacing: "0.02em", color: PAGE.heading, margin: "0 0 6px" }}>
            RocketTrade Reviews
          </h1>
          <p style={{ fontSize: 14, color: PAGE.sub, margin: 0 }}>
            Real feedback from our community of investors and market experts.
          </p>
        </div>

        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "28px 28px 24px", marginBottom: 28,
          display: "flex", gap: 36, flexWrap: "wrap", alignItems: "center",
          boxShadow: "0 4px 16px rgba(15,23,42,0.05)"
        }}>

          {loading ? (
            <>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <SkeletonLine width={80} height={56} mb={10} />
                <SkeletonLine width={100} height={18} mb={6} />
                <SkeletonLine width={70} height={13} />
              </div>
              <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 10 }}>
                {[1, 2, 3, 4, 5].map(i => <SkeletonLine key={i} height={8} />)}
              </div>
            </>
          ) : (
            <>
              <div style={{ textAlign: "center", minWidth: 120 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 56, fontWeight: 800, color: C.heading, lineHeight: 1 }}>{avg}</div>
                <div style={{ margin: "8px 0 4px" }}><Stars value={Number(avg)} size={18} /></div>
                <div style={{ fontSize: 13, color: C.muted }}>
                  {total} review{total !== 1 ? "s" : ""}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                {[5, 4, 3, 2, 1].map(star => (
                  <DistBar key={star} star={star}
                    count={dist[String(star)] || 0}
                    total={total}
                    active={starFilter === star}
                    onClick={() => setStarFilter(starFilter === star ? null : star)}
                  />
                ))}
              </div>

              <div style={{ textAlign: "center", minWidth: 110 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Verified Platform
                </div>
                <div style={{
                  background: "linear-gradient(135deg,#0092b8,#155dfc)", borderRadius: 12,
                  padding: "10px 16px", display: "inline-block"
                }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{avg}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>★★★★★</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>RocketTrade</div>
                </div>
              </div>
            </>
          )}
        </div>

        {myReview && !showForm && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.07em",
              textTransform: "uppercase", marginBottom: 8
            }}>Your Review</div>
            <ReviewCard review={{ ...myReview, is_mine: true }}
              onHelpful={handleHelpful}
              onEdit={() => { setEditing(myReview); setShowForm(true); setMessage(null); }}
              onDelete={handleDelete}
              onReport={() => { }} />
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <ReviewForm
              existing={editing}
              submitting={submitting}
              message={message}
              onCancel={() => { setShowForm(false); setEditing(null); setMessage(null); }}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>

        {!myReview && !showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true); setMessage(null); }} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "14px", borderRadius: 14, marginBottom: 24,
            background: "linear-gradient(135deg,#155dfc,#0092b8)", border: "none",
            color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
            boxShadow: "0 4px 16px rgba(21,93,252,0.25)"
          }}>
            <Star size={16} fill="currentColor" color="#fbbf24" />
            Write a Review
          </button>
        )}

        {message && !showForm && (
          <div style={{
            padding: "10px 16px", borderRadius: 10, marginBottom: 16, fontSize: 13, fontWeight: 600,
            background: message.type === "success" ? "rgba(15,157,88,0.1)" : "rgba(220,38,38,0.08)",
            color: message.type === "success" ? C.success : C.danger,
            border: `1px solid ${message.type === "success" ? "rgba(15,157,88,0.3)" : "rgba(220,38,38,0.3)"}`,
          }}>
            {message.text}
          </div>
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10, marginBottom: 20
        }}>
          <div style={{ fontSize: 13, color: C.muted }}>
            {starFilter
              ? <>{`Showing ${starFilter}-star reviews `}
                <button onClick={() => setStarFilter(null)}
                  style={{ color: "#0092b8", background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                  Clear ×
                </button>
              </>
              : `${otherReviews.length} review${otherReviews.length !== 1 ? "s" : ""}`
            }
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            padding: "10px 14px", borderRadius: 12,
            border: `1px solid ${C.border}`,
            background: C.card, color: C.text,
            fontSize: 13, outline: "none", cursor: "pointer",
          }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[1, 2, 3].map(i => <SkeletonReviewCard key={i} />)}
          </div>
        ) : otherReviews.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: C.muted, fontSize: 14 }}>
            {starFilter
              ? `No ${starFilter}-star reviews yet.`
              : "No reviews yet — be the first!"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {otherReviews.map(review => (
              <ReviewCard key={review.review_id} review={review}
                onHelpful={handleHelpful}
                onEdit={() => { setEditing(review); setShowForm(true); }}
                onDelete={handleDelete}
                onReport={(r) => setToReport(r)} />
            ))}
          </div>
        )}
      </main>

      <Footer />
      {toReport && (
        <ReportModal
          review={toReport}
          reporting={reporting}
          onCancel={() => setToReport(null)}
          onConfirm={(reason) => handleReport(toReport, reason)}
        />
      )}
    </motion.div>
  );
}
