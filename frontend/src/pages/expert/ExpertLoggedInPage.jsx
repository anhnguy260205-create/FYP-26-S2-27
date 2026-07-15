import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../../layout/Footer.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import professorPageImg from "../../images/professorpage.jpg";
import { getExpertInformation } from "../../api/userApi.js";
import { getExpertPortfolio } from "../../api/expertApi.js";
import { getMyArticles } from "../../api/knowledgeHubApi.js";
import {
  MessageSquare, Briefcase, GraduationCap, FileText,
  Star, ShieldCheck, MessagesSquare, Activity, DollarSign, Lock,
  Wallet, PieChart,
} from "lucide-react";
import {
  CARD, CARD_DOMINANT, CARD_HOVER, CARD_GLOW_HOVER, FOCUS_RING,
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
  indigo: { icon: "bg-indigo-400/10 text-indigo-300", badge: "bg-indigo-400/10 text-indigo-300", ring: "hover:ring-indigo-400/30" },
};

const TOOLS = [
  {
    Icon: Activity,
    title: "Real-time Dashboard",
    description: "View live stock prices, AI- powered predictions, and market insights to support investment decision - making.",
    to: "/realtimedashboard",
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
    Icon: Briefcase,
    title: "Model Portfolio",
    description: "Publish and rebalance the model portfolio investors follow — holdings, allocation, and rationale.",
    to: "/expert/portfolio",
    accent: "rose",
  },
  {
    Icon: MessageSquare,
    title: "Messages",
    description: "Your place to talk directly with investors and answer the questions they send you.",
    to: "/expert/questions",
    accent: "amber",
  },
];

function verificationTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified" || s === "approved") return { text: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (s === "rejected") return { text: "text-red-400", bg: "bg-red-400/10" };
  return { text: "text-amber-400", bg: "bg-amber-400/10" };
}

function isVerifiedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "verified" || s === "approved";
}

// Mirrors ExpertCompensationPage.jsx's mock SUMMARY.pendingPayout — no
// compensation backend exists yet, so this is kept in sync by hand.
const PENDING_PAYOUT = 842.50;

function fmt$(n) {
  const v = Number(n) || 0;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function useExpertData(userId) {
  const [expertInfo, setExpertInfo] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [articleCount, setArticleCount] = useState(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      getExpertInformation(userId).catch(() => null),
      getExpertPortfolio(userId).catch(() => null),
      getMyArticles(userId).catch(() => null),
    ])
      .then(([infoRes, portfolioRes, articlesRes]) => {
        if (infoRes?.success) setExpertInfo(infoRes.expert_information);
        if (portfolioRes?.success && portfolioRes.portfolio) setPortfolio(portfolioRes.portfolio);
        if (articlesRes?.success && Array.isArray(articlesRes.articles)) {
          setArticleCount(articlesRes.articles.filter((a) => a.status === "published").length);
        }
      })
      .finally(() => setLoading(false));
  }, [userId]);

  return { loading, expertInfo, portfolio, articleCount };
}

function Hero({ name, loading }) {
  const navigate = useNavigate();

  return (
    <section className="flex flex-col gap-5 -mt-6 md:-mt-8 -mb-8">
      <div className="relative overflow-hidden w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] min-h-[220px] md:min-h-[280px] flex flex-col justify-center p-6 sm:p-16 md:p-20">
        <img alt="" src={professorPageImg} className="absolute inset-0 w-full h-full object-cover -z-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15 -z-10" />

        <h1 className="text-white font-extrabold text-[32px] sm:text-[40px] md:text-[44px] leading-[1.1] tracking-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
          Welcome back, {" "}
          <span className=" text-purple-700">{name}</span>{" "}
        </h1>
        {loading ? (
          <div className="h-5 w-64 max-w-full rounded bg-white/20 animate-pulse mt-2" />
        ) : (
          <p className="mt-2 text-base text-gray-100 [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
            Manage your portfolio, publish content, and connect with investors.
          </p>
        )}
      </div>
    </section>
  );
}

function ProfileSummarySection({ expertInfo, loading, userId }) {
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
            <Skeleton style={{ height: 84 }} />
          </div>
        </div>
      </section>
    );
  }

  const rating = Number(expertInfo?.rating ?? 0);
  const hasRating = rating > 0;
  const verification = expertInfo?.verification_status ?? "pending";
  const tone = verificationTone(verification);
  const verified = isVerifiedStatus(verification);

  return (
    <section>
      <SectionHeader
        title="Your Profile"
        action={<ViewAllLink onClick={() => navigate("/expert/edit-profile")}>Edit Profile</ViewAllLink>}
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
            {!hasRating && <p className="text-sm text-slate-500 mt-2">Not yet rated — keep building your reputation with investors.</p>}
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

        {/* Right column — verification + compensation */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={`${CARD} p-6 flex flex-col justify-center`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Verification</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone.bg}`}>
                <ShieldCheck size={14} className={tone.text} />
              </div>
            </div>
            <p className={`font-semibold text-xl capitalize ${tone.text}`}>{verification}</p>
          </div>

          <div
            onClick={verified ? () => navigate("/expert/compensation") : undefined}
            role="button"
            tabIndex={verified ? 0 : -1}
            aria-disabled={!verified}
            onKeyDown={verified ? (e) => { if (e.key === "Enter") navigate("/expert/compensation"); } : undefined}
            title={verified ? undefined : "Get verified to unlock compensation"}
            className={`${CARD} p-6 flex flex-col justify-center ${verified ? `${CARD_HOVER} cursor-pointer ${FOCUS_RING}` : "opacity-60 cursor-not-allowed"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400">Compensation</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${verified ? "bg-indigo-400/10" : "bg-slate-500/10"}`}>
                {verified ? <DollarSign size={14} className="text-indigo-300" /> : <Lock size={14} className="text-slate-400" />}
              </div>
            </div>
            {verified ? (
              <>
                <p className="font-semibold text-xl text-white">{fmt$(PENDING_PAYOUT)}</p>
                <p className="text-xs text-slate-500 mt-1">Pending payout</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-xl text-slate-400">Locked</p>
                <p className="text-xs text-slate-500 mt-1">Get verified to unlock compensation</p>
              </>
            )}
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
            {portfolio ? "Manage Portfolio" : "Create Portfolio"}
          </PrimaryButton>
        </div>
      </div>
    </section>
  );
}

function ToolCard({ Icon, title, description, to, accent, primary, badge, locked }) {
  const navigate = useNavigate();
  const a = ACCENTS[accent];
  return (
    <div
      onClick={locked ? undefined : () => navigate(to)}
      role="button"
      tabIndex={locked ? -1 : 0}
      aria-disabled={locked}
      onKeyDown={locked ? undefined : (e) => { if (e.key === "Enter") navigate(to); }}
      title={locked ? "Get verified to unlock this tool" : undefined}
      className={`group flex flex-col justify-between ${primary ? CARD_DOMINANT : CARD} ${a.ring} ${primary ? "lg:col-span-2 p-7" : "p-6"} ${locked ? "opacity-60 cursor-not-allowed" : `cursor-pointer ${CARD_HOVER} ${CARD_GLOW_HOVER} ${FOCUS_RING}`}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className={`flex items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${a.icon} ${primary ? "w-12 h-12" : "w-10 h-10"}`}>
            {locked ? <Lock size={primary ? 24 : 21} strokeWidth={3} /> : <Icon size={primary ? 24 : 21} strokeWidth={3} />}
          </div>
          {badge && (
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${a.badge}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className={`text-slate-900  font-bold mb-1.5 ${primary ? "text-2xl" : "text-lg"}`}>{title}</h3>
        <p className="text-[15px] font-medium text-slate-600  leading-relaxed">{locked ? "Get verified to unlock this tool." : description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#00D3F2] transition-all duration-200 group-hover:gap-2.5">
        {locked ? "Locked" : "Open"}
      </div>
    </div>
  );
}

function ToolsSection({ articleCount, verified }) {
  const tools = TOOLS.map((tool) => {
    let t = tool;
    if (t.title === "Knowledge Hub" && articleCount != null) {
      t = { ...t, badge: `${articleCount} published` };
    }
    if (t.title === "Compensation" && !verified) {
      t = { ...t, locked: true };
    }
    return t;
  });

  return (
    <section>
      <SectionHeader
        title={<span className="text-black">Your Tools</span>}
        subtitle="Everything you need to publish, answer, and grow your reach"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </section>
  );
}

function DocumentsSection({ verification, loading }) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <section>
        <Skeleton style={{ height: 148 }} />
      </section>
    );
  }

  const tone = verificationTone(verification);
  const verified = isVerifiedStatus(verification);

  return (
    <section className="relative overflow-hidden rounded-4xl bg-linear-to-br from-amber-500/10 via-slate-900 to-slate-950 ring-1 ring-amber-400/25 shadow-[0_0_60px_rgba(251,191,36,0.08)] p-7 md:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-amber-400/10 ring-1 ring-inset ring-amber-400/20">
          <FileText size={26} className="text-amber-300" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-white font-bold text-xl">Verification Documents</h3>
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full capitalize ${tone.bg} ${tone.text}`}>
              {verification}
            </span>
          </div>
          <p className="text-[15px] text-slate-300 max-w-xl">
            {verified
              ? "Manage the credential documents tied to your verified expert account."
              : "Submit your credential documents to get verified and unlock the rest of the platform."}
          </p>
        </div>
      </div>

      <div className="relative shrink-0">
        <PrimaryButton onClick={() => navigate("/expert/documents")}>
          {verified ? "Manage Documents" : "Submit Documents"}
        </PrimaryButton>
      </div>
    </section>
  );
}

function ExpertLoggedInPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const name = currentUser?.username || currentUser?.full_name || "Expert";

  const { loading, expertInfo, portfolio, articleCount } = useExpertData(userId);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <ExpertHeader />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col gap-8 divide-y divide-white/[0.06]">
        <Hero name={name} loading={loading} />
        <div
          className="w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] rounded-4xl bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 px-6 sm:px-12 md:px-40 py-10 md:py-40 flex flex-col gap-8"
          style={{ marginTop: -15, marginBottom: 30 }}
        >
          <ModelPortfolioSection portfolio={portfolio} loading={loading} />
          <ProfileSummarySection expertInfo={expertInfo} loading={loading} userId={userId} />
        </div>
        <ToolsSection articleCount={articleCount} verified={isVerifiedStatus(expertInfo?.verification_status)} />
        <DocumentsSection verification={expertInfo?.verification_status ?? "pending"} loading={loading} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default ExpertLoggedInPage;
