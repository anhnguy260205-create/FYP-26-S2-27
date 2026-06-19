import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Filter,
  MessageSquare,
  Search,
  User,
  Zap,
} from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
  getExpertPortfolioByUser,
  getExpertPortfolios,
  getExpertQuestions,
  seedDemoForumQuestions,
} from "../../api/expertApi.js";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function safeArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function safeText(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function authorName(q) {
  if (q?.username) return q.username;
  if (q?.author && typeof q.author === "object") return q.author.name || q.author.username || "Investor";
  if (typeof q?.author === "string") return q.author;
  return "Investor";
}

function statusConfig(status, isResolved) {
  if (isResolved || status === "closed") return { label: "Closed", cls: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle size={14} /> };
  if (status === "answered") return { label: "Answered", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: <MessageSquare size={14} /> };
  if (status === "in_progress") return { label: "In Progress", cls: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: <Zap size={14} /> };
  return { label: "Pending", cls: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock size={14} /> };
}

function urgencyCls(urgency) {
  const u = String(urgency || "normal").toLowerCase();
  if (u.includes("urgent")) return "bg-red-100 text-red-700 border-red-200";
  if (u.includes("high")) return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function StatCard({ title, value, sub }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export default function ExpertQuestionsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [demoMessage, setDemoMessage] = useState("");

  useEffect(() => {
    async function resolveExpertId() {
      try {
        const byUser = await getExpertPortfolioByUser(user.user_id);
        return byUser.expert?.expert_id;
      } catch {
        const all = await getExpertPortfolios();
        return (all.experts || []).find((expert) => expert.user_id === user.user_id)?.expert_id;
      }
    }

    async function loadQuestions() {
      if (!user?.user_id) {
        setError("Please log in again.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const expertId = await resolveExpertId();
        if (!expertId) {
          setError("Expert profile not found. Please create or update your expert portfolio first.");
          return;
        }

        const seedResult = await seedDemoForumQuestions(expertId);
        if ((seedResult.created || 0) > 0) {
          setDemoMessage(`${seedResult.created} premade investor questions were added for testing replies.`);
        } else {
          setDemoMessage("Premade investor questions are assigned to this expert for reply testing.");
        }

        const data = await getExpertQuestions(expertId);
        setQuestions(data.questions || []);
      } catch (err) {
        setError(err.message || "Failed to load submitted questions.");
      } finally {
        setLoading(false);
      }
    }

    loadQuestions();
  }, [user?.user_id]);

  const stats = useMemo(() => {
    const total = questions.length;
    const closed = questions.filter((q) => q.is_resolved || q.status === "closed").length;
    const answered = questions.filter((q) => q.status === "answered").length;
    const pending = questions.filter((q) => q.status === "pending" || q.status === "in_progress").length;
    return { total, pending, answered, closed };
  }, [questions]);

  const filtered = questions.filter((q) => {
    const statusMatch =
      filter === "all" ||
      (filter === "pending" && (q.status === "pending" || q.status === "in_progress")) ||
      (filter === "answered" && q.status === "answered") ||
      (filter === "closed" && (q.is_resolved || q.status === "closed"));
    const tickers = safeArray(q.tickers).join(" ");
    const text = `${q.title || ""} ${q.content || ""} ${q.category || ""} ${tickers} ${authorName(q)} ${q.urgency || ""}`.toLowerCase();
    return statusMatch && text.includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div className="min-h-screen flex flex-col bg-gray-50 text-gray-950" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-[1240px]">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Submitted Question Forms</h1>
              <p className="mt-1 text-sm text-gray-600">Centralised dashboard to track assigned investor questions and craft expert responses.</p>
            </div>
            <button onClick={() => navigate("/expert")} className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100">Back to Expert Home</button>
          </div>

          <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard title="Total Questions" value={stats.total} sub="Assigned to you" />
            <StatCard title="Pending" value={stats.pending} sub="Awaiting response" />
            <StatCard title="Answered" value={stats.answered} sub="Replies sent" />
            <StatCard title="Closed" value={stats.closed} sub="Completed requests" />
          </section>

          <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by keyword, status, ticker, investor, urgency..." className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-blue-500">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending / In Progress</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </section>

          {demoMessage && <div className="mb-5 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-sm font-semibold text-cyan-800">{demoMessage}</div>}
          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-5 py-4">
              <p className="text-sm font-bold text-gray-950">Assigned Questions</p>
              <p className="mt-1 text-xs text-gray-500">Showing {filtered.length} of {questions.length} questions</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                <AlertCircle className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                <p className="font-semibold">No questions found</p>
                <p className="mt-1 text-sm">Premade investor questions should appear here after the backend restarts.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-5 py-3">Question Title</th>
                      <th className="px-5 py-3">Question Type</th>
                      <th className="px-5 py-3">Related Tickers</th>
                      <th className="px-5 py-3">Investor</th>
                      <th className="px-5 py-3">Urgency</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Submitted</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((q) => {
                      const status = statusConfig(q.status, q.is_resolved);
                      const tickers = safeArray(q.tickers);
                      return (
                        <tr key={q.question_id || q.id} className="align-top hover:bg-gray-50/70">
                          <td className="max-w-[360px] px-5 py-4">
                            <p className="font-bold text-gray-950">{safeText(q.title, "Untitled question")}</p>
                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">{safeText(q.content, "No question details provided.")}</p>
                          </td>
                          <td className="px-5 py-4"><span className="rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{safeText(q.category, "General")}</span></td>
                          <td className="px-5 py-4"><div className="flex flex-wrap gap-1">{tickers.length ? tickers.slice(0, 4).map((ticker) => <span key={ticker} className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-bold text-gray-700">{ticker}</span>) : <span className="text-gray-400">-</span>}</div></td>
                          <td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 font-semibold text-gray-700"><User size={14} /> {authorName(q)}</span></td>
                          <td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${urgencyCls(q.urgency)}`}>{safeText(q.urgency, "Normal")}</span></td>
                          <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${status.cls}`}>{status.icon}{status.label}</span></td>
                          <td className="px-5 py-4 text-xs font-semibold text-gray-500">{formatDate(q.created_at)}</td>
                          <td className="px-5 py-4 text-right"><button onClick={() => navigate(`/expert/question/${q.question_id || q.id}`)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100"><Eye size={14} /> View</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
