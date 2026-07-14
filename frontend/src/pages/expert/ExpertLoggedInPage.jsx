import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../../layout/Footer.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import { getExpertInformation } from "../../api/userApi.js";
import { getExpertPortfolio } from "../../api/expertApi.js";
import { getMyArticles } from "../../api/knowledgeHubApi.js";
import {
  MessageSquare, Briefcase, GraduationCap, FileText, UserCog,
  Star, ShieldCheck, MessagesSquare,
  Wallet, PieChart, ArrowRight,
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

function verificationTone(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified" || s === "approved") return { text: "text-emerald-400", bg: "bg-emerald-400/10" };
  if (s === "rejected") return { text: "text-red-400", bg: "bg-red-400/10" };
  return { text: "text-amber-400", bg: "bg-amber-400/10" };
}

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
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-white font-bold text-[36px] leading-[1.15] tracking-tight">
          Welcome back, {name} <span aria-hidden="true">👋</span>
        </h1>
        {loading ? (
          <div className="h-5 w-64 max-w-full rounded bg-white/5 animate-pulse mt-2" />
        ) : (
          <p className="mt-2 text-base text-slate-400">
            Manage your portfolio, publish content, and connect with investors.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <PrimaryButton size="lg" icon={MessageSquare} onClick={() => navigate("/expert/questions")}>
          Messages
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

function ProfileSummarySection({ expertInfo, loading, userId }) {
  const navigate = useNavigate();

  if (!userId) return null;

  if (loading) {
    return (
      <section>
        <SectionHeader title="Your Profile" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3" style={{ height: 160 }} />
          <Skeleton className="lg:col-span-2" style={{ height: 84 }} />
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

        {/* Verification card */}
        <div className={`lg:col-span-2 ${CARD} p-6 flex flex-col justify-center`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-400">Verification</p>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone.bg}`}>
              <ShieldCheck size={14} className={tone.text} />
            </div>
          </div>
          <p className={`font-semibold text-xl capitalize ${tone.text}`}>{verification}</p>
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

  const { loading, expertInfo, portfolio, articleCount } = useExpertData(userId);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <ExpertHeader />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col gap-8 divide-y divide-white/[0.06]">
        <Hero name={name} loading={loading} />
        <ModelPortfolioSection portfolio={portfolio} loading={loading} />
        <ProfileSummarySection expertInfo={expertInfo} loading={loading} userId={userId} />
        <ToolsSection articleCount={articleCount} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default ExpertLoggedInPage;
