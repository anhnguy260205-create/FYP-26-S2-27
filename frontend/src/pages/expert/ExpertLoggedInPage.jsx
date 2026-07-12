import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../../layout/Footer.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import { getExpertInformation } from "../../api/userApi.js";
import { getExpertQuestions, getExpertPortfolio } from "../../api/expertApi.js";
import { getMyArticles } from "../../api/knowledgeHubApi.js";
import {
  MessageSquare, Briefcase, GraduationCap, FileText, UserCog,
  Star, ShieldCheck, Clock, CheckCircle2, MessagesSquare,
  Wallet, PieChart, ArrowRight, Inbox,
} from "lucide-react";
import {
  CARD, CARD_COMPACT, CARD_DOMINANT, CARD_HOVER, CARD_GLOW_HOVER, FOCUS_RING,
  Skeleton, SectionHeader, ViewAllLink, PrimaryButton,
} from "../../components/dashboard/DashboardKit.jsx";

const SECONDARY_LINKS = [
  { Icon: Briefcase, label: "My Portfolio", to: "/expert/portfolio" },
  { Icon: GraduationCap, label: "Knowledge Hub", to: "/expert/knowledge-hub" },
  { Icon: FileText, label: "Documents", to: "/expert/documents" },
];

const ACCENTS = {
  cyan: { icon: "bg-[#00D3F2]/10 text-[#00D3F2]", badge: "bg-[#00D3F2]/10 text-[#00D3F2]", ring: "hover:ring-[#00D3F2]/30" },
  violet: { icon: "bg-violet-400/10 text-violet-300", badge: "bg-violet-400/10 text-violet-300", ring: "hover:ring-violet-400/30" },
  emerald: { icon: "bg-emerald-400/10 text-emerald-300", badge: "bg-emerald-400/10 text-emerald-300", ring: "hover:ring-emerald-400/30" },
  amber: { icon: "bg-amber-400/10 text-amber-300", badge: "bg-amber-400/10 text-amber-300", ring: "hover:ring-amber-400/30" },
  rose: { icon: "bg-rose-400/10 text-rose-300", badge: "bg-rose-400/10 text-rose-300", ring: "hover:ring-rose-400/30" },
};

const TOOLS = [
  {
    Icon: Briefcase,
    title: "Model Portfolio",
    description: "Publish and rebalance the model portfolio investors follow — holdings, allocation, and rationale.",
    to: "/expert/portfolio",
    accent: "cyan",
    primary: true,
  },
  {
    Icon: GraduationCap,
    title: "Knowledge Hub",
    description: "Write and publish educational articles for investors, from beginner basics to advanced strategy.",
    to: "/expert/knowledge-hub",
    accent: "violet",
  },
  {
    Icon: MessagesSquare,
    title: "Community Forum",
    description: "Join discussions with investors and fellow experts on markets, strategy, and platform news.",
    to: "/forum",
    accent: "emerald",
  },
  {
    Icon: FileText,
    title: "Documents",
    description: "Manage the verification and credential documents tied to your expert account.",
    to: "/expert/documents",
    accent: "amber",
  },
  {
    Icon: UserCog,
    title: "Edit Profile",
    description: "Update your bio, experience, and contact details investors see on your profile.",
    to: "/expert/edit-profile",
    accent: "rose",
  },
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

function verificationTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified" || s === "approved") return { text: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (s === "rejected") return { text: "text-red-400", bg: "bg-red-400/10" };
  return { text: "text-amber-400", bg: "bg-amber-400/10" };
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmt$(n) {
  const v = Number(n) || 0;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function useExpertData(userId) {
  const [expertInfo, setExpertInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [portfolio, setPortfolio] = useState(null);
  const [articleCount, setArticleCount] = useState(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getExpertInformation(userId).catch(() => null),
      getExpertQuestions(userId).catch(() => null),
      getExpertPortfolio(userId).catch(() => null),
      getMyArticles(userId).catch(() => null),
    ])
      .then(([infoRes, questionsRes, portfolioRes, articlesRes]) => {
        if (infoRes?.success) setExpertInfo(infoRes.expert_information);
        if (questionsRes?.success && Array.isArray(questionsRes.questions)) {
          setQuestions(sortQuestions(questionsRes.questions.map(normaliseQuestion)));
        }
        if (portfolioRes?.success && portfolioRes.portfolio) setPortfolio(portfolioRes.portfolio);
        if (articlesRes?.success && Array.isArray(articlesRes.articles)) {
          setArticleCount(articlesRes.articles.filter((a) => a.status === "published").length);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const stats = useMemo(() => ({
    pending: questions.filter((q) => String(q.status).toLowerCase() === "pending").length,
    answered: questions.filter((q) => String(q.status).toLowerCase() === "answered").length,
  }), [questions]);

  return { loading, expertInfo, questions, portfolio, articleCount, stats };
}

function Hero({ name, loading, pendingCount }) {
  const navigate = useNavigate();
  const hasPending = !loading && pendingCount > 0;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-white font-bold text-[36px] leading-[1.15] tracking-tight">
          Welcome back, {name} <span aria-hidden="true">👋</span>
        </h1>
        {loading ? (
          <div className="h-5 w-64 max-w-full rounded bg-white/5 animate-pulse mt-2" />
        ) : (
          <p className="mt-2 text-base text-slate-400">
            {hasPending
              ? `You have ${pendingCount} investor question${pendingCount === 1 ? "" : "s"} waiting for a reply.`
              : "No pending investor questions right now — great work staying on top of things."}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <PrimaryButton size="lg" icon={MessageSquare} onClick={() => navigate("/expert/questions")}>
          {hasPending ? "Answer Questions" : "Review Questions"}
        </PrimaryButton>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2.5">
          {SECONDARY_LINKS.map(({ Icon, label, to }) => (
            <button
              key={label}
              onClick={() => navigate(to)}
              className={`inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors duration-150 hover:text-[#00D3F2] cursor-pointer rounded ${FOCUS_RING}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProfileSummarySection({ expertInfo, stats, loading, userId }) {
  const navigate = useNavigate();

  if (!userId) return null;

  if (loading) {
    return (
      <section>
        <SectionHeader title="Your Profile" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3" style={{ height: 160 }} />
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Skeleton style={{ height: 84 }} />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton style={{ height: 74 }} />
              <Skeleton style={{ height: 74 }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const rating = Number(expertInfo?.rating ?? 0);
  const hasRating = rating > 0;
  const verification = expertInfo?.verification_status ?? "pending";
  const tone = verificationTone(verification);

  return (
    <section>
      <SectionHeader
        title="Your Profile"
        action={<ViewAllLink onClick={() => navigate("/expert/edit-profile")}>Edit Profile →</ViewAllLink>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Dominant card — rating */}
        <div className={`lg:col-span-3 ${CARD_DOMINANT} p-7 flex flex-col justify-between gap-6`}>
          <div>
            <p className="text-sm text-slate-400 mb-2">Your Rating</p>
            <div className="flex items-end gap-3">
              <p className="font-['DM_Mono'] font-bold text-white text-[42px] leading-none tracking-tight">
                {hasRating ? rating.toFixed(1) : "—"}
              </p>
              {hasRating && <span className="text-slate-500 text-lg mb-1">/ 5.0</span>}
            </div>
            {!hasRating && <p className="text-sm text-slate-500 mt-2">Not yet rated — keep answering questions to build your reputation.</p>}
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={18}
                className={i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-700"}
              />
            ))}
          </div>
        </div>

        {/* Secondary + compact cards */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={`${CARD} p-6 flex-1 flex flex-col justify-center`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Verification</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone.bg}`}>
                <ShieldCheck size={14} className={tone.text} />
              </div>
            </div>
            <p className={`font-semibold text-xl capitalize ${tone.text}`}>{verification}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${CARD_COMPACT} p-4`}>
              <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                <Clock size={12} />
                <p className="text-xs">Pending</p>
              </div>
              <p className="font-['DM_Mono'] font-semibold text-base text-white">{stats.pending}</p>
            </div>
            <div className={`${CARD_COMPACT} p-4`}>
              <div className="flex items-center gap-1.5 text-slate-500 mb-1.5">
                <CheckCircle2 size={12} />
                <p className="text-xs">Answered</p>
              </div>
              <p className="font-['DM_Mono'] font-semibold text-base text-white">{stats.answered}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PortfolioStat({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[#00D3F2]/10">
          <Icon size={14} className="text-[#00D3F2]" />
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-white font-semibold text-lg leading-tight truncate">{value}</p>
    </div>
  );
}

function ModelPortfolioSection({ portfolio, loading }) {
  const navigate = useNavigate();

  return (
    <section>
      <SectionHeader
        title="Model Portfolio"
        subtitle={portfolio ? `${portfolio.portfolio_name} — status: ${portfolio.status ?? "Active"}` : "The portfolio investors follow"}
      />
      <div className="rounded-2xl bg-[#00D3F2]/[0.05] shadow-lg shadow-black/20 ring-1 ring-[#00D3F2]/20 p-5 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 60 }} />
            ))}
          </div>
        ) : portfolio ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-5">
            <PortfolioStat icon={PieChart} label="Holdings" value={portfolio.total_holdings ?? 0} />
            <PortfolioStat icon={Wallet} label="Invested" value={fmt$(portfolio.total_invested)} />
            <PortfolioStat icon={Wallet} label="Cash Balance" value={fmt$(portfolio.cash_balance)} />
            <PortfolioStat icon={ShieldCheck} label="Risk Level" value={portfolio.risk_level ?? "—"} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">You haven't set up a model portfolio yet.</p>
        )}
        <div className="mt-5 pt-5 border-t border-white/10 flex justify-end">
          <PrimaryButton onClick={() => navigate("/expert/portfolio")}>
            {portfolio ? "Manage Portfolio →" : "Create Portfolio →"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function QuestionRow({ q, onSelect }) {
  return (
    <div
      onClick={() => onSelect(q.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(q.id); }}
      className="grid items-center gap-2 px-4 sm:px-6 py-4 border-b border-white/5 last:border-b-0 transition-colors duration-150 hover:bg-white/[0.03] cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[#00D3F2]"
      style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr" }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-white font-semibold text-sm truncate">{q.title}</span>
        <span className="text-slate-500 text-xs truncate">{q.investor_name} · {q.question_type}</span>
      </div>
      <span className={`justify-self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${urgencyClass(q.urgency)}`}>
        {q.urgency}
      </span>
      <span className={`justify-self-start rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(q.status)}`}>
        {q.status}
      </span>
      <span className="text-right text-slate-400 text-xs">{formatDate(q.submitted_at)}</span>
    </div>
  );
}

function InvestorQuestionsSection({ questions, loading }) {
  const navigate = useNavigate();
  const handleSelect = (id) => navigate(`/expert/question/${id}`);
  const preview = questions.slice(0, 5);

  return (
    <section>
      <SectionHeader
        title="Investor Questions"
        action={<ViewAllLink onClick={() => navigate("/expert/questions")}>View All Questions →</ViewAllLink>}
      />

      <div className={`${CARD_DOMINANT} overflow-hidden`}>
        <div
          className="grid gap-2 px-4 sm:px-6 py-3.5 text-xs text-slate-500 uppercase tracking-widest bg-white/[0.03]"
          style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr" }}
        >
          <span>Question</span>
          <span>Urgency</span>
          <span>Status</span>
          <span className="text-right">Submitted</span>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 sm:px-6 py-4 border-b border-white/5 last:border-b-0">
            <Skeleton style={{ height: 34 }} />
          </div>
        ))}

        {!loading && preview.length === 0 && (
          <div className="px-6 py-14 flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full bg-white/[0.03]" />
              <div className="absolute inset-[7px] rounded-full bg-white/[0.05] flex items-center justify-center">
                <Inbox size={22} className="text-slate-400" />
              </div>
            </div>
            <p className="text-white font-semibold text-base mb-1.5">No investor questions yet</p>
            <p className="text-sm text-slate-500 max-w-sm">
              Questions investors submit to you will show up here — verified experts get more visibility across the platform.
            </p>
          </div>
        )}

        {!loading && preview.map((q) => (
          <QuestionRow key={q.id} q={q} onSelect={handleSelect} />
        ))}
      </div>
    </section>
  );
}

function ToolCard({ Icon, title, description, to, accent, primary, badge }) {
  const navigate = useNavigate();
  const a = ACCENTS[accent];
  return (
    <div
      onClick={() => navigate(to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(to); }}
      className={`group flex flex-col justify-between cursor-pointer ${primary ? CARD_DOMINANT : CARD} ${CARD_HOVER} ${CARD_GLOW_HOVER} ${a.ring} ${FOCUS_RING} ${primary ? "lg:col-span-2 p-7" : "p-6"}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className={`flex items-center justify-center rounded-xl ${a.icon} ${primary ? "w-12 h-12" : "w-10 h-10"}`}>
            <Icon size={primary ? 22 : 19} />
          </div>
          {badge && (
            <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${a.badge}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className={`text-white font-semibold mb-1.5 ${primary ? "text-xl" : "text-lg"}`}>{title}</h3>
        <p className="text-[15px] text-slate-400 leading-relaxed">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#00D3F2] transition-all duration-200 group-hover:gap-2.5">
        Open <ArrowRight size={14} />
      </div>
    </div>
  );
}

function ToolsSection({ articleCount }) {
  const tools = TOOLS.map((tool) => {
    if (tool.title === "Knowledge Hub" && articleCount != null) {
      return { ...tool, badge: `${articleCount} published` };
    }
    return tool;
  });

  return (
    <section>
      <SectionHeader title="Your Tools" subtitle="Everything you need to publish, answer, and grow your reach" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </section>
  );
}

function ExpertLoggedInPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const name = currentUser?.username || currentUser?.full_name || "Expert";

  const { loading, expertInfo, questions, portfolio, articleCount, stats } = useExpertData(userId);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <ExpertHeader />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col gap-8 divide-y divide-white/[0.06]">
        <Hero name={name} loading={loading} pendingCount={stats.pending} />
        <ModelPortfolioSection portfolio={portfolio} loading={loading} />
        <ProfileSummarySection expertInfo={expertInfo} stats={stats} loading={loading} userId={userId} />
        <InvestorQuestionsSection questions={questions} loading={loading} />
        <ToolsSection articleCount={articleCount} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default ExpertLoggedInPage;
