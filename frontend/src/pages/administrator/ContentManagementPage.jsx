import { useEffect, useState } from "react";
import {
  Edit, Check, X, GripVertical, Eye, ChevronDown,
  Rocket, Compass, ShieldCheck, Sparkles, Award, Layers,
  PlayCircle, ListChecks, HelpCircle, CreditCard, Link2,
  LayoutDashboard, Wallet, Crown, GraduationCap,
  BrainCircuit, MessagesSquare, Bot, MessageCircleQuestion,
  DollarSign, Zap, Users, UserPlus, Mail, Activity, Briefcase, MessageSquare,
  TrendingUp, AlertTriangle, Gauge, BadgeCheck,
} from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import investorLoggedInImg from "../../images/investorloggedin.jpg";
import professorPageImg from "../../images/professorpage.jpg";

// Real per-card icons, copied straight from the source arrays in
// Homepage.jsx / LoggedInHomePage.jsx / ExpertLoggedInPage.jsx — icons
// aren't admin-editable (same as button "to" links), so this just mirrors
// what's actually hardcoded there, keyed by itemsSection and matched to
// cards by position/order_index.
const CARD_ICONS = {
  role_options: [Wallet, Award],
  get_started_steps: [UserPlus, Mail, ShieldCheck, Rocket],
  why_investor: [ShieldCheck, Zap, Users],
  why_expert: [DollarSign, Zap, Users],
  platform_features: [Wallet, BrainCircuit, MessagesSquare, Bot, GraduationCap, MessageCircleQuestion],
  expert_features: [DollarSign, Award, GraduationCap, MessageCircleQuestion, BrainCircuit, Bot],
  investor_home_features: [Wallet, BrainCircuit, MessagesSquare, Bot, GraduationCap],
  expert_tools: [Activity, GraduationCap, MessagesSquare, Briefcase, MessageSquare],
};

const API = `${import.meta.env.VITE_API_URL}/admin/content`;

// Tabs
// Each one maps to a section that's actually rendered somewhere real (Homepage.jsx
// or Footer) — went through and checked every section/content_id before adding it
// here. Dropped Feature Bubbles, Expert hero, and Forum Rooms since nothing in the
// app was actually reading those, so editing them did nothing.
//
// kind: "hero"       — one title+subtitle item, no card list
//       "generic"     — optional header item (headerId) + a list of cards (itemsSection)
//       "membership"  — the two-column Free/Premium plan editor
//       "footer"      — the footer editor
// Landing Page subtabs
const LANDING_SUBTABS = [
  { key: "hero",               label: "Header",           icon: Rocket,       kind: "hero",
    hint: "The big headline people see first when they land on the site." },
  { key: "video",               label: "Video Section",    icon: PlayCircle,   kind: "generic", preview: "video",
    headerId: "header_video", itemsSection: null,
    hint: "Just the heading above the demo video, nothing fancy." },
  { key: "path",                label: "Choose Your Path", icon: Compass,      kind: "generic", preview: "role_toggle",
    headerId: "header_path", itemsSection: "role_options",
    hint: "Where visitors choose Investor or Expert." },
  { key: "why_investor",        label: "Why RocketTrade",  icon: ShieldCheck,  kind: "generic", preview: "why_cards",
    headerId: "header_why_investor", itemsSection: "why_investor",
    hint: "The trust-building cards pitched at investors (Zero-Risk Learning and the rest)." },
  { key: "platform_features",   label: "Platform Features", icon: Sparkles,    kind: "generic", preview: "cards",
    headerId: "header_features_investor", itemsSection: "platform_features",
    hint: "The \u201cEverything You Need to Invest Smarter\u201d card grid." },
  { key: "why_expert",          label: "Why Become Expert", icon: Award,       kind: "generic", preview: "why_cards",
    headerId: "header_why_expert", itemsSection: "why_expert",
    hint: "Same idea as the investor version, just aimed at experts." },
  { key: "expert_features",     label: "Expert Features",  icon: Layers,       kind: "generic", preview: "cards",
    headerId: "header_features_expert", itemsSection: "expert_features",
    hint: "The \u201cEverything You Get as an Expert\u201d card grid." },
  { key: "get_started",         label: "Get Started Steps", icon: ListChecks,  kind: "generic", preview: "steps",
    headerId: "header_started", itemsSection: "get_started_steps",
    hint: "The 4-step walkthrough for new signups." },
  { key: "faq",                 label: "FAQ",              icon: HelpCircle,   kind: "generic", preview: "faq",
    headerId: "header_faq", itemsSection: "faq",
    hint: "Questions and answers, tucked near the bottom of the page." },
];

// Investor Home subtabs — reused by BOTH the Basic and Premium tabs below.
// Split into "top" (everything above the upgrade/renewal banner on the real
// page) and "bottom" (everything below it), since the banner itself is the
// one thing that's actually different between the two tiers.
const INVESTOR_SHARED_TOP = [
  { key: "empty_state", label: "Welcome Header", icon: Wallet, kind: "generic", preview: "empty_portfolio",
    headerId: "hero_empty_state", itemsSection: null,
    hint: "Shown right in the hero instead of today's P&L, only until an investor makes their first trade." },
  { key: "ai_insights", label: "AI Insights", icon: Sparkles, kind: "generic", preview: "ai_insights",
    headerId: "header_ai_insights", itemsSection: "investor_home_taglines",
    hint: "The heading, plus the different one-line messages that show depending on the investor's portfolio risk (or while things are still loading)." },
  { key: "portfolio_summary", label: "Portfolio Summary", icon: LayoutDashboard, kind: "generic", preview: "section_header",
    headerId: "header_portfolio_summary", ctaId: "portfolio_summary_cta", itemsSection: null,
    hint: "Just the section heading and the \u201cView Full Portfolio\u201d link text." },
  { key: "watchlist", label: "My Watchlist", icon: ListChecks, kind: "generic", preview: "section_header",
    headerId: "header_watchlist", ctaId: "watchlist_cta", itemsSection: null,
    hint: "The \u201cMy Watchlist\u201d heading and the \u201cView Full Watchlist\u201d link text." },
  { key: "watchlist_empty", label: "Empty Watchlist Message", icon: ListChecks, kind: "generic", preview: "watchlist_empty",
    headerId: "header_watchlist_empty", ctaId: "watchlist_empty_cta", itemsSection: null,
    hint: "What shows in the watchlist card before an investor has added any stocks." },
];

const INVESTOR_SHARED_BOTTOM = [
  { key: "investor_features",  label: "Dashboard Features",   icon: Sparkles, kind: "generic", preview: "cards",
    headerId: "header_investor_features", itemsSection: "investor_home_features",
    perCardCtaSection: "investor_home_features_cta", perCardBadgeSection: "investor_home_features_badge",
    hint: "The \u201cExplore RocketTrade\u201d cards further down the dashboard (different from the Platform Features cards on the public Landing Page). Basic and Premium investors see the same ones, so this edits both. Each card has its own button text and badge too." },
  { key: "investor_dashboard", label: "Realtime Dashboard",  icon: LayoutDashboard, kind: "generic", preview: "realtime_dashboard",
    headerId: "header_investor_dashboard", itemsSection: "investor_home_dashboard",
    hint: "The dark \u201cRealtime Trading Dashboard\u201d banner near the bottom. Also shared between Basic and Premium." },
];

const BASIC_INVESTOR_SUBTABS = [
  ...INVESTOR_SHARED_TOP,
  { key: "basic_banner", label: "Upgrade to Premium Banner", icon: Wallet, kind: "generic", preview: "banner_basic",
    headerId: "investor_banner_basic", ctaId: "investor_banner_basic_cta", itemsSection: null,
    hint: "Only investors who haven't gone Premium yet will see this." },
  ...INVESTOR_SHARED_BOTTOM,
];

const PREMIUM_INVESTOR_SUBTABS = [
  ...INVESTOR_SHARED_TOP,
  { key: "premium_banner", label: "Premium Renewal Banner", icon: Crown, kind: "generic", preview: "banner_premium",
    headerId: "investor_banner_premium", ctaId: "investor_banner_premium_cta", itemsSection: null,
    hint: "Only Premium investors see this one. Drop \u201c{days}\u201d anywhere in the description and it'll get swapped for however many days are actually left until renewal." },
  ...INVESTOR_SHARED_BOTTOM,
];

// Expert Home subtabs (ExpertLoggedInPage.jsx), in the order they actually
// appear scrolling down the page: hero, model portfolio, profile, tools,
// then the verification documents banner at the very bottom.
const EXPERT_SUBTABS = [
  { key: "expert_hero",  label: "Header", icon: GraduationCap, kind: "generic", preview: "expert_hero",
    headerId: "expert_hero_subtitle", itemsSection: null,
    hint: "The subtitle right under \u201cWelcome back\u201d on an expert's home page." },
  { key: "model_portfolio", label: "Model Portfolio", icon: LayoutDashboard, kind: "generic", preview: "model_portfolio",
    headerId: "header_model_portfolio", itemsSection: null,
    extraIds: [
      { id: "model_portfolio_empty_msg", label: "Message shown before they've set one up" },
      { id: "model_portfolio_cta_create", label: "Button text (no portfolio yet)" },
      { id: "model_portfolio_cta_manage", label: "Button text (already has one)" },
    ],
    hint: "The \u201cModel Portfolio\u201d card. The Holdings/Invested/Cash Balance/Risk numbers stay live data, only the heading, empty message, and button text are editable." },
  { key: "expert_profile", label: "Your Profile", icon: Award, kind: "generic", preview: "expert_profile",
    headerId: "header_expert_profile", itemsSection: null,
    extraIds: [
      { id: "expert_profile_edit_cta", label: "\u201cEdit Profile\u201d link text" },
      { id: "expert_profile_not_rated", label: "Message shown before they've been rated" },
      { id: "compensation_pending_label", label: "Compensation: label when a payout is pending" },
      { id: "compensation_need_followers", label: "Compensation: message before they qualify (keep the word {followers} in there \u2014 it's swapped for the real number)" },
      { id: "compensation_locked_label", label: "Compensation: label before they're verified" },
      { id: "compensation_locked_msg", label: "Compensation: message before they're verified" },
    ],
    hint: "The rating card at the top of an expert's profile summary, plus the compensation card next to it." },
  { key: "expert_tools", label: "Your Tools",         icon: Layers, kind: "generic", preview: "cards",
    headerId: "header_expert_tools", ctaId: "expert_tools_cta", itemsSection: "expert_tools",
    hint: "The tool cards further down the page. All five share the same button text, which you can edit below." },
  { key: "expert_documents", label: "Verification Documents", icon: HelpCircle, kind: "generic", preview: "documents",
    headerId: "header_documents", itemsSection: null,
    extraIds: [
      { id: "documents_desc_verified", label: "Description (already verified)" },
      { id: "documents_desc_unverified", label: "Description (not verified yet)" },
      { id: "documents_cta_verified", label: "Button text (already verified)" },
      { id: "documents_cta_unverified", label: "Button text (not verified yet)" },
    ],
    hint: "The amber banner at the very bottom of the expert home page." },
];

// "Landing Page" bundles every section that only lives on Homepage.jsx into
// its subtabs above. Membership Plans and Footer get their own top-level
// tabs instead, since both show up on more than just the landing page —
// Membership Plans also drives SubscriptionPage.jsx, and the footer is on
// literally every page (layout/Footer.jsx).
const MAIN_TABS = [
  { key: "landing",    label: "Landing Page",     icon: Rocket,     subtabs: LANDING_SUBTABS },
  { key: "membership", label: "Membership Plans", icon: CreditCard, kind: "membership",
    hint: "The pricing heading plus the Free/Premium cards. Shows up on both the landing page and the Subscription page." },
  { key: "footer",     label: "Footer",           icon: Link2,      kind: "footer",
    hint: "Brand name, tagline, and all the footer links. This one's on every page." },
  { key: "basic_investor", label: "Basic Investor", icon: Wallet, subtabs: BASIC_INVESTOR_SUBTABS },
  { key: "premium_investor", label: "Premium Investor", icon: Crown, subtabs: PREMIUM_INVESTOR_SUBTABS },
  { key: "expert_home", label: "Expert", icon: GraduationCap, subtabs: EXPERT_SUBTABS },
];

// Sections where item order is meaningful and can be dragged to reorder.
const ORDERABLE_SECTIONS = new Set([
  "role_options", "why_investor", "platform_features", "why_expert", "expert_features",
  "get_started_steps", "faq",
  "free_investor", "premium_investor",
  "footer_product", "footer_company", "footer_resources", "footer_contact",
  "investor_home_features", "investor_home_dashboard", "expert_tools",
]);

// sections/tabs that show the description/subtitle field when editing a card
const DESCRIPTION_SECTIONS = new Set([
  "hero", "page_headers",
  "role_options", "why_investor", "platform_features", "why_expert", "expert_features",
  "get_started_steps", "faq",
  "footer_brand", "footer_product", "footer_company", "footer_resources", "footer_contact",
  "investor_home_features", "investor_home_dashboard", "expert_tools",
  "investor_banner_basic", "investor_banner_premium",
]);

// Live preview mockups. These are hand-built approximations of how each
// section looks on the real site — good enough to sanity-check an edit
// without hopping over to the public pages every time.

function PreviewFrame({ label, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50 text-slate-500">
        <Eye size={13} />
        <span className="text-xs font-bold uppercase tracking-wider">Live Preview</span>
        <span className="text-xs text-slate-400 ml-auto">{label}</span>
      </div>
      <div className="p-0">{children}</div>
    </div>
  );
}

function HeroPreview({ title, description, ctaPrimary, ctaSecondary }) {
  return (
    <div className="relative overflow-hidden text-center py-10 px-6" style={{ background: "linear-gradient(to bottom, #000000, #172554)" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, rgba(59,130,246,0.22) 0%, transparent 60%)" }} />
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 mb-4 text-[9px] font-semibold tracking-wide text-cyan-300 uppercase">
          <Sparkles size={10} /> AI-Powered Investing Platform
        </span>
        <p className="text-lg font-extrabold leading-tight mb-2 bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #22d3ee, #60a5fa)" }}>
          {title || "Your headline goes here"}
        </p>
        <p className="text-slate-400 text-xs mb-5">{description || "Your subtitle goes here"}</p>
        <div className="flex gap-2 justify-center">
          <span className="px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-semibold">{ctaPrimary || "Get Started"}</span>
          <span className="px-4 py-1.5 rounded-lg border border-slate-500 text-white text-[10px] font-semibold">{ctaSecondary || "Login"}</span>
        </div>
      </div>
    </div>
  );
}

function ModelPortfolioPreview({ heading, description, extras }) {
  const emptyMsg = extras?.model_portfolio_empty_msg?.title || "Empty-state message";
  return (
    <div className="p-6 bg-white">
      <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading || "Model Portfolio"}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 mb-3">{description}</p>
      <div className="rounded-xl bg-cyan-50 ring-1 ring-cyan-200 p-4">
        <p className="text-slate-400 text-[9px] italic">{emptyMsg}</p>
        <div className="mt-3 pt-3 border-t border-cyan-200 flex justify-end">
          <span className="px-3 py-1 rounded-lg bg-cyan-500 text-white text-[9px] font-semibold">
            {extras?.model_portfolio_cta_create?.title || "Create Portfolio"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ExpertProfilePreview({ heading, extras }) {
  const editCta = extras?.expert_profile_edit_cta?.title || "Edit Profile";
  const notRated = extras?.expert_profile_not_rated?.title || "Not-yet-rated message";
  const lockedLabel = extras?.compensation_locked_label?.title || "Locked";
  const lockedMsg = extras?.compensation_locked_msg?.title || "Compensation locked message";
  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading || "Your Profile"}</p>
        <span className="text-cyan-600 text-[9px] font-semibold">{editCta}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #0f172a, #1e293b)" }}>
          <p className="text-slate-400 text-[9px] mb-1">Your Rating</p>
          <p className="text-white text-2xl font-bold font-mono leading-none">—</p>
          <p className="text-slate-500 text-[8px] mt-2">{notRated}</p>
        </div>
        <div className="rounded-xl p-4 bg-slate-100">
          <p className="text-slate-400 text-[9px] mb-1">Compensation</p>
          <p className="text-slate-500 text-base font-bold leading-none">{lockedLabel}</p>
          <p className="text-slate-400 text-[8px] mt-2">{lockedMsg}</p>
        </div>
      </div>
    </div>
  );
}

function DocumentsPreview({ heading, extras }) {
  const desc = extras?.documents_desc_unverified?.title || "Description goes here";
  const cta = extras?.documents_cta_unverified?.title || "Submit Documents";
  return (
    <div className="p-6" style={{ background: "linear-gradient(135deg, #451a03, #0f172a, #020617)" }}>
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-amber-400/10 ring-1 ring-amber-400/20 flex items-center justify-center shrink-0">
          <HelpCircle size={14} className="text-amber-300" />
        </div>
        <div>
          <p className="text-white text-xs font-bold leading-tight">{heading || "Verification Documents"}</p>
          <p className="text-slate-300 text-[9px] mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-900 text-[9px] font-bold">{cta}</span>
      </div>
    </div>
  );
}

function ExpertHeroPreview({ title }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 140 }}>
      <img src={professorPageImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.15))" }} />
      <div className="relative p-4 flex flex-col justify-end h-full">
        <p className="text-white font-extrabold text-sm leading-tight">
          Welcome back, <span className="text-purple-400">qa_expert</span>
        </p>
        <p className="text-slate-200 text-[9px] mt-1">{title || "Subtitle text goes here"}</p>
      </div>
    </div>
  );
}

function EmptyPortfolioMessagePreview({ title }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 140 }}>
      <img src={investorLoggedInImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.15))" }} />
      <div className="relative p-4 flex flex-col justify-end h-full">
        <p className="text-white font-extrabold text-sm leading-tight mb-2">
          Welcome back, <span className="text-cyan-400">qa_basic</span>
        </p>
        <span className="inline-flex items-center gap-1.5 w-fit rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 px-3 py-1.5">
          <Wallet size={11} className="text-cyan-400" />
          <span className="text-[9px] font-medium text-gray-100">{title || "Empty-state message goes here"}</span>
        </span>
      </div>
    </div>
  );
}

function AIInsightsPreview({ heading, items }) {
  const tagline = items.find(i => i.content_id === "ai_tagline_low")?.title
    ?? items[0]?.title ?? "Your portfolio is looking healthy today.";
  const stats = [
    { label: "Top Buy", icon: TrendingUp },
    { label: "Watchlist", icon: AlertTriangle },
    { label: "Portfolio Risk", icon: Gauge },
  ];
  return (
    <div className="p-6 bg-white">
      <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading || "Today's AI Insights"}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 mb-3">{typeof tagline === "string" ? tagline : "Your portfolio is looking healthy today."}</p>
      <div className="rounded-xl bg-cyan-50 ring-1 ring-cyan-200 p-3 grid grid-cols-3 divide-x divide-cyan-200/60">
        {stats.map(({ label, icon: Icon }) => (
          <div key={label} className="px-2 first:pl-0">
            <div className="flex items-center gap-1 mb-1">
              <span className="w-4 h-4 rounded bg-cyan-100 flex items-center justify-center"><Icon size={9} className="text-cyan-600" /></span>
              <span className="text-[7px] font-bold uppercase text-slate-400">{label}</span>
            </div>
            <p className="text-[9px] font-bold text-slate-800">Example Corp</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RealtimeDashboardPreview({ heading, description, items }) {
  const shown = items.length ? items : [
    { content_id: "ph1", title: "AI Predictions" }, { content_id: "ph2", title: "Verified Comments" }, { content_id: "ph3", title: "Paper Trading" },
  ];
  const dashIcons = [BrainCircuit, BadgeCheck, Wallet];
  return (
    <div className="p-6" style={{ background: "linear-gradient(135deg, #020617, #172554, #0f172a)" }}>
      <span className="inline-block text-[7px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 mb-2">Live Market Data</span>
      <p className="text-white text-sm font-bold leading-snug mb-1">{heading || "The Realtime Trading Dashboard"}</p>
      <p className="text-slate-400 text-[9px] mb-3">{description}</p>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {shown.slice(0, 3).map((it, i) => {
          const Icon = dashIcons[i] || Sparkles;
          return (
            <div key={it.content_id}>
              <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center mb-1">
                <Icon size={10} className="text-cyan-400" />
              </div>
              <p className="text-white text-[8px] font-semibold leading-tight">{it.title}</p>
              <p className="text-slate-400 text-[7px] leading-tight mt-0.5 line-clamp-2">{it.description}</p>
            </div>
          );
        })}
      </div>
      <p className="text-cyan-400 text-[9px] font-semibold">Launch Dashboard →</p>
    </div>
  );
}

function WhyCardsPreview({ heading, description, items, icons = [] }) {
  const shown = items.length ? items.slice(0, 3) : [
    { content_id: "ph1", title: "Card title", description: "Card description" },
    { content_id: "ph2", title: "Card title", description: "Card description" },
    { content_id: "ph3", title: "Card title", description: "Card description" },
  ];
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 items-stretch">
        {shown.map((it, i) => {
          const emphasized = i === 1;
          const Icon = icons[i] || ShieldCheck;
          return (
            <div key={it.content_id} className={`relative flex flex-col rounded-xl p-2.5 ${emphasized
              ? "bg-linear-to-br from-indigo-600 to-blue-700 scale-105 -translate-y-1 z-10"
              : "border border-blue-100 bg-blue-50"}`}>
              {emphasized && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[6px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-white text-indigo-700">Our Edge</span>
              )}
              <div className={`w-5 h-5 rounded-md flex items-center justify-center mb-1.5 ${emphasized ? "bg-white/15" : "bg-cyan-100"}`}>
                <Icon size={10} className={emphasized ? "text-white" : "text-cyan-600"} />
              </div>
              <p className={`text-[9px] font-bold leading-tight ${emphasized ? "text-white" : "text-slate-900"}`}>{it.title}</p>
              <p className={`text-[8px] leading-tight mt-0.5 flex-1 line-clamp-3 ${emphasized ? "text-indigo-100" : "text-slate-500"}`}>{it.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardGridPreview({ heading, description, items, ctaLabel, perCardCta, icons = [] }) {
  const shown = items.length ? items : [{ content_id: "placeholder", title: "Card title", description: "Card description" }];
  return (
    <div className="p-6 bg-white">
      {(heading || description) && (
        <div className="text-center mb-4">
          <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {shown.slice(0, 6).map((it, i) => {
          const Icon = icons[i] || Sparkles;
          return (
            <div key={it.content_id} className="rounded-xl border border-blue-100 bg-blue-50 p-3 relative">
              <div className="flex items-center justify-between mb-1.5">
                <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center">
                  <Icon size={12} className="text-cyan-600" />
                </div>
                {it.badge && (
                  <span className="text-[7px] font-bold uppercase tracking-wide text-cyan-700 bg-cyan-100 rounded-full px-1.5 py-0.5">{it.badge}</span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{it.title}</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{it.description}</p>
              {(perCardCta ? it.cta : ctaLabel) && (
                <p className="text-[8px] font-bold text-cyan-600 mt-1.5">{perCardCta ? it.cta : ctaLabel} →</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleTogglePreview({ heading, description, items, icons = [] }) {
  const shown = items.length ? items : [{ content_id: "ph1", title: "Role" }, { content_id: "ph2", title: "Role" }];
  return (
    <div className="p-6 bg-white text-center">
      <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
      <p className="text-slate-500 text-[10px] mt-0.5 mb-4">{description}</p>
      <div className="flex flex-col gap-2">
        {shown.map((it, i) => {
          const Icon = icons[i] || Compass;
          return (
            <div key={it.content_id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left ${i === 0 ? "border-cyan-500 bg-cyan-50" : "border-slate-200 bg-white"}`}>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${i === 0 ? "bg-cyan-100 text-cyan-600" : "bg-slate-100 text-slate-500"}`}>
                <Icon size={14} />
              </span>
              <span>
                <span className="block text-[11px] font-bold text-slate-800">{it.title}</span>
                <span className="block text-[9px] text-slate-400">{it.description}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepsPreview({ heading, description, items, icons = [] }) {
  const shown = items.length ? items : [{ content_id: "ph", title: "Step title", description: "Step description" }];
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shown.slice(0, 4).map((it, i) => {
          const Icon = icons[i] || Sparkles;
          return (
            <div key={it.content_id} className="relative rounded-xl border border-blue-100 bg-blue-50 p-3">
              <span className="absolute top-2 right-2 text-[8px] font-bold text-cyan-400">STEP {i + 1}</span>
              <div className="w-6 h-6 rounded-md bg-cyan-100 flex items-center justify-center mb-1.5">
                <Icon size={12} className="text-cyan-600" />
              </div>
              <p className="text-[10px] font-bold text-slate-900 leading-tight">{it.title}</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-0.5 line-clamp-2">{it.description}</p>
            </div>
          );
        })}
      </div>
      <div className="text-center mt-4">
        <span className="inline-block px-4 py-1.5 rounded-lg bg-cyan-500 text-white text-[10px] font-semibold">Create Your Account</span>
      </div>
    </div>
  );
}

function FaqPreview({ heading, description, items }) {
  const shown = items.length ? items : [{ content_id: "ph", title: "Question", description: "Answer" }];
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="space-y-1.5">
        {shown.slice(0, 4).map((it, i) => (
          <div key={it.content_id} className="rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-[10px] font-semibold text-slate-900">{it.title}</span>
              <ChevronDown size={12} className={`text-cyan-600 shrink-0 ${i === 0 ? "rotate-180" : ""}`} />
            </div>
            {i === 0 && <p className="px-3 pb-2 text-[9px] text-slate-500">{it.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TextPreview({ title, ctaLabel }) {
  return (
    <div className="p-6 bg-white text-center">
      <p className="text-slate-700 text-sm font-semibold">{title || "Text goes here"}</p>
      {ctaLabel && (
        <span className="inline-block mt-3 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold">{ctaLabel}</span>
      )}
    </div>
  );
}

function VideoPreview({ heading, description }) {
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{description}</p>
      </div>
      <div className="relative aspect-video w-full rounded-xl border border-cyan-400/30 bg-slate-900 flex items-center justify-center">
        <span className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center">
          <PlayCircle className="text-white" size={16} />
        </span>
      </div>
    </div>
  );
}

function BannerBasicPreview({ title, description, ctaLabel }) {
  return (
    <div className="p-6" style={{ background: "linear-gradient(135deg, #78350f, #0f172a, #451a03)" }}>
      <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 mb-2">
        <Sparkles size={9} /> RocketTrade Premium
      </span>
      <p className="text-white text-sm font-bold leading-snug mb-1">{title || "Banner headline"}</p>
      <p className="text-slate-300 text-[10px] leading-relaxed mb-3">{description || "Banner description"}</p>
      <span className="inline-block bg-yellow-400 text-slate-950 text-[10px] font-bold px-3 py-1.5 rounded-lg">{ctaLabel || "View Pricing"}</span>
    </div>
  );
}

function BannerPremiumPreview({ title, description, ctaLabel }) {
  const shown = (description || "").replace("{days}", "14");
  return (
    <div className="p-6" style={{ background: "linear-gradient(135deg, #1e1b4b, #0f172a, #172554)" }}>
      <span className="inline-flex items-center gap-1 text-[8px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 mb-2">
        <Sparkles size={9} /> RocketTrade Premium
      </span>
      <p className="text-white text-sm font-bold leading-snug mb-1">{title || "Banner headline"}</p>
      <p className="text-slate-300 text-[10px] leading-relaxed mb-3">{shown || "Banner description"}</p>
      <span className="inline-block bg-white/10 border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">{ctaLabel || "Manage Subscription"}</span>
      <p className="text-[8px] text-slate-500 mt-2 italic">Preview uses "14" for {"{days}"} — the real page shows the actual days left.</p>
    </div>
  );
}

function SectionHeaderPreview({ title, ctaLabel }) {
  return (
    <div className="p-6 bg-white">
      <div className="flex items-center justify-between">
        <p className="text-slate-900 text-base font-bold">{title || "Section heading"}</p>
        {ctaLabel && <span className="text-cyan-600 text-[10px] font-semibold">{ctaLabel}</span>}
      </div>
      <div className="mt-4 h-16 rounded-xl bg-slate-50 ring-1 ring-slate-100" />
    </div>
  );
}

function WatchlistEmptyPreview({ title, description, ctaLabel }) {
  return (
    <div className="bg-white">
      <div className="px-4 pt-4 pb-2 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">My Watchlist</p>
      </div>
      <div className="px-6 py-8 flex flex-col items-center text-center">
        <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <Eye size={18} className="text-slate-500" />
        </div>
        <p className="text-slate-900 font-bold text-xs mb-1">{title || "Empty-state heading"}</p>
        <p className="text-slate-500 text-[10px] mb-4 max-w-[220px]">{description || "Empty-state description"}</p>
        <span className="px-4 py-1.5 rounded-lg bg-cyan-400 text-slate-900 text-[10px] font-bold">{ctaLabel || "+ Add Stocks"}</span>
        <p className="text-slate-400 text-[8px] uppercase tracking-wide font-semibold mt-5 mb-2">Suggested for you</p>
        <div className="flex gap-1.5">
          {["AAPL", "NVDA", "TSLA"].map((s) => (
            <span key={s} className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[8px] font-semibold ring-1 ring-slate-200">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MembershipCard({ badge, badgeClass, name, price, sub, features, highlight }) {
  return (
    <div className={`flex-1 rounded-xl border-2 p-5 ${highlight ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
      <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${badgeClass}`}>{badge}</span>
      <p className="text-sm font-semibold text-slate-900 mb-0.5">{name || "Plan"}</p>
      <p className="text-2xl font-extrabold text-slate-800 mb-0.5">{price || "$0"}</p>
      <p className="text-[10px] text-slate-400 mb-3">{sub}</p>
      <div className="h-px bg-slate-200 mb-3" />
      <ul className="space-y-1.5">
        {(features.length ? features : [{ content_id: "ph", title: "Feature" }]).slice(0, 5).map(f => (
          <li key={f.content_id} className="text-[10px] text-slate-700 flex items-center gap-1.5">
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${highlight ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"}`}>
              <Check size={8} />
            </span>
            {f.title}
          </li>
        ))}
        {features.length > 5 && <li className="text-[10px] text-slate-400">+ {features.length - 5} more</li>}
      </ul>
    </div>
  );
}

function MembershipPreview({ heading, description, freeName, freePrice, freePriceSub, premName, premPrice, premPriceSub, freeFeatures, premFeatures }) {
  return (
    <div className="bg-slate-50">
      {(heading || description) && (
        <div className="text-center pt-5 px-4">
          <p className="text-slate-800 text-sm font-extrabold leading-tight">{heading}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
        </div>
      )}
      <div className="p-5 flex gap-3">
        <MembershipCard badge="Free" badgeClass="bg-blue-100 text-blue-700" name={freeName} price={freePrice} sub={freePriceSub} features={freeFeatures} />
        <MembershipCard badge="\u2b50 Premium" badgeClass="bg-amber-100 text-amber-700" name={premName} price={premPrice} sub={premPriceSub} features={premFeatures} highlight />
      </div>
    </div>
  );
}

function FooterCol({ label, items }) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">{label}</p>
      <ul className="space-y-1">
        {items.length ? items.map(i => <li key={i.content_id} className="text-[10px] text-white/70">{i.title}</li>)
                      : <li className="text-[10px] text-white/30 italic">No links yet</li>}
      </ul>
    </div>
  );
}

function FooterPreview({ brand, brandTagline, version, product, company, resources, contact }) {
  return (
    <div className="p-6" style={{ background: "#0B1D4F" }}>
      <div className="flex items-center gap-1.5 mb-1">
        <p className="text-white text-sm font-bold">{brand || "Brand Name"}</p>
        {version && <span className="text-[8px] font-semibold text-white/40 bg-white/10 rounded-full px-1.5 py-0.5">{version}</span>}
      </div>
      <p className="text-white/50 text-[10px] mb-4">{brandTagline}</p>
      <div className="grid grid-cols-4 gap-3">
        <FooterCol label="Product" items={product} />
        <FooterCol label="Company" items={company} />
        <FooterCol label="Resources" items={resources} />
        <FooterCol label="Contact" items={contact} />
      </div>
    </div>
  );
}

function ContentManagementPage() {
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState("landing");
  const [activeSubTab, setActiveSubTab] = useState("hero");
  const [loading, setLoading] = useState(true);

  const fetchContent = async () => {
    const res = await authFetch(API);
    const data = await res.json();
    if (data.success) setContent(data.content);
  };

  useEffect(() => {
    setLoading(true);
    fetchContent().finally(() => setLoading(false));
  }, []);

  const startEdit = (item) => {
    setEditing(item.content_id);
    setForm({ title: item.title, description: item.description || "" });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async (content_id) => {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/${content_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        await fetchContent();
        setEditing(null);
      } else {
        alert(data.message || "Failed to save");
      }
    } catch {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  // Drag-and-drop reordering
  const reorderSection = async (section, orderedIds) => {
    const res = await authFetch(`${API}/section/${section}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ordered_ids: orderedIds }),
    });
    const data = await res.json();
    if (!data.success) await fetchContent();
  };

  const handleDrop = (list, targetId) => {
    const draggedId = dragId;
    setDragId(null);
    setDragOverId(null);
    if (!draggedId || draggedId === targetId) return;

    const ids = list.map((i) => i.content_id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);

    const section = list[0].section;
    setContent((prev) => {
      const untouched = prev.filter((p) => p.section !== section);
      const reordered = ids.map((id, idx) => ({ ...prev.find((p) => p.content_id === id), order_index: idx }));
      return [...untouched, ...reordered];
    });
    reorderSection(section, ids);
  };

  const byId = (id) => content.find((c) => c.content_id === id);
  const bySection = (section) => content.filter((c) => c.section === section);

  const freePlanInfo    = bySection("free_plan");
  const premiumPlanInfo = bySection("premium_plan");
  const freeItems       = bySection("free_investor");
  const premiumItems    = bySection("premium_investor");
  const footerBrand     = bySection("footer_brand");
  const footerProduct   = bySection("footer_product");
  const footerCompany   = bySection("footer_company");
  const footerResources = bySection("footer_resources");
  const footerContact   = bySection("footer_contact");

  const currentMainTab = MAIN_TABS.find((t) => t.key === activeMainTab);
  const activeTabInfo = currentMainTab?.subtabs
    ? currentMainTab.subtabs.find((t) => t.key === activeSubTab)
    : currentMainTab;

  const renderRow = (item, list) => {
    const isEditing = editing === item.content_id;
    const orderable = ORDERABLE_SECTIONS.has(item.section) && list.length > 1;
    const isDragOver = orderable && dragOverId === item.content_id && dragId !== item.content_id;
    const showDesc = DESCRIPTION_SECTIONS.has(item.section) && !item.content_id.endsWith("_cta");
    return (
      <div
        key={item.content_id}
        draggable={orderable && !isEditing}
        onDragStart={() => setDragId(item.content_id)}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={(e) => { if (orderable) { e.preventDefault(); setDragOverId(item.content_id); } }}
        onDrop={(e) => { e.preventDefault(); if (orderable) handleDrop(list, item.content_id); }}
        className={`bg-white rounded-lg p-5 border transition-colors ${
          isDragOver ? "border-blue-400 border-dashed bg-blue-50/50" : "border-gray-100 hover:border-blue-200"
        } ${dragId === item.content_id ? "opacity-40" : ""}`}
      >
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            {showDesc && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  {["hero", "page_headers"].includes(item.section) ? "SUBTITLE"
                    : ["footer_product", "footer_company", "footer_resources", "footer_contact"].includes(item.section) ? "URL"
                    : item.section === "faq" ? "ANSWER" : "DESCRIPTION"}
                </label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
                <Check size={14} /> Save
              </button>
              <button onClick={cancelEdit}
                className="flex items-center gap-1 border border-gray-300 text-slate-600 px-4 py-2 rounded-lg text-sm">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {orderable && (
                <div className="pt-0.5 text-slate-300 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical size={16} />
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-800">{item.title}</p>
                {item.description && (
                  <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                )}
              </div>
            </div>
            <button onClick={() => startEdit(item)}
              className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-1.5 rounded text-sm shrink-0">
              <Edit size={13} /> Edit
            </button>
          </div>
        )}
      </div>
    );
  };

  // Whatever's currently being edited shows the in-progress form values in
  // the preview (so it updates as you type), everything else just uses
  // what's saved.
  const liveItem = (item) => item?.content_id === editing ? { ...item, title: form.title, description: form.description } : item;
  const liveList = (list) => list.map(liveItem);

  const renderPreview = () => {
    if (activeMainTab === "landing" && activeSubTab === "hero") {
      const hero = liveItem(byId("content_hero"));
      return <PreviewFrame label="Landing page"><HeroPreview title={hero?.title} description={hero?.description} ctaPrimary={liveItem(byId("hero_cta_primary"))?.title} ctaSecondary={liveItem(byId("hero_cta_secondary"))?.title} /></PreviewFrame>;
    }
    if (activeMainTab === "membership") {
      const header = liveItem(byId("header_pricing"));
      const fp = liveList(freePlanInfo), pp = liveList(premiumPlanInfo);
      return (
        <PreviewFrame label="Subscription page">
          <MembershipPreview
            heading={header?.title} description={header?.description}
            freeName={fp.find(i => i.content_id === "free_plan_name")?.title}
            freePrice={fp.find(i => i.content_id === "free_plan_price")?.title}
            freePriceSub={fp.find(i => i.content_id === "free_plan_price")?.description}
            premName={pp.find(i => i.content_id === "premium_plan_name")?.title}
            premPrice={pp.find(i => i.content_id === "premium_plan_price")?.title}
            premPriceSub={pp.find(i => i.content_id === "premium_plan_price")?.description}
            freeFeatures={liveList(freeItems)}
            premFeatures={liveList(premiumItems)}
          />
        </PreviewFrame>
      );
    }
    if (activeMainTab === "footer") {
      return (
        <PreviewFrame label="Site footer">
          <FooterPreview
            brand={liveList(footerBrand)[0]?.title}
            brandTagline={liveList(footerBrand)[0]?.description}
            version={liveItem(byId("footer_version"))?.title}
            product={liveList(footerProduct)}
            company={liveList(footerCompany)}
            resources={liveList(footerResources)}
            contact={liveList(footerContact)}
          />
        </PreviewFrame>
      );
    }
    // generic header + items tabs
    const tab = activeTabInfo;
    if (tab?.kind === "generic") {
      const header = tab.headerId ? liveItem(byId(tab.headerId)) : null;
      const items = tab.itemsSection ? liveList(bySection(tab.itemsSection)) : [];
      const heading = header?.title, description = header?.description;
      if (tab.preview === "video") {
        return <PreviewFrame label={tab.label}><VideoPreview heading={heading} description={description} /></PreviewFrame>;
      }
      if (tab.preview === "text_only") {
        return <PreviewFrame label={tab.label}><TextPreview title={heading} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "section_header") {
        return <PreviewFrame label={tab.label}><SectionHeaderPreview title={heading} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "watchlist_empty") {
        return <PreviewFrame label={tab.label}><WatchlistEmptyPreview title={heading} description={description} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "banner_basic") {
        return <PreviewFrame label={tab.label}><BannerBasicPreview title={heading} description={description} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "banner_premium") {
        return <PreviewFrame label={tab.label}><BannerPremiumPreview title={heading} description={description} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "role_toggle") {
        return <PreviewFrame label={tab.label}><RoleTogglePreview heading={heading} description={description} items={items} icons={CARD_ICONS[tab.itemsSection]} /></PreviewFrame>;
      }
      if (tab.preview === "steps") {
        return <PreviewFrame label={tab.label}><StepsPreview heading={heading} description={description} items={items} icons={CARD_ICONS[tab.itemsSection]} /></PreviewFrame>;
      }
      if (tab.preview === "faq") {
        return <PreviewFrame label={tab.label}><FaqPreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "why_cards") {
        return <PreviewFrame label={tab.label}><WhyCardsPreview heading={heading} description={description} items={items} icons={CARD_ICONS[tab.itemsSection]} /></PreviewFrame>;
      }
      if (tab.preview === "realtime_dashboard") {
        return <PreviewFrame label={tab.label}><RealtimeDashboardPreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "ai_insights") {
        return <PreviewFrame label={tab.label}><AIInsightsPreview heading={heading} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "expert_hero") {
        return <PreviewFrame label={tab.label}><ExpertHeroPreview title={heading} /></PreviewFrame>;
      }
      if (tab.preview === "empty_portfolio") {
        return <PreviewFrame label={tab.label}><EmptyPortfolioMessagePreview title={heading} /></PreviewFrame>;
      }
      if (tab.extraIds) {
        const extras = Object.fromEntries(tab.extraIds.map(({ id }) => [id, liveItem(byId(id))]));
        if (tab.preview === "model_portfolio") {
          return <PreviewFrame label={tab.label}><ModelPortfolioPreview heading={heading} description={description} extras={extras} /></PreviewFrame>;
        }
        if (tab.preview === "expert_profile") {
          return <PreviewFrame label={tab.label}><ExpertProfilePreview heading={heading} extras={extras} /></PreviewFrame>;
        }
        if (tab.preview === "documents") {
          return <PreviewFrame label={tab.label}><DocumentsPreview heading={heading} extras={extras} /></PreviewFrame>;
        }
      }
      const itemsWithCta = (tab.perCardCtaSection || tab.perCardBadgeSection)
        ? items.map((it, i) => ({
          ...it,
          cta: tab.perCardCtaSection ? liveList(bySection(tab.perCardCtaSection))[i]?.title : undefined,
          badge: tab.perCardBadgeSection ? liveList(bySection(tab.perCardBadgeSection))[i]?.title : undefined,
        }))
        : items;
      return (
        <PreviewFrame label={tab.label}>
          <CardGridPreview
            heading={heading} description={description} items={itemsWithCta}
            ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null}
            perCardCta={!!tab.perCardCtaSection}
            icons={CARD_ICONS[tab.itemsSection]}
          />
        </PreviewFrame>
      );
    }
    return null;
  };

  return (
    <AdminLayout title="Content Management" subtitle="Edit landing page and role-specific content">
      {/* Main tabs */}
      <div className="flex flex-wrap gap-2 mb-2">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveMainTab(tab.key);
              setEditing(null);
              if (tab.subtabs) setActiveSubTab(tab.subtabs[0].key);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeMainTab === tab.key
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Subtabs — any main tab that defines a `subtabs` list gets a second row */}
      {currentMainTab?.subtabs && (
        <div className="flex flex-wrap gap-1.5 mb-2 pl-1">
          {currentMainTab.subtabs.map((sub) => (
            <button
              key={sub.key}
              onClick={() => { setActiveSubTab(sub.key); setEditing(null); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeSubTab === sub.key
                ? "bg-blue-100 text-blue-700"
                : "bg-white/60 text-slate-500 hover:bg-white"
                }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {activeTabInfo?.hint && (
        <p className="text-xs text-slate-400 mb-4">{activeTabInfo.hint}</p>
      )}

      {loading ? (
        <div className="bg-white rounded-lg p-10 text-center text-gray-400">Loading content…</div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
      <div>

      {/* Hero */}
      {activeMainTab === "landing" && activeSubTab === "hero" && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Section Heading</p>
            {byId("content_hero") ? renderRow(byId("content_hero"), [byId("content_hero")])
              : <p className="text-slate-400 text-sm">No content found for this section.</p>}
          </div>
          {byId("hero_cta_primary") && byId("hero_cta_secondary") && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Buttons</p>
              <div className="space-y-3">
                {renderRow(byId("hero_cta_primary"), [byId("hero_cta_primary")])}
                {renderRow(byId("hero_cta_secondary"), [byId("hero_cta_secondary")])}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Generic header + items tabs */}
      {activeTabInfo?.kind === "generic" && (
        <div className="space-y-6">
          {activeTabInfo.headerId && byId(activeTabInfo.headerId) && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Section Heading</p>
              {renderRow(byId(activeTabInfo.headerId), [byId(activeTabInfo.headerId)])}
            </div>
          )}
          {activeTabInfo.ctaId && byId(activeTabInfo.ctaId) && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Button Text</p>
              {renderRow(byId(activeTabInfo.ctaId), [byId(activeTabInfo.ctaId)])}
            </div>
          )}
          {activeTabInfo.extraIds && activeTabInfo.extraIds.map(({ id, label }) => byId(id) && (
            <div key={id}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{label}</p>
              {renderRow(byId(id), [byId(id)])}
            </div>
          ))}
          {activeTabInfo.itemsSection && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cards</p>
              <div className="space-y-3">
                {bySection(activeTabInfo.itemsSection).length === 0
                  ? <p className="text-slate-400 text-sm">No content found for this section.</p>
                  : bySection(activeTabInfo.itemsSection).map((item, idx) => (
                    <div key={item.content_id}>
                      {renderRow(item, bySection(activeTabInfo.itemsSection))}
                      {activeTabInfo.perCardBadgeSection && bySection(activeTabInfo.perCardBadgeSection)[idx] && (
                        <div className="ml-4 mt-1.5 pl-3 border-l-2 border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Badge for this card</p>
                          {renderRow(
                            bySection(activeTabInfo.perCardBadgeSection)[idx],
                            [bySection(activeTabInfo.perCardBadgeSection)[idx]]
                          )}
                        </div>
                      )}
                      {activeTabInfo.perCardCtaSection && bySection(activeTabInfo.perCardCtaSection)[idx] && (
                        <div className="ml-4 mt-1.5 pl-3 border-l-2 border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Button text for this card</p>
                          {renderRow(
                            bySection(activeTabInfo.perCardCtaSection)[idx],
                            [bySection(activeTabInfo.perCardCtaSection)[idx]]
                          )}
                        </div>
                      )}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* Membership Plans — two columns */}
      {activeMainTab === "membership" && (
        <div className="space-y-6">
          {byId("header_pricing") && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Section Heading</p>
              {renderRow(byId("header_pricing"), [byId("header_pricing")])}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Free Plan</p>
            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-400 font-semibold">Plan Details</p>
              {freePlanInfo.map((item) => (
                <div key={item.content_id} className="bg-white rounded-lg p-4 border border-blue-100">
                  {editing === item.content_id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">
                          {item.content_id === "free_plan_name" ? "PLAN NAME" : "PRICE"}
                        </label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      {item.content_id === "free_plan_price" && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block">PRICE SUBTITLE</label>
                          <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold">
                          <Check size={13} /> Save
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 border border-gray-300 text-slate-600 px-3 py-1.5 rounded text-sm">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          {item.content_id === "free_plan_name" ? "Plan Name" : "Price"}
                        </p>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                      </div>
                      <button onClick={() => startEdit(item)}
                        className="flex items-center gap-1 border border-blue-500 text-blue-600 px-2 py-1 rounded text-xs shrink-0">
                        <Edit size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-semibold mb-3">Features</p>
            <div className="space-y-3">
              {freeItems.length === 0
                ? <p className="text-slate-400 text-sm">No free features found.</p>
                : freeItems.map((item) => renderRow(item, freeItems))
              }
            </div>
          </div>

          {/* Premium Plan */}
          <div>
            <p className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-3">Premium Plan</p>
            <div className="space-y-3 mb-5">
              <p className="text-xs text-slate-400 font-semibold">Plan Details</p>
              {premiumPlanInfo.map((item) => (
                <div key={item.content_id} className="bg-white rounded-lg p-4 border border-yellow-100">
                  {editing === item.content_id ? (
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-bold text-slate-400 mb-1 block">
                          {item.content_id === "premium_plan_name" ? "PLAN NAME" : "PRICE"}
                        </label>
                        <input
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                      {item.content_id === "premium_plan_price" && (
                        <div>
                          <label className="text-xs font-bold text-slate-400 mb-1 block">PRICE SUBTITLE</label>
                          <input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button onClick={() => saveEdit(item.content_id)} disabled={saving}
                          className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold">
                          <Check size={13} /> Save
                        </button>
                        <button onClick={cancelEdit}
                          className="flex items-center gap-1 border border-gray-300 text-slate-600 px-3 py-1.5 rounded text-sm">
                          <X size={13} /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-400 mb-0.5">
                          {item.content_id === "premium_plan_name" ? "Plan Name" : "Price"}
                        </p>
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>}
                      </div>
                      <button onClick={() => startEdit(item)}
                        className="flex items-center gap-1 border border-yellow-500 text-yellow-600 px-2 py-1 rounded text-xs shrink-0">
                        <Edit size={12} /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 font-semibold mb-3">Features</p>
            <div className="space-y-3">
              {premiumItems.length === 0
                ? <p className="text-slate-400 text-sm">No premium features found.</p>
                : premiumItems.map((item) => renderRow(item, premiumItems))
              }
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {activeMainTab === "footer" && (
        <div className="space-y-8">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Brand</p>
            <div className="space-y-3">{footerBrand.map((item) => renderRow(item, footerBrand))}</div>
          </div>
          {byId("footer_version") && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Version Badge</p>
              <p className="text-xs text-slate-400 mb-2">The small pill shown next to the brand name (e.g. "v1.0.0")</p>
              <div className="space-y-3">{renderRow(byId("footer_version"), [byId("footer_version")])}</div>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Product Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">{footerProduct.map((item) => renderRow(item, footerProduct))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">{footerCompany.map((item) => renderRow(item, footerCompany))}</div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Resources Links</p>
            <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
            <div className="space-y-3">
              {footerResources.length === 0
                ? <p className="text-slate-400 text-sm">No content found for this section.</p>
                : footerResources.map((item) => renderRow(item, footerResources))
              }
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
            <p className="text-xs text-slate-400 mb-2">For links: Title = label, Description = URL. For email: leave Description empty.</p>
            <div className="space-y-3">{footerContact.map((item) => renderRow(item, footerContact))}</div>
          </div>
        </div>
      )}

      </div>
      <div>{renderPreview()}</div>
      </div>
      )}
    </AdminLayout>
  );
}

export default ContentManagementPage;
