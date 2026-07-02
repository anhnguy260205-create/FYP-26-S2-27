import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchOverview } from "../api/stockInfoApi.js";

const CARD = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
  border: "1px solid rgba(99,179,237,0.15)",
  borderRadius: "12px",
};

const LABEL = {
  fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6",
  letterSpacing: "0.14em", textTransform: "uppercase",
};

function big(n) {
  if (n == null || isNaN(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toFixed(2)} T`;
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)} B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(2)} K`;
  return `${n}`;
}
const num = (n, d = 2) => (n == null || isNaN(n) ? "—" : Number(n).toFixed(d));
const pctv = (n) => (n == null || isNaN(n) ? "—" : `${(n * (n < 1 ? 100 : 1)).toFixed(2)}%`);

export default function StockOverview({ symbol, live }) {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchOverview(symbol)
      .then((res) => { if (alive) setD(res.success ? res : null); })
      .catch(() => { if (alive) setD(null); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol]);

  const volume = d?.volume ?? live?.volume;
  const avgVolume = d?.avgVolume ?? live?.avgVolume;

  const stats = [
    { label: "Volume", value: big(volume) },
    { label: "Avg Volume", value: big(avgVolume) },
    { label: "Market Cap", value: d ? `${big(d.marketCap)} USD` : "—" },
    { label: "P/E (TTM)", value: num(d?.trailingPE) },
    { label: "Basic EPS (TTM)", value: d?.trailingEps != null ? `${num(d.trailingEps)} USD` : "—" },
    { label: "Dividend Yield", value: pctv(d?.dividendYield) },
    { label: "Beta (1Y)", value: num(d?.beta) },
    { label: "Net Income (FY)", value: d ? `${big(d.netIncome)} USD` : "—" },
    { label: "Revenue (FY)", value: d ? `${big(d.revenue)} USD` : "—" },
    { label: "Shares Float", value: big(d?.floatShares) },
    { label: "Employees", value: big(d?.employees) },
  ];

  if (loading) {
    return <div style={CARD} className="p-6"><div className="h-24 bg-slate-800/40 rounded animate-pulse" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex flex-col gap-4">

      {/* Key stats */}
      <div style={CARD} className="p-5">
        <p style={LABEL} className="mb-4">Key Stats · {symbol}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="text-sm font-semibold text-slate-100 tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming earnings */}
      <div style={CARD} className="p-5">
        <p style={LABEL} className="mb-4">Upcoming Earnings</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <div className="text-[11px] text-slate-500">Next report date</div>
            <div className="text-sm font-semibold text-slate-100">
              {d?.nextEarningsDate ? String(d.nextEarningsDate).slice(0, 10) : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">EPS estimate</div>
            <div className="text-sm font-semibold text-slate-100 tabular-nums">
              {d?.epsEstimate != null ? `${num(d.epsEstimate)} USD` : "—"}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">Revenue estimate</div>
            <div className="text-sm font-semibold text-slate-100 tabular-nums">
              {d?.revenueEstimate != null ? `${big(d.revenueEstimate)} USD` : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div style={CARD} className="p-5">
        <p style={LABEL} className="mb-4">About {d?.name || symbol}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mb-4">
          <Info label="Sector" value={d?.sector} />
          <Info label="Industry" value={d?.industry} />
          <Info label="CEO" value={d?.ceo} />
          <Info label="Headquarters" value={d?.headquarters} />
          <Info label="Website" value={d?.website} link />
        </div>
        {d?.description && (
          <p className="text-sm text-slate-400 leading-relaxed">{d.description}</p>
        )}
      </div>
    </motion.div>
  );
}

function Info({ label, value, link }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      {link && value ? (
        <a href={value.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noreferrer"
          className="text-sm font-semibold text-cyan-400 hover:underline break-all">{value}</a>
      ) : (
        <div className="text-sm font-semibold text-slate-100 break-words">{value || "—"}</div>
      )}
    </div>
  );
}
