
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Search, Eye, AlertTriangle, MessageSquare, XCircle } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertQuestions } from "../../api/expertApi.js";

const STORAGE_KEY = "rocketTradeExpertQuestions";

const DEFAULT_QUESTIONS = [
  { id: "question_demo_nvda", question_id: "question_demo_nvda", investor_name: "Sarah Chen", investor_email: "sarah.chen@email.com", title: "Should I rebalance my NVDA-heavy portfolio?", question_type: "Portfolio Review", tickers: ["NVDA", "MSFT", "AAPL"], urgency: "High", status: "Pending", investment_goal: "Long-term growth", risk_profile: "Moderate-Aggressive", portfolio_value: 52000, content: "My portfolio is now heavily concentrated in NVDA after the recent rally. Should I trim some gains and rebalance into other technology or defensive stocks?", submitted_at: "2026-05-06T09:30:00+08:00" },
  { id: "question_demo_dbs", question_id: "question_demo_dbs", investor_name: "Marcus Rivera", investor_email: "marcus.rivera@email.com", title: "DBS entry price and dividend strategy", question_type: "Stock Analysis", tickers: ["DBS.SI", "UOB.SI"], urgency: "Medium", status: "Pending", investment_goal: "Dividend income", risk_profile: "Moderate", portfolio_value: 30000, content: "I am considering DBS for dividend income. Is the current price still attractive, or should I wait for a pullback before entering?", submitted_at: "2026-05-05T14:15:00+08:00" },
  { id: "question_demo_defensive", question_id: "question_demo_defensive", investor_name: "Priya Nair", investor_email: "priya.nair@email.com", title: "How do I make my portfolio less volatile?", question_type: "Risk Management", tickers: ["AAPL", "KO", "JNJ"], urgency: "Low", status: "Pending", investment_goal: "Capital preservation", risk_profile: "Conservative", portfolio_value: 18000, content: "I am worried about market volatility. What type of defensive allocation should I add so my portfolio moves less aggressively?", submitted_at: "2026-05-04T16:45:00+08:00" },
];

function normaliseQuestion(q) {
  const id = q.question_id || q.id;
  return { ...q, id, question_id: id, tickers: Array.isArray(q.tickers) ? q.tickers : String(q.tickers || "").split(",").map((t) => t.trim()).filter(Boolean) };
}

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "answered") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (s === "closed") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-orange-50 text-orange-700 border-orange-200";
}

function urgencyClass(urgency) {
  const u = String(urgency || "").toLowerCase();
  if (u === "high") return "bg-red-50 text-red-700 border-red-200";
  if (u === "medium") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div></div><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p></div>;
}

export default function ExpertQuestionsPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS.map(normaliseQuestion));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setQuestions(JSON.parse(saved).map(normaliseQuestion)); } catch { /* ignore */ }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_QUESTIONS));
    }
    getExpertQuestions(currentUser?.user_id).then((data) => {
      if (data?.success && Array.isArray(data.questions)) {
        const normalised = data.questions.map(normaliseQuestion);
        setQuestions(normalised);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
      }
    }).catch(() => { });
  }, [currentUser?.user_id]);

  const filteredQuestions = questions.filter((q) => {
    const search = query.toLowerCase().trim();
    const matchesSearch = !search || [q.title, q.investor_name, q.question_type, q.investment_goal, ...(q.tickers || [])].some((v) => String(v || "").toLowerCase().includes(search));
    const matchesFilter = filter === "All" || String(q.status).toLowerCase() === filter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  const stats = useMemo(() => ({
    total: questions.length,
    pending: questions.filter((q) => String(q.status).toLowerCase() === "pending").length,
    answered: questions.filter((q) => String(q.status).toLowerCase() === "answered").length,
    closed: questions.filter((q) => String(q.status).toLowerCase() === "closed").length,
  }), [questions]);

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ConsultantHeader />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-sm font-semibold text-cyan-300">Expert</p>
            <h1 className="text-3xl font-bold text-white">Submitted Question Forms</h1>
            <p className="mt-1 text-sm text-slate-300">Track pending, answered and closed questions submitted by premium users.</p>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<MessageSquare size={18} />} label="Total Questions" value={stats.total} />
            <StatCard icon={<Clock size={18} />} label="Pending" value={stats.pending} />
            <StatCard icon={<CheckCircle2 size={18} />} label="Answered" value={stats.answered} />
            <StatCard icon={<XCircle size={18} />} label="Closed" value={stats.closed} />
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative max-w-lg flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by title, investor, type or ticker" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-500" /></div>
              <div className="flex flex-wrap gap-2">{["All", "Pending", "Answered", "Closed"].map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-xl px-4 py-2 text-sm font-bold ${filter === item ? "bg-slate-950 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}</div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Question Type</th><th className="px-4 py-3">Tickers</th><th className="px-4 py-3">User</th><th className="px-4 py-3">Urgency</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted Date</th><th className="px-4 py-3">Action</th></tr></thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredQuestions.map((q) => <tr key={q.id} className="hover:bg-slate-50"><td className="px-4 py-4 font-bold text-slate-900">{q.title}</td><td className="px-4 py-4 text-slate-600">{q.question_type}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-1">{(q.tickers || []).map((t) => <span key={t} className="rounded-full bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">{t}</span>)}</div></td><td className="px-4 py-4 text-slate-600">{q.investor_name}</td><td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${urgencyClass(q.urgency)}`}>{q.urgency}</span></td><td className="px-4 py-4"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass(q.status)}`}>{q.status}</span></td><td className="px-4 py-4 text-slate-600">{formatDate(q.submitted_at)}</td><td className="px-4 py-4"><button onClick={() => navigate(`/expert/question/${q.id}`)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-700"><Eye size={14} /> View</button></td></tr>)}
                </tbody>
              </table>
              {filteredQuestions.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No questions found.</div>}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
