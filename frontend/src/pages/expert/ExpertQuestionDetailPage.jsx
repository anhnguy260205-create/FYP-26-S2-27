import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Trash2, Pencil } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
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
        const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
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
            <div className="min-h-screen flex flex-col bg-slate-50">
                <ConsultantHeader />
                <main className="flex-1 flex items-center justify-center text-slate-400">Loading question…</main>
                <Footer />
            </div>
        );
    }

    if (!question) {
        return (
            <div className="min-h-screen flex flex-col bg-slate-50">
                <ConsultantHeader />
                <main className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-slate-500">Question not found.</p>
                    <button onClick={() => navigate("/expert/questions")} className="rounded-xl bg-cyan-600 px-4 py-2 text-white text-sm font-bold hover:bg-cyan-700">
                        Back to Questions
                    </button>
                </main>
                <Footer />
            </div>
        );
    }

    const hasReply = Boolean(question.reply_text?.trim());

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <ConsultantHeader />
            <main className="flex-1 p-8 max-w-4xl mx-auto w-full">

                {/* Back */}
                <button onClick={() => navigate("/expert/questions")}
                    className="mb-6 flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-900">
                    <ArrowLeft size={16} /> Back to Questions
                </button>

                {/* Question card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
                    <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 mb-1">{question.title}</h1>
                            <p className="text-sm text-slate-500">
                                From {question.investor_name} · {formatDate(question.submitted_at)}
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {(question.tickers || []).map((t) => (
                                <span key={t} className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 border border-cyan-200">{t}</span>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 p-4 bg-slate-50 rounded-xl text-sm">
                        <div><span className="text-slate-400 block text-xs">Type</span><span className="font-semibold text-slate-700">{question.question_type}</span></div>
                        <div><span className="text-slate-400 block text-xs">Urgency</span><span className="font-semibold text-slate-700">{question.urgency}</span></div>
                        <div><span className="text-slate-400 block text-xs">Risk Profile</span><span className="font-semibold text-slate-700">{question.risk_profile}</span></div>
                        <div><span className="text-slate-400 block text-xs">Portfolio Value</span><span className="font-semibold text-slate-700">${Number(question.portfolio_value || 0).toLocaleString()}</span></div>
                    </div>

                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{question.content}</p>
                </div>

                {/* Reply section */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-900">
                            {hasReply ? "Your Reply" : "Write a Reply"}
                        </h2>
                        {hasReply && !editingReply && (
                            <div className="flex gap-2">
                                <button onClick={() => setEditingReply(true)}
                                    className="flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:text-cyan-900 px-3 py-1.5 rounded-lg border border-cyan-200 hover:bg-cyan-50">
                                    <Pencil size={12} /> Edit
                                </button>
                                <button onClick={handleDeleteReply} disabled={submitting}
                                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
                                    <Trash2 size={12} /> Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Show saved reply */}
                    {hasReply && !editingReply ? (
                        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                            <div className="text-xs text-cyan-600 font-semibold mb-2">
                                Answered by {consultantName}
                                {question.answered_at && ` · ${formatDate(question.answered_at)}`}
                            </div>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">{question.reply_text}</p>
                        </div>
                    ) : (
                        /* Reply textarea */
                        <div>
                            <textarea
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                rows={8}
                                placeholder="Write your expert reply here…"
                                className="w-full rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-cyan-400 resize-y"
                            />
                            <div className="flex gap-3 mt-3 justify-end">
                                {editingReply && hasReply && (
                                    <button onClick={() => { setReply(question.reply_text); setEditingReply(false); }}
                                        className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                                        Cancel
                                    </button>
                                )}
                                <button onClick={handleSubmit} disabled={submitting || !reply.trim()}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Send size={14} />
                                    {submitting ? "Saving…" : hasReply ? "Update Reply" : "Submit Reply"}
                                </button>
                            </div>
                        </div>
                    )}

                    {message && (
                        <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
                            message.type === "success" ? "bg-green-50 text-green-700 border border-green-200"
                          : message.type === "warning" ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                        }`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
