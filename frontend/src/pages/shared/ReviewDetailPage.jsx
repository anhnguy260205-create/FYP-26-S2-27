import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, ThumbsUp } from "lucide-react";
import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getReviewById } from "../../api/reviewApi.js";

function initials(name) {
  return String(name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarBg(name) {
  const palette = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#db2777"];
  let h = 0;
  for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return palette[h % palette.length];
}

function roleBadge(role) {
  const r = String(role || "").toLowerCase();
  if (r === "expert") return { label: "Expert", className: "bg-cyan-100 text-cyan-700" };
  if (r === "premium") return { label: "Premium", className: "bg-amber-100 text-amber-700" };
  return { label: "Member", className: "bg-slate-100 text-slate-600" };
}

function formatDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function Stars({ value = 0, size = 20 }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"}
        />
      ))}
    </div>
  );
}

function ReviewDetailPage() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getReviewById(reviewId)
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.review) setReview(data.review);
        else setNotFound(true);
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reviewId]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <RoleHeader />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          onClick={() => navigate("/reviews")}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft size={16} /> Back to all reviews
        </button>

        {loading && (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-8 animate-pulse">
            <div className="h-4 w-32 bg-slate-100 rounded mb-4" />
            <div className="h-6 w-2/3 bg-slate-100 rounded mb-3" />
            <div className="h-4 w-full bg-slate-100 rounded mb-2" />
            <div className="h-4 w-full bg-slate-100 rounded mb-2" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
          </div>
        )}

        {!loading && notFound && (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-8 text-center">
            <p className="text-slate-800 font-semibold mb-1">This review couldn't be found.</p>
            <p className="text-slate-500 text-sm mb-5">It may have been removed, or the link might be incorrect.</p>
            <button
              onClick={() => navigate("/reviews")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold"
            >
              View all reviews
            </button>
          </div>
        )}

        {!loading && !notFound && review && (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6 sm:p-8">
            <Stars value={review.rating} />
            {review.title && (
              <h1 className="text-2xl font-bold text-slate-900 mt-3 mb-3 leading-snug">{review.title}</h1>
            )}
            <p className="text-slate-700 text-base leading-relaxed whitespace-pre-line">{review.comment}</p>

            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ background: avatarBg(review.author) }}
                >
                  {initials(review.author)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{review.author}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleBadge(review.author_role).className}`}>
                      {roleBadge(review.author_role).label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
                </div>
              </div>
              {review.helpful_count > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <ThumbsUp size={13} /> {review.helpful_count} found this helpful
                </span>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default ReviewDetailPage;
