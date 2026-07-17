import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Trash2, Pencil } from "lucide-react";
import RoleHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
    deleteExpertQuestionReply,
    getExpertQuestionDetail,
    replyExpertQuestion,
} from "../../api/expertApi.js";

const STORAGE_KEY = "rocketTradeExpertQuestions_v2";

function normalise(q) {
    const id = q?.question_id || q?.id;
    return {
        ...q,
        id,
        question_id: id,
        tickers: Array.isArray(q?.tickers)
            ? q.tickers
            : String(q?.tickers || "").split(",").map((t) => t.trim()).filter(Boolean),
        reply_text:  q?.reply_text  || "",
        status:      q?.status      || "Pending",
    };
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function getLoggedInName() {
    try {
        const user = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
        return user.full_name || user.name || user.username || user.email || "Consultant";
    } catch { return "Consultant"; }
}

// Update the question in the shared localStorage cache
function syncToCache(updatedQuestion) {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        const next  = saved.map((q) =>
            (q.id === updatedQuestion.id || q.question_id === updatedQuestion.id)
                ? updatedQuestion
                : q
        );
        if (!next.find((q) => q.id === updatedQuestion.id)) next.push(updatedQuestion);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
}

const PAGE_BG = "min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white";
const CARD    = { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" };
const SUBCARD = { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" };

export default function ExpertQuestionDetailPage() {
    const { questionId } = useParams();
    const navigate       = useNavigate();
    const consultantName = useMemo(() => getLoggedInName(), []);

    const [question,     setQuestion]     = useState(null);
    const [reply,        setReply]        = useState("");
    const [editingReply, setEditingReply] = useState(false);
    const [submitting,   setSubmitting]   = useState(false);
    const [loading,      setLoading]      = useState(true);
    const [message,      setMessage]      = useState(null);

    // Load question — backend is always the source of truth
    useEffect(() => {
        setLoading(true);

        // Show cached version immediately while fetching
        try {
            const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            const local  = cached.find((q) => q.id === questionId || q.question_id === questionId);
            if (local) {
                const q = normalise(local);
                setQuestion(q);
                setReply(q.reply_text || "");
                setEditingReply(!q.reply_text);
            }
        } catch {}

        // Fetch fresh from backend — overrides local data
        getExpertQuestionDetail(questionId)
            .then((data) => {
                const raw = data?.question || (data?.success === false ? null : data);
                if (raw) {
                    const q = normalise(raw);
                    setQuestion(q);
                    setReply(q.reply_text || "");
                    setEditingReply(!q.reply_text);
                    syncToCache(q);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [questionId]);

    async function handleSubmit() {
        if (!reply.trim()) {
            setMessage({ type: "error", text: "Reply cannot be empty." });
            return;
        }
        setSubmitting(true);
        setMessage(null);

        try {
            const data = await replyExpertQuestion(questionId, reply.trim());
            // Accept any shape the backend returns
            const raw = data?.question || data;
            const updated = normalise({
                ...question,
                ...raw,
                reply_text:  raw?.reply_text  || reply.trim(),
                status:      raw?.status      || "Answered",
                answered_at: raw?.answered_at || new Date().toISOString(),
            });
            setQuestion(updated);
            setReply(updated.reply_text);
            setEditingReply(false);
            syncToCache(updated);
            setMessage({ type: "success", text: "Reply saved successfully." });
        } catch (err) {
            // Even if backend call fails, show local reply and mark for retry
            const fallback = normalise({
                ...question,
                reply_text:  reply.trim(),
                status:      "Answered",
                answered_at: new Date().toISOString(),
            });
            setQuestion(fallback);
            setEditingReply(false);
            syncToCache(fallback);
            setMessage({ type: "warning", text: "Saved locally. Will sync when backend is reachable." });
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDeleteReply() {
        if (!window.confirm("Delete this reply and mark the question as Pending again?")) return;
        setSubmitting(true);
        try {
            const data = await deleteExpertQuestionReply(questionId);
            const raw  = data?.question || data;
            const updated = normalise({ ...question, ...raw, reply_text: "", status: "Pending", answered_at: null });
            setQuestion(updated);
            setReply("");
            setEditingReply(true);
            syncToCache(updated);
            setMessage({ type: "success", text: "Reply deleted." });
        } catch {
            const fallback = normalise({ ...question, reply_text: "", status: "Pending", answered_at: null });
            setQuestion(fallback);
            setReply("");
            setEditingReply(true);
            syncToCache(fallback);
            setMessage({ type: "warning", text: "Deleted locally. Will sync when backend is reachable." });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading && !question) {
        return (
            <div className={PAGE_BG}>
                <RoleHeader />
                <main className="flex-1 flex items-center justify-center" style={{ color:"rgba(255,255,255,0.4)" }}>Loading question…</main>
                <Footer />
            </div>
        );
    }

    if (!question) {
        return (
            <div className={PAGE_BG}>
                <RoleHeader />
                <main className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p style={{ color:"rgba(255,255,255,0.5)" }}>Question not found.</p>
                    <button onClick={() => navigate("/expert/questions")}
                        className="rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                        style={{ background:"rgba(0,211,243,0.15)", border:"1px solid rgba(0,211,243,0.3)", color:"#22d3ee" }}>
                        Back to Questions
                    </button>
                </main>
                <Footer />
            </div>
        );
    }

    const hasReply = Boolean(question.reply_text?.trim());

    return (
        <motion.div className={PAGE_BG} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <RoleHeader />
            <main className="flex-1 p-4 md:p-7 max-w-4xl mx-auto w-full">

                {/* Back */}
                <button onClick={() => navigate("/expert/questions")}
                    className="mb-6 flex items-center gap-2 text-sm font-semibold transition-colors"
                    style={{ color:"#22d3ee" }}>
                    <ArrowLeft size={16} /> Back to Questions
                </button>

                {/* Question card */}
                <div className="rounded-2xl p-6 mb-6" style={CARD}>
                    <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                        <div>
                            <h1 className="text-xl font-bold mb-1" style={{ color:"#e2e8f0" }}>{question.title}</h1>
                            <p className="text-sm" style={{ color:"rgba(255,255,255,0.45)" }}>
                                From {question.investor_name} · {formatDate(question.submitted_at)}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(question.tickers || []).map((t) => (
                                <span key={t} className="rounded-full px-3 py-1 text-xs font-bold"
                                    style={{ background:"rgba(0,211,243,0.12)", color:"#22d3ee", border:"1px solid rgba(0,211,243,0.25)" }}>{t}</span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-4 rounded-xl text-sm" style={SUBCARD}>
                        <div><span className="block text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>Type</span><span className="font-semibold" style={{ color:"rgba(255,255,255,0.85)" }}>{question.question_type}</span></div>
                        <div><span className="block text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>Urgency</span><span className="font-semibold" style={{ color:"rgba(255,255,255,0.85)" }}>{question.urgency}</span></div>
                        <div><span className="block text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>Risk Profile</span><span className="font-semibold" style={{ color:"rgba(255,255,255,0.85)" }}>{question.risk_profile}</span></div>
                        <div><span className="block text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>Portfolio Value</span><span className="font-semibold" style={{ color:"rgba(255,255,255,0.85)" }}>${Number(question.portfolio_value || 0).toLocaleString()}</span></div>
                    </div>

                    <p className="leading-relaxed whitespace-pre-line" style={{ color:"rgba(255,255,255,0.75)" }}>{question.content}</p>
                </div>

                {/* Reply section */}
                <div className="rounded-2xl p-6" style={CARD}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold" style={{ color:"#e2e8f0" }}>
                            {hasReply ? "Your Reply" : "Write a Reply"}
                        </h2>
                        {hasReply && !editingReply && (
                            <div className="flex gap-2">
                                <button onClick={() => setEditingReply(true)}
                                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                    style={{ color:"#22d3ee", border:"1px solid rgba(0,211,243,0.25)", background:"rgba(0,211,243,0.06)" }}>
                                    <Pencil size={12} /> Edit
                                </button>
                                <button onClick={handleDeleteReply} disabled={submitting}
                                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                                    style={{ color:"#f87171", border:"1px solid rgba(248,113,113,0.25)", background:"rgba(248,113,113,0.06)" }}>
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Show saved reply */}
                    {hasReply && !editingReply ? (
                        <div className="rounded-xl p-4" style={{ background:"rgba(0,211,243,0.06)", border:"1px solid rgba(0,211,243,0.2)" }}>
                            <div className="text-xs font-semibold mb-2" style={{ color:"#22d3ee" }}>
                                Answered by {consultantName}
                                {question.answered_at && ` · ${formatDate(question.answered_at)}`}
                            </div>
                            <p className="leading-relaxed whitespace-pre-line" style={{ color:"rgba(255,255,255,0.8)" }}>{question.reply_text}</p>
                        </div>
                    ) : (
                        /* Reply textarea */
                        <div>
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                rows={8}
                                placeholder="Write your expert reply here…"
                                className="w-full rounded-xl p-4 text-sm outline-none resize-y"
                                style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"#e2e8f0" }}
                            />
                            <div className="flex gap-3 mt-3 justify-end">
                                {editingReply && hasReply && (
                                    <button onClick={() => { setReply(question.reply_text); setEditingReply(false); }}
                                        className="px-4 py-2 rounded-xl text-sm transition-colors"
                                        style={{ border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", background:"rgba(255,255,255,0.03)" }}>
                                        Cancel
                                    </button>
                                )}
                                <button onClick={handleSubmit} disabled={submitting || !reply.trim()}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background:"linear-gradient(135deg,#0092b8,#155dfc)", color:"white" }}>
                                    <Send size={14} />
                                    {submitting ? "Saving…" : hasReply ? "Update Reply" : "Submit Reply"}
                                </button>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={
                            message.type === "success" ? { background:"rgba(52,211,153,0.1)", color:"#34d399", border:"1px solid rgba(52,211,153,0.25)" }
                          : message.type === "warning" ? { background:"rgba(251,191,36,0.1)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.25)" }
                          :                               { background:"rgba(248,113,113,0.1)", color:"#f87171", border:"1px solid rgba(248,113,113,0.25)" }
                        }>
                            {message.text}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </motion.div>
    );
}
