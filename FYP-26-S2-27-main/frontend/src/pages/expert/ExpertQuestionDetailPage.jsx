import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, Clock, MessageSquare, Send, User, Zap } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { createForumReply, getExpertPortfolioByUser, getForumPost } from "../../api/expertApi.js";

const STORAGE_KEY = "deskstock_expert_questions_v2";

function safeArray(value) { return Array.isArray(value) ? value : []; }
function getCurrentUser() { try { return JSON.parse(localStorage.getItem("currentUser") || "null"); } catch { return null; } }
function loadQuestions() { try { return safeArray(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { return []; } }
function saveQuestions(questions) { localStorage.setItem(STORAGE_KEY, JSON.stringify(questions)); }
function findQuestion(questionId) { return loadQuestions().find((q) => q.question_id === questionId || q.id === questionId) || null; }
function upsertQuestion(question) { const list = loadQuestions(); const id = question.question_id || question.id; const idx = list.findIndex((q) => q.question_id === id || q.id === id); if (idx >= 0) list[idx] = question; else list.unshift(question); saveQuestions(list); }
function authorName(author) { if (!author) return "Investor"; if (typeof author === "string") return author; if (typeof author === "object") return author.name || author.full_name || author.username || "Investor"; return "Investor"; }
function authorInitial(author) { return authorName(author).split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase() || "U"; }
function formatDate(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString(); }
function statusBadge(question) { if (question?.is_resolved || question?.status === "closed") return { label: "Closed", color: "text-green-700 bg-green-100 border-green-200", icon: <CheckCircle size={15} /> }; if (question?.status === "answered") return { label: "Answered", color: "text-blue-700 bg-blue-100 border-blue-200", icon: <MessageSquare size={15} /> }; if (question?.status === "in_progress") return { label: "In Progress", color: "text-cyan-700 bg-cyan-100 border-cyan-200", icon: <Zap size={15} /> }; return { label: "Pending", color: "text-yellow-700 bg-yellow-100 border-yellow-200", icon: <Clock size={15} /> }; }

export default function ExpertQuestionDetailPage() {
  const { questionId } = useParams();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [question, setQuestion] = useState(() => findQuestion(questionId));
  const [expertId, setExpertId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const local = findQuestion(questionId);
      if (local && !cancelled) setQuestion(local);
      try {
        const [questionData, expertData] = await Promise.all([
          getForumPost(questionId, false).catch(() => null),
          user?.user_id ? getExpertPortfolioByUser(user.user_id).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (questionData?.question) {
          setQuestion(questionData.question);
          upsertQuestion(questionData.question);
        }
        setExpertId(expertData?.expert?.expert_id || null);
      } catch (error) {
        if (!local && !cancelled) setMessage(error.message || "Unable to load question.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [questionId, user?.user_id]);

  async function handleSubmitReply(e) {
    e.preventDefault();
    if (!replyContent.trim() || !question) return;
    setSubmitting(true);
    setMessage("");
    const reply = {
      id: `local-reply-${Date.now()}`,
      reply_id: `local-reply-${Date.now()}`,
      content: replyContent.trim(),
      author: { id: user?.user_id || "expert", name: user?.full_name || user?.username || "Expert", role: "expert" },
      created_at: new Date().toISOString(),
      time: new Date().toISOString(),
      likes: 0,
      is_expert_reply: true,
    };
    try {
      if (!String(questionId).startsWith("demo-")) {
        await createForumReply({ question_id: questionId, content: reply.content, expert_id: expertId, user_id: user?.user_id, is_expert_reply: true }).catch(() => null);
      }
      const updated = { ...question, status: "answered", replies: [...safeArray(question.replies), reply], reply_count: safeArray(question.replies).length + 1 };
      setQuestion(updated);
      upsertQuestion(updated);
      setReplyContent("");
      setMessage("Reply sent successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to send reply.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !question) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
  }

  if (!question) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-900"><div className="text-center"><h2 className="text-2xl font-bold mb-4">Question not found</h2><button onClick={() => navigate("/expert/questions")} className="px-6 py-3 bg-blue-600 text-white rounded-lg">Back to Questions</button></div></div>;
  }

  const badge = statusBadge(question);
  const replies = safeArray(question.replies);

  return (
    <motion.div className="min-h-screen flex flex-col bg-slate-100 text-slate-900" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate("/expert/questions")} className="flex items-center gap-2 mb-6 text-slate-500 hover:text-slate-900 transition-colors"><ArrowLeft size={20} /> Back to Questions</button>
          {message && <div className={`mb-6 rounded-xl border p-4 ${message.includes("successfully") ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>{message}</div>}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h1 className="text-3xl font-bold mb-3">{question.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500"><span className="inline-flex items-center gap-1"><User size={15} /> Submitted by {question.username || authorName(question.author)}</span><span>·</span><span>{formatDate(question.created_at)}</span></div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-sm font-semibold ${badge.color}`}>{badge.icon}{badge.label}</span>
                </div>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed rounded-2xl bg-slate-50 border border-slate-200 p-5 mb-5">{question.content}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <InfoCard label="Investment Goal" value={question.investment_goal || "Not specified"} />
                  <InfoCard label="Urgency" value={question.urgency || "Normal"} />
                </div>
                <div className="flex flex-wrap gap-2"><span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm font-semibold">{question.category || "General"}</span>{safeArray(question.tickers).map((ticker) => <span key={ticker} className="px-3 py-1 bg-slate-100 rounded-full text-sm font-mono">{ticker}</span>)}</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-7">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><MessageSquare size={20} /> Conversation ({replies.length})</h2>
                <div className="space-y-4">
                  {replies.length === 0 ? <div className="text-center py-10 text-slate-500">No replies yet.</div> : replies.map((reply) => (
                    <div key={reply.reply_id || reply.id} className={`rounded-2xl p-5 border ${reply.is_expert_reply ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200"}`}>
                      <div className="flex items-start gap-4"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${reply.is_expert_reply ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}>{authorInitial(reply.author)}</div><div className="flex-1 min-w-0"><div className="flex flex-wrap items-center gap-2 mb-2"><span className="font-semibold">{authorName(reply.author)}</span>{reply.is_expert_reply && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-semibold">Expert Reply</span>}<span className="text-sm text-slate-400">{formatDate(reply.created_at || reply.time)}</span></div><p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{reply.content}</p></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <aside className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"><h3 className="text-lg font-bold mb-4">Tips for a High Quality Reply</h3><ul className="space-y-3 text-sm text-slate-600 leading-relaxed"><li>• Reference the user’s investment goal and risk level.</li><li>• Explain your reasoning clearly.</li><li>• Mention risks and assumptions.</li><li>• Keep advice educational and data-backed.</li></ul></div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"><h3 className="text-lg font-bold mb-4">Your Reply</h3><form onSubmit={handleSubmitReply}><textarea value={replyContent} onChange={(e) => setReplyContent(e.target.value)} rows={10} placeholder="Write your response here..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none mb-4 text-slate-900" /><button type="submit" disabled={submitting || !replyContent.trim()} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-opacity disabled:opacity-50"><Send size={18} />{submitting ? "Sending..." : "Send Reply"}</button></form></div>
            </aside>
          </section>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

function InfoCard({ label, value }) { return <div className="rounded-xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</p><p className="text-sm text-slate-700 leading-relaxed">{value}</p></div>; }
