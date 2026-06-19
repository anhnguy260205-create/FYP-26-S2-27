import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Clock, Filter, MessageSquare, Search, User, Zap } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertPortfolioByUser, getExpertQuestions } from "../../api/expertApi.js";

const STORAGE_KEY = "deskstock_expert_questions_v2";

const DEMO_QUESTIONS = [
  {
    question_id: "demo-q1",
    id: "demo-q1",
    title: "Should I rebalance my tech-heavy portfolio before earnings season?",
    content: "My current portfolio is about 65% technology stocks, mainly AAPL, NVDA and MSFT. I am worried about earnings volatility but still want long-term growth exposure. How should I think about rebalancing without selling too much too early?",
    category: "Portfolio Strategy",
    tickers: ["AAPL", "NVDA", "MSFT"],
    urgency: "High",
    investment_goal: "Long-term capital growth with controlled drawdown risk.",
    status: "pending",
    is_resolved: false,
    username: "Alex Chen",
    author: { id: "demo-investor-1", name: "Alex Chen", role: "premium", title: "Premium Investor" },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    reply_count: 0,
    replies: [],
  },
  {
    question_id: "demo-q2",
    id: "demo-q2",
    title: "Is DBS still attractive after the recent price increase?",
    content: "I have been watching DBS and UOB for dividend income. DBS has moved up recently, so I am unsure whether to enter now or wait for a pullback. Could you explain the key valuation and risk factors I should consider?",
    category: "Stock Review",
    tickers: ["DBS", "UOB"],
    urgency: "Normal",
    investment_goal: "Dividend income and lower volatility exposure.",
    status: "in_progress",
    is_resolved: false,
    username: "Priya Nair",
    author: { id: "demo-investor-2", name: "Priya Nair", role: "investor", title: "Investor" },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    reply_count: 0,
    replies: [],
  },
  {
    question_id: "demo-q3",
    id: "demo-q3",
    title: "How much cash should I keep while markets look uncertain?",
    content: "I am a beginner investor and currently hold around 20% cash. I want to buy more stocks but I am nervous about a correction. What framework should I use for deciding how much cash to keep?",
    category: "Risk Management",
    tickers: ["SPY", "QQQ"],
    urgency: "Low",
    investment_goal: "Build a beginner-friendly diversified portfolio.",
    status: "pending",
    is_resolved: false,
    username: "Marcus Rivera",
    author: { id: "demo-investor-3", name: "Marcus Rivera", role: "basic", title: "Basic Investor" },
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    reply_count: 0,
    replies: [],
  },
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normaliseQuestion(q) {
  const replies = safeArray(q?.replies);
  return {
    ...q,
    question_id: q?.question_id || q?.id || `q-${Date.now()}`,
    id: q?.id || q?.question_id,
    title: String(q?.title || "Untitled question"),
    content: String(q?.content || ""),
    category: String(q?.category || "General"),
    tickers: safeArray(q?.tickers),
    urgency: String(q?.urgency || "Normal"),
    investment_goal: String(q?.investment_goal || "Not specified"),
    status: String(q?.status || "pending"),
    username: q?.username || q?.author?.name || "Investor",
    author: typeof q?.author === "object" && q.author ? q.author : { name: q?.username || "Investor", role: "investor" },
    created_at: q?.created_at || new Date().toISOString(),
    replies,
    reply_count: typeof q?.reply_count === "number" ? q.reply_count : replies.length,
    is_resolved: Boolean(q?.is_resolved),
  };
}

function loadStoredQuestions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (Array.isArray(stored) && stored.length > 0) return stored.map(normaliseQuestion);
  } catch (error) {
    console.error("Unable to load demo expert questions", error);
  }
  const seeded = DEMO_QUESTIONS.map(normaliseQuestion);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

function saveStoredQuestions(questions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(questions.map(normaliseQuestion)));
}

function mergeQuestions(localQuestions, apiQuestions) {
  const map = new Map();
  localQuestions.map(normaliseQuestion).forEach((q) => map.set(q.question_id, q));
  safeArray(apiQuestions).map(normaliseQuestion).forEach((q) => map.set(q.question_id, q));
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "null"); } catch { return null; }
}

function formatDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function statusBadge(status, isResolved) {
  if (isResolved || status === "closed") return { label: "Closed", className: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle size={14} /> };
  if (status === "answered") return { label: "Answered", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <MessageSquare size={14} /> };
  if (status === "in_progress") return { label: "In Progress", className: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: <Zap size={14} /> };
  return { label: "Pending", className: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Clock size={14} /> };
}

function urgencyBadge(urgency) {
  const lower = String(urgency || "normal").toLowerCase();
  if (lower === "high") return "bg-red-100 text-red-700 border-red-200";
  if (lower === "low") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-orange-100 text-orange-700 border-orange-200";
}

export default function ExpertQuestionsPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [questions, setQuestions] = useState(() => loadStoredQuestions());
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("Premade investor questions are loaded for testing replies.");
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadBackendQuestions() {
      if (!user?.user_id) return;
      setLoading(true);
      try {
        const expertData = await getExpertPortfolioByUser(user.user_id);
        const expertId = expertData?.expert?.expert_id;
        if (!expertId) return;
        const data = await getExpertQuestions(expertId);
        if (cancelled) return;
        const merged = mergeQuestions(loadStoredQuestions(), data.questions || []);
        setQuestions(merged);
        saveStoredQuestions(merged);
        setNotice("Backend questions and premade testing questions are loaded.");
      } catch (error) {
        if (!cancelled) setNotice("Backend questions unavailable, showing premade investor questions for testing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadBackendQuestions();
    return () => { cancelled = true; };
  }, [user?.user_id]);

  const stats = useMemo(() => {
    const total = questions.length;
    const closed = questions.filter((q) => q.is_resolved || q.status === "closed").length;
    const answered = questions.filter((q) => q.status === "answered").length;
    const pending = questions.filter((q) => q.status === "pending" || q.status === "in_progress").length;
    return { total, pending, answered, closed };
  }, [questions]);

  const filteredQuestions = questions.filter((q) => {
    const statusMatch = filter === "all" ||
      (filter === "pending" && (q.status === "pending" || q.status === "in_progress")) ||
      (filter === "answered" && q.status === "answered") ||
      (filter === "closed" && (q.is_resolved || q.status === "closed"));
    const text = `${q.title} ${q.content} ${q.tickers.join(" ")} ${q.username} ${q.category}`.toLowerCase();
    return statusMatch && text.includes(searchTerm.toLowerCase());
  });

  return (
    <motion.div className="min-h-screen flex flex-col bg-slate-100 text-slate-900" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-7">
            <h1 className="text-3xl font-bold mb-2">Submitted Question Forms</h1>
            <p className="text-slate-600">Track investor questions, urgency, related tickers, status, and replies.</p>
          </div>

          <section className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-7">
            <StatCard label="Total Questions" value={stats.total} tone="blue" />
            <StatCard label="Pending" value={stats.pending} tone="yellow" />
            <StatCard label="Answered" value={stats.answered} tone="cyan" />
            <StatCard label="Closed" value={stats.closed} tone="green" />
          </section>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by title, ticker, investor, or keyword..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-slate-400" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending / In Progress</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-500">{loading ? "Loading backend questions..." : notice}</p>
          </div>

          {filteredQuestions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <AlertCircle className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No questions found</h3>
              <p className="text-slate-500">Try another search or filter.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wide">
                <div className="col-span-4">Question</div>
                <div className="col-span-2">Type / Tickers</div>
                <div className="col-span-2">Investor</div>
                <div className="col-span-1">Urgency</div>
                <div className="col-span-1">Replies</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              {filteredQuestions.map((q) => {
                const badge = statusBadge(q.status, q.is_resolved);
                return (
                  <div key={q.question_id} className="grid grid-cols-12 gap-4 px-6 py-5 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center">
                    <div className="col-span-4 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{q.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{q.content}</p>
                      <p className="text-xs text-slate-400 mt-2">Submitted {formatDate(q.created_at)}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold mb-2">{q.category || "General"}</span>
                      <div className="flex flex-wrap gap-1">
                        {q.tickers.slice(0, 3).map((ticker) => <span key={ticker} className="px-2 py-0.5 bg-slate-100 rounded font-mono text-xs">{ticker}</span>)}
                      </div>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 text-sm text-slate-700"><User size={15} />{q.username || q.author?.name || "Investor"}</div>
                    <div className="col-span-1"><span className={`inline-flex px-2 py-1 rounded-full border text-xs font-semibold ${urgencyBadge(q.urgency)}`}>{q.urgency}</span></div>
                    <div className="col-span-1 text-sm text-slate-700"><MessageSquare size={15} className="inline mr-1" />{q.reply_count || 0}</div>
                    <div className="col-span-1"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-semibold ${badge.className}`}>{badge.icon}{badge.label}</span></div>
                    <div className="col-span-1 text-right"><button onClick={() => navigate(`/expert/question/${q.question_id}`)} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">View</button></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

function StatCard({ label, value, tone }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
    green: "bg-green-50 text-green-700 border-green-100",
  };
  return <div className={`rounded-2xl border p-5 bg-white shadow-sm ${colors[tone]}`}><p className="text-sm opacity-80">{label}</p><p className="text-3xl font-bold mt-1">{value}</p></div>;
}
