import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { authFetch } from "../api/apiClient.js";

const API_BASE = import.meta.env.VITE_API_URL;

// Reuses the existing /predict endpoint (standard multi-day mode) so the
// forecast that used to live on the AI Prediction page now renders inline
// on the stock page. Colours match the existing dashboard palette.

const CARD = {
  background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
  border: "1px solid rgba(99,179,237,0.15)",
  borderRadius: "12px",
};

const UP = "#34d399";
const DOWN = "#f87171";
const BLUE = "#63b3ed";

const DAY_OPTIONS = [7, 14, 30];

export default function StockPrediction({ symbol, livePrice }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (d) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/predict`, {
        method: "POST",
        body: JSON.stringify({ symbol, days: d, mode: "standard" }),
      });
      const json = await res.json();
      if (!json.success && json.success !== undefined && !json.predictions) {
        setError(json.message || "Prediction unavailable for this stock.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setError("Could not reach the prediction service.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => { load(days); }, [load, days]);

  if (loading) {
    return (
      <div style={CARD} className="p-6">
        <div className="h-5 w-40 bg-slate-700/40 rounded animate-pulse mb-4" />
        <div className="h-24 bg-slate-800/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !data?.predictions?.length) {
    return (
      <div style={CARD} className="p-6 text-center text-slate-400 text-sm">
        {error || `No forecast available for ${symbol}.`}
      </div>
    );
  }

  const sig = data.model_signal || {};
  const lastClose = data.last_close;
  const preds = data.predictions;
  const finalPrice = preds[preds.length - 1]?.price ?? lastClose;
  const pctChange = ((finalPrice - lastClose) / lastClose) * 100;
  const isUp = (sig.direction || (pctChange >= 0 ? "up" : "down")) === "up";
  const dirColor = isUp ? UP : DOWN;
  const probPct = (sig.prob_up ?? 0.5) * 100;
  const profit = sig.expected_profit_margin_pct ?? 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className="flex flex-col gap-4">

      {/* Horizon selector */}
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6",
          letterSpacing: "0.14em", textTransform: "uppercase" }}>
          AI Price Forecast · {symbol}
        </p>
        <div className="flex gap-1.5">
          {DAY_OPTIONS.map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className="text-xs px-3 py-1 rounded-full border transition"
              style={{
                color: d === days ? "#fff" : "#94a3b8",
                background: d === days ? "rgba(59,130,246,0.25)" : "transparent",
                borderColor: d === days ? "rgba(96,165,250,0.6)" : "rgba(99,179,237,0.2)",
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Model signal */}
      <div style={CARD} className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Metric label="Direction"
            value={<span style={{ color: dirColor, fontWeight: 700 }}>{isUp ? "▲ Bullish" : "▼ Bearish"}</span>} />
          <Metric label="Prob. up"
            value={<span style={{ color: dirColor, fontWeight: 700 }}>{probPct.toFixed(1)}%</span>} />
          <Metric label="Confidence"
            value={<span style={{ color: BLUE }}>{sig.tier_label || "—"} · {Math.round(sig.confidence_pct ?? 0)}%</span>} />
          <Metric label="Exp. profit"
            value={<span style={{ color: profit >= 0 ? UP : DOWN, fontWeight: 700 }}>
              {profit >= 0 ? "+" : ""}{Number(profit).toFixed(2)}%</span>} />
        </div>
      </div>

      {/* Forecast summary */}
      <div style={CARD} className="p-5">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">Current</div>
            <div className="text-lg font-bold text-slate-100 tabular-nums">
              ${(livePrice ?? lastClose)?.toFixed(2)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">{days}-day target</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: dirColor }}>
              ${finalPrice.toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 uppercase tracking-wide">Projected</div>
            <div className="text-lg font-bold tabular-nums" style={{ color: dirColor }}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Simple projection track */}
        <div className="space-y-1.5">
          {preds.filter((_, i) => i % Math.ceil(preds.length / 6) === 0 || i === preds.length - 1)
            .map((p, i) => {
              const chg = ((p.price - lastClose) / lastClose) * 100;
              const width = Math.min(100, Math.abs(chg) * 6 + 6);
              return (
                <div key={i} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500 w-14 shrink-0">Day {p.day ?? "+"}</span>
                  <span className="text-slate-200 w-16 tabular-nums shrink-0">${p.price.toFixed(2)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${width}%`, background: chg >= 0 ? UP : DOWN }} />
                  </div>
                  <span className="w-14 text-right tabular-nums shrink-0" style={{ color: chg >= 0 ? UP : DOWN }}>
                    {chg >= 0 ? "+" : ""}{chg.toFixed(1)}%
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <p className="text-[11px] text-slate-600">
        Model-generated forecast for educational purposes only — not investment advice.
      </p>
    </motion.div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
