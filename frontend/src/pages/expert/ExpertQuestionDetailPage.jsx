import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Edit3,
  Trash2,
  User,
  Target,
  Paperclip,
  Lightbulb,
  CheckCircle2,
  Database,
  MessageSquare,
} from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { deleteExpertQuestionReply, getExpertQuestionDetail, replyExpertQuestion } from "../../api/expertApi.js";

const STORAGE_KEY = "rocketTradeExpertQuestions";

function normalise(q) {
  const id = q?.question_id || q?.id;
  return {
    ...q,
    id,
    question_id: id,
    tickers: Array.isArray(q?.tickers)
      ? q.tickers
      : String(q?.tickers || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
  };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLoggedInName() {
  try {
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return user.full_name || user.name || user.username || user.email || "Consultant";
  } catch {
    return "Consultant";
  }
}

function upsertLocalQuestion(updatedQuestion) {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(normalise);
  const next = saved.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q));
  if (!next.find((q) => q.id === updatedQuestion.id)) next.push(updatedQuestion);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export default function ExpertQuestionDetailPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const consultantName = useMemo(() => getLoggedInName(), []);
  const [question, setQuestion] = useState(null);
  const [reply, setReply] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingReply, setEditingReply] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").map(normalise);
    const localQuestion = saved.find((q) => q.id === questionId);
    if (localQuestion) {
      setQuestion(localQuestion);
      setReply(localQuestion.reply_text || "");
    }

    getExpertQuestionDetail(questionId)
      .then((data) => {
        if (data?.success && data.question) {
          const q = normalise(data.question);
          setQuestion(q);
          setReply(q.reply_text || "");
          setEditingReply(!q.reply_text);
          upsertLocalQuestion(q);
        }
      })
      .catch(() => {});
  }, [questionId]);

  async function handleSubmit() {
    if (!reply.trim()) {
      setMessage({ type: "error", text: "Reply cannot be empty." });
      return;
    }

    setSubmitting(true);
    const fallbackUpdated = normalise({
      ...question,
      reply_text: reply.trim(),
      replied_by: consultantName,
      status: "Answered",
      answered_at: new Date().toISOString(),
    });

    try {
      const data = await replyExpertQuestion(questionId, reply.trim());
      const updated = normalise(data?.question || fallbackUpdated);
      setQuestion(updated);
      setReply(updated.reply_text || reply.trim());
      setEditingReply(false);
      upsertLocalQuestion(updated);
      setMessage({ type: "success", text: "Reply saved to database and shown below for this question." });
    } catch {
      setQuestion(fallbackUpdated);
      setEditingReply(false);
      upsertLocalQuestion(fallbackUpdated);
      setMessage({ type: "warning", text: "Backend unavailable, but reply is saved locally and shown below for testing." });
    } finally {
      setSubmitting(false);
    }
  }


  async function handleDeleteReply() {
    const confirmed = window.confirm("Delete this reply and mark the question as Pending again?");
    if (!confirmed) return;

    const fallbackUpdated = normalise({
      ...question,
      reply_text: "",
      replied_by: "",
      status: "Pending",
      answered_at: null,
    });

    setSubmitting(true);
    try {
      const data = await deleteExpertQuestionReply(questionId);
      const updated = normalise(data?.question || fallbackUpdated);
      setQuestion(updated);
      setReply("");
      setEditingReply(true);
      upsertLocalQuestion(updated);
      setMessage({ type: "success", text: "Reply deleted from database. The question is now Pending again." });
    } catch {
      setQuestion(fallbackUpdated);
      setReply("");
      setEditingReply(true);
      upsertLocalQuestion(fallbackUpdated);
      setMessage({ type: "warning", text: "Backend unavailable, but reply was deleted locally for testing." });
    } finally {
      setSubmitting(false);
    }
  }

  if (!question) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <ConsultantHeader />
        <main className="flex-1 p-8">
          <button onClick={() => navigate("/expert/questions")} className="font-bold text-cyan-300 hover:text-cyan-100">
            Back to Questions
          </button>
          <p className="mt-6 text-slate-300">Question not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const hasReply = Boolean(String(question.reply_text || "").trim());

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ConsultantHeader />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => navigate("/expert/questions")}
            className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-100"
          >
            <ArrowLeft size={16} /> Back to Submitted Questions
          </button>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">{question.question_type}</span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">{question.status}</span>
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">{question.urgency} urgency</span>
              </div>

              <h1 className="text-3xl font-bold text-slate-950">{question.title}</h1>
              <p className="mt-2 text-sm text-slate-500">Submitted {formatDate(question.submitted_at)}</p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Full Question Context</p>
                <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{question.content}</p>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare size={18} className="text-cyan-700" />
                  <h2 className="text-lg font-bold text-slate-950">Reply Shown to User</h2>
                </div>
                {hasReply ? (
                  <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Replied by {question.replied_by || consultantName}</p>
                        <p className="text-xs text-slate-500">Answered {formatDate(question.answered_at)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={13} /> Replied to user
                        </span>
                        <button
                          type="button"
                          onClick={() => { setReply(question.reply_text || ""); setEditingReply(true); }}
                          className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteReply}
                          disabled={submitting}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-line text-sm leading-7 text-slate-800">{question.reply_text}</p>
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-cyan-200 bg-white p-4 text-sm font-semibold text-slate-600">
                    No reply has been submitted for this question yet. Once submitted, the reply will appear here on the same page.
                  </p>
                )}
              </div>

              <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-slate-950">{hasReply ? "Edit Reply" : "Write Reply"}</h2>
                  {hasReply && !editingReply && (
                    <button
                      type="button"
                      onClick={() => { setReply(question.reply_text || ""); setEditingReply(true); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                    >
                      <Edit3 size={15} /> Edit Reply
                    </button>
                  )}
                </div>

                {editingReply || !hasReply ? (
                  <>
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={10}
                      placeholder="Write a professional consultant reply here..."
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">Use a clear recommendation, rationale, risk note and next step.</p>
                      <div className="flex flex-wrap gap-2">
                        {hasReply && (
                          <button
                            type="button"
                            onClick={() => { setReply(question.reply_text || ""); setEditingReply(false); }}
                            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Send size={16} /> {submitting ? "Saving..." : hasReply ? "Save Updated Reply" : "Submit Reply"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    A reply already exists for this question. Click <span className="font-bold text-blue-700">Edit Reply</span> to update it, or use <span className="font-bold text-red-700">Delete</span> above to remove it and mark the question as Pending again.
                  </p>
                )}

                {message && (
                  <div
                    className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
                      message.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : message.type === "warning"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    <Database size={16} className="mt-0.5 shrink-0" />
                    <span>{message.text}</span>
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <User size={18} className="text-cyan-700" />
                  <h3 className="font-bold text-slate-950">User Profile</h3>
                </div>
                <Info label="Investor" value={question.investor_name} />
                <Info label="Email" value={question.investor_email} />
                <Info label="Portfolio Value" value={`$${Number(question.portfolio_value || 0).toLocaleString()}`} />
                <Info label="Risk Profile" value={question.risk_profile} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Target size={18} className="text-cyan-700" />
                  <h3 className="font-bold text-slate-950">Investment Details</h3>
                </div>
                <Info label="Goal" value={question.investment_goal} />
                <Info label="Tickers" value={(question.tickers || []).join(", ")} />
                <Info label="Urgency" value={question.urgency} />
              </div>

              <div className="rounded-3xl border border-slate-200 bg-cyan-50 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb size={18} className="text-cyan-700" />
                  <h3 className="font-bold text-slate-950">Reply Tips</h3>
                </div>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
                  <li>Address the user’s goal and risk profile.</li>
                  <li>Explain why each ticker is relevant.</li>
                  <li>Include risk and allocation guidance.</li>
                  <li>Keep the response professional and specific.</li>
                </ul>
              </div>

              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Paperclip size={16} /> Attachments
                </div>
                <p className="mt-2">No attachments uploaded for this question.</p>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

function Info({ label, value }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}
