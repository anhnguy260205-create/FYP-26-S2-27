import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../layout/Header.jsx";
import { fetchStockSnapshot } from "../../api/stockApi.js";
import { getReviewStats, getReviews } from "../../api/reviewApi.js";
import { useLandingContent, usePlanContent, toEmbeddableVideoUrl } from "../../api/contentApi.js";
import MarketOverviewTicker from "../../components/MarketOverviewTicker.jsx";
import { SectionHeader } from "../../components/dashboard/DashboardKit.jsx";
import aboutUsImg from "../../images/about_us.jpg";
import {
  Bot, TrendingUp, Sparkles, Bell, Users, Zap, ShieldCheck, ArrowRight, Star,
  Wallet, BrainCircuit, MessagesSquare, GraduationCap, MessageCircleQuestion, Check, ChevronDown, Play, Award,
  UserPlus, Mail, Rocket, DollarSign,
} from "lucide-react";

const FAQS = [
  {
    title: "Is this real money trading?",
    description: "No. RocketTrade is a paper trading platform — you trade against live market prices using virtual funds, so you can build real skills with zero financial risk.",
  },
  {
    title: "How much does it cost to use RocketTrade?",
    description: "You can start for free with our Starter plan. Upgrade to Pro anytime for unlimited AI predictions, deeper quant ratings, and priority expert access.",
  },
  {
    title: "How accurate are the AI predictions?",
    description: "Our models combine technical indicators and news sentiment to forecast short-term price direction. They're a decision-support tool, not a guarantee, so always do your own research too.",
  },
  {
    title: "Do I need any trading experience to get started?",
    description: "Not at all. Our Educational Content library covers everything from beginner basics to advanced strategy, so you can learn as you go.",
  },
  {
    title: "Can I get help from a real person?",
    description: "Yes — chat instantly with our AI assistant, or connect with a verified market expert through consultations and Q&A.",
  },
  {
    title: "Can I cancel or change my plan anytime?",
    description: "Yes, you can upgrade, downgrade, or cancel your subscription at any time from your account settings.",
  },
];

const PLATFORM_FEATURES = [
  {
    Icon: Wallet,
    title: "Paper Trading Exchange",
    description: "Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.",
  },
  {
    Icon: BrainCircuit,
    title: "AI Stock Predictions",
    description: "Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.",
  },
  {
    Icon: MessagesSquare,
    title: "Investor Community",
    description: "Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.",
  },
  {
    Icon: Bot,
    title: "AI Chatbot & Expert Consultants",
    description: "Get instant answers from our AI assistant, or browse and connect with verified market experts.",
  },
  {
    Icon: GraduationCap,
    title: "Educational Content",
    description: "Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.",
  },
  {
    Icon: MessageCircleQuestion,
    title: "Ask the Experts",
    description: "Submit your investing questions directly to verified experts and get personalized answers.",
  },
];

const FEATURE_ICONS = [
  { match: "assistant", Icon: Bot },
  { match: "trend", Icon: TrendingUp },
  { match: "predict", Icon: Sparkles },
  { match: "alert", Icon: Bell },
  { match: "expert", Icon: Users },
];

function getFeatureIcon(title = "") {
  const lower = title.toLowerCase();
  const found = FEATURE_ICONS.find((f) => lower.includes(f.match));
  return found ? found.Icon : Star;
}

// One shared fetch for every landing-page section that's editable from
// Content Management but isn't the Hero or the membership plan (those
// already have their own hooks). Reused by every section below via props.
// Note: icons, accent colors, and the "stat" callouts on the Why cards
// aren't editable here — they stay matched to the hardcoded defaults by
// position. Only actual text (headings, subtitles, card copy, FAQ
// answers, step text) comes from the CMS.
function useLandingContentExtras() {
  const content = useLandingContent();

  const header = (id, fallbackTitle, fallbackDescription) => {
    const item = content?.find((c) => c.content_id === id);
    return { title: item?.title ?? fallbackTitle, description: item?.description ?? fallbackDescription, video_url: item?.video_url || "" };
  };

  // Matches fetched title/description onto the fallback list by position,
  // so icon/accent/stat (none of which live in the CMS) still come from
  // the hardcoded defaults.
  const items = (section, fallbackList) => {
    if (!content) return fallbackList;
    const fetched = content.filter((c) => c.section === section).sort((a, b) => a.order_index - b.order_index);
    if (fetched.length === 0) return fallbackList;
    return fetched.map((c, i) => ({
      ...(fallbackList[i] || fallbackList[fallbackList.length - 1] || {}),
      title: c.title,
      description: c.description,
    }));
  };

  return { header, items };
}

function Hero() {
  const navigate = useNavigate();
  const content = useLandingContent();

  const heroItem = content?.find((c) => c.section === "hero");
  const hero = heroItem ?? { title: "Discover the Future of Smart Investing", description: "Explore powerful tools floating around your financial universe." };
  const ctaPrimary = content?.find((c) => c.content_id === "hero_cta_primary")?.title ?? "Get Started";
  const ctaSecondary = content?.find((c) => c.content_id === "hero_cta_secondary")?.title ?? "Login";

  return (
    <div className="hero-section relative w-full h-200 text-white flex items-center justify-center overflow-hidden">
      <img src={hero.image_url || aboutUsImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {/* Same dark gradient treatment as the investor/expert hero photos */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.35))" }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.22) 0%, transparent 60%)" }}
      />
      <div className="relative z-20 text-center px-6 max-w-3xl py-20 sm:py-28">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1.5 mb-6 text-xs font-semibold tracking-wide text-cyan-300 uppercase">
          <Sparkles size={14} /> AI-Powered Investing Platform
        </div>

        <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-extrabold leading-tight m-0">
          <span className="block bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            {hero.title}
          </span>
        </h1>

        <p className="mt-4 mb-8 text-slate-300 text-base sm:text-lg">
          {hero.description}
        </p>

        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => navigate("/register")}
            className="group relative w-40 px-8 py-3 rounded-xl bg-cyan-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(34,211,238,0.4)] overflow-hidden flex items-center justify-center"
          >
            <span className="absolute inset-0 bg-white scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-cyan-600">{ctaPrimary}</span>
          </button>
          <button
            onClick={() => navigate("/login")}
            className="group relative w-40 px-8 py-3 rounded-xl bg-transparent border border-slate-500 hover:border-white text-white font-semibold text-base overflow-hidden transition-colors flex items-center justify-center"
          >
            <span className="absolute inset-0 bg-white scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <span className="relative z-10 transition-colors duration-300 group-hover:text-slate-900">{ctaSecondary}</span>
          </button>
        </div>
      </div>

      <style>{`
        .hero-section { min-height: calc(95vh - 60px); }
      `}</style>
    </div>
  );
}

const FEATURE_THEMES = {
  cyan: {
    ring: "ring-slate-200 hover:ring-cyan-300",
    iconBg: "bg-cyan-100",
    iconColor: "text-cyan-600",
  },
  purple: {
    ring: "ring-slate-200 hover:ring-purple-300",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
  },
};

function FeatureCards({ heading, subtitle, items, theme = "cyan" }) {
  const t = FEATURE_THEMES[theme];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-14">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map(({ Icon, title, description }) => (
          <div
            key={title}
            className={`rounded-2xl bg-white ring-1 ${t.ring} shadow-md shadow-slate-900/5 p-6 transition-all duration-[180ms] ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10`}
          >
            <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center mb-4`}>
              <Icon className={t.iconColor} size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}


function PlanCard({ badge, badgeClass, plan, features, highlighted }) {
  const navigate = useNavigate();
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate("/login", { state: { from: "/investor/subscription" } })}
      onKeyDown={(e) => { if (e.key === "Enter") navigate("/login", { state: { from: "/investor/subscription" } }); }}
      className={`group relative overflow-hidden w-full max-w-sm rounded-3xl p-8 border-2 transition-all duration-300 hover:-translate-y-1 cursor-pointer ${highlighted
        ? "bg-amber-100 border-amber-400 shadow-[0_8px_30px_rgba(251,191,36,0.35)] hover:shadow-[0_14px_45px_rgba(251,191,36,0.5)]"
        : "bg-blue-100 border-blue-300 shadow-[0_8px_30px_rgba(37,99,235,0.18)] hover:border-blue-500 hover:shadow-[0_14px_45px_rgba(37,99,235,0.3)]"
        }`}
    >
      <div className="relative z-10">
        <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4 ${badgeClass}`}>
          {badge}
        </span>
        <p className="text-xl font-semibold text-slate-900 mb-1">{plan.name}</p>
        <p className={`text-4xl font-extrabold mb-1 ${highlighted ? "text-amber-600" : "text-blue-600"}`}>{plan.price}</p>
        <p className="text-sm text-slate-500 mb-6">{plan.priceSubtitle}</p>
        <div className="h-px bg-slate-200 mb-6" />
        <div className="space-y-3">
          {features.map((f) => (
            <div key={f} className="flex items-start gap-2.5">
              <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlighted ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
                <Check size={13} />
              </span>
              <span className="text-sm text-slate-700">{f}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          className={`w-full mt-6 py-3 rounded-xl font-bold text-sm transition-colors ${highlighted
            ? "bg-amber-500 text-white group-hover:bg-amber-600"
            : "bg-blue-600 text-white group-hover:bg-blue-700"
            }`}
        >
          {plan.cta}
        </button>
      </div>
    </div>
  );
}

function PricingSection({ heading, subtitle }) {
  const { freeFeatures, premiumFeatures, freePlan, premiumPlan } = usePlanContent();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-16">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      <div className="flex flex-col md:flex-row gap-20 items-center md:items-start justify-center">
        <PlanCard badge="Free" badgeClass="bg-blue-100 text-blue-700" plan={freePlan} features={freeFeatures} />
        <PlanCard badge="⭐ Premium" badgeClass="bg-amber-100 text-amber-700" plan={premiumPlan} features={premiumFeatures} highlighted />
      </div>
    </div>
  );
}

function FAQItem({ q, a, open, onToggle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 text-left px-6 py-5 cursor-pointer"
      >
        <span className="font-semibold text-slate-900 text-sm sm:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`text-cyan-600 shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="px-6 pb-5 text-sm text-slate-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQSection({ heading, subtitle, faqs = FAQS }) {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState(0);
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pb-16">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <FAQItem
            key={faq.title}
            q={faq.title}
            a={faq.description}
            open={openIndex === index}
            onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
          />
        ))}
      </div>

      <div className="mt-10 text-center">
        <button
          onClick={() => navigate("/support")}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 px-6 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50 cursor-pointer"
        >
          Visit Help Center

        </button>
      </div>
    </div>
  );
}

function MarketingVideoSection({ heading, subtitle, videoUrl }) {
  const embedUrl = toEmbeddableVideoUrl(videoUrl);
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      {videoUrl ? (
        embedUrl ? (
          <iframe
            src={embedUrl}
            title={heading || "RocketTrade walkthrough video"}
            className="aspect-video w-full rounded-2xl border border-cyan-400/30 shadow-[0_0_45px_rgba(34,211,238,0.12)]"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            src={videoUrl}
            controls
            className="aspect-video w-full rounded-2xl border border-cyan-400/30 bg-black shadow-[0_0_45px_rgba(34,211,238,0.12)]"
          />
        )
      ) : (
        <div className="relative aspect-video w-full rounded-2xl border border-cyan-400/30 bg-slate-900/60 shadow-[0_0_45px_rgba(34,211,238,0.12)] overflow-hidden flex items-center justify-center">
          <button
            type="button"
            aria-label="Play marketing video"
            className="group relative z-10 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500 flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:bg-cyan-400 transition-colors"
          >
            <Play className="text-white translate-x-0.5" size={28} fill="currentColor" />
          </button>
          <span className="absolute bottom-4 text-xs text-slate-500">Video coming soon</span>
        </div>
      )}
    </div>
  );
}

const WHY_ROCKETTRADE = [
  {
    Icon: ShieldCheck,
    title: "Zero-Risk Learning",
    description: "Practice with virtual funds against live market prices — sharpen your instincts without risking real money.",
    stat: { value: "30+", label: "stocks to practice on, risk-free" },
    accent: {
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      statColor: "text-emerald-700",
      border: "hover:border-emerald-400/50",
    },
  },
  {
    Icon: Zap,
    title: "AI when you need speed. Experts when you need certainty.",
    description: "Live prices and news sentiment keep your paper portfolio in sync with what's actually happening in the market.",
    stat: { value: "24/7", label: "AI monitoring, backed by real experts" },
    emphasized: true,
  },
  {
    Icon: Users,
    title: "Expert-Backed Community",
    description: "Learn alongside fellow investors and get answers straight from verified market experts.",
    stat: { value: "Verified", label: "answers from real market experts" },
    accent: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      statColor: "text-amber-700",
      border: "hover:border-amber-400/50",
    },
  },
];

const EXPERT_WHY = [
  {
    Icon: DollarSign,
    title: "Get Paid for Your Expertise",
    description: "Earn from paid consultations and premium content — your market knowledge has real value here.",
    stat: { value: "Paid", label: "consultations & premium articles" },
    accent: {
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      statColor: "text-emerald-700",
      border: "hover:border-emerald-400/50",
    },
  },
  {
    Icon: Zap,
    title: "Be the certainty investors need when speed isn't enough.",
    description: "Reach investors who are already using AI predictions and want a real expert to validate the call.",
    stat: { value: "24/7", label: "visibility to AI-assisted traders" },
    emphasized: true,
  },
  {
    Icon: Users,
    title: "Build a Following You Own",
    description: "Grow your reputation through Q&A, portfolio publishing, and the community forum.",
    stat: { value: "Verified", label: "badge boosts trust & visibility" },
    accent: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      statColor: "text-amber-700",
      border: "hover:border-amber-400/50",
    },
  },
];

const EXPERT_ROLE_BENEFITS = [
  {
    Icon: BrainCircuit,
    title: "Premium Investor Tools Included",
    description: "Experts get access to the same advanced tools as Premium investors, including AI predictions, portfolio insights, paper trading, and market dashboards.",
    stat: { value: "All-in-one", label: "premium tools included" },
    accent: {
      iconBg: "bg-cyan-100",
      iconColor: "text-cyan-600",
      statColor: "text-cyan-700",
      border: "hover:border-cyan-400/50",
    },
  },
  {
    Icon: DollarSign,
    title: "Monthly Compensation",
    description: "Verified experts can earn monthly compensation based on their activity, contributions, and investor engagement on the platform.",
    stat: { value: "Monthly", label: "earn from your expertise" },
    emphasized: true,
  },
  {
    Icon: Users,
    title: "Grow Your Network",
    description: "Build your professional presence by sharing insights, answering investor questions, publishing content, and connecting with the RocketTrade community.",
    stat: { value: "Reach", label: "expand your relationships" },
    accent: {
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      statColor: "text-amber-700",
      border: "hover:border-amber-400/50",
    },
  },
];

function WhyCards({ heading, subtitle, items }) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-14">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch mt-2">
        {items.map(({ Icon, title, description, stat, emphasized, accent }) => (
          <div
            key={title}
            className={`relative h-full flex flex-col rounded-2xl p-6 transition-all duration-300 ${emphasized
              ? "border border-indigo-300 bg-linear-to-br from-indigo-600 to-blue-700 shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/25 lg:scale-[1.02] z-10"
              : `border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:-translate-y-1 ${accent.border}`
              }`}
          >
            {emphasized && (
              <span className="mb-4 self-start text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white text-indigo-700 shadow-sm">
                Our Edge
              </span>
            )}
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${emphasized ? "bg-white/15" : accent.iconBg
                }`}
            >
              <Icon className={emphasized ? "text-white" : accent.iconColor} size={22} />
            </div>
            <h3 className={`font-bold text-base mb-1.5 ${emphasized ? "text-white" : "text-slate-900"}`}>{title}</h3>
            <p className={`text-sm flex-1 leading-relaxed ${emphasized ? "text-indigo-100" : "text-slate-500"}`}>{description}</p>
            <div className={`mt-5 pt-5 border-t ${emphasized ? "border-white/15" : "border-slate-200"}`}>
              <span className={`text-2xl font-extrabold ${emphasized ? "text-white" : accent.statColor}`}>{stat.value}</span>
              <span className={`block text-xs mt-0.5 ${emphasized ? "text-indigo-100" : "text-slate-500"}`}>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingSectionDivider({ label = "Next Section" }) {
  return (
    <div className="bg-white px-4 sm:px-8 py-6">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-300" />
        <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 shadow-sm">
          {label}
        </span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200 to-slate-300" />
      </div>
    </div>
  );
}

function LandingPanel({ children, className = "", muted = false }) {
  return (
    <section className={`bg-white ${muted ? "bg-slate-50/70" : ""} border-b border-slate-100 ${className}`}>
      {children}
    </section>
  );
}
const ROLE_OPTIONS = [
  {
    value: "investor",
    Icon: Wallet,
    title: "Investor",
    description: "Trade, learn, and get AI-backed predictions",
    active: "border-cyan-500 bg-cyan-50 text-cyan-700",
    activeIcon: "bg-cyan-100 text-cyan-600",
  },
  {
    value: "expert",
    Icon: Award,
    title: "Expert",
    description: "Publish insights and mentor investors",
    active: "border-purple-500 bg-purple-50 text-purple-700",
    activeIcon: "bg-purple-100 text-purple-600",
  },
];

function RoleToggle({ activeRole, onSelect, heading, subtitle, options = ROLE_OPTIONS }) {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-2 pb-10">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {options.map(({ value, Icon, title, description, active, activeIcon }) => {
          const selected = activeRole === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onSelect(value)}
              aria-pressed={selected}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 transition-all duration-300 text-left w-full sm:w-72 ${selected ? `${active} shadow-sm` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
            >
              <span
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${selected ? activeIcon : "bg-slate-100 text-slate-500"
                  }`}
              >
                <Icon size={22} />
              </span>
              <span>
                <span className="block font-bold text-base">{title}</span>
                <span className={`block text-xs mt-0.5 ${selected ? "" : "text-slate-400"}`}>{description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EXPERT_FEATURES = [
  {
    Icon: DollarSign,
    title: "Paid Consultations",
    description: "Offer 1-on-1 sessions with investors and earn directly for your time and expertise.",
  },
  {
    Icon: Award,
    title: "Verified Expert Badge",
    description: "Stand out with a trust badge that boosts your visibility across the platform.",
  },
  {
    Icon: GraduationCap,
    title: "Publish Educational Content",
    description: "Share articles in the Knowledge Hub and become a go-to voice for new investors.",
  },
  {
    Icon: MessageCircleQuestion,
    title: "Answer Investor Questions",
    description: "Respond to Ask the Experts questions and grow your following one answer at a time.",
  },
  {
    Icon: BrainCircuit,
    title: "Publish Portfolio Insights",
    description: "Share your strategy and quant calls, and let investors follow your track record.",
  },
  {
    Icon: Bot,
    title: "AI-Matched Reach",
    description: "Get surfaced to investors using AI predictions who want a human expert's take.",
  },
];

const REGISTRATION_STEPS = [
  {
    Icon: UserPlus,
    step: "1",
    title: "Choose your role & sign up",
    description: "Pick Investor or Expert, then create your account with a username, email, and password.",
  },
  {
    Icon: Mail,
    step: "2",
    title: "Verify your email",
    description: "Confirm the verification email we send you to activate your account.",
  },
  {
    Icon: ShieldCheck,
    step: "3",
    title: "Agree to the terms",
    description: "Review and accept RocketTrade's Terms and Conditions and Privacy Policy.",
  },
  {
    Icon: Rocket,
    step: "4",
    title: "Start using RocketTrade",
    description: "Investors jump straight into paper trading; Experts get verified before publishing insights.",
  },
];

function RegistrationGuide({ heading, subtitle, steps = REGISTRATION_STEPS }) {
  const navigate = useNavigate();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-10">
      <SectionHeader title={heading} subtitle={subtitle} dark={false} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {steps.map(({ Icon, step, title, description }) => (
          <div
            key={step}
            className="relative rounded-2xl bg-white ring-1 ring-slate-200 shadow-md shadow-slate-900/5 p-6 transition-all duration-[180ms] ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 hover:ring-cyan-300"
          >
            <span className="absolute top-4 right-4 text-xs font-bold text-cyan-300">STEP {step}</span>
            <div className="w-11 h-11 rounded-xl bg-cyan-100 flex items-center justify-center mb-4">
              <Icon className="text-cyan-600" size={22} />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">{title}</h3>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        ))}
      </div>
      <div className="text-center mt-10">
        <button
          onClick={() => navigate("/register")}
          className="group relative px-8 py-3 rounded-xl bg-cyan-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(34,211,238,0.3)] overflow-hidden inline-flex items-center justify-center"
        >
          <span className="absolute inset-0 bg-white scale-x-0 origin-left transition-transform duration-300 ease-out group-hover:scale-x-100" />
          <span className="relative z-10 transition-colors duration-300 group-hover:text-cyan-600">Create Your Account</span>
        </button>
      </div>
    </div>
  );
}

function TestimonialAvatar({ name }) {
  const colours = ["#155dfc", "#0092b8", "#7c3aed", "#059669", "#d97706", "#dc2626"];
  let hash = 0;
  for (const c of String(name || "")) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  const initials = String(name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      style={{
        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
        background: colours[hash % colours.length], display: "flex",
        alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "white",
      }}
    >
      {initials}
    </div>
  );
}

function TestimonialStars({ value }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} fill={i <= Math.round(value) ? "#fbbf24" : "none"} color={i <= Math.round(value) ? "#fbbf24" : "#334155"} />
      ))}
    </div>
  );
}

function roleLabel(role) {
  if (role === "expert") return "Expert";
  if (role === "premium") return "Premium Member";
  return "Member";
}

function CtaButton({ children, onClick, primary }) {
  const [hovered, setHovered] = useState(false);
  const style = primary
    ? {
      padding: "12px 28px", borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer", border: "none",
      background: "linear-gradient(135deg,#155dfc,#0092b8)", color: "white",
      boxShadow: hovered ? "0 8px 28px rgba(21,93,252,0.55)" : "0 4px 20px rgba(21,93,252,0.35)",
      transform: hovered ? "translateY(-2px)" : "translateY(0)",
      filter: hovered ? "brightness(1.1)" : "brightness(1)",
      transition: "transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease",
    }
    : {
      padding: "12px 28px", borderRadius: 50, fontWeight: 700, fontSize: 14, cursor: "pointer",
      background: hovered ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.08)",
      border: hovered ? "1px solid rgba(125,211,252,0.9)" : "1px solid rgba(255,255,255,0.22)",
      color: "white",
      backdropFilter: "blur(10px)",
      transform: hovered ? "translateY(-2px)" : "translateY(0)",
      transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease, transform 0.2s ease",
    };
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={style}>
      {children}
    </button>
  );
}

function TestimonialsSection() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ average: 0, total: 0 });
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    getReviewStats().then((d) => { if (d?.success || d?.average != null) setStats(d); }).catch(() => { });
    getReviews({ sort: "helpful", pageSize: 5 }).then((d) => {
      if (d?.success) setReviews(d.reviews || []);
    }).catch(() => { });
  }, []);

  const avg = Number(stats?.average || 0).toFixed(1);

  // Don't render section at all if no reviews yet
  if (reviews.length === 0) return null;

  function StarRow({ value, size = 14 }) {
    return (
      <div style={{ display: "flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={size}
            fill={i <= Math.round(Number(value)) ? "#fbbf24" : "none"}
            color={i <= Math.round(Number(value)) ? "#fbbf24" : "#cbd5e1"}
          />
        ))}
      </div>
    );
  }

  function AvatarCircle({ name }) {
    const palette = ["#155dfc", "#0092b8", "#7c3aed", "#059669", "#d97706", "#be185d"];
    let h = 0;
    for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    const initials = String(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: palette[h % palette.length], display: "flex", alignItems: "center",
        justifyContent: "center", fontWeight: 700, fontSize: 14, color: "white"
      }}>
        {initials}
      </div>
    );
  }

  function rolePill(role) {
    const r = String(role || "").toLowerCase();
    if (r === "expert") return { label: "Expert", style: { background: "rgba(34,211,238,0.12)", color: "#67e8f9", border: "1px solid rgba(103,232,249,0.35)" } };
    if (r === "premium") return { label: "Premium", style: { background: "rgba(251,191,36,0.13)", color: "#fde68a", border: "1px solid rgba(253,230,138,0.4)" } };
    return { label: "Member", style: { background: "rgba(148,163,184,0.14)", color: "#cbd5e1", border: "1px solid rgba(203,213,225,0.25)" } };
  }

  return (
    <section style={{
      position: "relative",
      overflow: "hidden",
      background: "linear-gradient(135deg, #020617 0%, #0f172a 45%, #0b3b5a 100%)",
      padding: "86px 24px 98px",
      borderTop: "1px solid rgba(148,163,184,0.18)",
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 15% 20%, rgba(34,211,238,0.20), transparent 32%), radial-gradient(circle at 85% 15%, rgba(251,191,36,0.14), transparent 28%), radial-gradient(circle at 50% 100%, rgba(37,99,235,0.22), transparent 40%)",
        pointerEvents: "none",
      }} />
      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>

        {/* Heading */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px",
            borderRadius: 20, background: "rgba(34,211,238,0.12)", border: "1px solid rgba(125,211,252,0.35)",
            color: "#67e8f9", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", marginBottom: 16
          }}>
            ★ Community Reviews
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 850, color: "#ffffff", margin: "0 0 14px", lineHeight: 1.15 }}>
            Trusted by investors and market experts
          </h2>
          <p style={{ maxWidth: 650, margin: "0 auto 22px", color: "#cbd5e1", fontSize: 15.5, lineHeight: 1.7 }}>
            Real feedback from people using RocketTrade to practise trading, explore market insights, and connect with experts.
          </p>
          {/* Aggregate score bar */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: 50, padding: "10px 22px", backdropFilter: "blur(12px)"
          }}>
            <StarRow value={avg} size={18} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#ffffff" }}>{avg}</span>
            <span style={{ fontSize: 13, color: "#cbd5e1" }}>
              from {stats.total} review{stats.total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Review cards grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: 18, marginBottom: 48 }}>
          {reviews.slice(0, 3).map((review) => {
            const pill = rolePill(review.author_role);
            const isTruncated = review.comment.length > 200;
            return (
              <div key={review.review_id} style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 18, padding: "22px 20px", display: "flex", flexDirection: "column", gap: 12,
                boxShadow: "0 18px 40px rgba(0,0,0,0.22)", backdropFilter: "blur(14px)",
              }}>
                <StarRow value={review.rating} />
                {review.title && (
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", margin: 0, lineHeight: 1.3 }}>
                    {review.title}
                  </h3>
                )}
                <p style={{ fontSize: 13.5, color: "#dbeafe", lineHeight: 1.75, margin: 0, flex: 1 }}>
                  {isTruncated ? review.comment.slice(0, 200) + "…" : review.comment}
                </p>
                {isTruncated && (
                  <button
                    onClick={() => navigate("/login", { state: { from: `/reviews/${review.review_id}` } })}
                    style={{
                      alignSelf: "flex-start", background: "none", border: "none", padding: 0,
                      fontSize: 12.5, fontWeight: 700, color: "#67e8f9", cursor: "pointer",
                    }}
                  >
                    Read full review →
                  </button>
                )}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.13)"
                }}>
                  <AvatarCircle name={review.author} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {review.author}
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
                      padding: "2px 7px", borderRadius: 20, ...pill.style
                    }}>
                      {pill.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#cbd5e1", marginBottom: 16 }}>
            Join the community and start exploring RocketTrade with confidence.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <CtaButton onClick={() => navigate("/register")} primary>
              Get started free
            </CtaButton>
            <CtaButton onClick={() => navigate("/login", { state: { from: "/reviews" } })}>
              Read all reviews
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}


function HomePage() {
  const { header, items } = useLandingContentExtras();

  const videoHeader = header("header_video", "See RocketTrade in Action", "Watch a quick walkthrough of the platform and its AI-powered tools.");
  const whyInvestorHeader = header("header_why_investor", "Why RocketTrade", "Built to help you invest smarter, without the real-money risk.");
  const featuresInvestorHeader = header("header_features_investor", "Everything You Need to Invest Smarter", "One platform, six ways to sharpen your edge.");
  const expertBenefitsHeader = header("header_expert_benefits", "Why Join as a RocketTrade Expert", "Use premium tools, earn from your expertise, and grow your professional network with investors.");
  const startedHeader = header("header_started", "How to Get Started", "Signing up only takes a few minutes, for investors and experts alike.");
  const faqHeader = header("header_faq", "Frequently Asked Questions", "Everything you need to know before you get started.");
  const pricingHeader = header("header_pricing", "Simple, Transparent Pricing", "Compare our Free and Pro plans — create an investor account to get started.");

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Header />
      <MarketOverviewTicker />
      <main className="flex-1 flex flex-col">
        <Hero />
        <LandingPanel className="pt-24 pb-16">
          <MarketingVideoSection heading={videoHeader.title} subtitle={videoHeader.description} videoUrl={videoHeader.video_url} />
        </LandingPanel>

        <LandingPanel muted>
          <WhyCards
            heading={whyInvestorHeader.title}
            subtitle={whyInvestorHeader.description}
            items={items("why_investor", WHY_ROCKETTRADE)}
          />
        </LandingPanel>

        <LandingPanel>
          <FeatureCards
            heading={featuresInvestorHeader.title}
            subtitle={featuresInvestorHeader.description}
            items={items("platform_features", PLATFORM_FEATURES)}
            theme="cyan"
          />
        </LandingPanel>

        <LandingPanel muted>
          <PricingSection heading={pricingHeader.title} subtitle={pricingHeader.description} />
        </LandingPanel>

        <LandingPanel>
          <RegistrationGuide
            heading={startedHeader.title}
            subtitle={startedHeader.description}
            steps={items("get_started_steps", REGISTRATION_STEPS)}
          />
        </LandingPanel>

        <LandingPanel muted>
          <WhyCards
            heading={expertBenefitsHeader.title}
            subtitle={expertBenefitsHeader.description}
            items={items("expert_role_benefits", EXPERT_ROLE_BENEFITS)}
          />
        </LandingPanel>

        <LandingSectionDivider label="Questions before getting started" />
        <LandingPanel className="flex-1 pt-2">
          <FAQSection
            heading={faqHeader.title}
            subtitle={faqHeader.description}
            faqs={items("faq", FAQS)}
          />
        </LandingPanel>

        <TestimonialsSection />

      </main>
      <Footer />
    </motion.div>
  );
}

export default HomePage;
