import RoleHeader from "../../layout/RoleHeader.jsx";
import { isExpertUser, getPageBackground } from "../../utils/userRole.js";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import useLiveStocks from "../../api/useLiveStocks.js";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../../api/apiClient.js";
import MiniChart from "../../components/MiniChart.jsx";
import { useNavigate } from "react-router-dom";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";
import { Activity, TrendingUp, TrendingDown, Database } from "lucide-react";

// The 11 GICS primary sectors — every pool stock carries a matching
// `sector` field in its snapshot (set by the backend), used for filtering.
const GICS_SECTORS = [
  "Information Technology", "Communication Services", "Consumer Discretionary",
  "Financials", "Energy", "Real Estate", "Health Care", "Consumer Staples",
  "Industrials", "Materials", "Utilities",
];

// How many stocks "Recommended for You" shows. Candidates come from the
// user's interest sectors; stocks whose volatility bucket (computed by the
// backend: 3-month volatility tertiles → Conservative/Moderate/Aggressive)
// matches the user's risk tolerance rank first, then by 1-month momentum.
const RECOMMEND_COUNT = 8;
// Top Picks gets its own cap so it can't eat the whole RECOMMEND_COUNT
// budget — with 500+ stocks in the pool, risk-matched candidates alone
// routinely exceed 8, which used to starve "For You" completely.
const TOP_PICKS_COUNT = 4;

function SearchBar({ onSearch, loading }) {
  const [inputValue, setInputValue] = useState("");

  const handleSearch = () => onSearch(inputValue.trim().toUpperCase());

  return (
    <div className="flex items-center gap-3 pt-5">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search symbol (e.g. AAPL, NFLX)..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="w-full h-10 pl-12 pr-4 rounded-xl bg-white border border-[rgba(11,29,79,0.25)] text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#00D3F2]"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(15,23,42,0.4)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="px-6 h-10 text-white font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap disabled:opacity-50"
        style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,146,184,0.25)" }}
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </div>
  );
}

function MarketStatus({ marketStatus, lastUpdated }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={marketStatus === "OPEN" ? "text-emerald-600 font-medium" : "text-slate-500"}>
        {marketStatus === "OPEN" ? "🟢 Market Open" : "⚪ Market Closed"}
      </span>
      <span className="text-slate-400">|</span>
      <span className={marketStatus === "OPEN" ? "text-[#0092b8] font-medium" : "text-slate-500"}>
        {marketStatus === "OPEN" ? "Live Data" : "Offline Data"}
      </span>
      <span className="text-slate-400">|</span>
      <span className="text-slate-500">Last Updated: {lastUpdated}</span>
    </div>
  );
}

function StatTile({ icon: Icon, iconColor, iconBg, label, value, valueColor, sub }) {
  return (
    <div style={{
      flex: "1 1 150px", padding: "14px 16px", borderRadius: 14,
      background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          background: iconBg, color: iconColor, flexShrink: 0,
        }}>
          <Icon size={15} strokeWidth={2.25} />
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#5B6C88" }}>
          {label}
        </span>
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 800, color: valueColor || "#0B1D4F", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: valueColor || "#5B6C88", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function companyName(symbol) {
  const names = {
    AAPL: "Apple", MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    NVDA: "NVIDIA", META: "Meta", TSLA: "Tesla", AVGO: "Broadcom",
    ORCL: "Oracle", AMD: "AMD", CRM: "Salesforce", QCOM: "Qualcomm",
    ADBE: "Adobe", NFLX: "Netflix", DIS: "Disney", NKE: "Nike",
    MCD: "McDonald's", HD: "Home Depot", JPM: "JPMorgan", BAC: "Bank of America",
    V: "Visa", MA: "Mastercard", XOM: "ExxonMobil", CVX: "Chevron",
    COP: "ConocoPhillips", AMT: "American Tower", PLD: "Prologis", O: "Realty Income",
  };
  return names[symbol] ?? "";
}

const StockRow = memo(function StockRow({ stock, candles, onSelect, isRecommended, isTopPick, isLive }) {
  const chg = stock.price && stock.previousClose
    ? (stock.price - stock.previousClose).toFixed(3)
    : null;
  const pctChg = stock.price && stock.previousClose
    ? (((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(2)
    : null;
  const isUp = chg === null ? true : Number(chg) >= 0;
  const color = isUp ? "text-emerald-600" : "text-red-600";

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className="grid px-6 py-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors items-center"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr",
        background: isLive
          ? "rgba(29,78,216,0.05)"
          : isTopPick ? "rgba(180,83,9,0.05)"
            : isRecommended ? "rgba(0,211,243,0.05)" : undefined,
        borderLeft: isLive
          ? "3px solid rgba(29,78,216,0.6)"
          : isTopPick ? "3px solid rgba(180,83,9,0.6)"
            : isRecommended ? "3px solid rgba(0,211,243,0.5)" : "3px solid transparent",
        cursor: "pointer",
      }}
    >
      {/* Symbol */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-slate-900 font-semibold text-sm">{stock.symbol}</span>
          {isLive && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 20,
              color: "#1D4ED8", background: "rgba(29,78,216,0.1)", border: "1px solid rgba(29,78,216,0.3)",
            }}>
              Live Search
            </span>
          )}
          {!isLive && isTopPick && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 20,
              color: "#B45309", background: "rgba(180,83,9,0.12)", border: "1px solid rgba(180,83,9,0.35)",
            }}>
              Top Pick
            </span>
          )}
          {!isLive && !isTopPick && isRecommended && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 20,
              color: "#00D3F2", background: "rgba(0,211,243,0.12)", border: "1px solid rgba(0,211,243,0.3)",
            }}>
              For You
            </span>
          )}
        </div>
        <span className="text-slate-500 text-xs">{stock.name ?? companyName(stock.symbol)}</span>
      </div>

      {/* Price */}
      <span className={`text-right font-medium text-sm ${color}`}>
        {stock.price?.toFixed(3) ?? "—"}
      </span>

      {/* Chg */}
      <span className={`text-right font-medium text-sm ${color}`}>
        {chg !== null ? (isUp ? "+" : "") + chg : "—"}
      </span>

      {/* % Chg */}
      <span className={`text-right font-medium text-sm ${color}`}>
        {pctChg !== null ? (isUp ? "+" : "") + pctChg + "%" : "—"}
      </span>

      {/* Trend sparkline */}
      <span className="flex justify-center items-center">
        {candles?.length > 0
          ? <MiniChart candles={candles} width={100} height={40} />
          : <span className="text-slate-400 text-xs">—</span>
        }
      </span>
    </div>
  );
});

/* ── Recommended stock card (grid layout) ───────────────────── */
const StockCard = memo(function StockCard({ stock, candles, onSelect, isTopPick }) {
  const chg = stock.price && stock.previousClose
    ? (stock.price - stock.previousClose).toFixed(2) : null;
  const pctChg = stock.price && stock.previousClose
    ? (((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(2) : null;
  const isUp = chg === null ? true : Number(chg) >= 0;

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className="flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.02]"
      style={{
        padding: "16px",
        borderRadius: "16px",
        background: isTopPick ? "rgba(180,83,9,0.06)" : "rgba(0,211,243,0.06)",
        border: isTopPick ? "1px solid rgba(180,83,9,0.3)" : "1px solid rgba(0,211,243,0.22)",
        minWidth: 0,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{stock.symbol}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 20,
              color: isTopPick ? "#B45309" : "#00D3F2",
              background: isTopPick ? "rgba(180,83,9,0.12)" : "rgba(0,211,243,0.12)",
              border: isTopPick ? "1px solid rgba(180,83,9,0.3)" : "1px solid rgba(0,211,243,0.25)",
            }}>
              {isTopPick ? "Top Pick" : "For You"}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "#5B6C88", marginTop: 2, display: "block" }}>{stock.name ?? companyName(stock.symbol)}</span>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontWeight: 600, fontSize: 14, color: isUp ? "#0F9D58" : "#DC2626" }}>
            ${stock.price?.toFixed(2) ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: isUp ? "#0F9D58" : "#DC2626" }}>
            {pctChg !== null ? (isUp ? "+" : "") + pctChg + "%" : "—"}
          </div>
        </div>
      </div>
      {candles?.length > 0 && (
        <MiniChart candles={candles} width={120} height={36} />
      )}
    </div>
  );
});

/* ── Browse stock table row ─────────────────────────────────── */
function StockTableSection({ stocks, candles, categoryFilter, searchedStock, searchedCandles }) {
  const stockList = Array.isArray(stocks) ? stocks : Object.values(stocks ?? {});
  const navigate = useNavigate();
  const handleSelect = useCallback((symbol) => {
    navigate(`/realtimedashboard/astockdashboard/${symbol}`);
  }, [navigate]);

  const filtered = useMemo(() => {
    const bySector = !categoryFilter || categoryFilter === "All"
      ? stockList
      : stockList.filter(s => s.sector === categoryFilter);
    return [...bySector]
      .sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
      .slice(0, 10);
  }, [stockList, categoryFilter]);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="min-w-140">
        <div className="grid px-6 py-3 text-xs text-slate-500 uppercase tracking-widest border-b border-slate-200 bg-slate-50"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr" }}>
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">% Change</span>
          <span className="text-center">Trend (1D)</span>
        </div>
        {searchedStock && (
          <StockRow stock={searchedStock} candles={searchedCandles} onSelect={handleSelect} isLive={true} />
        )}
        {filtered.length === 0 && !searchedStock ? (
          <div className="px-6 py-8 text-center text-slate-500 text-sm">Waiting for data…</div>
        ) : (
          filtered.map(stock => (
            <StockRow key={stock.symbol} stock={stock} candles={candles?.[stock.symbol]} onSelect={handleSelect} />
          ))
        )}
      </div>
    </div>
  );
}

function RealTimeDashBoardPage() {
  const { stocks, candles, marketStatus, lastUpdated, error } = useLiveStocks();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedStock, setSearchedStock] = useState(null);
  const [searchedCandles, setSearchedCandles] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [interests, setInterests] = useState(() => {
    const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return stored.interests
      ? stored.interests.split(",").map(s => s.trim()).filter(Boolean)
      : [];
  });
  const [riskTolerance, setRiskTolerance] = useState(() => {
    const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    return stored.risk_tolerance || "";
  });
  const [browseCategory, setBrowseCategory] = useState("All");
  const navigate = useNavigate();
  // Merged roles: everyone (including verified experts) edits their profile
  // via the investor profile page — /expert/edit-profile is no longer routed.
  const editProfilePath = "/investor/edit-profile";

  useEffect(() => {
    const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const userId = stored.user_id;
    if (!userId) return;
    // This dashboard is shared between investors and experts — each role's
    // interests/risk tolerance live on a different record, so fetch the
    // right one instead of always assuming investor.
    const isExpert = isExpertUser(stored);
    const endpoint = isExpert ? "expert-information" : "investor-information";
    const infoKey = isExpert ? "expert_information" : "investor_information";
    authFetch(`${import.meta.env.VITE_API_URL}/user/${endpoint}/${userId}`)
      .then(r => r.json())
      .then(data => {
        const info = data?.[infoKey];
        if (!info) return;
        const freshInterests = info.interests
          ? info.interests.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        const freshRisk = info.risk_tolerance || "";
        setInterests(freshInterests);
        setRiskTolerance(freshRisk);
        // keep localStorage in sync so other pages see the latest values
        const updated = { ...stored, interests: info.interests || "", risk_tolerance: freshRisk };
        sessionStorage.setItem("currentUser", JSON.stringify(updated));
      })
      .catch(() => { });
  }, []);

  const { topPicks, forYou } = useMemo(() => {
    if (!interests.length) return { topPicks: [], forYou: [] };
    const interestSet = new Set(interests);
    const byMomentum = (a, b) => (b.mom21 ?? -Infinity) - (a.mom21 ?? -Infinity);

    const pool = Object.values(stocks ?? {}).filter(s => interestSet.has(s.sector));
    const riskMatched = riskTolerance
      ? pool.filter(s => s.risk === riskTolerance).sort(byMomentum)
      : [];
    const riskSet = new Set(riskMatched.map(s => s.symbol));
    const others = pool.filter(s => !riskSet.has(s.symbol)).sort(byMomentum);

    // Top Picks (risk-matched) and For You (rest of the sector pool) each
    // get their own slice, so a large risk-matched pool can't crowd out
    // For You entirely.
    const topPicks = riskMatched.slice(0, TOP_PICKS_COUNT);
    const forYou = others.slice(0, RECOMMEND_COUNT - topPicks.length);
    return { topPicks, forYou };
  }, [stocks, interests, riskTolerance]);

  async function handleSearch(sym) {
    setSearchError("");

    if (!sym) {
      setSearchQuery("");
      setSearchedStock(null);
      setSearchedCandles([]);
      return;
    }

    setSearchQuery(sym);

    // Symbol is in the pool — just filter, no API call
    if (stocks?.[sym]) {
      setSearchedStock(null);
      setSearchedCandles([]);
      return;
    }

    // Unknown symbol — fetch snapshot + candles in parallel from yfinance
    setSearchLoading(true);
    setSearchedStock(null);
    setSearchedCandles([]);
    try {
      const [snapRes, candlesRes] = await Promise.all([
        fetchStockSnapshot(sym),
        fetchStockCandles(sym, "1D"),
      ]);
      if (!snapRes.success) {
        setSearchError(`No data found for "${sym}"`);
      } else {
        const d = snapRes.data;
        setSearchedStock({
          symbol: d.s,
          price: d.p,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          previousClose: d.previousClose,
          volume: d.volume,
          avgVolume: d.avgVolume,
        });
        if (candlesRes.success) setSearchedCandles(candlesRes.candles);
      }
    } catch {
      setSearchError("Could not reach backend.");
    } finally {
      setSearchLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!searchQuery) return Object.values(stocks ?? {});
    // Only filter pool stocks by the query
    return Object.values(stocks ?? {}).filter(s =>
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stocks, searchQuery]);
  const [currentUser] = useState(() => JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}"));
  const isExpert = isExpertUser(currentUser);

  const browseTabs = ["All", ...GICS_SECTORS];

  const marketStats = useMemo(() => {
    const list = Object.values(stocks ?? {});
    let topGainer = null, topLoser = null;
    list.forEach(s => {
      if (s.price == null || !s.previousClose) return;
      const pct = ((s.price - s.previousClose) / s.previousClose) * 100;
      if (!topGainer || pct > topGainer.pct) topGainer = { symbol: s.symbol, pct };
      if (!topLoser || pct < topLoser.pct) topLoser = { symbol: s.symbol, pct };
    });
    return { stocksTracked: list.length, topGainer, topLoser };
  }, [stocks]);

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{ background: getPageBackground() }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
    >
      <RoleHeader />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>

        {/* ── Page header ────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
              background: marketStatus === "OPEN" ? "#0F9D58" : "#94A3B8",
              boxShadow: marketStatus === "OPEN" ? "0 0 0 5px rgba(15,157,88,0.18)" : "none",
            }} className={marketStatus === "OPEN" ? "animate-pulse" : ""} />
            <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, letterSpacing: "0.04em", color: "#0B1D4F", margin: 0, lineHeight: 1 }}>
              Real-Time Dashboard
            </h1>
          </div>
          <div className="mt-2">
            <MarketStatus marketStatus={marketStatus} lastUpdated={lastUpdated} />
          </div>
          {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
        </div>

        {/* ── Stat highlight row ─────────────────────────────── */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
          <StatTile
            icon={Database} iconColor="#0092b8" iconBg="rgba(0,146,184,0.12)"
            label="Stocks Tracked" value={marketStats.stocksTracked || "—"}
          />
          <StatTile
            icon={TrendingUp} iconColor="#0F9D58" iconBg="rgba(15,157,88,0.12)"
            label="Top Gainer" valueColor="#0F9D58"
            value={marketStats.topGainer ? marketStats.topGainer.symbol : "—"}
            sub={marketStats.topGainer ? `+${marketStats.topGainer.pct.toFixed(2)}%` : undefined}
          />
          <StatTile
            icon={TrendingDown} iconColor="#DC2626" iconBg="rgba(220,38,38,0.12)"
            label="Top Loser" valueColor="#DC2626"
            value={marketStats.topLoser ? marketStats.topLoser.symbol : "—"}
            sub={marketStats.topLoser ? `${marketStats.topLoser.pct.toFixed(2)}%` : undefined}
          />
          <StatTile
            icon={Activity}
            iconColor={marketStatus === "OPEN" ? "#0F9D58" : "#5B6C88"}
            iconBg={marketStatus === "OPEN" ? "rgba(15,157,88,0.12)" : "rgba(91,108,136,0.12)"}
            label="Market" valueColor={marketStatus === "OPEN" ? "#0F9D58" : "#5B6C88"}
            value={marketStatus === "OPEN" ? "Open" : "Closed"}
          />
        </div>

        {/* ── Section 1: Recommended ─────────────────────────── */}
        <section>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#0B1D4F", margin: 0 }}>
                Recommended for You
              </h2>
              <p className="text-xs text-slate-500 mt-1">Based on your sector interests and risk tolerance</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {interests.map(s => (
                <span key={s} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#00D3F2", background: "rgba(0,211,243,0.1)", border: "1px solid rgba(0,211,243,0.25)" }}>{s}</span>
              ))}
              {riskTolerance && (
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#B45309", background: "rgba(180,83,9,0.1)", border: "1px solid rgba(180,83,9,0.3)" }}>{riskTolerance} Risk</span>
              )}

            </div>
          </div>

          {interests.length === 0 ? (
            <div style={{ padding: "32px", borderRadius: "16px", background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)", textAlign: "center" }}>
              <p className="text-slate-500 text-sm">No sector interests set yet.</p>
              <button onClick={() => navigate(editProfilePath)}
                className="mt-3 text-sm font-semibold"
                style={{ color: "#0092b8", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Set your interests and risk tolerance →
              </button>
            </div>
          ) : (
            <div style={{ padding: "clamp(14px, 3vw, 24px)", borderRadius: "20px", background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)" }}>

              {/* Top Picks — sector + risk-tolerance match, momentum-ranked */}
              {topPicks.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#B45309" }}>★ Top Picks</span>
                    <span className="hidden sm:inline" style={{ fontSize: 12, color: "#5B6C88" }}>— matches your sector + risk tolerance, ranked by 1-month momentum</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                    {topPicks.map(stock => (
                      <StockCard key={stock.symbol} stock={stock} candles={candles?.[stock.symbol]}
                        onSelect={s => navigate(`/realtimedashboard/astockdashboard/${s}`)}
                        isTopPick={true} />
                    ))}
                  </div>
                </div>
              )}

              {/* Sector matches (different risk bucket) filling up to 8 */}
              {forYou.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#0092b8" }}>For You</span>
                    <span className="hidden sm:inline" style={{ fontSize: 12, color: "#5B6C88" }}>— in your selected sectors</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                    {forYou.map(stock => (
                      <StockCard key={stock.symbol} stock={stock} candles={candles?.[stock.symbol]}
                        onSelect={s => navigate(`/realtimedashboard/astockdashboard/${s}`)}
                        isTopPick={false} />
                    ))}
                  </div>
                </div>
              )}

              {topPicks.length === 0 && forYou.length === 0 && (
                <p style={{ color: "#5B6C88", fontSize: 14, textAlign: "center", padding: "16px 0" }}>No stocks match your current interests.</p>
              )}
            </div>
          )}
        </section>

        {/* ── Section 2: Browse by sector ────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#0B1D4F", margin: 0 }}>
                Browse Stocks
              </h2>
              <p className="text-xs text-slate-500 mt-1">Top 10 most popular by volume — filter by sector or search any symbol</p>
            </div>
          </div>

          {/* Category tabs — horizontal scroll on mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {browseTabs.map(tab => (
              <button key={tab} onClick={() => setBrowseCategory(tab)}
                style={{
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: browseCategory === tab ? "linear-gradient(90deg,#0092b8,#155dfc)" : "#F1F5F9",
                  border: browseCategory === tab ? "none" : "1px solid rgba(11,29,79,0.15)",
                  color: browseCategory === tab ? "#fff" : "#33477A",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <SearchBar onSearch={handleSearch} loading={searchLoading} />
          {searchError && <p style={{ marginTop: 8, fontSize: 12, color: "#DC2626" }}>{searchError}</p>}

          <div className="mt-4">
            <StockTableSection
              stocks={filtered}
              candles={candles}
              categoryFilter={browseCategory}
              searchedStock={searchedStock}
              searchedCandles={searchedCandles}
            />
          </div>
        </section>

      </main>
      <Footer />
    </motion.div>
  );
}

export default RealTimeDashBoardPage;
