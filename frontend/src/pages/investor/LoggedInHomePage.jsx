import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import investorLoggedInImg from "../../images/investorloggedin.jpg";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import useLiveStocks from "../../api/useLiveStocks.js";
import { getPageBackground } from "../../utils/userRole.js";
import MiniChart from "../../components/MiniChart.jsx";
import RiskAssessmentModal, { riskDismissedKey } from "../../components/RiskAssessmentModal.jsx";
import { getWatchlist, refreshSessionUser, getSubscriptionStatus, getSubscriptionDetails } from "../../api/userApi.js";
import { isExpertUser } from "../../utils/userRole.js"; import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";
import { getPortfolio, getPortalSummary } from "../../api/tradingApi.js";
import { fetchRating } from "../../api/ratingApi.js";
import { useLandingContent } from "../../api/contentApi.js";
import {
  Bot, GraduationCap,
  Wallet, BrainCircuit, MessagesSquare,
  Eye, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, Gauge,
  Users, ListChecks, BadgeCheck, Sparkles, Award, Briefcase, Bell,
} from "lucide-react";
import { authFetch } from "../../api/apiClient.js";
import {
  CARD_HOVER, CARD_GLOW_HOVER, FOCUS_RING,
  SectionHeader, PrimaryButton,
} from "../../components/dashboard/DashboardKit.jsx";

// Light-theme card surfaces for the sections that now sit on the page's
// light background instead of the dark dashboard wrapper — kept local so the
// shared dark tokens in DashboardKit.jsx (also used by the expert dashboard)
// stay untouched.
const CARD_LIGHT = "rounded-2xl bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-200";
const CARD_COMPACT_LIGHT = "rounded-xl bg-white shadow-sm shadow-slate-900/5 ring-1 ring-slate-200";
const CARD_PURPLE = "rounded-2xl bg-[#F5F0FF] shadow-md shadow-slate-900/5 ring-1 ring-[#7C3AED]/20";
const CARD_DOMINANT_LIGHT = "rounded-2xl bg-white shadow-lg shadow-slate-900/8 ring-1 ring-slate-200";

function readStoredUser() {
  try {
    return JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function SkeletonLight({ className, style }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className ?? ""}`} style={style} />;
}

function ViewAllLinkLight({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-semibold text-[#00A9C4] transition-colors duration-150 hover:text-[#0092b8] cursor-pointer self-start sm:self-auto"
    >
      {children}
    </button>
  );
}

const ACCENTS = {
  cyan: { icon: "bg-[#00D3F2]/10 text-[#00D3F2]", badge: "bg-[#00D3F2]/10 text-[#00D3F2]", ring: "hover:ring-[#00D3F2]/30" },
  blue: { icon: "bg-blue-400/10 text-blue-300", badge: "bg-blue-400/10 text-blue-300", ring: "hover:ring-blue-400/30" },
  violet: { icon: "bg-violet-400/10 text-violet-300", badge: "bg-violet-400/10 text-violet-300", ring: "hover:ring-violet-400/30" },
  emerald: { icon: "bg-emerald-400/10 text-emerald-300", badge: "bg-emerald-400/10 text-emerald-300", ring: "hover:ring-emerald-400/30" },
  amber: { icon: "bg-amber-400/10 text-amber-300", badge: "bg-amber-400/10 text-amber-300", ring: "hover:ring-amber-400/30" },
  rose: { icon: "bg-rose-400/10 text-rose-300", badge: "bg-rose-400/10 text-rose-300", ring: "hover:ring-rose-400/30" },
};

const RISK_TONE = {
  Low: { text: "text-emerald-600", bg: "bg-emerald-500/10" },
  Medium: { text: "text-amber-600", bg: "bg-amber-500/10" },
  High: { text: "text-red-600", bg: "bg-red-500/10" },
};

const PLATFORM_FEATURES = [
  {
    Icon: Wallet,
    title: "Paper Trading Exchange",
    description: "Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.",
    to: "/realtimedashboard",
    badge: "Live market prices",
    cta: "Start trading",
    accent: "cyan",
    primary: true,
  },
  {
    Icon: BrainCircuit,
    title: "AI Stock Predictions",
    description: "Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.",
    to: "/investor/quantrating",
    badge: "ML-powered forecasts",
    cta: "Explore",
    accent: "violet",
  },
  {
    Icon: MessagesSquare,
    title: "Investor Community",
    description: "Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.",
    to: "/forum",
    badge: "Live discussions",
    cta: "Explore",
    accent: "emerald",
  },
  {
    Icon: Bot,
    title: "AI Chatbot & Expert Consultants",
    description: "Get instant answers from our AI assistant, or browse and connect with verified market experts.",
    to: "/investor/aichatbot",
    badge: "Ask anything",
    cta: "Explore",
    accent: "blue",
  },
  {
    Icon: GraduationCap,
    title: "Educational Content",
    description: "Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.",
    to: "/investor/educationcontent",
    badge: "Beginner to advanced",
    cta: "Explore",
    accent: "amber",
  },
  {
    Icon: Award,
    title: "Become an Expert",
    description: "Trade 30 different stocks and hit a 200% profit margin to apply for verified expert status — publish articles and share your portfolio.",
    to: "/investor/become-expert",
    badge: "Level up",
    cta: "Check my progress",
    accent: "rose",
  },
];

const COMPANY_NAMES = {
  AAPL: "Apple Inc.", MSFT: "Microsoft Corp.", GOOGL: "Alphabet Inc.", AMZN: "Amazon.com Inc.",
  NVDA: "NVIDIA Corporation", META: "Meta Platforms", TSLA: "Tesla Inc.", AVGO: "Broadcom",
  ORCL: "Oracle Corp.", AMD: "Advanced Micro Devices", CRM: "Salesforce", QCOM: "Qualcomm",
  ADBE: "Adobe Inc.", NFLX: "Netflix Inc.", DIS: "Walt Disney Co.", NKE: "Nike Inc.",
  MCD: "McDonald's Corp.", HD: "Home Depot", JPM: "JPMorgan Chase", BAC: "Bank of America",
  V: "Visa Inc.", MA: "Mastercard", XOM: "ExxonMobil", CVX: "Chevron Corp.",
  COP: "ConocoPhillips", AMT: "American Tower", PLD: "Prologis", O: "Realty Income",
  VOO: "Vanguard S&P 500 ETF", MU: "Micron Technology", PLTR: "Palantir Technologies",
};

const POPULAR_SYMBOLS = ["AAPL", "NVDA", "TSLA", "AMZN", "MU", "PLTR"];

const AVATAR_PALETTE = [
  "bg-[#00D3F2]/15 text-[#0092b8]",
  "bg-violet-500/15 text-violet-700",
  "bg-emerald-500/15 text-emerald-700",
  "bg-amber-500/15 text-amber-700",
  "bg-rose-500/15 text-rose-700",
  "bg-blue-500/15 text-blue-700",
];

function fmt$(n) {
  const abs = Math.abs(Number(n));
  return `${Number(n) < 0 ? "-" : ""}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSigned$(n) {
  const v = Number(n);
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortCompanyName(symbol) {
  const full = COMPANY_NAMES[symbol];
  if (!full) return symbol;
  return full.replace(/,?\s+(Inc\.?|Corp(oration)?\.?|Co\.?|Platforms)$/, "");
}

function avatarClass(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) hash = (hash * 31 + symbol.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function buildSparklineSeries(up) {
  let seed = up ? 7 : 13;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  let value = 50;
  const drift = up ? 0.55 : -0.55;
  const series = [];
  for (let i = 0; i < 24; i++) {
    value += (rand() - 0.45) * 3 + drift;
    series.push({ close: value });
  }
  return series;
}

// Maps the investor's own selected risk tolerance (Conservative/Moderate/
// Aggressive, set via the Risk Assessment prompt / profile page) onto the
// existing Low/Medium/High tone-and-tagline tiers, so the "Portfolio Risk"
// stat always matches what the user actually picked instead of a value
// derived independently from current holdings.
const RISK_TOLERANCE_TIER = { Conservative: "Low", Moderate: "Medium", Aggressive: "High" };

function usePortfolioData(userId, stocks) {
  const [portfolio, setPortfolio] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    Promise.all([getPortfolio(userId), getPortalSummary(userId)])
      .then(([portRes, sumRes]) => {
        if (portRes.success) setPortfolio(portRes);
        if (sumRes.success) setSummary(sumRes);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const holdings = portfolio?.holdings ?? [];
  const assets = portfolio?.assets ?? 0;

  const holdingsValue = holdings.reduce((sum, h) => {
    const price = stocks?.[h.symbol]?.price ?? h.average_cost;
    return sum + price * h.quantity;
  }, 0);
  const unrealisedPnL = holdings.reduce((sum, h) => {
    const price = stocks?.[h.symbol]?.price ?? h.average_cost;
    return sum + (price - h.average_cost) * h.quantity;
  }, 0);
  const todaysPnL = holdings.reduce((sum, h) => {
    const live = stocks?.[h.symbol];
    if (!live || live.previousClose == null) return sum;
    return sum + (live.price - live.previousClose) * h.quantity;
  }, 0);
  const totalValue = assets + holdingsValue;
  const realisedPnL = summary?.realised_pnl ?? 0;

  return { loading, holdings, assets, unrealisedPnL, realisedPnL, todaysPnL, totalValue };
}

// Reads the server-computed volatility "risk" bucket already broadcast for
// every pool symbol — no new backend logic, just existing endpoints/data
// assembled for the summary card.
function useAIInsights(stocks, portfolioData, userId, riskTolerance) {
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);

  useEffect(() => {
    if (!userId) return;
    getWatchlist(userId)
      .then((res) => { if (res.success) setWatchlistSymbols(res.watchlist.map((e) => e.stock_symbol)); })
      .catch(() => { });
  }, [userId]);

  // "Top Buy" — same top-gainer computation as the real-time dashboard's
  // "Top Gainer" stat: biggest % move up across the whole live stock pool.
  const topGainer = useMemo(() => {
    let best = null;
    Object.values(stocks ?? {}).forEach((s) => {
      if (s.price == null || !s.previousClose) return;
      const pct = ((s.price - s.previousClose) / s.previousClose) * 100;
      if (!best || pct > best.pct) best = { symbol: s.symbol, pct };
    });
    return best;
  }, [stocks]);

  // "Watchlist" AI insight — biggest mover among the stocks the investor is
  // actually watching, not the whole market pool.
  const stockToWatch = useMemo(() => {
    if (!watchlistSymbols.length) return null;
    const entries = watchlistSymbols
      .map((symbol) => stocks?.[symbol])
      .filter((s) => s && s.price != null && s.previousClose);
    if (!entries.length) return null;
    const withMove = entries.map((s) => ({ ...s, movePct: Math.abs((s.price - s.previousClose) / s.previousClose) * 100 }));
    const aggressive = withMove.filter((s) => s.risk === "Aggressive");
    const pool = aggressive.length ? aggressive : withMove;
    return pool.reduce((best, s) => (s.movePct > best.movePct ? s : best));
  }, [stocks, watchlistSymbols]);

  return {
    loading: portfolioData.loading,
    topGainer,
    stockToWatch,
    portfolioRisk: riskTolerance || null,
  };
}

function StockAvatar({ symbol, size = 36 }) {
  return (
    <div
      aria-hidden="true"
      className={`shrink-0 rounded-full flex items-center justify-center font-bold ${avatarClass(symbol)}`}
      style={{ width: size, height: size, fontSize: size * 0.32 }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

function PortfolioSparkline({ up }) {
  const series = useMemo(() => buildSparklineSeries(up), [up]);
  return <MiniChart candles={series} width={600} height={80} responsive />;
}

function ProfileAvatar({ name, size = 48 }) {
  const initials = String(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const palette = ["#155dfc", "#0092b8", "#7c3aed", "#059669", "#d97706", "#be185d"];
  let hash = 0;
  for (const c of String(name || "")) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const bg = palette[hash % palette.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 700, color: "white" }}>{initials}</span>
    </div>
  );
}

function Hero({ name, nameColor, portfolioData, header }) {
  const { loading, holdings, todaysPnL } = portfolioData;
  const hasHoldings = !loading && holdings.length > 0;
  const up = todaysPnL >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;
  const emptyState = header("hero_empty_state", "Start building your portfolio with your first trade.");
  const emptyStateMessage = emptyState.title;
  const heroImage = emptyState.image_url || investorLoggedInImg;

  return (
    <section className="flex flex-col gap-5 -mt-6 md:-mt-8">
      <div className="relative overflow-hidden w-screen ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] min-h-[220px] md:min-h-[280px]">
        <img alt="" src={heroImage} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />

        <div className="relative z-10 flex flex-col justify-center h-full p-16 md:p-20">
          <h1 className="text-white font-extrabold text-[32px] sm:text-[40px] md:text-[44px] leading-[1.1] tracking-tight [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">
            Welcome back,{" "}
            <span style={{ color: nameColor }}>{name}</span>
          </h1>

          {loading ? (
            <div className="h-9 w-64 max-w-full rounded-full bg-white/15 animate-pulse mt-3" />
          ) : hasHoldings ? (
            <div className="mt-3 inline-flex w-fit items-center gap-3 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 pl-2.5 pr-4 py-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${up ? "bg-emerald-400/15 text-emerald-400" : "bg-red-400/15 text-red-400"}`}>
                <TrendIcon size={14} />
                {up ? "+" : "-"}{fmt$(Math.abs(todaysPnL))}
              </span>
              <span className="text-sm font-medium text-gray-100">today</span>
            </div>
          ) : (
            <div className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/15 px-4 py-2">
              <Wallet size={14} className="text-[#00D3F2] shrink-0" />
              <span className="text-sm font-medium text-gray-100">{emptyStateMessage}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

const RISK_TAGLINE = {
  Low: "Your portfolio is looking healthy today.",
  Medium: "Moderate risk today — worth a quick check-in.",
  High: "Higher risk today — you may want to review your positions.",
};

function AIInsightStat({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="flex flex-col gap-2 sm:px-6 first:sm:pl-0 last:sm:pr-0">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone.bg}`}>
          <Icon size={14} className={tone.text} />
        </div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      </div>
      <div>
        <p className="text-slate-900 font-semibold text-lg leading-tight truncate">{value}</p>
        {sub && <p className={`text-sm font-medium mt-0.5 ${tone.text}`}>{sub}</p>}
      </div>
    </div>
  );
}

function AIInsightsSection({ portfolioData, header, userId, riskTolerance }) {
  const { stocks } = useLiveStocks();
  const { loading, topGainer, stockToWatch, portfolioRisk } = useAIInsights(stocks, portfolioData, userId, riskTolerance);
  const portfolioRiskTier = RISK_TOLERANCE_TIER[portfolioRisk] ?? null;

  const topGainerName = topGainer ? (COMPANY_NAMES[topGainer.symbol] ?? topGainer.symbol) : "-";
  const watchName = stockToWatch ? (COMPANY_NAMES[stockToWatch.symbol] ?? stockToWatch.name ?? stockToWatch.symbol) : "-";

  const sectionTitle = header("header_ai_insights", "Today's AI Insights").title;
  const taglineIds = { Low: "ai_tagline_low", Medium: "ai_tagline_medium", High: "ai_tagline_high" };
  const subtitle = loading
    ? header("ai_tagline_loading", "Personalized signals from RocketTrade's prediction models").title
    : portfolioRiskTier
      ? header(taglineIds[portfolioRiskTier], RISK_TAGLINE[portfolioRiskTier]).title
      : header("ai_tagline_unset", "Set your risk tolerance to personalize this feed.").title;

  return (
    <section>
      <SectionHeader
        title={sectionTitle}
        subtitle={subtitle}
        dark={false}

      />
      <div className="rounded-2xl bg-[#00D3F2]/8 shadow-lg shadow-slate-900/10 ring-1 ring-[#00D3F2]/25 p-5 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonLight key={i} style={{ height: 68 }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-5 sm:divide-x sm:divide-slate-900/10">
            <AIInsightStat
              icon={TrendingUp}
              label="Top Gainer"
              value={topGainerName}
              sub={topGainer ? `+${topGainer.pct.toFixed(2)}%` : "No data yet"}
              tone={RISK_TONE.Low}
            />
            <AIInsightStat
              icon={AlertTriangle}
              label="Watchlist"
              value={watchName}
              sub={stockToWatch ? (stockToWatch.risk === "Aggressive" ? "High Volatility" : "Notable Mover") : "Your watchlist is empty"}
              tone={RISK_TONE.Medium}
            />
            <AIInsightStat
              icon={Gauge}
              label="Portfolio Risk"
              value={portfolioRisk || "-"}
              sub={portfolioRisk ? "Your selected risk profile" : "Set your risk profile"}
              tone={RISK_TONE[portfolioRiskTier] ?? RISK_TONE.Medium}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioSummarySection({ portfolioData, userId, header }) {
  const navigate = useNavigate();
  const { loading, assets, unrealisedPnL, realisedPnL, todaysPnL, totalValue } = portfolioData;
  const sectionTitle = header("header_portfolio_summary", "Portfolio Summary").title;
  const ctaLabel = header("portfolio_summary_cta", "View Full Portfolio \u2192").title;

  if (!userId) return null;

  if (loading) {
    return (
      <section>
        <SectionHeader title={sectionTitle} dark={false} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <SkeletonLight className="lg:col-span-3" style={{ height: 224 }} />
          <div className="lg:col-span-2 flex flex-col gap-6">
            <SkeletonLight style={{ height: 84 }} />
            <div className="grid grid-cols-2 gap-4">
              <SkeletonLight style={{ height: 74 }} />
              <SkeletonLight style={{ height: 74 }} />
            </div>
          </div>
        </div>
      </section>
    );
  }

  const todaysUp = todaysPnL >= 0;
  const TodayIcon = todaysUp ? TrendingUp : TrendingDown;

  return (
    <section>
      <SectionHeader
        title={sectionTitle}
        dark={false}
        action={<ViewAllLinkLight onClick={() => navigate("/investor/portfolio-overview")}>{ctaLabel}</ViewAllLinkLight>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Dominant card */}
        <div className={`lg:col-span-3 ${CARD_DOMINANT_LIGHT} p-7 flex flex-col gap-4`}>
          <div>
            <p className="text-sm text-slate-500 mb-2">Total Portfolio Value</p>
            <p className="font-['DM_Mono'] font-bold text-slate-900 text-[42px] leading-none tracking-tight">
              {fmt$(totalValue)}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Change</p>
              <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${todaysUp ? "text-emerald-600" : "text-red-600"}`}>
                <TodayIcon size={16} />
                {fmtSigned$(todaysPnL)}
              </div>
            </div>
            <div className="rounded-xl bg-black/85 shadow-inner shadow-black/40 px-3 pt-3 pb-1">
              <PortfolioSparkline up={todaysUp} />
            </div>
          </div>
        </div>

        {/* Secondary + compact cards */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={`${CARD_LIGHT} p-6 flex-1 flex flex-col justify-center`}>
            <p className="text-sm text-slate-500 mb-2">Available Funds</p>
            <p className="font-['DM_Mono'] font-semibold text-slate-900 text-2xl">{fmt$(assets)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${CARD_COMPACT_LIGHT} p-4`}>
              <p className="text-xs text-slate-500 mb-1.5">Unrealized P&L</p>
              <p className={`font-['DM_Mono'] font-semibold text-base ${unrealisedPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmtSigned$(unrealisedPnL)}
              </p>
            </div>
            <div className={`${CARD_COMPACT_LIGHT} p-4`}>
              <p className="text-xs text-slate-500 mb-1.5">Realized P&L</p>
              <p className={`font-['DM_Mono'] font-semibold text-base ${realisedPnL >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {fmtSigned$(realisedPnL)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketStatusPill({ marketStatus, lastUpdated }) {
  const open = marketStatus === "OPEN";
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className={`inline-flex items-center gap-1.5 font-medium ${open ? "text-emerald-600" : "text-slate-500"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
        {open ? "Market Open" : "Market Closed"}
      </span>
      {lastUpdated && (
        <>
          <span className="text-slate-700">•</span>
          <span className="text-slate-500">Updated {lastUpdated}</span>
        </>
      )}
    </div>
  );
}

function WatchlistRow({ symbol, live, candles, onSelect }) {
  const price = live?.price ?? null;
  const prev = live?.previousClose ?? null;
  const change = price != null && prev != null ? price - prev : null;
  const percent = change != null && prev ? (change / prev) * 100 : null;
  const isUp = change === null ? true : change >= 0;
  const color = isUp ? "text-emerald-600" : "text-red-600";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={() => onSelect(symbol)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(symbol); }}
      className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr] items-center gap-2 px-4 sm:px-6 py-4 border-b border-slate-100 last:border-b-0 transition-colors duration-150 hover:bg-slate-50 cursor-pointer focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[#00D3F2]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <StockAvatar symbol={symbol} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-slate-900 font-semibold text-sm">{symbol}</span>
          <span className="text-slate-500 text-xs truncate">{live?.name ?? COMPANY_NAMES[symbol] ?? "—"}</span>
        </div>
      </div>
      <span className={`text-right font-['DM_Mono'] font-medium text-sm ${color}`}>
        {price != null ? `$${price.toFixed(2)}` : "—"}
      </span>
      <span className={`flex items-center justify-end gap-1 font-medium text-sm ${color}`}>
        {percent != null && <TrendIcon size={14} />}
        {percent != null ? `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%` : "—"}
      </span>
      <span className="flex justify-end">
        {candles?.length > 0
          ? <MiniChart candles={candles} width={90} height={34} />
          : <span className="text-slate-600 text-xs">—</span>}
      </span>
    </div>
  );
}

function WatchlistSection({ header }) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const { stocks, candles, marketStatus, lastUpdated } = useLiveStocks();

  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) return;
    getWatchlist(userId)
      .then((res) => { if (res.success) setSymbols(res.watchlist.map((e) => e.stock_symbol)); })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSelect = (symbol) => navigate(`/realtimedashboard/astockdashboard/${symbol}`, {
    state: { from: "/investor", fromLabel: "Home" },
  });
  const sectionTitle = header("header_watchlist", "My Watchlist").title;
  const ctaLabel = header("watchlist_cta", "View Full Watchlist \u2192").title;
  const emptyState = header("header_watchlist_empty", "Start building your watchlist", "Track stocks you're interested in and receive AI insights on how they're moving.");
  const emptyStateCta = header("watchlist_empty_cta", "+ Add Stocks").title;

  return (
    <section className="border-t-0!">
      <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-slate-900 tracking-tight leading-snug">{sectionTitle}</h2>
          <div className="mt-2">
            <MarketStatusPill marketStatus={marketStatus} lastUpdated={lastUpdated} />
          </div>
        </div>
        <ViewAllLinkLight onClick={() => navigate("/watchlist")}>{ctaLabel}</ViewAllLinkLight>
      </div>

      <div className={`${CARD_DOMINANT_LIGHT} overflow-hidden`}>
        <div className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr] gap-2 px-4 sm:px-6 py-3.5 text-xs text-slate-500 uppercase tracking-widest bg-slate-50">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">% Change</span>
          <span className="text-right">Trend (1D)</span>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 sm:px-6 py-4 border-b border-slate-100 last:border-b-0">
            <SkeletonLight style={{ height: 34 }} />
          </div>
        ))}

        {!loading && !userId && (
          <div className="px-6 py-14 text-center text-sm text-slate-500">Log in to see your watchlist.</div>
        )}

        {!loading && userId && symbols.length === 0 && (
          <div className="px-6 py-14 flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full bg-slate-100" />
              <div className="absolute inset-1.75 rounded-full bg-slate-200 flex items-center justify-center">
                <Eye size={22} className="text-slate-500" />
              </div>
            </div>
            <p className="text-slate-900 font-semibold text-base mb-1.5">{emptyState.title}</p>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              {emptyState.description}
            </p>
            <PrimaryButton onClick={() => navigate("/watchlist")}>{emptyStateCta}</PrimaryButton>
            <div className="mt-8 w-full">
              <p className="text-xs uppercase tracking-wide text-slate-500 mb-3">Suggested for you</p>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_SYMBOLS.slice(0, 5).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition-colors duration-150 hover:bg-slate-200 hover:text-[#0092b8] cursor-pointer"
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && symbols.slice(0, 6).map((symbol) => (
          <WatchlistRow
            key={symbol}
            symbol={symbol}
            live={stocks?.[symbol]}
            candles={candles?.[symbol]}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {symbols.length > 6 && (
        <p className="text-xs text-slate-500 mt-3 text-center">
          Showing 6 of {symbols.length} —{" "}
          <button onClick={() => navigate("/watchlist")} className="underline text-[#00D3F2] cursor-pointer">
            view all
          </button>
        </p>
      )}
    </section>
  );
}



function PopularStockCard({ symbol, snapshot, candles, confidence, onSelect }) {
  const price = snapshot?.p ?? null;
  const prev = snapshot?.previousClose ?? null;
  const change = price != null && prev != null ? price - prev : null;
  const percent = change != null && prev ? (change / prev) * 100 : null;
  const isUp = change === null ? true : change >= 0;
  const color = isUp ? "text-emerald-600" : "text-red-600";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={() => onSelect(symbol)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(symbol); }}
      className={`group flex flex-col gap-3 shrink-0 w-54 cursor-pointer ${CARD_LIGHT} ${CARD_HOVER} ${CARD_GLOW_HOVER} hover:ring-[#00D3F2]/30 p-5 ${FOCUS_RING}`}
    >
      <div className="flex items-center gap-3">
        <StockAvatar symbol={symbol} size={34} />
        <div className="min-w-0">
          <p className="text-slate-900 font-semibold text-sm leading-tight truncate">{shortCompanyName(symbol)}</p>
          <p className="text-slate-500 text-xs">{symbol}</p>
        </div>
      </div>
      {confidence != null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">AI Confidence</span>
          <span className="text-[#00D3F2] font-semibold">{confidence}%</span>
        </div>
      )}
      <div>
        <p className={`font-['DM_Mono'] font-semibold text-lg leading-tight ${color}`}>
          {price != null ? `$${price.toFixed(2)}` : "—"}
        </p>
        <p className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${color}`}>
          {percent != null && <TrendIcon size={14} />}
          {percent != null ? `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%` : "—"}
        </p>
      </div>
      <div className="transition-transform duration-200 ease-out group-hover:scale-[1.03]">
        {candles?.length > 0
          ? <MiniChart candles={candles} width={176} height={44} />
          : <div style={{ height: 44 }} />}
      </div>
    </div>
  );
}

function PopularStocksSection() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState({});
  const [candles, setCandles] = useState({});
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      POPULAR_SYMBOLS.map((symbol) =>
        Promise.all([fetchStockSnapshot(symbol), fetchStockCandles(symbol, "1D"), fetchRating(symbol)])
          .then(([snapRes, candlesRes, ratingRes]) => ({
            symbol,
            snapshot: snapRes.success ? snapRes.data : null,
            candles: candlesRes.success ? candlesRes.candles : [],
            rating: ratingRes?.success ? ratingRes : null,
          }))
          .catch(() => ({ symbol, snapshot: null, candles: [], rating: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      const nextSnapshots = {};
      const nextCandles = {};
      const nextRatings = {};
      results.forEach((r) => { nextSnapshots[r.symbol] = r.snapshot; nextCandles[r.symbol] = r.candles; nextRatings[r.symbol] = r.rating; });
      setSnapshots(nextSnapshots);
      setCandles(nextCandles);
      setRatings(nextRatings);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (symbol) => navigate(`/realtimedashboard/astockdashboard/${symbol}`, {
    state: { from: "/investor", fromLabel: "Home" },
  });

  return (
    <section>
      <SectionHeader title="Popular Stocks" subtitle="Trending picks investors are watching right now" dark={false} />

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonLight key={i} className="shrink-0" style={{ width: 216, height: 172, borderRadius: 16 }} />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {POPULAR_SYMBOLS.map((symbol) => (
              <PopularStockCard
                key={symbol}
                symbol={symbol}
                snapshot={snapshots[symbol]}
                candles={candles[symbol]}
                confidence={ratings[symbol]?.buyProbability != null ? Math.round(ratings[symbol].buyProbability * 100) : null}
                onSelect={handleSelect}
              />
            ))}
          </div>
          <div
            className="pointer-events-none absolute top-0 right-0 h-full w-12"
            style={{ background: "linear-gradient(to right, transparent, rgba(248,250,252,0.95))" }}
          />
        </div>
      )}
    </section>
  );
}

function useLandingContentExtras() {
  const content = useLandingContent();

  const header = (id, fallbackTitle, fallbackDescription) => {
    const item = content?.find((c) => c.content_id === id);
    return { title: item?.title ?? fallbackTitle, description: item?.description ?? fallbackDescription, image_url: item?.image_url || "" };
  };

  // Matches fetched title/description onto the fallback list by position,
  // so icon/to/badge/cta/accent (none of which live in the CMS) still come
  // from the hardcoded defaults.
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

function useSubscriptionInfo(userId) {
  const [info, setInfo] = useState({ status: "unknown", renewalDate: null, latest: null, loading: !!userId });

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setInfo({ status: "inactive", renewalDate: null, latest: null, loading: false });
      return () => { cancelled = true; };
    }

    Promise.all([
      getSubscriptionStatus(userId).catch(() => null),
      getSubscriptionDetails(userId).catch(() => null),
    ])
      .then(([statusRes, detailsRes]) => {
        if (cancelled) return;

        const latest = detailsRes?.latest || null;
        const latestPlan = latest?.plan_type || latest?.subscription_type || latest?.sub_plan_type || "";
        const latestStatus = latest?.status || latest?.sub_status || latest?.subscription_status || "";
        const hasPremiumPlan = String(latestPlan).toLowerCase().includes("premium");
        const isCancelled = String(latestStatus).toLowerCase().includes("cancel");

        const status = (
          statusRes?.subscription_status ||
          latest?.investor_subscription_status ||
          (hasPremiumPlan && !isCancelled ? "premium" : "inactive")
        );

        setInfo({
          status,
          renewalDate: statusRes?.renewal_date || latest?.sub_renewal_date || latest?.renewal_date || latest?.end_date || latest?.expiry_date || null,
          latest,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setInfo({ status: "unknown", renewalDate: null, latest: null, loading: false });
      });

    return () => { cancelled = true; };
  }, [userId]);

  return info;
}

function normaliseRole(user) {
  return String(
    user?.role ||
    user?.user_role ||
    user?.account_type ||
    user?.user_type ||
    user?.userType ||
    ""
  ).trim().toLowerCase();
}

function isPremiumStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  return ["premium", "active", "paid", "subscribed", "premium_investor"].includes(value) || value.includes("premium");
}

function getAccountSubscriptionStatus(user) {
  return (
    user?.subscription_status ||
    user?.investor_subscription_status ||
    user?.plan_type ||
    user?.plan ||
    user?.subscription_type ||
    user?.membership ||
    user?.account_status ||
    user?.role ||
    ""
  );
}

function PlatformFeatureCard({ Icon, title, description, to, badge, cta, primary, accent }) {
  const navigate = useNavigate();
  const a = ACCENTS[accent];
  return (
    <div
      onClick={() => navigate(to)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(to); }}
      className={`group flex flex-col justify-between cursor-pointer rounded-2xl bg-white ring-1 ring-slate-200 shadow-md shadow-slate-900/5 ${CARD_HOVER} hover:shadow-xl hover:shadow-slate-900/10 ${a.ring} ${FOCUS_RING} ${primary ? "lg:col-span-2 p-7" : "p-6"}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className={`flex items-center justify-center rounded-xl ring-1 ring-inset ring-white/10 ${a.icon} ${primary ? "w-12 h-12" : "w-10 h-10"}`}>
            <Icon size={primary ? 24 : 21} strokeWidth={3} />
          </div>
          {badge && (
            <span className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${a.badge}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className={`text-slate-900 font-bold mb-1.5 ${primary ? "text-2xl" : "text-lg"}`}>{title}</h3>
        <p className="text-[15px] font-medium text-slate-600 leading-relaxed">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#00D3F2] transition-all duration-200 group-hover:gap-2.5">
        {cta}
      </div>
    </div>
  );
}

function PlatformFeaturesSection({ header, items, isExpert }) {
  const h = header("header_investor_features", "Explore RocketTrade", "Everything the platform offers, all in one place");
  const features = items("investor_home_features", PLATFORM_FEATURES);
  const ctaOverrides = items("investor_home_features_cta", []);
  const badgeOverrides = items("investor_home_features_badge", []);
  const withOverrides = features
    .map((f, i) => ({
      ...f,
      cta: ctaOverrides[i]?.title ?? f.cta,
      badge: badgeOverrides[i]?.title ?? f.badge,
    }))
    .filter((f) => !isExpert || f.title !== "AI Chatbot & Expert Consultants");
  return (
    <section className="rounded-3xl bg-slate-50 ring-1 ring-slate-200/70 shadow-sm shadow-slate-900/5 p-6 md:p-10">
      <SectionHeader title={h.title} subtitle={h.description} dark={false} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {withOverrides.map((feature) => (
          <PlatformFeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}

function RealtimeDashboardSection({ header, items, isExpert }) {
  const navigate = useNavigate();
  const h = header("header_investor_dashboard", "The Realtime Trading Dashboard", "One screen for every stock — AI-powered predictions, verified expert commentary, and paper trading against live market prices.");
  const DEFAULT_HIGHLIGHTS = [
    { Icon: BrainCircuit, title: "AI Predictions", description: "Multi-day price forecasts and confidence scores powered by machine learning." },
    { Icon: BadgeCheck, title: "Verified Expert Comments", description: "Get insights straight from verified market experts on every stock page." },
    { Icon: Wallet, title: "Paper Trading", description: "Trade against live market prices using virtual funds, zero real-money risk." },
    { Icon: Bell, title: "Customised Alerts", description: "Set your own price targets on any stock and get notified the moment they're hit." },
  ];
  const highlights = items("investor_home_dashboard", DEFAULT_HIGHLIGHTS)
    .filter((f) => !isExpert || f.title !== "Verified Expert Comments");

  return (
    <section
      onClick={() => navigate("/realtimedashboard")}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") navigate("/realtimedashboard"); }}
      className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-900/8 p-8 md:p-12 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 hover:ring-[#00D3F2]/30"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#00D3F2]/10 blur-3xl" />

      <div className="relative flex flex-col gap-8">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-[#00D3F2]/10 text-[#0092b8]">
            Live Market Data
          </span>
          <h2 className="text-slate-900 font-bold text-[28px] md:text-[34px] tracking-tight leading-snug mt-3">
            {h.title}
          </h2>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed mt-2 max-w-2xl">
            {h.description}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map(({ Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00D3F2]/10 text-[#0092b8]">
                <Icon size={19} />
              </div>
              <p className="text-slate-900 font-semibold text-[15px]">{title}</p>
              <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>

        <div className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-[#00D3F2] transition-all duration-200 group-hover:gap-2.5">
          Launch Dashboard <ArrowRight size={14} />
        </div>
      </div>
    </section>
  );
}

function BasicUpgradeBanner({ header }) {
  const navigate = useNavigate();
  const h = header("investor_banner_basic", "Stop guessing. Start trading with an edge.", "Unlock custom price alerts, deeper AI forecasts, and priority access to verified experts — for less than a coffee a day.");
  return (
    <section className="relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#FFD700]/30 shadow-lg shadow-amber-900/8 p-5 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#FFD700]/10 blur-3xl" />

      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#FFD700]/10 text-amber-700">
          <Sparkles size={11} /> RocketTrade Premium
        </span>
        <h2 className="text-slate-900 font-bold text-[19px] md:text-[22px] tracking-tight leading-snug mt-2">
          {h.title}
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed mt-1.5">
          {h.description}
        </p>
      </div>

      <button
        onClick={() => navigate("/investor/subscription")}
        className="relative shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-[#FFD700]/20 transition-all duration-200 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
      >
        {header("investor_banner_basic_cta", "View Pricing").title} <ArrowRight size={16} />
      </button>
    </section>
  );
}

// ── Expert-only quick links ──────────────────────────────────────────────
// Jump cards to the expert-specific tools that live on their own pages.
const EXPERT_FEATURE_CARDS = [
  {
    key: "education",
    icon: GraduationCap,
    title: "My Education Content",
    description: "Write and manage the articles you've published to the knowledge hub.",
    path: "/expert/knowledge-hub",
  },
  {
    key: "portfolio",
    icon: Briefcase,
    title: "My Portfolio",
    description: "Publish and manage the portfolio you share with investors.",
    path: "/investor/expertportfolio",
  },
  {
    key: "compensation",
    icon: Wallet,
    title: "Compensation",
    description: "Track your earnings and payout history as a verified expert.",
    path: "/investor/compensation",
  },
];

function ExpertFeatureCard({ icon: Icon, title, description, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      className={`group cursor-pointer ${CARD_PURPLE} ${CARD_HOVER} hover:shadow-xl hover:shadow-slate-900/10 hover:ring-[#7C3AED]/30 p-6 flex flex-col gap-4`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#7C3AED]/10 text-[#6D28D9] shrink-0">
          <Icon size={19} />
        </div>
        <h3 className="text-slate-900 font-bold text-[15px]">{title}</h3>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED] group-hover:gap-2 transition-all mt-auto">
        Open <ArrowRight size={12} />
      </span>
    </div>
  );
}

// ── Expert features ────────────────────────────────────────────────────
// Quick links to the expert's own tools, plus published portfolios from
// other verified experts as reference material. Hidden entirely for
// non-experts (gated at the call site).
function ExpertFeaturesSection() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState([]);

  useEffect(() => {
    let cancelled = false;
    authFetch(`${import.meta.env.VITE_API_URL}/expert/published-portfolios`)
      .then(r => r.json())
      .then(res => {
        if (cancelled) return;
        if (res.success && (res.portfolios || []).length > 0) {
          setPortfolios(res.portfolios);
        }
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, []);

  return (
    <section>
      <SectionHeader
        title="Expert Features"
        subtitle="Your expert tools, plus reference portfolios from other verified experts"
        dark={false}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {EXPERT_FEATURE_CARDS.map((card) => (
          <ExpertFeatureCard
            key={card.key}
            icon={card.icon}
            title={card.title}
            description={card.description}
            onClick={() => navigate(card.path)}
          />
        ))}

        {portfolios.map((p) => {
          const up = (p.return_pct ?? 0) >= 0;
          return (
            <div
              key={p.portfolio_id}
              onClick={() => navigate(`/investor/expertdetails?user_id=${p.expert_user_id}`, {
                state: { from: "/investor", fromLabel: "Home" },
              })}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") navigate(`/investor/expertdetails?user_id=${p.expert_user_id}`, {
                  state: { from: "/investor", fromLabel: "Home" },
                });
              }}
              className={`group cursor-pointer ${CARD_PURPLE} ${CARD_HOVER} hover:shadow-xl hover:shadow-slate-900/10 hover:ring-[#7C3AED]/30 p-6 flex flex-col gap-4`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#7C3AED]/10 text-[#6D28D9] shrink-0">
                    <Briefcase size={19} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-slate-900 font-bold text-[15px] truncate">{p.portfolio_name}</h3>
                    <p className="text-xs text-[#7C3AED] truncate">by {p.expert_name}</p>
                  </div>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${up ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}{Number(p.return_pct ?? 0).toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{p.description || p.investment_objective}</p>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mt-auto">
                <span className="inline-flex items-center gap-1"><ListChecks size={13} /> {p.total_holdings} holdings</span>
                <span className="inline-flex items-center gap-1"><Gauge size={13} /> {p.risk_level}</span>
                <span className="inline-flex items-center gap-1 text-[#7C3AED] group-hover:gap-2 transition-all">View <ArrowRight size={12} /></span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function LoggedInHomePage() {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser());
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    refreshSessionUser()
      .then((freshUser) => {
        if (!cancelled && freshUser) setCurrentUser((prev) => ({ ...prev, ...freshUser }));
      })
      .finally(() => {
        if (!cancelled) setSessionChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  const userId = currentUser?.user_id;
  const role = normaliseRole(currentUser);
  const isExpert = isExpertUser(currentUser) || role.includes("expert") || role.includes("consultant");
  const name = currentUser?.full_name || currentUser?.username || currentUser?.user_name || (isExpert ? "Expert" : "Investor");
  const { stocks } = useLiveStocks();
  const portfolioData = usePortfolioData(userId, stocks);
  const { header, items } = useLandingContentExtras();
  const subscription = useSubscriptionInfo(userId);
  const premiumFromAccount = getAccountSubscriptionStatus(currentUser);
  const isPremiumInvestor = !isExpert && (isPremiumStatus(subscription.status) || isPremiumStatus(premiumFromAccount));

  // Preferences / risk-assessment prompt: shown on login when the user has no
  // risk tolerance set and hasn't ticked "Don't show me again".
  const [showRisk, setShowRisk] = useState(() => {
    if (!userId) return false;
    const hasRisk = !!currentUser?.risk_tolerance;
    const dismissed = localStorage.getItem(riskDismissedKey(userId)) === "1";
    return !hasRisk && !dismissed;
  });

  return (
    <motion.div
      className="relative min-h-screen flex flex-col"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: getPageBackground(500),
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >

      <GeneralHeader />
      <main className="flex-1 w-full max-w-350 mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col gap-8">
        <Hero name={name} nameColor={isExpert ? "#7C3AED" : isPremiumInvestor ? "#FFD500" : "#73ADFF"} portfolioData={portfolioData} header={header} />

        <div className="flex flex-col gap-8 mt-16">
          <AIInsightsSection portfolioData={portfolioData} header={header} userId={userId} riskTolerance={currentUser?.risk_tolerance} />
          <PortfolioSummarySection portfolioData={portfolioData} userId={userId} header={header} />
          <WatchlistSection header={header} />
          {isExpert && <ExpertFeaturesSection />}

          {!subscription.loading && !(subscription.status === "premium" || isPremiumInvestor) && (
            <BasicUpgradeBanner header={header} />
          )}
          <PlatformFeaturesSection header={header} items={items} isExpert={isExpert} />
          <RealtimeDashboardSection header={header} items={items} isExpert={isExpert} />
        </div>

      </main>
      <Footer />

      <RiskAssessmentModal
        open={showRisk}
        userId={userId}
        onDone={() => setShowRisk(false)}
      />
    </motion.div>
  );
}

export default LoggedInHomePage;
