import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import useLiveStocks from "../../api/useLiveStocks.js";
import { memo, useCallback, useMemo, useState } from "react";
import MiniChart from "../../components/MiniChart.jsx";
import { useNavigate } from "react-router-dom";
function SearchBar({ onSearch }) {
  const [inputValue, setInputValue] = useState("");
  const handleSearch = () => onSearch(inputValue);

  return (
    <div className="flex items-center gap-3 pt-5">
      <div className="relative flex-1">
        <input
          type="text"
          placeholder="Search stocks..."
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
        className="px-6 h-10 text-white font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap"
        style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
      >
        Search
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
    META: "Meta", AMD: "AMD", NFLX: "Netflix", INTC: "Intel",
  };
  return names[symbol] ?? "";
}

const StockRow = memo(function StockRow({ stock, candles, onSelect }) {
  const chg = stock.price && stock.previousClose
    ? (stock.price - stock.previousClose).toFixed(3)
    : null;
  const pctChg =
    stock.price && stock.previousClose
      ? (((stock.price - stock.previousClose) / stock.previousClose) * 100).toFixed(2)
      : null;
  const isUp = chg === null ? true : Number(chg) >= 0;
  const color = isUp ? "text-green-400" : "text-red-400";

  return (
    <div onClick={() => onSelect(stock.symbol)}
      className="grid px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center"
      style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr" }} >
      {/* Symbol */}
      <div className="flex flex-col">
        <span className="text-white font-semibold text-sm">{stock.symbol}</span>
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
        <MiniChart candles={candles} width={100} height={40} />
      </span>
    </div>
  );
});

// ── StockTable now accepts candles too ──────────────────────────────────────
function StockTable({ stocks, candles }) {
  const stockList = Array.isArray(stocks) ? stocks : Object.values(stocks ?? {});
  const navigate = useNavigate();
  const handleSelect = useCallback((symbol) => {
    navigate(`/investor/realtimedashboard/astockdashboard/${symbol}`);
  }, [navigate]);

  return (
    <div className="w-full mt-6 overflow-x-auto rounded-xl border border-white/20">
      <div className="min-w-[560px]">

        {/* Header — 5 columns */}
        <div className="grid px-6 py-3 text-xs text-gray-400 uppercase tracking-widest border-b border-white/10 bg-white/5"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 2fr" }}>
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right">Change</span>
          <span className="text-right">% Change</span>
          <span className="text-center">Trend (1D)</span>
        </div>

        {/* Rows */}
        {stockList.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 text-sm">
            Waiting for data...
          </div>
        ) : (
          stockList.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              candles={candles?.[stock.symbol]}
              onSelect={handleSelect}
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

  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();

    return Object.values(stocks ?? {}).filter((s) =>
      s.symbol.toLowerCase().includes(query)
    );
  }, [stocks, searchQuery]);

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} >
      <GeneralHeader />
      <main className="flex-1 p-4 md:p-7">
        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
          Real-Time Dashboard</h1>
        <MarketStatus marketStatus={marketStatus} lastUpdated={lastUpdated} />
        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}

        <SearchBar onSearch={setSearchQuery} />
        {/* Pass candles so each row can render its sparkline */}
        <StockTable stocks={filtered} candles={candles} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default RealTimeDashBoardPage;
