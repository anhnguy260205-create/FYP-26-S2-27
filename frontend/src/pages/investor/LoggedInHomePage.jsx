import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import useLiveStocks from "../../api/useLiveStocks.js";
import MiniChart from "../../components/MiniChart.jsx";
import { getWatchlist } from "../../api/userApi.js";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";
import { getPortfolio, getPortalSummary } from "../../api/tradingApi.js";
import { fetchRating } from "../../api/ratingApi.js";
import {
  LineChart, Sparkles, Users, Bot, GraduationCap,
  Wallet, BrainCircuit, MessagesSquare, MessageCircleQuestion,
  Eye, ArrowRight, TrendingUp, TrendingDown, AlertTriangle, Gauge,
} from "lucide-react";
import {
  CARD, CARD_COMPACT, CARD_DOMINANT, CARD_HOVER, CARD_GLOW_HOVER, FOCUS_RING,
  Skeleton, SectionHeader, ViewAllLink, PrimaryButton,
} from "../../components/dashboard/DashboardKit.jsx";

const SECONDARY_LINKS = [
  { Icon: LineChart, label: "Trade", to: "/realtimedashboard" },
  { Icon: Sparkles, label: "AI Predictions", to: "/investor/quantrating" },
  { Icon: Users, label: "Ask an Expert", to: "/investor/expertadvice" },
  { Icon: GraduationCap, label: "Learn", to: "/investor/educationcontent" },
];

const ACCENTS = {
  cyan: { icon: "bg-[#00D3F2]/10 text-[#00D3F2]", badge: "bg-[#00D3F2]/10 text-[#00D3F2]", ring: "hover:ring-[#00D3F2]/30" },
  blue: { icon: "bg-blue-400/10 text-blue-300", badge: "bg-blue-400/10 text-blue-300", ring: "hover:ring-blue-400/30" },
  violet: { icon: "bg-violet-400/10 text-violet-300", badge: "bg-violet-400/10 text-violet-300", ring: "hover:ring-violet-400/30" },
  emerald: { icon: "bg-emerald-400/10 text-emerald-300", badge: "bg-emerald-400/10 text-emerald-300", ring: "hover:ring-emerald-400/30" },
  amber: { icon: "bg-amber-400/10 text-amber-300", badge: "bg-amber-400/10 text-amber-300", ring: "hover:ring-amber-400/30" },
  rose: { icon: "bg-rose-400/10 text-rose-300", badge: "bg-rose-400/10 text-rose-300", ring: "hover:ring-rose-400/30" },
};

const RISK_TONE = {
  Low: { text: "text-emerald-400", bg: "bg-emerald-400/10" },
  Medium: { text: "text-amber-400", bg: "bg-amber-400/10" },
  High: { text: "text-red-400", bg: "bg-red-400/10" },
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
    Icon: MessageCircleQuestion,
    title: "Ask the Experts",
    description: "Submit your investing questions directly to verified experts and get personalized answers.",
    to: "/investor/expertadvice",
    badge: "Verified experts",
    cta: "Explore",
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
  "bg-[#00D3F2]/15 text-[#00D3F2]",
  "bg-violet-400/15 text-violet-300",
  "bg-emerald-400/15 text-emerald-300",
  "bg-amber-400/15 text-amber-300",
  "bg-rose-400/15 text-rose-300",
  "bg-blue-400/15 text-blue-300",
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

// Value-weighted average of each held symbol's server-computed volatility bucket (Conservative/Moderate/Aggressive).
function computePortfolioRisk(holdings, stocks) {
  if (!holdings.length) return "Low";
  const weight = { Conservative: 1, Moderate: 2, Aggressive: 3 };
  let totalWeight = 0;
  let totalValue = 0;
  holdings.forEach((h) => {
    const live = stocks?.[h.symbol];
    const price = live?.price ?? h.average_cost;
    const value = price * h.quantity;
    totalWeight += (weight[live?.risk] ?? 2) * value;
    totalValue += value;
  });
  if (!totalValue) return "Low";
  const avg = totalWeight / totalValue;
  if (avg < 1.67) return "Low";
  if (avg < 2.34) return "Medium";
  return "High";
}

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
  const paperMoney = portfolio?.paper_money ?? 0;

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
  const totalValue = paperMoney + holdingsValue;
  const realisedPnL = summary?.realised_pnl ?? 0;

  return { loading, holdings, paperMoney, unrealisedPnL, realisedPnL, todaysPnL, totalValue };
}

// Ranks the same POPULAR_SYMBOLS pool already shown on this page by real Quant Rating buy-probability,
// and reads the server-computed volatility "risk" bucket already broadcast for every pool symbol —
// no new backend logic, just existing endpoints/data assembled for the summary card.
function useAIInsights(stocks, portfolioData) {
  const [ratings, setRatings] = useState({});
  const [ratingsLoading, setRatingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      POPULAR_SYMBOLS.map((symbol) =>
        fetchRating(symbol)
          .then((res) => ({ symbol, data: res?.success ? res : null }))
          .catch(() => ({ symbol, data: null }))
      )
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((r) => { next[r.symbol] = r.data; });
      setRatings(next);
      setRatingsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const topPick = useMemo(() => {
    const candidates = Object.values(ratings).filter((r) => r && r.buyProbability != null);
    if (!candidates.length) return null;
    return candidates.reduce((best, r) => (r.buyProbability > best.buyProbability ? r : best));
  }, [ratings]);

  const stockToWatch = useMemo(() => {
    const entries = Object.values(stocks ?? {}).filter((s) => s.price != null && s.previousClose);
    if (!entries.length) return null;
    const withMove = entries.map((s) => ({ ...s, movePct: Math.abs((s.price - s.previousClose) / s.previousClose) * 100 }));
    const aggressive = withMove.filter((s) => s.risk === "Aggressive");
    const pool = aggressive.length ? aggressive : withMove;
    return pool.reduce((best, s) => (s.movePct > best.movePct ? s : best));
  }, [stocks]);

  const portfolioRisk = useMemo(
    () => computePortfolioRisk(portfolioData.holdings, stocks),
    [portfolioData.holdings, stocks]
  );

  return {
    loading: ratingsLoading || portfolioData.loading,
    topPick,
    stockToWatch,
    portfolioRisk,
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

function Hero({ name, portfolioData }) {
  const navigate = useNavigate();
  const { loading, holdings, todaysPnL } = portfolioData;
  const hasHoldings = !loading && holdings.length > 0;
  const up = todaysPnL >= 0;
  const TrendIcon = up ? TrendingUp : TrendingDown;

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-white font-bold text-[36px] leading-[1.15] tracking-tight">
          Welcome back, {name} <span aria-hidden="true">👋</span>
        </h1>

        {loading ? (
          <div className="h-5 w-64 max-w-full rounded bg-white/5 animate-pulse mt-2" />
        ) : hasHoldings ? (
          <p className="mt-2 text-base text-slate-400 flex flex-wrap items-center gap-1.5">
            Your portfolio {up ? "gained" : "lost"}
            <span className={`inline-flex items-center gap-1 font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
              <TrendIcon size={16} />
              {fmt$(Math.abs(todaysPnL))}
            </span>
            today.
          </p>
        ) : (
          <p className="mt-2 text-base text-slate-400">
            You haven't made any trades yet — jump in and start building your portfolio.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5">
        <PrimaryButton size="lg" icon={LineChart} onClick={() => navigate("/realtimedashboard")}>
          {hasHoldings ? "Continue Trading" : "Start Trading"}
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

const RISK_TAGLINE = {
  Low: "Your portfolio is looking healthy today.",
  Medium: "Moderate risk today — worth a quick check-in.",
  High: "Higher risk today — you may want to review your positions.",
};

function AIInsightStat({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tone.bg}`}>
          <Icon size={14} className={tone.text} />
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      </div>
      <div>
        <p className="text-white font-semibold text-lg leading-tight truncate">{value}</p>
        {sub && <p className={`text-sm font-medium mt-0.5 ${tone.text}`}>{sub}</p>}
      </div>
    </div>
  );
}

function AIInsightsSection({ portfolioData }) {
  const { stocks } = useLiveStocks();
  const { loading, topPick, stockToWatch, portfolioRisk } = useAIInsights(stocks, portfolioData);

  const topPickName = topPick ? (COMPANY_NAMES[topPick.symbol] ?? topPick.name ?? topPick.symbol) : "Unavailable";
  const watchName = stockToWatch ? (COMPANY_NAMES[stockToWatch.symbol] ?? stockToWatch.name ?? stockToWatch.symbol) : "Unavailable";

  return (
    <section>
      <SectionHeader
        title="Today's AI Insights"
        subtitle={loading ? "Personalized signals from RocketTrade's prediction models" : RISK_TAGLINE[portfolioRisk]}
      />
      <div className="rounded-2xl bg-[#00D3F2]/[0.05] shadow-lg shadow-black/20 ring-1 ring-[#00D3F2]/20 p-5 md:p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} style={{ height: 68 }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-5">
            <AIInsightStat
              icon={TrendingUp}
              label="Top Buy"
              value={topPickName}
              sub={topPick ? `${Math.round(topPick.buyProbability * 100)}% Confidence` : "Model data unavailable"}
              tone={RISK_TONE.Low}
            />
            <AIInsightStat
              icon={AlertTriangle}
              label="Watchlist"
              value={watchName}
              sub={stockToWatch ? (stockToWatch.risk === "Aggressive" ? "High Volatility" : "Notable Mover") : "No data yet"}
              tone={RISK_TONE.Medium}
            />
            <AIInsightStat
              icon={Gauge}
              label="Portfolio Risk"
              value={portfolioRisk}
              sub={portfolioData.holdings.length ? "From your holdings" : "No holdings yet"}
              tone={RISK_TONE[portfolioRisk]}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PortfolioSummarySection({ portfolioData, userId }) {
  const navigate = useNavigate();
  const { loading, paperMoney, unrealisedPnL, realisedPnL, todaysPnL, totalValue } = portfolioData;

  if (!userId) return null;

  if (loading) {
    return (
      <section>
        <SectionHeader title="Portfolio Summary" />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Skeleton className="lg:col-span-3" style={{ height: 224 }} />
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

  const todaysUp = todaysPnL >= 0;
  const TodayIcon = todaysUp ? TrendingUp : TrendingDown;

  return (
    <section>
      <SectionHeader
        title="Portfolio Summary"
        action={<ViewAllLink onClick={() => navigate("/investor/portfolio-overview")}>View Full Portfolio →</ViewAllLink>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Dominant card */}
        <div className={`lg:col-span-3 ${CARD_DOMINANT} p-7 flex flex-col gap-4`}>
          <div>
            <p className="text-sm text-slate-400 mb-2">Total Portfolio Value</p>
            <p className="font-['DM_Mono'] font-bold text-white text-[42px] leading-none tracking-tight">
              {fmt$(totalValue)}
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Today's Change</p>
              <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${todaysUp ? "text-emerald-400" : "text-red-400"}`}>
                <TodayIcon size={16} />
                {fmtSigned$(todaysPnL)}
              </div>
            </div>
            <div className="rounded-xl bg-black/20 shadow-inner shadow-black/40 px-3 pt-3 pb-1">
              <PortfolioSparkline up={todaysUp} />
            </div>
          </div>
        </div>

        {/* Secondary + compact cards */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className={`${CARD} p-6 flex-1 flex flex-col justify-center`}>
            <p className="text-sm text-slate-400 mb-2">Available Funds</p>
            <p className="font-['DM_Mono'] font-semibold text-white text-2xl">{fmt$(paperMoney)}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className={`${CARD_COMPACT} p-4`}>
              <p className="text-xs text-slate-500 mb-1.5">Unrealized P&L</p>
              <p className={`font-['DM_Mono'] font-semibold text-base ${unrealisedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {fmtSigned$(unrealisedPnL)}
              </p>
            </div>
            <div className={`${CARD_COMPACT} p-4`}>
              <p className="text-xs text-slate-500 mb-1.5">Realized P&L</p>
              <p className={`font-['DM_Mono'] font-semibold text-base ${realisedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
      <span className={`inline-flex items-center gap-1.5 font-medium ${open ? "text-emerald-400" : "text-slate-500"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
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
  const color = isUp ? "text-emerald-400" : "text-red-400";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={() => onSelect(symbol)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(symbol); }}
      className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr] items-center gap-2 px-4 sm:px-6 py-4 border-b border-white/5 last:border-b-0 transition-colors duration-150 hover:bg-white/[0.03] cursor-pointer focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-[#00D3F2]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <StockAvatar symbol={symbol} />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-white font-semibold text-sm">{symbol}</span>
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

function WatchlistSection() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
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

  const handleSelect = (symbol) => navigate(`/realtimedashboard/astockdashboard/${symbol}`);

  return (
    <section>
      <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-white tracking-tight leading-snug">My Watchlist</h2>
          <div className="mt-2">
            <MarketStatusPill marketStatus={marketStatus} lastUpdated={lastUpdated} />
          </div>
        </div>
        <ViewAllLink onClick={() => navigate("/watchlist")}>View Full Watchlist →</ViewAllLink>
      </div>

      <div className={`${CARD_DOMINANT} overflow-hidden`}>
        <div className="grid grid-cols-[2.2fr_1fr_1fr_1.2fr] gap-2 px-4 sm:px-6 py-3.5 text-xs text-slate-500 uppercase tracking-widest bg-white/[0.03]">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">% Change</span>
          <span className="text-right">Trend (1D)</span>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 sm:px-6 py-4 border-b border-white/5 last:border-b-0">
            <Skeleton style={{ height: 34 }} />
          </div>
        ))}

        {!loading && !userId && (
          <div className="px-6 py-14 text-center text-sm text-slate-500">Log in to see your watchlist.</div>
        )}

        {!loading && userId && symbols.length === 0 && (
          <div className="px-6 py-14 flex flex-col items-center text-center">
            <div className="relative w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full bg-white/[0.03]" />
              <div className="absolute inset-[7px] rounded-full bg-white/[0.05] flex items-center justify-center">
                <Eye size={22} className="text-slate-400" />
              </div>
            </div>
            <p className="text-white font-semibold text-base mb-1.5">Start building your watchlist</p>
            <p className="text-sm text-slate-500 mb-6 max-w-sm">
              Track stocks you're interested in and receive AI insights on how they're moving.
            </p>
            <PrimaryButton onClick={() => navigate("/watchlist")}>+ Add Stocks</PrimaryButton>
            <div className="mt-8 w-full">
              <p className="text-xs uppercase tracking-wide text-slate-600 mb-3">Suggested for you</p>
              <div className="flex flex-wrap justify-center gap-2">
                {POPULAR_SYMBOLS.slice(0, 5).map((sym) => (
                  <button
                    key={sym}
                    onClick={() => handleSelect(sym)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] text-slate-300 ring-1 ring-white/5 transition-colors duration-150 hover:bg-white/[0.08] hover:text-[#00D3F2] cursor-pointer"
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
  const color = isUp ? "text-emerald-400" : "text-red-400";
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  return (
    <div
      onClick={() => onSelect(symbol)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onSelect(symbol); }}
      className={`group flex flex-col gap-3 shrink-0 w-[216px] cursor-pointer ${CARD} ${CARD_HOVER} ${CARD_GLOW_HOVER} hover:ring-[#00D3F2]/30 p-5 ${FOCUS_RING}`}
    >
      <div className="flex items-center gap-3">
        <StockAvatar symbol={symbol} size={34} />
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{shortCompanyName(symbol)}</p>
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

  const handleSelect = (symbol) => navigate(`/realtimedashboard/astockdashboard/${symbol}`);

  return (
    <section>
      <SectionHeader title="Popular Stocks" subtitle="Trending picks investors are watching right now" />

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0" style={{ width: 216, height: 172, borderRadius: 16 }} />
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
            style={{ background: "linear-gradient(to right, transparent, rgba(8,15,35,0.9))" }}
          />
        </div>
      )}
    </section>
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
      className={`group flex flex-col justify-between cursor-pointer ${primary ? CARD_DOMINANT : CARD} ${CARD_HOVER} ${CARD_GLOW_HOVER} ${a.ring} ${FOCUS_RING} ${primary ? "lg:col-span-2 p-7" : "p-6"}`}
    >
      <div>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className={`flex items-center justify-center rounded-xl ${a.icon} ${primary ? "w-12 h-12" : "w-10 h-10"}`}>
            <Icon size={primary ? 22 : 19} />
          </div>
          <span className={`text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${a.badge}`}>
            {badge}
          </span>
        </div>
        <h3 className={`text-white font-semibold mb-1.5 ${primary ? "text-xl" : "text-lg"}`}>{title}</h3>
        <p className="text-[15px] text-slate-400 leading-relaxed">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#00D3F2] transition-all duration-200 group-hover:gap-2.5">
        {cta} <ArrowRight size={14} />
      </div>
    </div>
  );
}

function PlatformFeaturesSection() {
  return (
    <section>
      <SectionHeader title="Explore RocketTrade" subtitle="Everything the platform offers, all in one place" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORM_FEATURES.map((feature) => (
          <PlatformFeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </section>
  );
}

function LoggedInHomePage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const name = currentUser?.username || currentUser?.full_name || "Investor";
  const { stocks } = useLiveStocks();
  const portfolioData = usePortfolioData(userId, stocks);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-10 py-6 md:py-8 flex flex-col gap-8 divide-y divide-white/[0.06]">
        <Hero name={name} portfolioData={portfolioData} />
        <AIInsightsSection portfolioData={portfolioData} />
        <PortfolioSummarySection portfolioData={portfolioData} userId={userId} />
        <WatchlistSection />
        <PopularStocksSection />
        <PlatformFeaturesSection />
      </main>
      <Footer />
    </motion.div>
  );
}

export default LoggedInHomePage;
