import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../../layout/Footer.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import { getExpertInformation } from "../../api/userApi.js";
import { getExpertQuestions } from "../../api/expertApi.js";
import {
  MessageSquare, Briefcase, GraduationCap, FileText,
  Star, ShieldCheck, Clock, CheckCircle2,
} from "lucide-react";

const QUICK_ACTIONS = [
  { Icon: MessageSquare, label: "Answer Questions", to: "/expert/questions" },
  { Icon: Briefcase, label: "My Portfolio", to: "/expert/portfolio" },
  { Icon: GraduationCap, label: "Knowledge Hub", to: "/expert/knowledge-hub" },
  { Icon: FileText, label: "Documents", to: "/expert/documents" },
];

function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "answered") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (s === "closed") return "bg-slate-500/10 text-slate-400 border-slate-500/30";
  return "bg-orange-500/10 text-orange-400 border-orange-500/30";
}

function urgencyClass(urgency) {
  const u = String(urgency || "").toLowerCase();
  if (u === "high") return "bg-red-500/10 text-red-400 border-red-500/30";
  if (u === "medium") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  return "bg-blue-500/10 text-blue-400 border-blue-500/30";
}

// Experts only ever see 3 verification states — Unverified / Pending /
// Approved. Rejected reads the same as never having submitted.
function verificationClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified" || s === "approved") return "text-emerald-400";
  if (s === "pending") return "text-yellow-400";
  return "text-slate-400";
}

function verificationLabel(status) {
  const s = String(status || "not_submitted").toLowerCase();
  if (s === "not_submitted" || s === "rejected") return "Unverified";
  if (s === "pending") return "Pending Review";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value, valueClass, small }) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-gray-400">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,211,243,0.1)" }}>
          <span className="text-cyan-400">{icon}</span>
        </div>
      </div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: small ? 15 : 20, fontWeight: 700 }} className={valueClass ?? "text-white"}>
        {value}
      </p>
    </div>
  );
}

function Skeleton({ className, style }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ""}`} style={style} />;
}

function WelcomeBanner({ name, pendingCount }) {
  return (
    <div>
      <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1.2 }}>
        Welcome back, {name}
      </h1>
      <p className="text-sm text-gray-400 mt-2">
        {pendingCount > 0
          ? `You have ${pendingCount} investor question${pendingCount === 1 ? "" : "s"} waiting for a reply.`
          : "No pending investor questions right now — great work staying on top of things."}
      </p>
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
      {QUICK_ACTIONS.map(({ Icon, label, to }) => (
        <button
          key={label}
          onClick={() => navigate(to)}
          className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 cursor-pointer transition-all duration-200 hover:bg-white/5 hover:border-cyan-400/40 hover:-translate-y-0.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,211,243,0.1)" }}>
            <Icon size={18} className="text-cyan-400" />
          </div>
          <span className="text-xs font-medium text-gray-300 text-center">{label}</span>
        </button>
      ))}
    </div>
  );
}

function ExpertStatsSection({ expertInfo, stats, loading }) {
  const rating = Number(expertInfo?.rating ?? 0);

  if (loading) {
    return (
      <section>
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px" }}>
          Your Profile
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 76 }} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 12px" }}>
        Your Profile
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Star size={14} />} label="Rating" value={rating > 0 ? rating.toFixed(1) : "Not yet rated"} small={rating <= 0} />
        <StatCard
          icon={<ShieldCheck size={14} />}
          label="Verification"
          value={verificationLabel(expertInfo?.verification_status)}
          valueClass={verificationClass(expertInfo?.verification_status)}
        />
        <StatCard icon={<Clock size={14} />} label="Pending Questions" value={stats.pending} />
        <StatCard icon={<CheckCircle2 size={14} />} label="Answered Questions" value={stats.answered} />
      </div>
    </section>
  );
}

function QuestionRow({ q, onSelect }) {
  return (
    <div
      onClick={() => onSelect(q.id)}
      className="grid items-center gap-2 px-4 sm:px-6 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr" }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-white font-semibold text-sm truncate">{q.title}</span>
        <span className="text-gray-500 text-xs truncate">{q.investor_name} · {q.question_type}</span>
      </div>
      <span className={`justify-self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyClass(q.urgency)}`}>
        {q.urgency}
      </span>
      <span className={`justify-self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(q.status)}`}>
        {q.status}
      </span>
      <span className="text-right text-gray-400 text-xs">{formatDate(q.submitted_at)}</span>
    </div>
  );
}

function InvestorQuestionsSection({ questions, loading }) {
  const navigate = useNavigate();
  const handleSelect = (id) => navigate(`/expert/question/${id}`);
  const preview = questions.slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          Investor Questions
        </h2>
        <button
          onClick={() => navigate("/expert/questions")}
          className="text-sm font-semibold"
          style={{ color: "#00D3F2", background: "none", border: "none", cursor: "pointer" }}
        >
          View All Questions →
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/10">
        <div
          className="grid gap-2 px-4 sm:px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/10 bg-white/5"
          style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr" }}
        >
          <span>Question</span>
          <span>Urgency</span>
          <span>Status</span>
          <span className="text-right">Submitted</span>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 sm:px-6 py-3.5 border-b border-white/5">
            <Skeleton style={{ height: 34 }} />
          </div>
        ))}

        {!loading && preview.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-gray-500">No investor questions yet.</div>
        )}

        {!loading && preview.map((q) => (
          <QuestionRow key={q.id} q={q} onSelect={handleSelect} />
        ))}
      </div>
    </section>
  );
}

function normaliseQuestion(q) {
  const id = q.question_id || q.id;
  return { ...q, id };
}

const STATUS_RANK = { pending: 0, answered: 1, closed: 2 };
const URGENCY_RANK = { high: 0, medium: 1, low: 2 };

function questionSortKey(q) {
  return [
    STATUS_RANK[String(q.status).toLowerCase()] ?? 1,
    URGENCY_RANK[String(q.urgency).toLowerCase()] ?? 1,
  ];
}

function sortQuestions(list) {
  return [...list].sort((a, b) => {
    const [aStatus, aUrgency] = questionSortKey(a);
    const [bStatus, bUrgency] = questionSortKey(b);
    if (aStatus !== bStatus) return aStatus - bStatus;
    if (aUrgency !== bUrgency) return aUrgency - bUrgency;
    return new Date(b.submitted_at) - new Date(a.submitted_at);
  });
}

function ExpertLoggedInPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const name = currentUser?.username || currentUser?.full_name || "Expert";

  const [expertInfo, setExpertInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getExpertInformation(userId), getExpertQuestions(userId)])
      .then(([infoRes, questionsRes]) => {
        if (infoRes?.success) setExpertInfo(infoRes.expert_information);
        if (questionsRes?.success && Array.isArray(questionsRes.questions)) {
          setQuestions(sortQuestions(questionsRes.questions.map(normaliseQuestion)));
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const stats = useMemo(() => ({
    pending: questions.filter((q) => String(q.status).toLowerCase() === "pending").length,
    answered: questions.filter((q) => String(q.status).toLowerCase() === "answered").length,
  }), [questions]);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <ConsultantHeader />
      <main className="flex-1 p-4 md:p-7 flex flex-col gap-8">
        <WelcomeBanner name={name} pendingCount={stats.pending} />
        <QuickActions />
        <ExpertStatsSection expertInfo={expertInfo} stats={stats} loading={loading} />
        <InvestorQuestionsSection questions={questions} loading={loading} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default ExpertLoggedInPage;
