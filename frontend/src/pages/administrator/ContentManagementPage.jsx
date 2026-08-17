import { useEffect, useState } from "react";
import {
  Edit, Check, X, GripVertical, Eye, ChevronDown,
  Rocket, ShieldCheck, ScrollText, Sparkles, Award,
  PlayCircle, ListChecks, HelpCircle, CreditCard, Link2,
  LayoutDashboard, Wallet, GraduationCap,
  BrainCircuit, MessagesSquare, Bot, MessageCircleQuestion,
  DollarSign, Zap, Users, UserPlus, Mail, Activity, Briefcase, MessageSquare, BookOpen,
  TrendingUp, AlertTriangle, Gauge, BadgeCheck, FileText,
  Search, Plus, Hash, Flame, Star, Clock, Heart,
  BarChart3, CheckCircle2, Cpu, ChartNoAxesCombined, UserRound, ChartCandlestick,
} from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import { toEmbeddableVideoUrl } from "../../api/contentApi.js";
import investorLoggedInImg from "../../images/investorloggedin.jpg";
import professorPageImg from "../../images/professorpage.jpg";
import aboutUsImg from "../../images/about_us.jpg";
import helpCenterImg from "../../images/help_center.jpg";

// Real per-card icons, copied straight from the source arrays in
// Homepage.jsx / LoggedInHomePage.jsx / ExpertLoggedInPage.jsx — icons
// aren't admin-editable (same as button "to" links), so this just mirrors
// what's actually hardcoded there, keyed by itemsSection and matched to
// cards by position/order_index.
const CARD_ICONS = {
  get_started_steps: [UserPlus, Mail, ShieldCheck, Rocket],
  why_investor: [ShieldCheck, Zap, Users],
  platform_features: [Wallet, BrainCircuit, MessagesSquare, Bot, GraduationCap, MessageCircleQuestion],
  expert_role_benefits: [BrainCircuit, DollarSign, Users],
  investor_home_features: [Wallet, BrainCircuit, MessagesSquare, Bot, GraduationCap],
  expert_tools: [Activity, GraduationCap, MessagesSquare, Briefcase, MessageSquare],
  expert_home_features: [GraduationCap, Briefcase, Wallet],
  forum_topics: [Gauge, BrainCircuit, Briefcase, TrendingUp, GraduationCap, Sparkles, Activity, DollarSign, Wallet, MessageSquare, Zap, LayoutDashboard],
};

const ABOUT_VALUE_ICONS = [ShieldCheck, Cpu, ChartNoAxesCombined, Users];
const HELP_CATEGORY_ICONS = [
  UserRound,
  CreditCard,
  ChartCandlestick,
  BrainCircuit,
  MessagesSquare,
  ShieldCheck,
];

const API = `${import.meta.env.VITE_API_URL}/admin/content`;

const IMAGE_CONTENT_IDS = new Set([
  "content_hero",
  "hero_empty_state",
  "expert_hero_subtitle",
  "expert_compensation_header",
  "expert_documents_page_header",
  "expert_knowledge_header",
  "expert_portfolio_list_header",
  "expert_portfolio_list_expert_header",
  "about_hero",
  "help_hero",
  "forum_topic_technical",
  "forum_topic_ai",
  "forum_topic_strategy",
  "forum_topic_news",
  "forum_topic_beginner",
  "forum_topic_trading",
  "forum_topic_it",
  "forum_topic_financials",
  "forum_topic_consumer",
  "forum_topic_communication",
  "forum_topic_energy",
  "forum_topic_real_estate",
]);

const VIDEO_CONTENT_IDS = new Set([
  "header_video",
]);

function resizeImageToDataUrl(file, maxWidth = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


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
  {
    key: "hero", label: "Header", icon: Rocket, kind: "hero",
    hint: "Controls the main landing-page hero headline, supporting text, header image, and primary action buttons."
  },
  {
    key: "video", label: "Video Section", icon: PlayCircle, kind: "generic", preview: "video",
    headerId: "header_video", itemsSection: null,
    hint: "Controls the title and supporting text displayed above the landing-page video section."
  },
  {
    key: "why_investor", label: "Why RocketTrade", icon: ShieldCheck, kind: "generic", preview: "why_cards",
    headerId: "header_why_investor", itemsSection: "why_investor",
    hint: "Controls the credibility and value proposition cards shown to visitors on the landing page."
  },
  {
    key: "platform_features", label: "Platform Features", icon: Sparkles, kind: "generic", preview: "cards",
    headerId: "header_features_investor", itemsSection: "platform_features",
    hint: "Controls the feature cards that explain RocketTrade’s core investor tools and platform capabilities."
  },
  {
    key: "get_started", label: "Get Started Steps", icon: ListChecks, kind: "generic", preview: "steps",
    headerId: "header_started", itemsSection: "get_started_steps",
    hint: "Controls the step-by-step onboarding guide shown to new visitors before they sign up."
  },
  {
    key: "expert_benefits", label: "Expert Benefits", icon: Award, kind: "generic", preview: "expert_benefits",
    headerId: "header_expert_benefits", itemsSection: "expert_role_benefits",
    hint: "Controls the Expert Benefits section that explains why users may choose to become verified experts."
  },
  {
    key: "faq", label: "FAQ", icon: HelpCircle, kind: "generic", preview: "faq",
    headerId: "header_faq", itemsSection: "faq",
    hint: "Controls the frequently asked questions section shown near the bottom of the landing page."
  },
];

// Investor Home subtabs — reused by BOTH the Basic and Premium tabs below.
// Split into "top" (everything above the upgrade/renewal banner on the real
// page) and "bottom" (everything below it), since the banner itself is the
// one thing that's actually different between the two tiers.
const INVESTOR_SHARED_TOP = [
  {
    key: "empty_state", label: "Welcome Header", icon: Wallet, kind: "generic", preview: "empty_portfolio",
    headerId: "hero_empty_state", itemsSection: null,
    hint: "Controls the welcome message displayed before an investor makes their first trade. After the first trade, the dashboard switches to the live portfolio summary."
  },
  {
    key: "ai_insights", label: "AI Insights", icon: Sparkles, kind: "generic", preview: "ai_insights",
    headerId: "header_ai_insights", itemsSection: "investor_home_taglines", noAdd: true,
    hint: "Controls the AI Insights heading and the short advisory messages shown on the dashboard. The displayed message changes according to the investor’s portfolio risk level, with a default loading message while the portfolio data is being prepared."
  },
  {
    key: "portfolio_summary", label: "Portfolio Summary", icon: LayoutDashboard, kind: "generic", preview: "section_header",
    headerId: "header_portfolio_summary", ctaId: "portfolio_summary_cta", itemsSection: null,
    hint: "Controls the Portfolio Summary heading and the link text that opens the full portfolio page."
  },
  {
    key: "watchlist", label: "My Watchlist", icon: ListChecks, kind: "generic", preview: "section_header",
    headerId: "header_watchlist", ctaId: "watchlist_cta", itemsSection: null,
    hint: "Controls the Watchlist heading and the link text that opens the full watchlist page."
  },
  {
    key: "watchlist_empty", label: "Empty Watchlist Message", icon: ListChecks, kind: "generic", preview: "watchlist_empty",
    headerId: "header_watchlist_empty", ctaId: "watchlist_empty_cta", itemsSection: null,
    hint: "Controls the empty-state message shown before an investor adds their first stock to the watchlist."
  },
];

const INVESTOR_SHARED_BOTTOM = [
  {
    key: "investor_features", label: "Dashboard Features", icon: Sparkles, kind: "generic", preview: "cards",
    headerId: "header_investor_features", itemsSection: "investor_home_features",
    perCardCtaSection: "investor_home_features_cta", perCardBadgeSection: "investor_home_features_badge",
    hint: "Controls the dashboard feature cards shared by Basic and Premium investors. These cards link to key tools such as paper trading, AI predictions, the Community Forum, the chatbot, and education content."
  },
  {
    key: "investor_dashboard", label: "Realtime Dashboard", icon: LayoutDashboard, kind: "generic", preview: "realtime_dashboard",
    headerId: "header_investor_dashboard", itemsSection: "investor_home_dashboard",
    hint: "Controls the Realtime Trading Dashboard section shown near the bottom of the investor home page. This section is shared by Basic and Premium investors."
  },
];

const COMMUNITY_FORUM_SUBTABS = [
  {
    key: "forum_overview", label: "Overview", icon: MessagesSquare, kind: "generic", preview: "forum_overview",
    headerId: "forum_header", ctaId: "forum_new_post_cta", itemsSection: null,
    extraIds: [
      { id: "forum_search_placeholder", label: "Search field placeholder" },
      { id: "forum_trending_label", label: "Trending section heading" },
      { id: "forum_activity_label", label: "Activity section heading" },
      { id: "forum_topics_label", label: "Topics section heading" },
      { id: "forum_latest_label", label: "Latest posts section heading" },
      { id: "forum_latest_cta", label: "Latest posts link text" },
    ],
    hint: "Controls the main Community Forum heading, subtitle, primary action text, search placeholder, and section labels used on the forum home page."
  },
  {
    key: "forum_topics", label: "Forum Topics", icon: BookOpen, kind: "generic", preview: "forum_topics",
    headerId: "forum_topics_label", itemsSection: "forum_topics",
    hint: "Controls the visible topic names, short descriptions, and topic images used in the Community Forum topic grid. Each topic's picture can be replaced the same way as the other header images. The underlying category keys remain fixed so existing posts continue to appear correctly."
  },
];

// New cleaner admin grouping:
// - Shared home content is edited once under Investor + Expert.
// - Basic/Premium only tabs contain only their unique banners.
// This avoids repeating the same dashboard sections in both Basic and Premium.
// Community Forum lives here too (not as its own top-level tab) since both
// Investors and Experts use the same forum — same reasoning as everything
// else in this array.
const INVESTOR_EXPERT_HOME_SUBTABS = [
  ...INVESTOR_SHARED_TOP,
  ...INVESTOR_SHARED_BOTTOM,
  ...COMMUNITY_FORUM_SUBTABS,
];

// Expert Home subtabs (ExpertLoggedInPage.jsx), in the order they actually
// appear scrolling down the page: hero, model portfolio, profile, tools,
// then the verification documents banner at the very bottom.
const EXPERT_PAGES_SUBTABS = [
  { key: "expert_home_page", label: "Logged In Homepage", icon: LayoutDashboard, kind: "generic", preview: "cards", headerId: "header_expert_features", itemsSection: "expert_home_features", perCardCtaSection: "expert_home_features_cta", hint: "Controls the \"Expert Features\" heading, quick-link cards (My Education Content, My Portfolio, Compensation), and each card's button text, shown to experts on the shared logged-in homepage." },
  { key: "expert_compensation_page", label: "Compensation Page", icon: DollarSign, kind: "generic", preview: "expert_compensation_page", headerId: "expert_compensation_header", itemsSection: "expert_compensation_page", hint: "Controls the main headings, notices, locked-state copy, and empty-state messages on the Expert Compensation page. Numerical values and table column labels remain system-generated." },
  { key: "expert_documents_page", label: "Documents Page", icon: FileText, kind: "generic", preview: "expert_documents_page", headerId: "expert_documents_page_header", itemsSection: "expert_documents_page", hint: "Controls the headings, instructions, and action text on the Expert document submission page." },
  { key: "expert_knowledge_page", label: "Knowledge Hub Page", icon: GraduationCap, kind: "generic", preview: "expert_knowledge_page", headerId: "expert_knowledge_header", itemsSection: "expert_knowledge_page", hint: "Controls the headings, empty-state messages, and verification guidance shown on the Expert Knowledge Hub page." },
  { key: "expert_portfolio_page", label: "Portfolio List Page", icon: Briefcase, kind: "generic", preview: "expert_portfolio_page", headerId: "expert_portfolio_list_header", itemsSection: "expert_portfolio_page", hint: "Controls copy for the shared Expert Portfolio page. Investors and experts use the same page structure, with role-specific header text where needed." },
  { key: "expert_detail_page", label: "Expert Detail Page", icon: BadgeCheck, kind: "generic", preview: "expert_detail_page", headerId: "expert_detail_core_title", itemsSection: "expert_detail_page", hint: "Controls copy for the shared Expert Detail page. Investor-only actions remain hidden when an Expert account views the page." },
];

// Investor-only account pages. These are pages investors use after login.
// The Become Expert application and profile setup are moved to Investor Setup & Applications
// so the main investor pages stay focused on dashboard/trading/profile screens.
const INVESTOR_PAGES_SUBTABS = [
  {
    key: "ai_chatbot_page", label: "AI Chatbot", icon: Bot, kind: "generic", preview: "ai_chatbot_page",
    headerId: "header_ai_chatbot_page", itemsSection: null,
    hint: "Controls the title and subtitle shown on the AI Chatbot page. The conversation messages, quick prompts, and AI replies remain system-generated."
  },
  {
    key: "portfolio_overview_page", label: "Portfolio Overview", icon: LayoutDashboard, kind: "generic", preview: "portfolio_overview_page",
    headerId: "header_portfolio_overview_page", itemsSection: null,
    hint: "Controls the Portfolio Overview page header. Portfolio value, charts, holdings, and order data remain system-generated from the investor's account."
  },
  {
    key: "quant_rating_page", label: "Quant Ratings", icon: Gauge, kind: "generic", preview: "quant_rating_page",
    headerId: "header_quant_rating_page", itemsSection: null,
    hint: "Controls the Sector Quant Ratings page header. Ratings, model confidence, scores, and sector leaderboards remain system-generated."
  },
  {
    key: "transaction_portal_page", label: "Transaction Portal", icon: LayoutDashboard, kind: "generic", preview: "transaction_portal_page",
    headerId: "header_transaction_portal_page", itemsSection: "transaction_portal_page",
    hint: "Controls the Transaction Portal heading, subtitle, and View History link text. Trade totals, filters, and transaction rows remain system-generated."
  },
  {
    key: "transaction_history_page", label: "Transaction History", icon: FileText, kind: "generic", preview: "transaction_history_page",
    headerId: "header_transaction_history_page", itemsSection: "transaction_history_page",
    hint: "Controls the Transaction History page heading, subtitle, and empty-state text shown before the investor's first trade. Transaction rows and totals remain system-generated."
  },
  {
    key: "investor_profile_page", label: "Profile & Settings", icon: Users, kind: "generic", preview: "investor_profile_page",
    headerId: null, itemsSection: "investor_profile_page",
    hint: "Controls the Personal Information and Account Settings section headings on the investor profile page. Form fields, user details, and account data remain system-generated."
  },
];

const INVESTOR_SETUP_SUBTABS = [
  {
    key: "update_particular_page", label: "Complete Profile", icon: Users, kind: "generic", preview: "update_particular_page",
    headerId: null, itemsSection: "update_particular_page", noAdd: true,
    hint: "Controls the profile setup screen new investors see after signing up. Keep “{username}” in the heading because it is replaced with the real username."
  },
  {
    key: "become_expert_page", label: "Become an Expert Application", icon: Award, kind: "generic", preview: "become_expert_page",
    headerId: "header_become_expert_page", itemsSection: "become_expert_page",
    hint: "This remains in Investor Setup because only investors apply to become verified experts. It controls the application heading, status messages, and action buttons. Progress numbers stay system-generated."
  },
];

const MEMBERSHIP_PAYMENT_SUBTABS = [
  {
    key: "membership_plans", label: "Plans & Pricing", icon: CreditCard, kind: "membership",
    hint: "Controls the Free and Premium membership plan cards used on the landing page and subscription page."
  },
  {
    key: "payment_result_page", label: "Payment Result Pages", icon: DollarSign, kind: "generic", preview: "payment_result_page",
    headerId: null, itemsSection: "payment_result_page",
    hint: "Controls the loading, success, and failure screens shown after subscription checkout. Payment verification and subscription status remain system-generated."
  },
];

// Only Basic gets an upgrade banner — the Premium equivalent
// (PremiumRenewalBanner) was removed from LoggedInHomePage.jsx in the
// investor/expert merge, so there's nothing left for a "Premium Banner"
// tab to control. Removed rather than left pointing at nothing.
// "Landing Page" bundles every section that only lives on Homepage.jsx into
// its subtabs above. Membership & Payment gets its own top-level tab
// because pricing and payment-result screens belong to subscription flow,
// not investor profile setup. The footer stays separate because it appears
// across the whole platform.
const ABOUT_US_SUBTABS = [
  {
    key: "about_hero",
    label: "Page Header",
    icon: Sparkles,
    kind: "generic",
    preview: "about_hero",
    headerId: "about_hero",
    itemsSection: null,
    extraIds: [{ id: "about_hero_para2", label: "Second introduction paragraph" }],
    hint: "Controls the About Us hero image, heading and both introduction paragraphs. Use a line break in the heading to control where it wraps.",
  },
  {
    key: "about_values",
    label: "Values Section",
    icon: ShieldCheck,
    kind: "generic",
    preview: "about_values",
    headerId: "about_values_header",
    itemsSection: "about_values",
    itemsLabel: "Value cards",
    hint: "Controls the Our Values badge and all four value-card titles and descriptions.",
  },
  {
    key: "about_people",
    label: "Team Section",
    icon: Users,
    kind: "generic",
    preview: "about_people",
    headerId: "about_people_header",
    itemsSection: "about_team",
    itemsLabel: "Team members",
    extraIds: [
      { id: "about_people_badge", label: "Section badge" },
      { id: "about_team_role", label: "Role label shown on every team card" },
    ],
    hint: "Controls the team section heading, description, badge, member names, initials and shared role label.",
  },
];

const HELP_CENTER_SUBTABS = [
  {
    key: "help_hero",
    label: "Header & Search",
    icon: HelpCircle,
    kind: "generic",
    preview: "help_hero",
    headerId: "help_hero",
    itemsSection: null,
    extraIds: [{ id: "help_search_placeholder", label: "Search field placeholder" }],
    hint: "Controls the Help Center hero image, heading, subtitle and search placeholder. Use “|” to mark where the gradient-coloured part of the heading begins.",
  },
  {
    key: "help_categories",
    label: "Support Categories",
    icon: BookOpen,
    kind: "generic",
    preview: "help_categories",
    headerId: null,
    itemsSection: "help_categories",
    itemsLabel: "Category filters",
    hint: "Controls the six category names shown below the search field. Each category remains linked to its three FAQ entries by position, so labels can be renamed safely.",
  },
  {
    key: "help_faqs",
    label: "FAQ Section",
    icon: MessageCircleQuestion,
    kind: "generic",
    preview: "help_faqs",
    headerId: "help_faq_header",
    itemsSection: "help_faqs",
    itemsLabel: "Questions and answers",
    extraIds: [
      { id: "help_faq_category_desc", label: "Description shown after selecting a category — keep {category}" },
      { id: "help_empty_heading", label: "No-results heading" },
      { id: "help_empty_desc", label: "No-results description" },
    ],
    hint: "Controls the FAQ heading, descriptions, all 18 questions and answers, and the no-results state.",
  },
  {
    key: "help_contact",
    label: "Contact Support",
    icon: Mail,
    kind: "generic",
    preview: "help_contact",
    headerId: "help_contact_heading",
    itemsSection: null,
    extraIds: [
      { id: "help_contact_desc", label: "Supporting text" },
      { id: "help_contact_cta", label: "Button text" },
      { id: "help_contact_email", label: "Support email address" },
    ],
    hint: "Controls the contact call-to-action shown at the bottom of the Help Center, including the email address used by the button.",
  },
];

const MAIN_TABS = [
  { key: "landing", label: "Landing Page", icon: Rocket, subtabs: LANDING_SUBTABS },
  { key: "membership", label: "Membership & Payment", icon: CreditCard, subtabs: MEMBERSHIP_PAYMENT_SUBTABS },
  { key: "investor_expert_home", label: "Shared Investor + Expert", icon: Wallet, subtabs: INVESTOR_EXPERT_HOME_SUBTABS },
  {
    key: "investor_banners", label: "Basic Upgrade Banner", icon: Wallet, kind: "generic", preview: "banner_basic",
    headerId: "investor_banner_basic", ctaId: "investor_banner_basic_cta", itemsSection: null,
    hint: "Controls the upgrade banner shown only to Basic investors. Premium investors and Expert accounts do not see this banner."
  },
  { key: "investor_pages", label: "Investor Pages", icon: Wallet, subtabs: INVESTOR_PAGES_SUBTABS },
  { key: "investor_setup", label: "Investor Setup & Applications", icon: UserPlus, subtabs: INVESTOR_SETUP_SUBTABS },
  { key: "expert_pages", label: "Expert Pages", icon: Briefcase, subtabs: EXPERT_PAGES_SUBTABS },
  { key: "about_us", label: "About Us", icon: Sparkles, subtabs: ABOUT_US_SUBTABS },
  { key: "help_center", label: "Help Center", icon: HelpCircle, subtabs: HELP_CENTER_SUBTABS },
  {
    key: "terms", label: "Terms of Service", icon: ScrollText, kind: "generic", preview: "legal_hero",
    headerId: "tos_hero", itemsSection: "terms_of_service", itemsLabel: "Numbered sections",
    extraIds: [
      { id: "tos_intro", label: "Introduction paragraph (below the hero)" },
      { id: "tos_last_updated", label: "\"Last updated\" date shown on the page" },
    ],
    hint: "Controls the hero heading/subtitle, the introduction paragraph, the \"Last updated\" date, and every numbered section on the Terms of Service page. In the hero heading, only the last word gets the gradient highlight colour.",
  },
  {
    key: "privacy", label: "Privacy Policy", icon: ShieldCheck, kind: "generic", preview: "legal_hero",
    headerId: "privacy_hero", itemsSection: "privacy_policy", itemsLabel: "Numbered sections",
    extraIds: [
      { id: "privacy_intro", label: "Introduction paragraph (below the hero)" },
      { id: "privacy_last_updated", label: "\"Last updated\" date shown on the page" },
    ],
    hint: "Controls the hero heading/subtitle, the introduction paragraph, the \"Last updated\" date, and every numbered section on the Privacy Policy page. In the hero heading, only the last word gets the gradient highlight colour.",
  },
  {
    key: "footer", label: "Footer", icon: Link2, kind: "footer",
    hint: "Controls the footer brand text, supporting tagline, and footer links displayed across the platform."
  },
];

// Sections where item order is meaningful and can be dragged to reorder.
const ORDERABLE_SECTIONS = new Set([
  "why_investor", "platform_features", "expert_role_benefits",
  "get_started_steps", "faq",
  "free_investor", "premium_investor",
  "footer_product", "footer_company", "footer_contact",
  "investor_home_features", "investor_home_dashboard", "expert_tools", "forum_topics",
  "expert_compensation_page", "expert_documents_page", "expert_knowledge_page", "expert_portfolio_page", "expert_detail_page",
  "become_expert_page", "transaction_history_page", "investor_profile_page",
  "transaction_portal_page", "update_particular_page", "payment_result_page",
]);

// sections/tabs that show the description/subtitle field when editing a card
const DESCRIPTION_SECTIONS = new Set([
  "hero", "page_headers",
  "why_investor", "platform_features", "expert_role_benefits",
  "get_started_steps", "faq",
  "footer_brand", "footer_product", "footer_company", "footer_contact",
  "investor_home_features", "investor_home_dashboard", "expert_tools", "forum_page", "forum_topics",
  "expert_compensation_page", "expert_documents_page", "expert_knowledge_page", "expert_portfolio_page", "expert_detail_page",
  "investor_banner_basic", "investor_banner_premium",
  "about_values", "about_team", "help_faqs",
  "expert_home_features",
  "terms_of_service", "privacy_policy",
]);

const DESCRIPTION_CONTENT_IDS = new Set([
  "help_faq_header",
  "tos_intro", "privacy_intro",
]);

const LONG_TITLE_CONTENT_IDS = new Set([
  "about_hero_para2",
  "help_faq_category_desc",
  "help_empty_desc",
  "help_contact_desc",
]);

// Sections where admins may only edit the description — the card title
// stays fixed so it keeps matching the page it links to.
const TITLE_LOCKED_SECTIONS = new Set([
  "expert_home_features",
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

function HeroPreview({ title, description, ctaPrimary, ctaSecondary, imageUrl }) {
  return (
    <div className="relative overflow-hidden text-center py-10 px-6" style={{ background: "linear-gradient(to bottom, #000000, #172554)" }}>
      <img src={imageUrl || aboutUsImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.35))" }} />
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



function LegalHeroPreview({ title, description, items, icon: Icon = ShieldCheck }) {
  const words = (title || "Page Title").trim().split(" ");
  const lead = words.slice(0, -1).join(" ");
  const highlight = words[words.length - 1] || "";
  return (
    <div className="bg-white">
      <div className="relative overflow-hidden text-center py-9 px-6" style={{ background: "linear-gradient(to bottom right, #020617, #172554, #0f172a)" }}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/5 px-3 py-1 mb-4 text-[9px] font-bold tracking-wide text-cyan-300 uppercase">
          <Icon size={10} /> Legal
        </span>
        <p className="text-xl font-extrabold leading-tight mb-2 text-white">
          {lead ? `${lead} ` : ""}
          <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(to right, #22d3ee, #60a5fa)" }}>
            {highlight}
          </span>
        </p>
        <p className="text-slate-400 text-xs">{description || "Your subtitle goes here"}</p>
      </div>
      {items && items.length > 0 && (
        <div className="p-4 space-y-2">
          {items.slice(0, 3).map((item) => (
            <div key={item.content_id} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-[10px] font-bold text-slate-700">{item.title}</p>
              {item.description && <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>}
            </div>
          ))}
          {items.length > 3 && (
            <p className="text-[9px] text-slate-400 text-center pt-1">+ {items.length - 3} more section{items.length - 3 !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}
    </div>
  );
}

function SimplePagePreview({ heading, description, items }) {
  return (
    <div className="p-6 bg-white">
      <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading || "Page heading"}</p>
      {description && <p className="text-slate-500 text-[10px] mt-1 mb-4">{description}</p>}
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.content_id} className="rounded-lg bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] font-bold text-slate-700">{item.title}</p>
            {item.description && <p className="text-[9px] text-slate-500 mt-0.5">{item.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function ForumTopicTile({ topic, count = 0, latest = false, compact = false }) {
  const title = topic?.title || "Topic name";
  const description = topic?.description || "";
  const imageUrl = topic?.image_url || "";

  return (
    <div
      className="overflow-hidden text-left"
      style={{
        borderRadius: compact ? 12 : 14,
        border: "1px solid rgba(11,29,79,0.25)",
        background: "#FFFFFF",
        boxShadow: compact ? "none" : "0 6px 14px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ height: compact ? 58 : 78, overflow: "hidden", background: "#F1F5F9", position: "relative" }}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #E0F2FE, #EEF2FF)",
            }}
          >
            <Hash size={compact ? 16 : 20} color="#5B6C88" />
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(13,21,38,0.68) 0%, transparent 62%)" }} />
      </div>
      <div style={{ padding: compact ? "8px 9px" : "10px 12px" }}>
        <p style={{ fontSize: compact ? 10 : 12, fontWeight: 800, color: "#0F172A", lineHeight: 1.25, margin: 0 }}>
          {title}
        </p>
        {!compact && description && (
          <p style={{ fontSize: 10, color: "#5B6C88", lineHeight: 1.35, margin: "4px 0 0", minHeight: 26 }}>
            {description}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: compact ? 5 : 8 }}>
          <span style={{ fontSize: compact ? 9 : 11, color: "#5B6C88" }}>{count} post{count !== 1 ? "s" : ""}</span>
          {latest && <span style={{ fontSize: compact ? 8 : 10, color: "#00A9C4", fontWeight: 700 }}>Active</span>}
        </div>
      </div>
    </div>
  );
}

function ForumSectionHeading({ icon, label, noMargin = false }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: noMargin ? 0 : 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,211,242,0.12)", color: "#00D3F2" }}>
        {icon}
      </span>
      <span style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{label}</span>
    </div>
  );
}

function ForumPostPreviewCard({ title, category, author = "RocketTrade User", likes = 12, replies = 4, views = 88 }) {
  return (
    <div style={{ borderRadius: 14, background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)", padding: 12 }}>
      <div className="flex items-start gap-2">
        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#155dfc,#0092b8)", color: "white", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          RT
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 12, fontWeight: 800, color: "#0F172A", margin: 0, lineHeight: 1.25 }}>{title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span style={{ fontSize: 9, fontWeight: 700, color: "#0E7490", background: "rgba(0,211,242,0.10)", border: "1px solid rgba(0,211,242,0.25)", borderRadius: 999, padding: "1px 6px" }}>{category}</span>
            <span style={{ fontSize: 9, color: "#5B6C88" }}>by {author}</span>
          </div>
          <div className="flex items-center gap-3 mt-2" style={{ color: "#5B6C88", fontSize: 10 }}>
            <span className="inline-flex items-center gap-1"><Heart size={10} /> {likes}</span>
            <span className="inline-flex items-center gap-1"><MessageCircleQuestion size={10} /> {replies}</span>
            <span className="inline-flex items-center gap-1"><Eye size={10} /> {views}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ForumOverviewPreview({ heading, description, ctaLabel, extras = {}, topics = [] }) {
  const topicList = topics.length ? topics : [
    { content_id: "ph1", title: "Technical Analysis", description: "Discuss charts and setups." },
    { content_id: "ph2", title: "AI Predictions", description: "Talk about forecasts." },
    { content_id: "ph3", title: "Portfolio Strategy", description: "Share portfolio ideas." },
  ];
  const topicLabels = ["All", ...topicList.slice(0, 5).map((topic) => topic.title || "Topic")];

  return (
    <div style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 800, letterSpacing: "0.04em", color: "#0B1D4F", margin: 0, lineHeight: 1 }}>
            {heading || "Community Forum"}
          </p>
          <p style={{ fontSize: 11, color: "#33477A", margin: "5px 0 0" }}>
            {description || "Share ideas, discuss markets, and learn from the community"}
          </p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 13px", borderRadius: 999, background: "#00D3F2", color: "#004450", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 4px 14px rgba(0,211,242,0.35)" }}>
          <Plus size={12} /> {ctaLabel || "New Post"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, overflow: "hidden", marginBottom: 14 }}>
        {topicLabels.map((label, index) => (
          <span
            key={`${label}-${index}`}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: "nowrap",
              border: index === 0 ? "none" : "1px solid rgba(11,29,79,0.3)",
              background: index === 0 ? "#00D3F2" : "transparent",
              color: index === 0 ? "#004450" : "#0B1D4F",
            }}
          >
            {label}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={12} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#5B6C88" }} />
          <div style={{ height: 36, borderRadius: 12, border: "1px solid rgba(11,29,79,0.25)", background: "#FFFFFF", paddingLeft: 32, display: "flex", alignItems: "center", color: "#5B6C88", fontSize: 11 }}>
            {extras.forum_search_placeholder?.title || "Search posts, topics, authors…"}
          </div>
        </div>
        <div style={{ width: 92, height: 36, borderRadius: 12, border: "1px solid rgba(11,29,79,0.25)", background: "#FFFFFF", color: "#0F172A", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
          Home
        </div>
      </div>

      <section style={{ marginBottom: 18 }}>
        <ForumSectionHeading icon={<Flame size={13} />} label={extras.forum_trending_label?.title || "Trending Right Now"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <ForumPostPreviewCard title="How are you reading this week's market move?" category={topicList[0]?.title || "Technical Analysis"} />
          <ForumPostPreviewCard title="AI forecast accuracy discussion" category={topicList[1]?.title || "AI Predictions"} likes={8} replies={3} views={51} />
        </div>
      </section>

      <section style={{ marginBottom: 18 }}>
        <ForumSectionHeading icon={<Users size={13} />} label={extras.forum_activity_label?.title || "My Activity"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
          {[
            [Star, "Saved Posts", 2, "#0E7490"],
            [Heart, "Liked Posts", 5, "#DC2626"],
            [FileText, "My Posts", 1, "#7C3AED"],
            [MessageSquare, "Commented", 3, "#0F9D58"],
          ].map(([Icon, label, value, color]) => (
            <div key={label} style={{ borderRadius: 14, background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)", padding: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8, background: `${color}1F` }}>
                <Icon size={14} color={color} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#0F172A" }}>{value}</div>
              <div style={{ fontSize: 9, color: "#5B6C88", marginTop: 1 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 18 }}>
        <ForumSectionHeading icon={<BookOpen size={13} />} label={extras.forum_topics_label?.title || "Browse by Topic"} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
          {topicList.slice(0, 6).map((topic, index) => (
            <ForumTopicTile key={topic.content_id || index} topic={topic} count={[6, 4, 9, 3, 2, 5][index] ?? 1} latest={index < 3} compact />
          ))}
        </div>
      </section>

      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <ForumSectionHeading icon={<Clock size={13} />} label={extras.forum_latest_label?.title || "Latest Posts"} noMargin />
          <span style={{ fontSize: 10, color: "#00A9C4", fontWeight: 800 }}>{extras.forum_latest_cta?.title || "See all →"}</span>
        </div>
        <div className="space-y-2">
          <ForumPostPreviewCard title="What are your favourite defensive sectors?" category={topicList[2]?.title || "Portfolio Strategy"} likes={4} replies={2} views={34} />
        </div>
      </section>
    </div>
  );
}

function ForumTopicsPreview({ heading, topics = [] }) {
  const shown = topics.length ? topics : [
    { content_id: "ph1", title: "Technical Analysis", description: "Discuss charts, indicators, price action, and trading setups." },
    { content_id: "ph2", title: "AI Predictions", description: "Talk about AI forecasts, model signals, and prediction confidence." },
    { content_id: "ph3", title: "Portfolio Strategy", description: "Share asset allocation ideas, diversification plans, and portfolio reviews." },
  ];

  return (
    <div style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)", padding: 18 }}>
      <ForumSectionHeading icon={<BookOpen size={13} />} label={heading || "Browse by Topic"} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {shown.map((topic, index) => (
          <ForumTopicTile key={topic.content_id || index} topic={topic} count={[6, 4, 9, 3, 2, 5, 7, 1, 2, 4, 3, 2][index] ?? 1} latest={index < 4} />
        ))}
      </div>
    </div>
  );
}




function cmItem(items, id, fallbackTitle = "", fallbackDescription = "") {
  const found = items.find((item) => item.content_id === id);
  return {
    title: found?.title || fallbackTitle,
    description: found?.description || fallbackDescription,
    image_url: found?.image_url || "",
  };
}

function InvestorPageShellPreview({ heading, description, children }) {
  return (
    <div style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 74px, #FFFFFF 100%)", padding: 14 }}>
      {(heading || description) && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 800, letterSpacing: "0.04em", color: "#0B1D4F", margin: 0 }}>{heading}</p>
          {description && <p style={{ fontSize: 9, color: "#33477A", margin: "3px 0 0" }}>{description}</p>}
          <div style={{ height: 1, background: "rgba(15,23,42,0.12)", marginTop: 8 }} />
        </div>
      )}
      {children}
    </div>
  );
}

function AIChatbotPagePreview({ heading, description }) {
  return (
    <div className="p-3" style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 74px, #FFFFFF 100%)" }}>
      <div className="grid grid-cols-[88px_1fr] gap-2" style={{ height: 230 }}>
        <div className="rounded-xl p-2 text-white" style={{ background: "#0B1D4F", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="flex items-center gap-1.5 mb-3"><span className="w-5 h-5 rounded-full bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center"><Bot size={11} /></span><span className="text-[8px] font-bold">AI Assistant</span></div>
          <p className="text-[7px] uppercase tracking-wide text-white/30 mb-1">Suggested</p>
          {["Market summary", "Stock analysis", "Trading basics"].map((x) => <div key={x} className="rounded-md bg-white/5 border border-white/10 px-1.5 py-1 text-[7px] text-white/70 mb-1">{x}</div>)}
          <p className="text-[7px] uppercase tracking-wide text-white/30 mt-3 mb-1">Topics</p>
          {["Stock Analysis", "AI & Predictions", "Investing Basics"].map((x) => <div key={x} className="text-[7px] text-white/45 py-0.5">{x}</div>)}
        </div>
        <div className="rounded-xl overflow-hidden flex flex-col text-white" style={{ background: "#0B1D4F", border: "1px solid rgba(255,255,255,0.1)" }}>
          <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center"><Bot size={14} /></span>
            <span><p className="text-[10px] font-bold m-0">{heading || "RocketTrade AI Assistant"}</p><p className="text-[7px] text-white/45 m-0">{description}</p></span>
          </div>
          <div className="flex-1 p-3 space-y-2">
            <div className="w-2/3 rounded-xl rounded-bl-sm bg-white/10 border border-white/10 px-2 py-1.5 text-[8px] text-white/80">Hi, how can I help with your portfolio today?</div>
            <div className="ml-auto w-1/2 rounded-xl rounded-br-sm bg-cyan-500/20 border border-cyan-400/30 px-2 py-1.5 text-[8px] text-white">Explain AAPL's trend</div>
          </div>
          <div className="p-2 border-t border-white/10 flex gap-1.5"><div className="flex-1 rounded-lg bg-cyan-400/5 border border-cyan-400/20 px-2 py-1.5 text-[8px] text-white/30">Ask about a stock…</div><span className="w-7 h-7 rounded-lg bg-linear-to-br from-blue-600 to-cyan-600 flex items-center justify-center"><MessageSquare size={11} /></span></div>
        </div>
      </div>
    </div>
  );
}

function PortfolioOverviewPagePreview({ heading, description }) {
  return (
    <InvestorPageShellPreview heading={heading} description={description}>
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        {["Total portfolio value", "Available funds", "Unrealized P&L", "Realized P&L"].map((label, i) => <div key={label} className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[7px] text-slate-500 m-0">{label}</p><p className={`text-[10px] font-bold m-0 ${i === 0 ? "text-cyan-700" : "text-slate-900"}`}>{i === 2 ? "+$124.50" : "$2,000.00"}</p></div>)}
      </div>
      <div className="grid grid-cols-[1.5fr_1fr] gap-2 mb-2">
        <div className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[8px] text-slate-500 mb-2">Cumulative P&L, last 30 days</p><div className="h-16 rounded bg-cyan-50 border border-cyan-100 relative overflow-hidden"><div className="absolute bottom-3 left-3 right-3 h-7 border-b-2 border-cyan-500 rounded-[50%]" /></div></div>
        <div className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[8px] text-slate-500 mb-2">Diversification</p><div className="w-16 h-16 rounded-full border-12px border-cyan-300 mx-auto" /></div>
      </div>
      <div className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[8px] text-slate-500 mb-1">Current holdings</p><div className="grid grid-cols-6 gap-1 text-[7px] text-slate-500 border-b pb-1"><span>Symbol</span><span>Shares</span><span>Avg cost</span><span>Price</span><span>Value</span><span>P&L</span></div>{["AAPL", "NVDA"].map((s) => <div key={s} className="grid grid-cols-6 gap-1 text-[8px] py-1 border-b border-slate-100"><b>{s}</b><span>3</span><span>$180</span><span>$190</span><span>$570</span><span className="text-emerald-600">+$30</span></div>)}</div>
    </InvestorPageShellPreview>
  );
}

function QuantRatingPagePreview({ heading, description }) {
  return (
    <InvestorPageShellPreview heading={heading} description={description}>
      <div className="flex gap-2 mb-2"><div className="flex-1 rounded-lg bg-white border border-blue-100 px-2 py-1.5 text-[8px] text-slate-400">Enter ticker (e.g. AAPL)</div><span className="rounded-lg bg-cyan-400 px-3 py-1.5 text-[8px] font-bold text-cyan-950">Rate</span></div>
      <div className="flex flex-wrap gap-1 mb-3">{["Technology", "Financials", "Energy", "Real Estate"].map(s => <span key={s} className="rounded-full bg-white border border-blue-100 px-2 py-1 text-[7px] text-slate-600">{s}</span>)}</div>
      <div className="grid grid-cols-[1fr_1.6fr] gap-2">
        <div className="rounded-xl bg-white border border-emerald-200 p-3 text-center"><p className="text-left text-[12px] font-bold text-slate-900">AAPL</p><div className="mx-auto my-2 w-24 h-12 rounded-t-full border-10px border-b-0 border-emerald-500" /><span className="rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold px-2 py-1">Buy</span><div className="grid grid-cols-2 gap-1 mt-3 text-[7px]"><span>Buy probability<br /><b>64%</b></span><span>Price<br /><b>$190.00</b></span></div></div>
        <div className="space-y-2"><div className="rounded-xl bg-white border border-blue-100 p-3"><p className="text-[10px] font-bold text-slate-900 mb-2">Factor Grades</p><div className="grid grid-cols-5 gap-1">{["A", "B", "C", "B", "A"].map((g, i) => <div key={i} className="rounded-lg bg-slate-50 text-center py-2"><b className="text-emerald-600">{g}</b><p className="text-[6px] text-slate-500 m-0">Factor</p></div>)}</div></div><div className="rounded-xl bg-white border border-blue-100 p-3"><p className="text-[10px] font-bold text-slate-900 mb-2">Sector Leaderboard</p>{["NVDA", "MSFT", "AAPL"].map((s, i) => <div key={s} className="grid grid-cols-4 text-[8px] py-1 border-b border-slate-100"><span>#{i + 1}</span><b>{s}</b><span>{85 - i * 4}</span><span>Buy</span></div>)}</div></div>
      </div>
    </InvestorPageShellPreview>
  );
}

function TransactionPortalPagePreview({ heading, description, items }) {
  const historyCta = cmItem(items, "transaction_portal_history_cta", "View History →").title;
  return (
    <InvestorPageShellPreview heading={heading} description={description}>
      <div className="flex justify-end mb-2"><span className="rounded-lg bg-white border border-blue-100 px-2 py-1 text-[8px] text-slate-800">{historyCta}</span></div>
      <div className="grid grid-cols-5 gap-1.5 mb-2">{["Total Trades", "Total Invested", "Total Proceeds", "Realised P&L", "Most Traded"].map((label, i) => <div key={label} className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[6px] uppercase text-slate-500 m-0">{label}</p><b className="text-[9px] text-slate-900">{i === 4 ? "AAPL" : "$1,200"}</b></div>)}</div>
      <div className="rounded-lg bg-white border border-blue-100 p-2"><div className="flex gap-1 mb-2"><span className="flex-1 rounded bg-slate-100 px-2 py-1 text-[7px] text-slate-400">Search ticker…</span>{["all", "buy", "sell"].map(x => <span key={x} className="rounded bg-slate-100 px-2 py-1 text-[7px] text-slate-500">{x}</span>)}</div><div className="grid grid-cols-6 text-[7px] text-slate-500 bg-slate-100 p-1 rounded"><span>Date</span><span>Symbol</span><span>Type</span><span>Qty</span><span>Price</span><span>Total</span></div>{["AAPL", "NVDA"].map((s) => <div key={s} className="grid grid-cols-6 text-[8px] py-1 border-b border-slate-100"><span>23 Jul</span><b>{s}</b><span>buy</span><span>2</span><span>$190</span><span>$380</span></div>)}</div>
    </InvestorPageShellPreview>
  );
}

function TransactionHistoryPagePreview({ heading, description, items }) {
  const emptyHeading = cmItem(items, "transaction_history_empty_heading", "No transactions yet").title;
  const emptyDesc = cmItem(items, "transaction_history_empty_desc", "Start trading to see your history here").title;
  const emptyCta = cmItem(items, "transaction_history_empty_cta", "Go to Markets").title;
  return (
    <InvestorPageShellPreview heading={heading} description={description}>
      <div className="grid grid-cols-4 gap-1.5 mb-2">{["Showing", "Buy volume", "Sell volume", "Net P&L"].map((label, i) => <div key={label} className="rounded-lg bg-white border border-blue-100 p-2"><p className="text-[7px] text-slate-500 m-0">{label}</p><b className="text-[9px] text-slate-900">{i === 0 ? "0 trades" : "$0.00"}</b></div>)}</div>
      <div className="rounded-lg bg-white border border-blue-100 p-3 text-center"><FileText size={22} className="mx-auto text-cyan-500/40 mb-2" /><p className="text-[10px] font-bold text-slate-700">{emptyHeading}</p><p className="text-[8px] text-slate-500 mb-2">{emptyDesc}</p><span className="rounded-lg bg-cyan-100 text-cyan-800 px-3 py-1 text-[8px] font-bold">{emptyCta}</span></div>
    </InvestorPageShellPreview>
  );
}

function InvestorProfilePagePreview({ items }) {
  const personal = cmItem(items, "investor_profile_personal_info_heading", "Personal Information").title;
  const settings = cmItem(items, "investor_profile_account_settings_heading", "Account Settings").title;
  return (
    <div className="p-3" style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 74px, #FFFFFF 100%)" }}>
      <div className="grid grid-cols-[100px_1fr] gap-2">
        <div className="rounded-xl bg-white border border-blue-100 overflow-hidden"><div className="h-12 bg-linear-to-br from-slate-950 via-blue-900 to-cyan-600" /><div className="p-3 -mt-5"><div className="w-9 h-9 rounded-full bg-linear-to-br from-cyan-500 to-blue-600 border-4 border-white text-white text-xs font-bold flex items-center justify-center">QA</div><p className="text-[10px] font-bold text-slate-900 mt-2">QA Investor</p><p className="text-[7px] text-slate-500">@qa_basic</p>{["Personal Information", "Account Settings", "Security", "Paper Money", "Subscription"].map((x, i) => <div key={x} className={`rounded-md px-2 py-1 text-[7px] mt-1 ${i === 0 ? "bg-cyan-50 text-cyan-700 border border-cyan-200" : "text-slate-500"}`}>{x}</div>)}</div></div>
        <div className="space-y-2"><div className="rounded-xl bg-white border border-blue-100 p-3"><div className="flex justify-between"><p className="text-[11px] font-bold text-slate-900">{personal}</p><span className="text-[8px] text-cyan-600">Edit</span></div><p className="text-[8px] text-slate-500 mb-2">Your name, contact details and bio</p><div className="grid grid-cols-2 gap-2 text-[8px]"><span>Full Name<br /><b>QA Investor</b></span><span>Email<br /><b>qa@example.com</b></span><span>Location<br /><b>Singapore</b></span><span>Phone<br /><b>+65 9123 4567</b></span></div></div><div className="rounded-xl bg-white border border-blue-100 p-3"><p className="text-[11px] font-bold text-slate-900">{settings}</p><p className="text-[8px] text-slate-500">Stock interests and account type</p><div className="flex gap-1 mt-2"><span className="rounded-full bg-cyan-50 text-cyan-700 px-2 py-1 text-[7px]">Technology</span><span className="rounded-full bg-cyan-50 text-cyan-700 px-2 py-1 text-[7px]">Moderate</span></div></div></div>
      </div>
    </div>
  );
}

function BecomeExpertPagePreview({ heading, description, items }) {
  const eligibleHeading = cmItem(items, "become_expert_eligible_heading", "You meet the requirements!").title;
  const eligibleDesc = cmItem(items, "become_expert_eligible_desc", "Apply now and upload supporting documents for review.").title;
  const eligibleCta = cmItem(items, "become_expert_eligible_cta", "Apply to Become an Expert →").title;
  return (
    <InvestorPageShellPreview heading={heading} description={description}>
      <div className="grid grid-cols-2 gap-2 mb-2"><div className="rounded-lg bg-white border border-blue-100 p-3"><BarChart3 size={14} className="text-cyan-700 mb-1" /><p className="text-[8px] font-bold text-slate-900">Different Stocks Traded</p><p className="text-[13px] font-bold text-slate-900">30 <span className="text-[8px] text-slate-500">/ 30</span></p><div className="h-1.5 bg-emerald-500 rounded" /></div><div className="rounded-lg bg-white border border-blue-100 p-3"><TrendingUp size={14} className="text-cyan-700 mb-1" /><p className="text-[8px] font-bold text-slate-900">Profit Margin</p><p className="text-[13px] font-bold text-slate-900">200% <span className="text-[8px] text-slate-500">/ 200%</span></p><div className="h-1.5 bg-emerald-500 rounded" /></div></div>
      <div className="rounded-lg bg-white border border-blue-100 p-4 text-center"><p className="text-[11px] font-bold text-slate-900">{eligibleHeading}</p><p className="text-[8px] text-slate-500 mt-1">{eligibleDesc}</p><span className="inline-block mt-2 rounded-lg bg-cyan-400 px-3 py-1.5 text-[8px] font-bold text-cyan-950">{eligibleCta}</span></div>
    </InvestorPageShellPreview>
  );
}

function UpdateParticularPagePreview({ items }) {
  const heading = cmItem(items, "update_particular_heading", "Welcome, {username}! 👋").title.replace("{username}", "qa_basic");
  const subtitle = cmItem(items, "update_particular_desc", "Let's set up your profile before you start trading.").title;
  const submit = cmItem(items, "update_particular_submit_cta", "Get Started →").title;
  const skip = cmItem(items, "update_particular_skip_cta", "Skip for now").title;
  return (
    <div className="p-5 flex items-center justify-center" style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 74px, #FFFFFF 100%)" }}>
      <div className="w-full max-w-62.5 rounded-2xl bg-white border border-blue-100 shadow p-4 text-center"><p className="text-[14px] font-bold text-slate-900 font-mono">{heading}</p><p className="text-[8px] text-slate-500 mb-3">{subtitle}</p>{["Full Name", "Phone Number", "Location"].map(x => <div key={x} className="text-left mb-2"><p className="text-[7px] font-bold text-slate-500 mb-1">{x}</p><div className="h-7 rounded-lg bg-white border border-slate-200" /></div>)}<p className="text-left text-[7px] font-bold text-slate-500 mb-1">Stock Interests</p><div className="grid grid-cols-2 gap-1 mb-2">{["Technology", "Financials", "Energy", "Real Estate"].map(x => <span key={x} className="rounded-lg bg-slate-100 px-2 py-1 text-[7px] text-slate-500 text-left">{x}</span>)}</div><div className="rounded-xl bg-linear-to-r from-cyan-600 to-blue-600 text-white py-2 text-[9px] font-bold">{submit}</div><p className="text-[8px] text-slate-400 mt-2">{skip}</p></div>
    </div>
  );
}

function PaymentResultPagePreview({ items }) {
  const successHeading = cmItem(items, "payment_success_heading", "Payment Successful").title;
  const successDesc = cmItem(items, "payment_success_desc", "Your subscription is now active.").title;
  const failHeading = cmItem(items, "payment_fail_heading", "Payment Failed").title;
  const failDesc = cmItem(items, "payment_fail_desc", "Please try again.").title;
  return (
    <div className="p-5" style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 74px, #FFFFFF 100%)" }}>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white border border-blue-100 p-4 text-center"><CheckCircle2 size={24} className="mx-auto text-emerald-600 mb-2" /><p className="text-[12px] font-bold text-emerald-600 font-mono">{successHeading}</p><p className="text-[8px] text-slate-500">{successDesc}</p></div>
        <div className="rounded-xl bg-white border border-blue-100 p-4 text-center"><X size={24} className="mx-auto text-red-600 mb-2" /><p className="text-[12px] font-bold text-red-600 font-mono">{failHeading}</p><p className="text-[8px] text-slate-500">{failDesc}</p></div>
      </div>
    </div>
  );
}

function AboutHeroPreview({ title, description, para2, imageUrl }) {
  const lines = (title || "").split("\n");
  return (
    <div className="relative overflow-hidden px-5 py-12 text-center text-white">
      <img
        src={imageUrl || aboutUsImg}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: "blur(3px)" }}
      />
      <div className="absolute inset-0 bg-blue-950/80" />
      <div className="relative mx-auto max-w-xl">
        <p className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
          {lines.map((line, i) => (
            <span key={`${line}-${i}`} className="block">{line}</span>
          ))}
        </p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="h-0.5 w-10 rounded-full bg-cyan-400" />
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
        </div>
        <p className="mx-auto mt-5 max-w-lg text-[10px] leading-5 text-slate-300">{description}</p>
        <p className="mx-auto mt-3 max-w-lg text-[10px] leading-5 text-slate-300">{para2}</p>
      </div>
    </div>
  );
}

function AboutValuesPreview({ heading, items, imageUrl }) {
  const shown = items.length
    ? items
    : [{ content_id: "ph", title: "Value", description: "Value description" }];

  return (
    <div className="relative overflow-hidden p-5 text-white">
      <img src={imageUrl || aboutUsImg} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover" style={{ filter: "blur(3px)" }} />
      <div className="absolute inset-0 bg-blue-950/80" />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-3 py-1.5 text-[8px] font-bold tracking-wider text-cyan-400">
          <Sparkles size={10} />
          {(heading || "Our Values").toUpperCase()}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {shown.map((item, i) => {
            const Icon = ABOUT_VALUE_ICONS[i] || ShieldCheck;
            return (
              <article key={item.content_id} className="min-h-32 rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
                <div className="mb-2 grid h-8 w-8 place-items-center rounded-full border border-cyan-400/40 bg-cyan-50 text-cyan-600">
                  <Icon size={15} strokeWidth={1.8} />
                </div>
                <p className="text-[10px] font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-[8px] leading-4 text-slate-600">{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AboutPeoplePreview({ badge, heading, description, roleLabel, items, imageUrl }) {
  const shown = items.length
    ? items
    : [{ content_id: "ph", title: "Team Member", description: "TM" }];

  return (
    <div className="relative overflow-hidden p-5 text-white">
      <img src={imageUrl || aboutUsImg} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover" style={{ filter: "blur(3px)" }} />
      <div className="absolute inset-0 bg-blue-950/80" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/60 bg-cyan-400/5 px-3 py-1.5 text-[8px] font-bold tracking-wider text-cyan-400">
          <Users size={10} />
          {badge || "OUR PEOPLE"}
        </div>
        <p className="mt-4 text-lg font-bold">{heading}</p>
        <p className="mt-2 text-[9px] leading-4 text-slate-400">{description}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {shown.map((item) => (
            <article key={item.content_id} className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-md">
              <div className="relative mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full border border-cyan-400/50 bg-linear-to-br from-cyan-500/20 to-blue-600/20 text-[10px] font-bold text-cyan-700">
                {item.description}
                <span className="absolute inset-1 rounded-full border border-cyan-400/10" />
              </div>
              <p className="text-[9px] font-semibold leading-4 text-slate-800">{item.title}</p>
              <p className="mt-1 text-[6px] font-medium tracking-wider text-cyan-600">
                {roleLabel || "ROCKET TRADE TEAM"}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function HelpCategoryRow({ items }) {
  const shown = items.length
    ? items
    : [{ content_id: "ph", title: "Support Category" }];

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {shown.map((item, i) => {
        const Icon = HELP_CATEGORY_ICONS[i] || HelpCircle;
        return (
          <div
            key={item.content_id}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border bg-white px-2 py-1.5 shadow-md ${i === 0 ? "border-cyan-400" : "border-slate-200"
              }`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-cyan-400/40 bg-cyan-50 text-cyan-600">
              <Icon size={11} strokeWidth={1.8} />
            </span>
            <span className="whitespace-nowrap text-[7px] font-semibold text-slate-800">{item.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function HelpHeroPreview({ title, description, imageUrl, searchPlaceholder, categories }) {
  const [plain, accent] = (title || "").includes("|")
    ? title.split("|")
    : ["", title];

  return (
    <div className="relative overflow-hidden px-4 py-10 text-center text-white">
      <img
        src={imageUrl || helpCenterImg}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: "blur(3px)" }}
      />
      <div className="absolute inset-0 bg-blue-950/80" />
      <div className="relative mx-auto max-w-xl">
        <p className="text-xl font-bold tracking-tight">
          {plain}{plain && " "}
          <span className="bg-linear-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">{accent}</span>
        </p>
        <p className="mx-auto mt-3 max-w-md text-[9px] leading-4 text-slate-200">{description}</p>
        <div className="relative mx-auto mt-5 max-w-md">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
          <div className="flex h-9 items-center rounded-3xl border border-blue-500/40 bg-slate-950/85 pl-9 pr-3 text-left text-[8px] text-slate-400 shadow-lg">
            {searchPlaceholder || "Search for help..."}
          </div>
        </div>
        <div className="mt-4">
          <HelpCategoryRow items={categories} />
        </div>
      </div>
    </div>
  );
}

function HelpCategoriesPreview({ items, imageUrl }) {
  return (
    <div className="relative overflow-hidden px-4 py-8">
      <img
        src={imageUrl || helpCenterImg}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: "blur(3px)" }}
      />
      <div className="absolute inset-0 bg-blue-950/80" />
      <div className="relative">
        <HelpCategoryRow items={items} />
      </div>
    </div>
  );
}

function HelpFaqPreview({
  heading,
  description,
  categoryDescription,
  emptyHeading,
  emptyDescription,
  categories,
  items,
  showCategoryState,
  showEmptyState,
}) {
  const selectedCategory = categories[0]?.title || "Account & Login";
  const subtext = showCategoryState
    ? (categoryDescription || "Showing questions related to {category}.").replace("{category}", selectedCategory)
    : description;

  return (
    <div className="max-h-140 overflow-y-auto bg-white p-5">
      <p className="text-center text-base font-bold text-slate-900">{heading}</p>
      <p className="mt-2 text-center text-[9px] leading-4 text-slate-600">{subtext}</p>

      {showEmptyState ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
          <HelpCircle size={24} className="mx-auto text-cyan-600" />
          <p className="mt-3 text-[11px] font-semibold text-slate-800">{emptyHeading}</p>
          <p className="mt-1 text-[9px] leading-4 text-slate-600">{emptyDescription}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map((item, index) => {
            const isOpen = index === 0;
            return (
              <article
                key={item.content_id}
                className={`overflow-hidden rounded-xl border bg-white shadow-md ${isOpen ? "border-cyan-400" : "border-slate-200"
                  }`}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-cyan-600">Q.</span>
                    <span className="text-[9px] font-medium text-slate-800">{item.title}</span>
                  </div>
                  <ChevronDown size={13} className={`shrink-0 text-cyan-600 ${isOpen ? "rotate-180" : ""}`} />
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 px-3 py-3">
                    <p className="text-[8px] leading-4 text-slate-600">{item.description}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HelpContactPreview({ heading, description, cta, email }) {
  return (
    <div className="bg-white p-7 text-center">
      <div className="mx-auto mb-6 max-w-xs border-t border-blue-500/20" />
      <p className="text-base font-bold text-slate-900">{heading}</p>
      <p className="mt-2 text-[9px] leading-4 text-slate-600">{description}</p>
      <a
        href={`mailto:${email}`}
        onClick={(event) => event.preventDefault()}
        className="mt-5 inline-flex h-9 items-center justify-center rounded-xl bg-linear-to-r from-cyan-400 to-blue-500 px-5 text-[9px] font-bold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
      >
        {cta}
      </a>
    </div>
  );
}

function ExpertHeroPreview({ title, imageUrl }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 140 }}>
      <img src={imageUrl || professorPageImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
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

function EmptyPortfolioMessagePreview({ title, imageUrl }) {
  return (
    <div className="relative overflow-hidden" style={{ height: 140 }}>
      <img src={imageUrl || investorLoggedInImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
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

function VideoPreview({ heading, description, videoUrl }) {
  const embedUrl = toEmbeddableVideoUrl(videoUrl);
  return (
    <div className="p-6 bg-white">
      <div className="text-center mb-4">
        <p className="text-slate-900 text-sm font-extrabold leading-tight">{heading}</p>
        <p className="text-slate-400 text-[10px] mt-0.5">{description}</p>
      </div>
      {videoUrl ? (
        embedUrl ? (
          <iframe
            src={embedUrl}
            title="Video preview"
            className="aspect-video w-full rounded-xl border border-cyan-400/30"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={videoUrl} controls className="aspect-video w-full rounded-xl border border-cyan-400/30 bg-black" />
        )
      ) : (
        <div className="relative aspect-video w-full rounded-xl border border-cyan-400/30 bg-slate-900 flex items-center justify-center">
          <span className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center">
            <PlayCircle className="text-white" size={16} />
          </span>
        </div>
      )}
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
        <p className="text-slate-500 text-[10px] mb-4 max-w-55">{description || "Empty-state description"}</p>
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

function MembershipCard({ badge, badgeClass, name, price, sub, features, highlight, cta }) {
  return (
    <div className={`flex-1 rounded-xl border-2 p-5 ${highlight ? "border-amber-300 bg-amber-50" : "border-blue-200 bg-blue-50"}`}>
      <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 ${badgeClass}`}>{badge}</span>
      <p className="text-sm font-semibold text-slate-900 mb-0.5">{name || "Plan"}</p>
      <p className="text-2xl font-extrabold text-slate-800 mb-0.5">{price || "$0"}</p>
      <p className="text-[10px] text-slate-400 mb-3">{sub}</p>
      <div className="h-px bg-slate-200 mb-3" />
      <ul className="space-y-1.5 mb-3">
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
      <span className={`block text-center py-1.5 rounded-lg text-[10px] font-bold text-white ${highlight ? "bg-amber-500" : "bg-blue-600"}`}>{cta}</span>
    </div>
  );
}

function MembershipPreview({ heading, description, freeName, freePrice, freePriceSub, freeCta, premName, premPrice, premPriceSub, premCta, freeFeatures, premFeatures }) {
  return (
    <div className="bg-slate-50">
      {(heading || description) && (
        <div className="text-center pt-5 px-4">
          <p className="text-slate-800 text-sm font-extrabold leading-tight">{heading}</p>
          <p className="text-slate-500 text-[10px] mt-0.5">{description}</p>
        </div>
      )}
      <div className="p-5 flex gap-3">
        <MembershipCard badge="Free" badgeClass="bg-blue-100 text-blue-700" name={freeName} price={freePrice} sub={freePriceSub} cta={freeCta} features={freeFeatures} />
        <MembershipCard badge="\u2b50 Premium" badgeClass="bg-amber-100 text-amber-700" name={premName} price={premPrice} sub={premPriceSub} cta={premCta} features={premFeatures} highlight />
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

function FooterPreview({ brand, brandTagline, version, product, company, contact }) {
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
        <FooterCol label="Contact" items={contact} />
      </div>
    </div>
  );
}

function ContentManagementPage() {
  const [content, setContent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", video_url: "" });
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
    let cancelled = false;

    const loadInitialContent = async () => {
      try {
        const res = await authFetch(API);
        const data = await res.json();
        if (!cancelled && data.success) setContent(data.content);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadInitialContent();
    return () => { cancelled = true; };
  }, []);

  const startEdit = (item) => {
    setEditing(item.content_id);
    setForm({ title: item.title, description: item.description || "", image_url: item.image_url || "", video_url: item.video_url || "" });
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

  const addItem = async (section) => {
    setSaving(true);
    try {
      const res = await authFetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, title: "New item", description: "" }),
      });
      const data = await res.json();
      if (data.success && data.content) {
        setContent((prev) => [...prev, data.content]);
        setEditing(data.content.content_id);
        setForm({ title: data.content.title, description: data.content.description || "", image_url: "", video_url: "" });
      } else {
        alert(data.message || "Failed to add item");
      }
    } catch {
      alert("Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (content_id) => {
    if (!window.confirm("Remove this item? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API}/${content_id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setContent((prev) => prev.filter((c) => c.content_id !== content_id));
        if (editing === content_id) setEditing(null);
      } else {
        alert(data.message || "Failed to remove item");
      }
    } catch {
      alert("Failed to remove item");
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

  const freePlanInfo = bySection("free_plan");
  const premiumPlanInfo = bySection("premium_plan");
  const freeItems = bySection("free_investor");
  const premiumItems = bySection("premium_investor");
  const footerBrand = bySection("footer_brand");
  const footerProduct = bySection("footer_product");
  const footerCompany = bySection("footer_company");
  const footerContact = bySection("footer_contact");

  const currentMainTab = MAIN_TABS.find((t) => t.key === activeMainTab);
  const activeTabInfo = currentMainTab?.subtabs
    ? currentMainTab.subtabs.find((t) => t.key === activeSubTab)
    : currentMainTab;

  const renderRow = (item, list, removable = false) => {
    const isEditing = editing === item.content_id;
    const orderable = ORDERABLE_SECTIONS.has(item.section) && list.length > 1;
    const isDragOver = orderable && dragOverId === item.content_id && dragId !== item.content_id;
    const showDesc = (DESCRIPTION_SECTIONS.has(item.section) || DESCRIPTION_CONTENT_IDS.has(item.content_id)) && !item.content_id.endsWith("_cta");
    const titleLocked = TITLE_LOCKED_SECTIONS.has(item.section);
    return (
      <div
        key={item.content_id}
        draggable={orderable && !isEditing}
        onDragStart={() => setDragId(item.content_id)}
        onDragEnd={() => { setDragId(null); setDragOverId(null); }}
        onDragOver={(e) => { if (orderable) { e.preventDefault(); setDragOverId(item.content_id); } }}
        onDrop={(e) => { e.preventDefault(); if (orderable) handleDrop(list, item.content_id); }}
        className={`bg-white rounded-lg p-5 border transition-colors ${isDragOver ? "border-blue-400 border-dashed bg-blue-50/50" : "border-gray-100 hover:border-blue-200"
          } ${dragId === item.content_id ? "opacity-40" : ""}`}
      >
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">TITLE</label>
              {titleLocked ? (
                <p className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500" title="This title is fixed and can't be edited.">
                  {form.title}
                </p>
              ) : LONG_TITLE_CONTENT_IDS.has(item.content_id) ? (
                <textarea
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  rows={3}
                  className="w-full resize-y border rounded-lg px-3 py-2 text-sm"
                />
              ) : (
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>
            {showDesc && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">
                  {["hero", "page_headers"].includes(item.section) ? "SUBTITLE"
                    : ["footer_product", "footer_company", "footer_contact"].includes(item.section) ? "URL"
                      : ["faq", "help_faqs"].includes(item.section) ? "ANSWER"
                        : item.section === "about_team" ? "INITIALS"
                          : DESCRIPTION_CONTENT_IDS.has(item.content_id) || ["terms_of_service", "privacy_policy"].includes(item.section) ? "SECTION TEXT"
                            : "DESCRIPTION"}
                </label>
                {["help_faqs", "about_values", "terms_of_service", "privacy_policy"].includes(item.section) || DESCRIPTION_CONTENT_IDS.has(item.content_id) ? (
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    className="w-full resize-y border rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                )}
              </div>
            )}
            {(IMAGE_CONTENT_IDS.has(item.content_id) || item.section === "forum_topics") && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">HEADER PICTURE</label>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="Paste image URL, or upload below"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id={`header-image-upload-${item.content_id}`}
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await resizeImageToDataUrl(file);
                        setForm((prev) => ({ ...prev, image_url: dataUrl }));
                      } catch {
                        alert("Could not read image file");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`header-image-upload-${item.content_id}`}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                  >
                    Upload header image
                  </label>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                      className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Remove image
                    </button>
                  )}
                </div>
                {form.image_url && (
                  <img src={form.image_url} alt="Header preview" className="mt-3 h-32 w-full rounded-lg object-cover border border-slate-200" />
                )}
                <p className="mt-1 text-[11px] text-slate-400">Paste an image URL above, or use the upload button to store a compressed image in the database.</p>
              </div>
            )}
            {VIDEO_CONTENT_IDS.has(item.content_id) && (
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">VIDEO</label>
                <input
                  value={form.video_url}
                  onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                  placeholder="YouTube/Vimeo link, or a direct .mp4 URL"
                  className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                />
                {form.video_url && (
                  <>
                    {toEmbeddableVideoUrl(form.video_url) ? (
                      <iframe
                        src={toEmbeddableVideoUrl(form.video_url)}
                        title="Video preview"
                        className="w-full aspect-video rounded-lg border border-slate-200"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video src={form.video_url} controls className="w-full aspect-video rounded-lg border border-slate-200 bg-black" />
                    )}
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, video_url: "" }))}
                      className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Remove video
                    </button>
                  </>
                )}
                <p className="mt-1 text-[11px] text-slate-400">Paste a YouTube or Vimeo link (embeds automatically), or a direct link to an .mp4/.webm file. Leave blank to show the "Video coming soon" placeholder.</p>
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
                {item.image_url && (IMAGE_CONTENT_IDS.has(item.content_id) || item.section === "forum_topics") && (
                  <img src={item.image_url} alt="Header preview" className="mt-3 h-20 w-36 rounded-lg object-cover border border-slate-200" />
                )}
                {VIDEO_CONTENT_IDS.has(item.content_id) && (
                  <p className="text-xs text-slate-400 mt-1">
                    {item.video_url ? `Video: ${item.video_url}` : "No video set — showing \"Video coming soon\" placeholder"}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => startEdit(item)}
                className="flex items-center gap-1 border border-blue-500 text-blue-600 px-3 py-1.5 rounded text-sm">
                <Edit size={13} /> Edit
              </button>
              {removable && (
                <button onClick={() => deleteItem(item.content_id)}
                  className="flex items-center gap-1 border border-red-300 text-red-600 px-3 py-1.5 rounded text-sm">
                  <X size={13} /> Remove
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Whatever's currently being edited shows the in-progress form values in
  // the preview (so it updates as you type), everything else just uses
  // what's saved.
  const liveItem = (item) => item?.content_id === editing ? { ...item, title: form.title, description: form.description, image_url: form.image_url, video_url: form.video_url } : item;
  const liveList = (list) => list.map(liveItem);

  const renderPreview = () => {
    if (activeMainTab === "landing" && activeSubTab === "hero") {
      const hero = liveItem(byId("content_hero"));
      return <PreviewFrame label="Landing page"><HeroPreview title={hero?.title} description={hero?.description} imageUrl={hero?.image_url} ctaPrimary={liveItem(byId("hero_cta_primary"))?.title} ctaSecondary={liveItem(byId("hero_cta_secondary"))?.title} /></PreviewFrame>;
    }
    if (activeMainTab === "membership" && activeSubTab === "membership_plans") {
      const header = liveItem(byId("header_pricing"));
      const fp = liveList(freePlanInfo), pp = liveList(premiumPlanInfo);
      return (
        <PreviewFrame label="Subscription page">
          <MembershipPreview
            heading={header?.title} description={header?.description}
            freeName={fp.find(i => i.content_id === "free_plan_name")?.title}
            freePrice={fp.find(i => i.content_id === "free_plan_price")?.title}
            freePriceSub={fp.find(i => i.content_id === "free_plan_price")?.description}
            freeCta={fp.find(i => i.content_id === "free_plan_cta")?.title}
            premName={pp.find(i => i.content_id === "premium_plan_name")?.title}
            premPrice={pp.find(i => i.content_id === "premium_plan_price")?.title}
            premPriceSub={pp.find(i => i.content_id === "premium_plan_price")?.description}
            premCta={pp.find(i => i.content_id === "premium_plan_cta")?.title}
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
        return <PreviewFrame label={tab.label}><VideoPreview heading={heading} description={description} videoUrl={header?.video_url} /></PreviewFrame>;
      }
      if (tab.preview === "text_only") {
        return <PreviewFrame label={tab.label}><TextPreview title={heading} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} /></PreviewFrame>;
      }
      if (tab.preview === "legal_hero") {
        return <PreviewFrame label={tab.label}><LegalHeroPreview title={heading} description={description} items={items} icon={tab.key === "privacy" ? ShieldCheck : ScrollText} /></PreviewFrame>;
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

      if (tab.preview === "forum_overview") {
        const extras = Object.fromEntries((tab.extraIds || []).map(({ id }) => [id, liveItem(byId(id))]));
        return <PreviewFrame label={tab.label}><ForumOverviewPreview heading={heading} description={description} ctaLabel={tab.ctaId ? liveItem(byId(tab.ctaId))?.title : null} extras={extras} topics={liveList(bySection("forum_topics"))} /></PreviewFrame>;
      }
      if (tab.preview === "forum_topics") {
        return <PreviewFrame label={tab.label}><ForumTopicsPreview heading={heading} topics={items} /></PreviewFrame>;
      }
      if (tab.preview === "ai_chatbot_page") {
        return <PreviewFrame label={tab.label}><AIChatbotPagePreview heading={heading} description={description} /></PreviewFrame>;
      }
      if (tab.preview === "portfolio_overview_page") {
        return <PreviewFrame label={tab.label}><PortfolioOverviewPagePreview heading={heading} description={description} /></PreviewFrame>;
      }
      if (tab.preview === "quant_rating_page") {
        return <PreviewFrame label={tab.label}><QuantRatingPagePreview heading={heading} description={description} /></PreviewFrame>;
      }
      if (tab.preview === "transaction_portal_page") {
        return <PreviewFrame label={tab.label}><TransactionPortalPagePreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "transaction_history_page") {
        return <PreviewFrame label={tab.label}><TransactionHistoryPagePreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "investor_profile_page") {
        return <PreviewFrame label={tab.label}><InvestorProfilePagePreview items={items} /></PreviewFrame>;
      }
      if (tab.preview === "become_expert_page") {
        return <PreviewFrame label={tab.label}><BecomeExpertPagePreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "update_particular_page") {
        return <PreviewFrame label={tab.label}><UpdateParticularPagePreview items={items} /></PreviewFrame>;
      }
      if (tab.preview === "payment_result_page") {
        return <PreviewFrame label={tab.label}><PaymentResultPagePreview items={items} /></PreviewFrame>;
      }
      if (["expert_compensation_page", "expert_documents_page", "expert_knowledge_page", "expert_portfolio_page", "expert_detail_page"].includes(tab.preview)) {
        return <PreviewFrame label={tab.label}><SimplePagePreview heading={heading} description={description} items={items} /></PreviewFrame>;
      }
      if (tab.preview === "expert_benefits") {
        return <PreviewFrame label={tab.label}><WhyCardsPreview heading={heading} description={description} items={items} icons={CARD_ICONS[tab.itemsSection]} /></PreviewFrame>;
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
        return <PreviewFrame label={tab.label}><ExpertHeroPreview title={heading} imageUrl={header?.image_url} /></PreviewFrame>;
      }
      if (tab.preview === "about_hero") {
        const para2 = liveItem(byId("about_hero_para2"))?.title;
        return (
          <PreviewFrame label={tab.label}>
            <AboutHeroPreview
              title={heading}
              description={description}
              para2={para2}
              imageUrl={header?.image_url}
            />
          </PreviewFrame>
        );
      }
      if (tab.preview === "about_values") {
        return <PreviewFrame label={tab.label}><AboutValuesPreview heading={heading} items={items} imageUrl={liveItem(byId("about_hero"))?.image_url} /></PreviewFrame>;
      }
      if (tab.preview === "about_people") {
        return (
          <PreviewFrame label={tab.label}>
            <AboutPeoplePreview
              badge={liveItem(byId("about_people_badge"))?.title}
              heading={heading}
              description={description}
              roleLabel={liveItem(byId("about_team_role"))?.title}
              items={items}
              imageUrl={liveItem(byId("about_hero"))?.image_url}
            />
          </PreviewFrame>
        );
      }
      if (tab.preview === "help_hero") {
        return (
          <PreviewFrame label={tab.label}>
            <HelpHeroPreview
              title={heading}
              description={description}
              imageUrl={header?.image_url}
              searchPlaceholder={liveItem(byId("help_search_placeholder"))?.title}
              categories={liveList(bySection("help_categories"))}
            />
          </PreviewFrame>
        );
      }
      if (tab.preview === "help_categories") {
        return <PreviewFrame label={tab.label}><HelpCategoriesPreview items={items} imageUrl={liveItem(byId("help_hero"))?.image_url} /></PreviewFrame>;
      }
      if (tab.preview === "help_faqs") {
        return (
          <PreviewFrame label={tab.label}>
            <HelpFaqPreview
              heading={heading}
              description={description}
              categoryDescription={liveItem(byId("help_faq_category_desc"))?.title}
              emptyHeading={liveItem(byId("help_empty_heading"))?.title}
              emptyDescription={liveItem(byId("help_empty_desc"))?.title}
              categories={liveList(bySection("help_categories"))}
              items={items}
              showCategoryState={editing === "help_faq_category_desc"}
              showEmptyState={editing === "help_empty_heading" || editing === "help_empty_desc"}
            />
          </PreviewFrame>
        );
      }
      if (tab.preview === "help_contact") {
        return (
          <PreviewFrame label={tab.label}>
            <HelpContactPreview
              heading={heading}
              description={liveItem(byId("help_contact_desc"))?.title}
              cta={liveItem(byId("help_contact_cta"))?.title}
              email={liveItem(byId("help_contact_email"))?.title}
            />
          </PreviewFrame>
        );
      }
      if (tab.preview === "empty_portfolio") {
        return <PreviewFrame label={tab.label}><EmptyPortfolioMessagePreview title={heading} imageUrl={header?.image_url} /></PreviewFrame>;
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
    <AdminLayout title="Content Management" subtitle="Edit landing content, membership/payment screens, shared investor/expert pages, and role-specific account pages">
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
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{activeTabInfo.itemsLabel || "Cards"}</p>
                    <div className="space-y-3">
                      {bySection(activeTabInfo.itemsSection).length === 0
                        ? <p className="text-slate-400 text-sm">No content found for this section.</p>
                        : bySection(activeTabInfo.itemsSection).map((item, idx) => (
                          <div key={item.content_id}>
                            {renderRow(item, bySection(activeTabInfo.itemsSection), !activeTabInfo.perCardBadgeSection && !activeTabInfo.perCardCtaSection)}
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
                      {!activeTabInfo.perCardBadgeSection && !activeTabInfo.perCardCtaSection && !activeTabInfo.noAdd && (
                        <button onClick={() => addItem(activeTabInfo.itemsSection)} disabled={saving}
                          className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                          <Plus size={14} /> Add item
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Membership & Payment — Plans & Pricing subtab */}
            {activeMainTab === "membership" && activeSubTab === "membership_plans" && (
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
                                  {item.content_id === "free_plan_name" ? "PLAN NAME" : item.content_id === "free_plan_cta" ? "BUTTON TEXT" : "PRICE"}
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
                                  {item.content_id === "free_plan_name" ? "Plan Name" : item.content_id === "free_plan_cta" ? "Button Text" : "Price"}
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
                        : freeItems.map((item) => renderRow(item, freeItems, true))
                      }
                      <button onClick={() => addItem("free_investor")} disabled={saving}
                        className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                        <Plus size={14} /> Add feature
                      </button>
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
                                  {item.content_id === "premium_plan_name" ? "PLAN NAME" : item.content_id === "premium_plan_cta" ? "BUTTON TEXT" : "PRICE"}
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
                                  {item.content_id === "premium_plan_name" ? "Plan Name" : item.content_id === "premium_plan_cta" ? "Button Text" : "Price"}
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
                        : premiumItems.map((item) => renderRow(item, premiumItems, true))
                      }
                      <button onClick={() => addItem("premium_investor")} disabled={saving}
                        className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                        <Plus size={14} /> Add feature
                      </button>
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
                  <div className="space-y-3">
                    {footerProduct.map((item) => renderRow(item, footerProduct, true))}
                    <button onClick={() => addItem("footer_product")} disabled={saving}
                      className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                      <Plus size={14} /> Add link
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Company Links</p>
                  <p className="text-xs text-slate-400 mb-2">Title = link label &nbsp;·&nbsp; Description = URL</p>
                  <div className="space-y-3">
                    {footerCompany.map((item) => renderRow(item, footerCompany, true))}
                    <button onClick={() => addItem("footer_company")} disabled={saving}
                      className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                      <Plus size={14} /> Add link
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Contact</p>
                  <p className="text-xs text-slate-400 mb-2">For links: Title = label, Description = URL. For email: leave Description empty.</p>
                  <div className="space-y-3">
                    {footerContact.map((item) => renderRow(item, footerContact, true))}
                    <button onClick={() => addItem("footer_contact")} disabled={saving}
                      className="flex items-center gap-1 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 px-3 py-2 rounded-lg text-sm w-full justify-center">
                      <Plus size={14} /> Add item
                    </button>
                  </div>
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
