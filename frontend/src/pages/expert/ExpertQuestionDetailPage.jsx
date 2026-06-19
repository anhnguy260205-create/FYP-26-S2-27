import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock, MessageSquare, Send, User, Zap } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { createForumReply, getExpertPortfolioByUser, getForumPost } from "../../api/expertApi.js";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function safeArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function authorName(author) {
  if (!author) return "Investor";
  if (typeof author === "string") return author;
  if (typeof author === "object") return author.name || author.full_name || author.username || "Investor";
  return "Investor";
}

function initials(name) {
  return safeText(name, "User").split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U";
}

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(question) {
  if (question?.is_resolved || question?.status === "closed") return { label: "Closed", cls: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle size={15} /> };
  if (question?.status === "answered") return { label: "Answered", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <MessageSquare size={15} /> };
  if (question?.status === "in_progress") return { label: "In Progress", cls: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: <Zap size={15} /> };
  return { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock size={15} /> };
}

function urgencyClass(urgency) {
  const u = String(urgency || "normal").toLowerCase();
  if (u.includes("urgent")) return "bg-red-100 text-red-700 border-red-200";
  if (u.includes("high")) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function ExpertQuestionDetailPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [question, setQuestion] = useState(null);
  const [expertId, setExpertId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshQuestion() {
    const data = await getForumPost(questionId, false, user?.user_id || null);
    setQuestion(data.question);
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");
      try {
        const [questionData, expertData] = await Promise.all([
          getForumPost(questionId, false, user?.user_id || null),
          user?.user_id ? getExpertPortfolioByUser(user.user_id).catch(() => null) : Promise.resolve(null),
        ]);
        setQuestion(questionData.question);
        setExpertId(expertData?.expert?.expert_id || null);
      } catch (error) {
        setMessage(error.message || "Unable to load question.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [questionId, user?.user_id]);

  async function handleSubmitReply(e) {
    e.preventDefault();
    if (!replyContent.trim()) return;
    setSubmitting(true);
    setMessage("");
    try {
      await createForumReply({
        question_id: questionId,
        content: replyContent.trim(),
        expert_id: expertId,
        user_id: user?.user_id,
        is_expert_reply: true,
      });
      setReplyContent("");
      await refreshQuestion();
      setMessage("Reply sent successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to send reply.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" /></div>;
  }

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-950">
        <div className="text-center"><h2 className="text-2xl font-bold mb-4">Question not found</h2><button onClick={() => navigate("/expert/questions")} className="rounded-md bg-gray-950 px-5 py-3 text-sm font-bold text-white">Back to Questions</button></div>
      </div>
    );
  }

  const badge = statusBadge(question);
  const replies = Array.isArray(question.replies) ? question.replies : [];
  const tickers = safeArray(question.tickers);
  const submitter = question.username || authorName(question.author);

  return (
    <motion.div className="min-h-screen flex flex-col bg-gray-50 text-gray-950" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[1180px]">
          <button onClick={() => navigate("/expert/questions")} className="mb-5 inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100"><ArrowLeft size={16} /> Back to Submitted Questions</button>

          {message && <div className={`mb-5 rounded-lg border p-4 text-sm font-semibold ${message.includes("successfully") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}>{message}</div>}

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold leading-tight text-gray-950">{safeText(question.title, "Untitled question")}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1.5"><User size={15} /> Submitted by {submitter}</span>
                      <span>•</span>
                      <span>{formatDate(question.created_at)}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${badge.cls}`}>{badge.icon}{badge.label}</span>
                </div>

                <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{safeText(question.content, "No question details provided.")}</div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Urgency Level</p>
                    <span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${urgencyClass(question.urgency)}`}>{safeText(question.urgency, "Normal")}</span>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Related Tickers</p>
                    <div className="mt-2 flex flex-wrap gap-1">{tickers.length ? tickers.map((ticker) => <span key={ticker} className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-700">{ticker}</span>) : <span className="text-sm text-gray-400">-</span>}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Investment Goal</p>
                    <p className="mt-2 text-sm font-semibold text-gray-700">{safeText(question.investment_goal, "Not provided")}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><MessageSquare size={18} /> Conversation ({replies.length})</h2>
                <div className="space-y-4">
                  {replies.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center text-sm text-gray-500">No replies yet. Use the reply form to send the first expert response.</div>
                  ) : replies.map((reply) => {
                    const replyName = authorName(reply.author);
                    return (
                      <div key={reply.reply_id || reply.id} className={`rounded-xl border p-5 ${reply.is_expert_reply ? "border-cyan-200 bg-cyan-50" : "border-gray-200 bg-white"}`}>
                        <div className="flex items-start gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${reply.is_expert_reply ? "bg-cyan-600 text-white" : "bg-gray-100 text-gray-700"}`}>{initials(replyName)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2"><span className="font-bold text-gray-950">{replyName}</span>{reply.is_expert_reply && <span className="rounded border border-cyan-200 bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-700">Expert Reply</span>}<span className="text-xs text-gray-500">{formatDate(reply.created_at || reply.time)}</span></div>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{safeText(reply.content, "")}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold">Reply Question Form</h3>
                <form onSubmit={handleSubmitReply}>
                  <textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={11} placeholder="Write your expert response here..." className="mb-4 w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-500" />
                  <button type="submit" disabled={submitting || !replyContent.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-50"><Send size={16} /> {submitting ? "Sending..." : "Send Reply"}</button>
                </form>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-base font-bold">Tips for High Quality Replies</h3>
                <ul className="space-y-3 text-sm leading-relaxed text-gray-600">
                  <li>• Reference the investor’s goal, tickers, and urgency level.</li>
                  <li>• Explain the reasoning behind the advice.</li>
                  <li>• Include risks, assumptions, and next steps.</li>
                  <li>• Keep the response educational and data-backed.</li>
                </ul>
              </div>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
