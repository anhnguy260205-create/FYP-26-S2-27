import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import useLiveStocks from "../../api/useLiveStocks.js";
import MiniChart from "../../components/MiniChart.jsx";
import { getWatchlist } from "../../api/userApi.js";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";
import { getPortfolio, getPortalSummary } from "../../api/tradingApi.js";
import { LineChart, Sparkles, Users, Bot, GraduationCap } from "lucide-react";

const QUICK_ACTIONS = [
  { Icon: LineChart, label: "Trade", to: "/realtimedashboard" },
  { Icon: Sparkles, label: "AI Predictions", to: "/investor/quantrating" },
  { Icon: Users, label: "Ask an Expert", to: "/investor/expertadvice" },
  { Icon: Bot, label: "AI Chatbot", to: "/investor/aichatbot" },
  { Icon: GraduationCap, label: "Learn", to: "/investor/educationcontent" },
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

function fmt$(n) {
  const abs = Math.abs(Number(n));
  return `${Number(n) < 0 ? "-" : ""}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtSigned$(n) {
  const v = Number(n);
  return `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Skeleton({ className, style }) {
  return <div className={`animate-pulse rounded-lg bg-white/5 ${className ?? ""}`} style={style} />;
}

function PortfolioStatCard({ label, value, highlighted, valueColor }) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{
        background: highlighted ? "rgba(0,211,243,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${highlighted ? "rgba(0,211,243,0.3)" : "rgba(255,255,255,0.08)"}`,
      }}
    >
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      <p
        style={{ fontFamily: "'DM Mono', monospace", fontSize: highlighted ? 22 : 18, fontWeight: 700 }}
        className={valueColor ?? "text-white"}
      >
        {value}
      </p>
    </div>
  );
}

function PortfolioSummarySection() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const userId = currentUser?.user_id;
  const { stocks } = useLiveStocks();

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

  if (!userId) return null;

  if (loading) {
    return (
      <section>
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 16px" }}>
          Portfolio Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 76 }} />
          ))}
        </div>
      </section>
    );
  }

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
  const totalValue = paperMoney + holdingsValue;
  const realisedPnL = summary?.realised_pnl ?? 0;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
          Portfolio Summary
        </h2>
        <button
          onClick={() => navigate("/investor/portfolio-overview")}
          className="text-sm font-semibold"
          style={{ color: "#00D3F2", background: "none", border: "none", cursor: "pointer" }}
        >
          View Full Portfolio →
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <PortfolioStatCard label="Total portfolio value" value={fmt$(totalValue)} highlighted />
        <PortfolioStatCard label="Available funds" value={fmt$(paperMoney)} />
        <PortfolioStatCard label="Unrealized P&L" value={fmtSigned$(unrealisedPnL)} valueColor={unrealisedPnL >= 0 ? "text-green-400" : "text-red-400"} />
        <PortfolioStatCard label="Realized P&L" value={fmtSigned$(realisedPnL)} valueColor={realisedPnL >= 0 ? "text-green-400" : "text-red-400"} />
      </div>
    </section>
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

function MarketStatusPill({ marketStatus, lastUpdated }) {
  const open = marketStatus === "OPEN";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
      <span className={open ? "text-green-400" : "text-gray-400"}>
        {open ? "🟢 Market Open" : "⚪ Market Closed"}
      </span>
      {lastUpdated && (
        <>
          <span className="text-gray-600">|</span>
          <span className="text-gray-500">Updated {lastUpdated}</span>
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
  const color = isUp ? "text-green-400" : "text-red-400";

  return (
    <div
      onClick={() => onSelect(symbol)}
      className="grid items-center px-4 sm:px-6 py-3.5 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
      style={{ gridTemplateColumns: "2fr 1fr 1fr 1.2fr" }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-white font-semibold text-sm">{symbol}</span>
        <span className="text-gray-500 text-xs truncate">{live?.name ?? COMPANY_NAMES[symbol] ?? "—"}</span>
      </div>
      <span className={`text-right font-medium text-sm ${color}`}>
        {price != null ? `$${price.toFixed(2)}` : "—"}
      </span>
      <span className={`text-right font-medium text-sm ${color}`}>
        {percent != null ? `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%` : "—"}
      </span>
      <span className="flex justify-end">
        {candles?.length > 0
          ? <MiniChart candles={candles} width={90} height={34} />
          : <span className="text-gray-600 text-xs">—</span>}
      </span>
    </div>
  );
}

function WatchlistSection() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
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
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            My Watchlist
          </h2>
          <div className="mt-1.5">
            <MarketStatusPill marketStatus={marketStatus} lastUpdated={lastUpdated} />
          </div>
        </div>
        <button
          onClick={() => navigate("/investor/watchlist")}
          className="text-sm font-semibold self-start sm:self-auto"
          style={{ color: "#00D3F2", background: "none", border: "none", cursor: "pointer" }}
        >
          View Full Watchlist →
        </button>
      </div>

      <div className="rounded-xl overflow-hidden border border-white/10">
        <div
          className="grid px-4 sm:px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/10 bg-white/5"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1.2fr" }}
        >
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">% Change</span>
          <span className="text-right">Trend (1D)</span>
        </div>

        {loading && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 sm:px-6 py-3.5 border-b border-white/5">
            <Skeleton style={{ height: 34 }} />
          </div>
        ))}

        {!loading && !userId && (
          <div className="px-6 py-10 text-center text-sm text-gray-500">Log in to see your watchlist.</div>
        )}

        {!loading && userId && symbols.length === 0 && (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500 mb-3">Your watchlist is empty.</p>
            <button
              onClick={() => navigate("/investor/watchlist")}
              className="text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "linear-gradient(90deg, #155dfc, #0092b8)", color: "white" }}
            >
              + Add Stocks
            </button>
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
        <p className="text-xs text-gray-500 mt-3 text-center">
          Showing 6 of {symbols.length} —{" "}
          <button onClick={() => navigate("/investor/watchlist")} className="underline" style={{ background: "none", border: "none", color: "#00D3F2", cursor: "pointer" }}>
            view all
          </button>
        </p>
      )}
    </section>
  );
}

function PopularStockCard({ symbol, snapshot, candles, onSelect }) {
  const price = snapshot?.p ?? null;
  const prev = snapshot?.previousClose ?? null;
  const change = price != null && prev != null ? price - prev : null;
  const percent = change != null && prev ? (change / prev) * 100 : null;
  const isUp = change === null ? true : change >= 0;

  return (
    <div
      onClick={() => onSelect(symbol)}
      className="flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02] shrink-0"
      style={{
        padding: "16px",
        borderRadius: "16px",
        background: "rgba(0,211,243,0.05)",
        border: "1px solid rgba(0,211,243,0.18)",
        width: 200,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{symbol}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, display: "block" }} className="truncate">
            {COMPANY_NAMES[symbol] ?? "—"}
          </span>
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 16, color: isUp ? "#4ade80" : "#f87171" }}>
          {price != null ? `$${price.toFixed(2)}` : "—"}
        </div>
        <div style={{ fontSize: 12, color: isUp ? "#4ade80" : "#f87171" }}>
          {percent != null ? `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%` : "—"}
        </div>
      </div>
      {candles?.length > 0
        ? <MiniChart candles={candles} width={160} height={36} />
        : <div style={{ height: 36 }} />}
    </div>
  );
}

function PopularStocksSection() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState({});
  const [candles, setCandles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      POPULAR_SYMBOLS.map((symbol) =>
        Promise.all([fetchStockSnapshot(symbol), fetchStockCandles(symbol, "1D")])
          .then(([snapRes, candlesRes]) => ({
            symbol,
            snapshot: snapRes.success ? snapRes.data : null,
            candles: candlesRes.success ? candlesRes.candles : [],
          }))
          .catch(() => ({ symbol, snapshot: null, candles: [] }))
      )
    ).then((results) => {
      if (cancelled) return;
      const nextSnapshots = {};
      const nextCandles = {};
      results.forEach((r) => { nextSnapshots[r.symbol] = r.snapshot; nextCandles[r.symbol] = r.candles; });
      setSnapshots(nextSnapshots);
      setCandles(nextCandles);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (symbol) => navigate(`/realtimedashboard/astockdashboard/${symbol}`);

  return (
    <section>
      <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>
        Popular Stocks
      </h2>
      <p className="text-xs text-gray-500 mb-4">Trending picks investors are watching right now</p>

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="shrink-0" style={{ width: 200, height: 128, borderRadius: 16 }} />
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

function WelcomeBanner() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const name = currentUser?.username || currentUser?.full_name || "Investor";
  return (
    <div>
      <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1.2 }}>
        Welcome back, {name}
      </h1>
      <p className="text-sm text-gray-400 mt-2">Here's what's happening with your watchlist today.</p>
    </div>
  );
}

function LoggedInHomePage() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-4 md:p-7 flex flex-col gap-8">
        <WelcomeBanner />
        <QuickActions />
        <PortfolioSummarySection />
        <WatchlistSection />
        <PopularStocksSection />
      </main>
      <Footer />
    </motion.div>
  );
}

export default LoggedInHomePage;
