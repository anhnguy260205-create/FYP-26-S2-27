import GeneralHeader from "../../components/GeneralHeader.jsx";
import Footer from "../../components/Footer.jsx";
import { motion } from "framer-motion";
import useLiveStocks from "../../api/useLiveStocks.js";
import { useState } from "react";

function SearchBar({ stocks }) {
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const stockList = Object.values(stocks);
  const filtered = stockList.filter((s) =>
    s.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 pt-5">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search stocks..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setSearchQuery(inputValue)}
            className="w-full h-10 pl-12 pr-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 outline-none"
          />
          <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <button
          type="button"
          onClick={() => setSearchQuery(inputValue)}
          className="px-6 h-10 text-white font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap"
          style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
        >
          Search
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {filtered.map((stock) => (
            <StockCard key={stock.symbol} stock={stock} />
          ))}
        </div>
      ) : (
        <div className="text-gray-400 mt-4">No stock found.</div>
      )}
    </div>
  );
}

function MarketStatus({ marketStatus, lastUpdated }) {
  return (
    <div className="flex items-center gap-3 text-sm">
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

function StockCard({ stock }) {
  const change = stock.price && stock.previousClose
    ? ((stock.price - stock.previousClose) / stock.previousClose * 100).toFixed(2)
    : null;
  const isUp = change >= 0;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-400">{stock.symbol}</span>
      <span className="text-lg font-semibold text-white">
        ${stock.price?.toFixed(2) ?? "—"}
      </span>
      {change !== null && (
        <span className={`text-xs font-medium ${isUp ? "text-green-400" : "text-red-400"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(change)}%
        </span>
      )}
    </div>
  );
}

function RealTimeDashBoardPage() {
  const { stocks, candles, marketStatus, lastUpdated, error, connectionStatus } = useLiveStocks();

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-7">
        <h1 className="text-2xl font-semibold mb-2">Real-Time Dashboard</h1>

        <MarketStatus marketStatus={marketStatus} lastUpdated={lastUpdated} />

        {error && (
          <div className="mt-3 text-red-400 text-sm">{error}</div>
        )}

        <SearchBar stocks={stocks} />
      </main>
      <Footer />
    </motion.div>
  );
}

export default RealTimeDashBoardPage;