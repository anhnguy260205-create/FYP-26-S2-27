import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fetchRating } from "../api/ratingApi.js";

// Prediction tab = the sector Quant Rating for this stock (calibrated buy model).

const LABEL_THEME = {
  "Strong Buy": { text: "#10b981", ring: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.4)" },
  "Buy": { text: "#34d399", ring: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)" },
  "Hold": { text: "#fbbf24", ring: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.35)" },
  "Sell": { text: "#fb923c", ring: "#fb923c", bg: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.35)" },
  "Strong Sell": { text: "#f87171", ring: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.4)" },
};
const CARD = { background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)", borderRadius: "12px" };
const themeFor = (l) => LABEL_THEME[l] || LABEL_THEME["Hold"];
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const UP = "#0F9D58";
const DOWN = "#DC2626";
const DAY_OPTIONS = [7, 15, 30];

function Gauge({ score, label }) {
  const t = themeFor(label);
  const W = 240, H = 140, cx = W / 2, cy = 122, r = 92;
  const v = Math.max(0, Math.min(100, score ?? 0));
  const ang = Math.PI * (1 - v / 100);
  const xy = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [sx, sy] = xy(Math.PI), [ex, ey] = xy(0), [nx, ny] = xy(ang);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[240px]">
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${ex} ${ey}`} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="13" strokeLinecap="round" />
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 0 1 ${nx} ${ny}`} fill="none" stroke={t.ring} strokeWidth="13" strokeLinecap="round" />
      <text x={cx} y={cy - 24} textAnchor="middle" fontSize="42" fontWeight="800" fill="#0F172A">{Math.round(v)}</text>
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fill="#5B6C88">/ 100</text>
    </svg>
  );
}

export default function StockQuantRating({ symbol }) {
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [days, setDays] = useState(7);

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    fetchRating(symbol)
      .then((res) => {
        if (!alive) return;
        if (!res.success) { setError(res.message || "No rating for this stock."); setR(null); }
        else setR(res);
      })
      .catch(() => { if (alive) { setError("Could not reach the rating service."); setR(null); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [symbol]);

  if (loading) return <div style={CARD} className="p-6"><div className="h-40 bg-slate-200 rounded-xl animate-pulse" /></div>;
  if (error || !r) return <div style={CARD} className="p-6 text-center text-slate-600 text-sm">{error || `No quant rating for ${symbol}.`}</div>;

  const t = themeFor(r.label);
  const m = r.modelMetrics || {};
  const upside = r.targetMeanPrice && r.currentPrice ? r.targetMeanPrice / r.currentPrice - 1 : null;

  return (
    <div
      className="flex flex-col gap-4">

      {/* Rating headline */}
      <div style={{ ...CARD, borderColor: t.border }} className="p-5 flex flex-col items-center">
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0092b8", letterSpacing: "0.14em", textTransform: "uppercase" }} className="self-start mb-2">
          AI Quant Rating · {r.sectorLabel}
        </p>
        <Gauge score={r.score} label={r.label} />
        <span className="px-4 py-1.5 rounded-full text-sm font-bold -mt-2"
          style={{ color: t.text, background: t.bg, border: `1px solid ${t.border}` }}>{r.label}</span>
        <div className="mt-2 text-amber-600">{"★".repeat(Math.round(r.stars || 0))}</div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 w-full text-center">
          <Mini label="Buy probability" value={pct(r.buyProbability)} />
          <Mini label="Threshold" value={pct(r.threshold)} />
          <Mini label="Price" value={r.currentPrice ? `$${r.currentPrice.toFixed(2)}` : "—"} />
          <Mini label="Implied upside" value={upside != null ? `${upside >= 0 ? "+" : ""}${(upside * 100).toFixed(1)}%` : "—"}
            color={upside >= 0 ? "#0F9D58" : "#DC2626"} />
        </div>
      </div>

      {/* Projected price path */}
      {(r.pricePath || []).length > 0 && (() => {
        const chosen = r.pricePath.find((p) => p.days === days) || r.pricePath[0];
        const isUp = chosen.changePct >= 0;
        const dirColor = isUp ? UP : DOWN;
        return (
          <div style={CARD} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0092b8", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                Projected Price Path
              </p>
              <div className="flex gap-1.5">
                {DAY_OPTIONS.map((d) => (
                  <button key={d} onClick={() => setDays(d)}
                    className="text-xs px-3 py-1 rounded-full border transition"
                    style={{
                      color: d === days ? "#0B1D4F" : "#5B6C88",
                      background: d === days ? "rgba(0,146,184,0.15)" : "transparent",
                      borderColor: d === days ? "rgba(0,146,184,0.5)" : "rgba(11,29,79,0.2)",
                    }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <Mini label="Current" value={r.currentPrice ? `$${r.currentPrice.toFixed(2)}` : "—"} />
              <Mini label={`${days}-day target`} value={`$${chosen.price.toFixed(2)}`} color={dirColor} />
              <Mini label="Projected change" value={`${isUp ? "+" : ""}${chosen.changePct.toFixed(2)}%`} color={dirColor} />
              <Mini label="Range" value={`$${chosen.lower.toFixed(2)} – $${chosen.upper.toFixed(2)}`} />
            </div>
            <p className="text-[11px] text-slate-500 mt-4">
              Statistical projection derived from the buy signal's edge vs. its threshold and realised volatility — not a separately trained per-horizon model.
            </p>
          </div>
        );
      })()}

      {/* Model reliability */}
      <div style={CARD} className="p-5">
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0092b8", letterSpacing: "0.14em", textTransform: "uppercase" }} className="mb-3">Model Reliability</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Mini label="Buy precision" value={pct(m.buyPrecisionCv)} center />
          <Mini label="CV AUC" value={m.aucBuyCv != null ? m.aucBuyCv.toFixed(3) : "—"} center />
          <Mini label="Sell precision" value={pct(m.sellPrecisionCv)} center />
        </div>
        {m.reliable === false && (
          <div className="text-[11px] text-amber-600 mt-3 text-center">⚠ Flagged low-confidence for this sector</div>
        )}
      </div>

      <p className="text-[11px] text-slate-600">Calibrated buy probability from the sector model — educational only, not investment advice.</p>
    </div>
  );
}

function Mini({ label, value, color, center }) {
  return (
    <div className={center ? "rounded-lg bg-slate-100 py-2" : ""}>
      <div className="font-semibold tabular-nums text-sm" style={{ color: color || "#0F172A" }}>{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
