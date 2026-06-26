import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import useLiveStocks from "../../api/useLiveStocks.js";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import MiniChart from "../../components/MiniChart.jsx";
import { useNavigate } from "react-router-dom";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";

const STOCK_POOL = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "AMD",
  "CRM", "QCOM", "ADBE", "NFLX", "DIS", "NKE", "MCD", "HD",
  "JPM", "BAC", "V", "MA", "XOM", "CVX", "COP", "AMT", "PLD", "O",
];

const STOCK_SPECIALTIES = {
  "Information Technology": ["NVDA", "AMD", "AVGO", "MSFT", "ORCL", "AAPL", "CRM", "QCOM", "ADBE"],
  "Communication Services": ["META", "GOOGL", "NFLX", "DIS"],
  "Consumer Discretionary": ["AMZN", "TSLA", "NKE", "MCD", "HD"],
  "Financials": ["JPM", "BAC", "V", "MA"],
  "Energy": ["XOM", "CVX", "COP"],
  "Real Estate": ["AMT", "PLD", "O"],
};

const STOCK_RISK = {
  Conservative: ["AAPL", "MSFT", "ORCL", "JPM", "BAC", "V", "MA", "XOM", "CVX", "AMT", "PLD", "O", "MCD", "DIS"],
  Moderate: ["GOOGL", "META", "AVGO", "CRM", "ADBE", "AMZN", "HD", "NKE", "COP", "DIS"],
  Aggressive: ["NVDA", "AMD", "TSLA", "QCOM", "NFLX", "COP", "META", "AMZN"],
};

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
          className="w-full h-10 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 outline-none"
        />
        <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <button
        type="button"
        onClick={handleSearch}
        disabled={loading}
        className="px-6 h-10 text-white font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap disabled:opacity-50"
        style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </div>
  );
}

function MarketStatus({ marketStatus, lastUpdated }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={marketStatus === "OPEN" ? "text-green-400" : "text-gray-400"}>
        {marketStatus === "OPEN" ? "🟢 Market Open" : "⚪ Market Closed"}
      </span>
      <span className="text-gray-500">|</span>
      <span className={marketStatus === "OPEN" ? "text-cyan-400" : "text-gray-400"}>
        {marketStatus === "OPEN" ? "Live Data" : "Offline Data"}
      </span>
      <span className="text-gray-500">|</span>
      <span className="text-gray-400">Last Updated: {lastUpdated}</span>
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
  const color = isUp ? "text-green-400" : "text-red-400";

  return (
    <div
      onClick={() => onSelect(stock.symbol)}
      className="grid px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
      style={{
        gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr",
        background: isLive
          ? "rgba(99,179,237,0.05)"
          : isTopPick ? "rgba(250,204,21,0.04)"
            : isRecommended ? "rgba(0,211,243,0.04)" : undefined,
        borderLeft: isLive
          ? "3px solid rgba(99,179,237,0.6)"
          : isTopPick ? "3px solid rgba(250,204,21,0.7)"
            : isRecommended ? "3px solid rgba(0,211,243,0.5)" : "3px solid transparent",
        cursor: "pointer",
      }}
    >
      {/* Symbol */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">{stock.symbol}</span>
          {isLive && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 20,
              color: "#63b3ed", background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.3)",
            }}>
              Live Search
            </span>
          )}
          {!isLive && isTopPick && (
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "2px 7px", borderRadius: 20,
              color: "#fbbf24", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)",
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
        <span className="text-gray-500 text-xs">{companyName(stock.symbol)}</span>
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
          : <span className="text-gray-600 text-xs">—</span>
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
        background: isTopPick ? "rgba(251,191,36,0.07)" : "rgba(0,211,243,0.05)",
        border: isTopPick ? "1px solid rgba(251,191,36,0.28)" : "1px solid rgba(0,211,243,0.18)",
        minWidth: 0,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{stock.symbol}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
              padding: "2px 6px", borderRadius: 20,
              color: isTopPick ? "#fbbf24" : "#00D3F2",
              background: isTopPick ? "rgba(251,191,36,0.12)" : "rgba(0,211,243,0.12)",
              border: isTopPick ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(0,211,243,0.25)",
            }}>
              {isTopPick ? "Top Pick" : "For You"}
            </span>
          </div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2, display: "block" }}>{companyName(stock.symbol)}</span>
        </div>
        <div className="text-right shrink-0">
          <div style={{ fontWeight: 600, fontSize: 14, color: isUp ? "#4ade80" : "#f87171" }}>
            ${stock.price?.toFixed(2) ?? "—"}
          </div>
          <div style={{ fontSize: 12, color: isUp ? "#4ade80" : "#f87171" }}>
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
    navigate(`/investor/realtimedashboard/astockdashboard/${symbol}`);
  }, [navigate]);

  const filtered = useMemo(() => {
    if (!categoryFilter || categoryFilter === "All") return stockList;
    const inCategory = new Set(STOCK_SPECIALTIES[categoryFilter] || []);
    return stockList.filter(s => inCategory.has(s.symbol));
  }, [stockList, categoryFilter]);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10">
      <div className="min-w-140">
        <div className="grid px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/10 bg-white/5"
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
          <div className="px-6 py-8 text-center text-gray-500 text-sm">Waiting for data…</div>
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
    const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return stored.interests
      ? stored.interests.split(",").map(s => s.trim()).filter(Boolean)
      : [];
  });
  const [riskTolerance, setRiskTolerance] = useState(() => {
    const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return stored.risk_tolerance || "";
  });
  const [browseCategory, setBrowseCategory] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const userId = stored.user_id;
    if (!userId) return;
    fetch(`${import.meta.env.VITE_API_URL}/investor-information/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (!data?.investor_information) return;
        const info = data.investor_information;
        const freshInterests = info.interests
          ? info.interests.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        const freshRisk = info.risk_tolerance || "";
        setInterests(freshInterests);
        setRiskTolerance(freshRisk);
        // keep localStorage in sync so other pages see the latest values
        const updated = { ...stored, interests: info.interests || "", risk_tolerance: freshRisk };
        localStorage.setItem("currentUser", JSON.stringify(updated));
      })
      .catch(() => {});
  }, []);

  const { sectorSymbols, topPickSymbols } = useMemo(() => {
    if (!interests.length) return { sectorSymbols: [], topPickSymbols: [] };
    const sector = new Set();
    interests.forEach(interest => {
      (STOCK_SPECIALTIES[interest] || []).forEach(s => sector.add(s));
    });
    const sectorArr = [...sector];
    if (!riskTolerance) return { sectorSymbols: sectorArr, topPickSymbols: [] };
    const riskSet = new Set(STOCK_RISK[riskTolerance] || []);
    const top = sectorArr.filter(s => riskSet.has(s));
    return { sectorSymbols: sectorArr, topPickSymbols: top };
  }, [interests, riskTolerance]);

  const recommendedSymbols = sectorSymbols;

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
    if (STOCK_POOL.includes(sym)) {
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

  const allSectors = ["All", ...Object.keys(STOCK_SPECIALTIES)];
  const browseTabs = allSectors;

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-4 md:p-7 flex flex-col gap-8">

        {/* ── Page header ────────────────────────────────────── */}
        <div>
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: "clamp(20px, 5vw, 30px)", fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
            Real-Time Dashboard
          </h1>
          <div className="mt-2">
            <MarketStatus marketStatus={marketStatus} lastUpdated={lastUpdated} />
          </div>
          {error && <div className="mt-2 text-red-400 text-sm">{error}</div>}
        </div>

        {/* ── Section 1: Recommended ─────────────────────────── */}
        <section>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                Recommended for You
              </h2>
              <p className="text-xs text-gray-500 mt-1">Based on your sector interests and risk tolerance</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {interests.map(s => (
                <span key={s} style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#00D3F2", background: "rgba(0,211,243,0.1)", border: "1px solid rgba(0,211,243,0.25)" }}>{s}</span>
              ))}
              {riskTolerance && (
                <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}>{riskTolerance} Risk</span>
              )}
              <button onClick={() => navigate("/investor/edit-profile")}
                style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Edit profile
              </button>
            </div>
          </div>

          {interests.length === 0 ? (
            <div style={{ padding: "32px", borderRadius: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
              <p className="text-gray-400 text-sm">No sector interests set yet.</p>
              <button onClick={() => navigate("/investor/edit-profile")}
                className="mt-3 text-sm font-semibold"
                style={{ color: "#00D3F2", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                Set your interests and risk tolerance →
              </button>
            </div>
          ) : (
            <div style={{ padding: "clamp(14px, 3vw, 24px)", borderRadius: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>

              {/* Top Picks */}
              {topPickSymbols.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#fbbf24" }}>★ Top Picks</span>
                    <span className="hidden sm:inline" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>— matches your sector + risk tolerance</span>
                  </div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                    {topPickSymbols.map(sym => {
                      const stock = Object.values(stocks ?? {}).find(s => s.symbol === sym);
                      if (!stock) return null;
                      return (
                        <StockCard key={sym} stock={stock} candles={candles?.[sym]}
                          onSelect={s => navigate(`/investor/realtimedashboard/astockdashboard/${s}`)}
                          isTopPick={true} />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sector matches (non-top-pick) */}
              {(() => {
                const sectorOnly = sectorSymbols.filter(s => !topPickSymbols.includes(s));
                if (!sectorOnly.length) return null;
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#00D3F2" }}>For You</span>
                      <span className="hidden sm:inline" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>— in your selected sectors</span>
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
                      {sectorOnly.map(sym => {
                        const stock = Object.values(stocks ?? {}).find(s => s.symbol === sym);
                        if (!stock) return null;
                        return (
                          <StockCard key={sym} stock={stock} candles={candles?.[sym]}
                            onSelect={s => navigate(`/investor/realtimedashboard/astockdashboard/${s}`)}
                            isTopPick={false} />
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {sectorSymbols.length === 0 && (
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14, textAlign: "center", padding: "16px 0" }}>No stocks match your current interests.</p>
              )}
            </div>
          )}
        </section>

        {/* ── Section 2: Browse by sector ────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                Browse Stocks
              </h2>
              <p className="text-xs text-gray-500 mt-1">Filter by sector or search any symbol</p>
            </div>
          </div>

          {/* Category tabs — horizontal scroll on mobile */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {browseTabs.map(tab => (
              <button key={tab} onClick={() => setBrowseCategory(tab)}
                style={{
                  padding: "6px 16px", borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  background: browseCategory === tab ? "linear-gradient(90deg,#0092b8,#155dfc)" : "rgba(255,255,255,0.05)",
                  border: browseCategory === tab ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: browseCategory === tab ? "#fff" : "rgba(255,255,255,0.5)",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <SearchBar onSearch={handleSearch} loading={searchLoading} />
          {searchError && <p style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>{searchError}</p>}

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
