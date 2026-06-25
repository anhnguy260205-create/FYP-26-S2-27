import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import useLiveStocks from "../../api/useLiveStocks.js";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import MiniChart from "../../components/MiniChart.jsx";
import { useNavigate } from "react-router-dom";
import { fetchStockSnapshot, fetchStockCandles } from "../../api/stockApi.js";

const STOCK_POOL = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AVGO", "ORCL", "AMD"];

const STOCK_SPECIALTIES = {
  "AI & Chips":        ["NVDA", "AMD", "AVGO"],
  "Cloud & Software":  ["MSFT", "ORCL", "GOOGL"],
  "Consumer Tech":     ["AAPL"],
  "Social & Ads":      ["META", "GOOGL"],
  "E-commerce":        ["AMZN"],
  "Electric Vehicles": ["TSLA"],
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
    AAPL: "Apple", TSLA: "Tesla", NVDA: "NVIDIA",
    MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
    META: "Meta", AMD: "AMD", AVGO: "Broadcom", ORCL: "Oracle",
  };
  return names[symbol] ?? "";
}

const StockRow = memo(function StockRow({ stock, candles, onSelect, isRecommended, isLive }) {
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
          : isRecommended ? "rgba(0,211,243,0.04)" : undefined,
        borderLeft: isLive
          ? "3px solid rgba(99,179,237,0.6)"
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
          {!isLive && isRecommended && (
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

function StockTable({ stocks, candles, recommendedSymbols, searchedStock, searchedCandles }) {
  const stockList = Array.isArray(stocks) ? stocks : Object.values(stocks ?? {});
  const navigate = useNavigate();
  const handleSelect = useCallback((symbol) => {
    navigate(`/investor/realtimedashboard/astockdashboard/${symbol}`);
  }, [navigate]);

  const sorted = useMemo(() => {
    if (!recommendedSymbols?.length) return stockList;
    return [
      ...stockList.filter(s => recommendedSymbols.includes(s.symbol)),
      ...stockList.filter(s => !recommendedSymbols.includes(s.symbol)),
    ];
  }, [stockList, recommendedSymbols]);

  return (
    <div className="w-full mt-6 overflow-x-auto rounded-xl border border-white/20">
      <div className="min-w-[560px]">
        <div className="grid px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/10 bg-white/5"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr" }}>
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">% Change</span>
          <span className="text-center">Trend (1D)</span>
        </div>

        {/* Live searched stock appears first */}
        {searchedStock && (
          <StockRow
            key={`live-${searchedStock.symbol}`}
            stock={searchedStock}
            candles={searchedCandles}
            onSelect={handleSelect}
            isRecommended={false}
            isLive={true}
          />
        )}

        {sorted.length === 0 && !searchedStock ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Waiting for data...
          </div>
        ) : (
          sorted.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              candles={candles?.[stock.symbol]}
              onSelect={handleSelect}
              isRecommended={recommendedSymbols?.includes(stock.symbol)}
              isLive={false}
            />
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
    // Read interests from localStorage — no API call needed.
    // Gets updated when the user saves Account Settings in their profile.
    const stored = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return stored.interests
      ? stored.interests.split(",").map(s => s.trim()).filter(Boolean)
      : [];
  });
  const navigate = useNavigate();

  const recommendedSymbols = useMemo(() => {
    if (!interests.length) return [];
    const symbols = new Set();
    interests.forEach(interest => {
      (STOCK_SPECIALTIES[interest] || []).forEach(s => symbols.add(s));
    });
    return [...symbols];
  }, [interests]);

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

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-4 md:p-7">

        <div className="flex items-baseline gap-4 flex-wrap">
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
            Real-Time Dashboard
          </h1>
        </div>

        <MarketStatus marketStatus={marketStatus} lastUpdated={lastUpdated} />
        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}

        {/* Active interest chips */}
        {interests.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Your interests:
            </span>
            {interests.map(s => (
              <span key={s} style={{
                padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                color: "#00D3F2", background: "rgba(0,211,243,0.1)", border: "1px solid rgba(0,211,243,0.3)",
              }}>
                {s}
              </span>
            ))}
            <button
              onClick={() => navigate("/investor/edit-profile")}
              style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Edit
            </button>
          </div>
        )}

        {interests.length === 0 && (
          <p style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            No interests set —{" "}
            <span onClick={() => navigate("/investor/edit-profile")}
              style={{ color: "#00D3F2", cursor: "pointer", textDecoration: "underline" }}>
              set your sector interests
            </span>
            {" "}to see personalised recommendations.
          </p>
        )}

        <SearchBar onSearch={handleSearch} loading={searchLoading} />

        {/* Search error */}
        {searchError && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#f87171" }}>{searchError}</p>
        )}

        <StockTable
          stocks={filtered}
          candles={candles}
          recommendedSymbols={recommendedSymbols}
          searchedStock={searchedStock}
          searchedCandles={searchedCandles}
        />
      </main>
      <Footer />
    </motion.div>
  );
}

export default RealTimeDashBoardPage;
