import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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

/* CourseHero-style paywall: a fake blurred forecast behind a lock overlay. */
function PredictionPaywall({ symbol, viewsUsed, viewsLimit }) {
  const navigate = useNavigate();
  return (
    <div style={{ ...CARD, position: "relative", overflow: "hidden" }} className="p-6">
      {/* Blurred decoy content (not real data) */}
      <div style={{ filter: "blur(7px)", userSelect: "none", pointerEvents: "none", opacity: 0.7 }} aria-hidden="true">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
          {["Direction", "Prob. up", "Confidence", "Exp. profit"].map((label, i) => (
            <div key={label}>
              <div className="text-[11px] text-slate-500 uppercase tracking-wide">{label}</div>
              <div className="text-base font-bold" style={{ color: i % 2 ? UP : BLUE }}>
                {["▲ Bullish", "64.2%", "High · 78%", "+3.85%"][i]}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-2" style={{ height: 90 }}>
          {[38, 46, 42, 55, 60, 52, 66, 72, 64, 78, 84, 80].map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`, borderRadius: 4,
              background: "linear-gradient(180deg, rgba(52,211,153,0.65), rgba(52,211,153,0.15))",
            }} />
          ))}
        </div>
      </div>

      {/* Lock overlay */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 10, textAlign: "center",
        background: "linear-gradient(180deg, rgba(15,23,42,0.25), rgba(15,23,42,0.78))",
        padding: 20,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", fontSize: 24,
          background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>🔒</div>
        <div className="text-slate-100 font-semibold text-sm">
          You've used all {viewsLimit ?? 3} free AI predictions
        </div>
        <div className="text-slate-400 text-xs max-w-70">
          Upgrade to Premium for unlimited AI forecasts on {symbol} and every other S&P 500 stock.
        </div>
        <button onClick={() => navigate("/investor/subscription")}
          className="text-sm font-semibold px-5 py-2 rounded-xl text-white hover:opacity-90 active:scale-[0.99] transition"
          style={{ background: "linear-gradient(90deg, #d4a017, #b8860b)", boxShadow: "0 8px 18px rgba(212,160,23,0.3)" }}>
          Upgrade to Premium →
        </button>
        <span className="text-[11px] text-slate-500">{viewsUsed ?? viewsLimit ?? 3} of {viewsLimit ?? 3} free predictions used</span>
      </div>
    </div>
  );
}

export default function StockPrediction({ symbol, livePrice }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null); // set when free quota is exhausted

  const load = useCallback(async (d) => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setLimitInfo(null);
    try {
      const res = await authFetch(`${API_BASE}/predict`, {
        method: "POST",
        body: JSON.stringify({ symbol, days: d, mode: "standard" }),
      });
      const json = await res.json();
      if (json.limit_reached) {
        setLimitInfo({ viewsUsed: json.views_used, viewsLimit: json.views_limit });
        setData(null);
      } else if (!json.success && json.success !== undefined && !json.predictions) {
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

  if (limitInfo) {
    return <PredictionPaywall symbol={symbol} viewsUsed={limitInfo.viewsUsed} viewsLimit={limitInfo.viewsLimit} />;
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

      {/* Free-quota reminder (basic plan only) */}
      {data.views_limit != null && (
        <div className="text-[11px] px-3 py-2 rounded-lg"
          style={{ color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
          Basic plan: {data.views_used} of {data.views_limit} free stock predictions used. Viewing {symbol} again is free.
        </div>
      )}

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
