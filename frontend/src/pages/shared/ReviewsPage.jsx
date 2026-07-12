import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Star, ThumbsUp, Trash2 } from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
  createReview,
  deleteReview,
  getMyReview,
  getReviewStats,
  getReviews,
  toggleReviewHelpful,
  updateReview,
} from "../../api/reviewApi.js";

const EMPTY_FORM = { rating: 5, title: "", comment: "" };

function getCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-SG", { day: "2-digit", month: "short", year: "numeric" });
}

function StarRow({ value, onChange }) {
  const rating = Number(value || 0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          style={{ background: "none", border: "none", padding: 0, color: n <= rating ? "#facc15" : "rgba(255,255,255,0.2)" }}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star size={18} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const currentUser = useMemo(() => getCurrentUser(), []);
  const isExpert = String(currentUser?.role || "").toLowerCase() === "expert";

  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadReviews() {
    setLoading(true);
    try {
      const [reviewData, statsData, mineData] = await Promise.all([
        getReviews({ pageSize: 50 }).catch(() => null),
        getReviewStats().catch(() => null),
        getMyReview().catch(() => null),
      ]);

      if (reviewData?.success) setReviews(reviewData.reviews || []);
      if (statsData?.success) setStats(statsData);
      if (mineData?.success && mineData.review) {
        setMyReview(mineData.review);
        setForm({
          rating: mineData.review.rating || 5,
          title: mineData.review.title || "",
          comment: mineData.review.comment || "",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.comment.trim()) {
      setMessage("Please write a short review before submitting.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const payload = {
        rating: Number(form.rating),
        title: form.title.trim(),
        comment: form.comment.trim(),
      };
      const data = myReview?.review_id
        ? await updateReview(myReview.review_id, payload)
        : await createReview(payload);

      if (data?.success) {
        setMessage(myReview?.review_id ? "Review updated." : "Review submitted.");
        await loadReviews();
      } else {
        setMessage(data?.message || "Unable to save review.");
      }
    } catch (err) {
      setMessage(err.message || "Unable to save review.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!myReview?.review_id) return;
    if (!window.confirm("Delete your review?")) return;
    setSaving(true);
    try {
      const data = await deleteReview(myReview.review_id);
      if (data?.success) {
        setMyReview(null);
        setForm(EMPTY_FORM);
        setMessage("Review deleted.");
        await loadReviews();
      }
    } catch (err) {
      setMessage(err.message || "Unable to delete review.");
    } finally {
      setSaving(false);
    }
  }

  async function handleHelpful(reviewId) {
    try {
      const data = await toggleReviewHelpful(reviewId);
      if (data?.success) await loadReviews();
    } catch {
      // Non-blocking action.
    }
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {isExpert ? <ExpertHeader /> : <GeneralHeader />}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Platform Reviews</h1>
          <p className="mt-2 text-sm text-slate-400">
            Share feedback on RocketTrade and see what other users think.
          </p>
          {stats && (
            <p className="mt-3 text-sm text-slate-300">
              Average rating: <span className="font-bold text-yellow-300">{Number(stats.average_rating || 0).toFixed(1)}/5</span>
              {stats.total != null && <span className="text-slate-500"> from {stats.total} review{stats.total !== 1 ? "s" : ""}</span>}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl p-5 mb-8 border border-white/10 bg-white/[0.04]">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
            <h2 className="font-bold text-lg">{myReview ? "Edit Your Review" : "Leave a Review"}</h2>
            <StarRow value={form.rating} onChange={(rating) => setForm((prev) => ({ ...prev, rating }))} />
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Review title (optional)"
            className="w-full rounded-xl px-4 py-3 mb-3 bg-white/[0.05] border border-white/10 outline-none text-white placeholder:text-slate-500"
          />
          <textarea
            value={form.comment}
            onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
            placeholder="Write your review..."
            rows={5}
            className="w-full rounded-xl px-4 py-3 bg-white/[0.05] border border-white/10 outline-none text-white placeholder:text-slate-500 resize-y"
          />
          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <p className="text-sm text-slate-400">{message}</p>
            <div className="flex gap-2">
              {myReview && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold border border-red-400/25 text-red-300 bg-red-400/10 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#0092b8,#155dfc)" }}
              >
                {saving ? "Saving..." : myReview ? "Update Review" : "Submit Review"}
              </button>
            </div>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No reviews yet.</div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <article key={review.review_id} className="rounded-2xl p-5 border border-white/10 bg-white/[0.04]">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-white">{review.author || "RocketTrade User"}</span>
                      <span className="text-xs rounded-full px-2 py-0.5 bg-white/10 text-slate-300 uppercase">{review.author_role || "user"}</span>
                      <span className="text-xs text-slate-500">{formatDate(review.created_at)}</span>
                    </div>
                    <div className="mt-2"><StarRow value={review.rating} /></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHelpful(review.review_id)}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold bg-white/[0.05] border border-white/10 text-slate-300"
                  >
                    <ThumbsUp size={14} /> Helpful {review.helpful_count || 0}
                  </button>
                </div>
                {review.title && <h3 className="font-bold text-lg mt-4 text-white">{review.title}</h3>}
                <p className="text-sm text-slate-300 leading-6 mt-2 whitespace-pre-line">{review.comment}</p>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
