import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import useLiveStocks from "../../api/useLiveStocks.js";
import { createAlert } from "../../api/alertApi.js";

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = "http://127.0.0.1:8000";

const SYMBOLS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA",
  "META", "TSLA", "AVGO", "ORCL", "AMD",
];

const COMPANY_NAMES = {
  AAPL: "Apple",     MSFT: "Microsoft", GOOGL: "Alphabet", AMZN: "Amazon",
  NVDA: "NVIDIA",    META: "Meta",       TSLA: "Tesla",     AVGO: "Broadcom",
  ORCL: "Oracle",    AMD: "AMD",
};

const SENTIMENT_COLORS = {
  Bullish: { text: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.35)" },
  Neutral: { text: "#94a3b8", bg: "rgba(148,163,184,0.10)", border: "rgba(148,163,184,0.25)" },
  Bearish: { text: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)" },
};

// Three prediction modes, mapped to teacher's requested scenarios:
//   - standard: existing multi-day forecast (1-30 trading days)
//   - daytrade: short-term 12h / 24h window for day traders
//   - goal:     fixed budget + target return % over ~1 month for goal-based investors
const MODES = [
  { id: "standard", label: "Multi-Day Forecast", sub: "1-30 trading days" },
  { id: "daytrade", label: "Day Trading", sub: "12h / 24h window" },
  { id: "goal", label: "Goal Planner", sub: "Budget + target return" },
];

// ─── Prediction Chart (SVG, matches project dark theme) ────────────────────────

function PredictionChart({ lastClose, predictions, symbol }) {
  const W = 820, H = 300;
  const PAD = { top: 20, right: 20, bottom: 44, left: 72 };

  const allP = [lastClose, ...predictions.map(p => p.upper), ...predictions.map(p => p.lower)];
  const minP = Math.min(...allP) * 0.997;
  const maxP = Math.max(...allP) * 1.003;
  const range = maxP - minP || 1;

  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const total = predictions.length + 1;

  const toX = (i) => PAD.left + (i / (total - 1)) * cW;
  const toY = (p) => PAD.top + ((maxP - p) / range) * cH;

  const anchor = { x: toX(0), y: toY(lastClose) };
  const midPts   = [anchor, ...predictions.map((p, i) => ({ x: toX(i + 1), y: toY(p.price) }))];
  const upperPts = [anchor, ...predictions.map((p, i) => ({ x: toX(i + 1), y: toY(p.upper) }))];
  const lowerPts = [anchor, ...predictions.map((p, i) => ({ x: toX(i + 1), y: toY(p.lower) }))];

  const toPath = pts => pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const bandPath =
    toPath(upperPts) + " " +
    [...lowerPts].reverse().map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  const yTicks = Array.from({ length: 5 }, (_, i) => minP + (range / 4) * i);

  const xLabels = predictions
    .map((p, i) => ({ i: i + 1, date: p.date }))
    .filter((_, i) => i === 0 || i === predictions.length - 1 || (i + 1) % 5 === 0);

  const lastPrice = predictions.at(-1)?.price ?? lastClose;
  const pctChange = ((lastPrice - lastClose) / lastClose) * 100;
  const isUp = lastPrice >= lastClose;

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.15)",
      borderRadius: 12,
      backdropFilter: "blur(12px)",
      overflow: "hidden",
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Price Forecast — {symbol}
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          <LegendItem solid color="#63b3ed" label="Predicted" />
          <LegendItem dashed color="rgba(99,179,237,0.45)" label="Confidence band" />
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        <defs>
          <linearGradient id="predBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#63b3ed" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#63b3ed" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="predLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
          <filter id="predGlow">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* grid + y-axis labels */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontFamily="'DM Mono', monospace">
              {v >= 1000 ? v.toFixed(0) : v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* today divider */}
        <line x1={toX(0)} y1={PAD.top} x2={toX(0)} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="4 3" />
        <text x={toX(0)} y={H - PAD.bottom + 16} textAnchor="middle" fill="#cbd5e1" fontSize="10" fontFamily="'DM Mono', monospace">Today</text>

        {/* x-axis date labels */}
        {xLabels.map(({ i, date }) => (
          <text key={i} x={toX(i)} y={H - PAD.bottom + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="'DM Mono', monospace">
            {date.slice(5)}
          </text>
        ))}

        {/* confidence band */}
        <path d={bandPath} fill="url(#predBand)" />
        <path d={toPath(upperPts)} fill="none" stroke="rgba(99,179,237,0.3)" strokeWidth="1" strokeDasharray="5 3" />
        <path d={toPath(lowerPts)} fill="none" stroke="rgba(99,179,237,0.3)" strokeWidth="1" strokeDasharray="5 3" />

        {/* glow + main line */}
        <path d={toPath(midPts)} fill="none" stroke="rgba(96,165,250,0.25)" strokeWidth="7" filter="url(#predGlow)" />
        <path d={toPath(midPts)} fill="none" stroke="url(#predLine)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* anchor dot (today's close) */}
        <circle cx={toX(0)} cy={toY(lastClose)} r="4" fill="#60a5fa" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />

        {/* final prediction dot + pulse */}
        <circle cx={toX(predictions.length)} cy={toY(lastPrice)} r="4" fill="#34d399" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
        <circle cx={toX(predictions.length)} cy={toY(lastPrice)} r="4" fill="none" stroke="#34d399" strokeWidth="1" opacity="0.5">
          <animate attributeName="r" values="4;9;4" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
        </circle>

        {/* end callout */}
        <text x={toX(predictions.length) + 7} y={toY(lastPrice) - 7}
          fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="'DM Mono', monospace">
          ${lastPrice.toFixed(2)}
        </text>
        <text x={toX(predictions.length) + 7} y={toY(lastPrice) + 6}
          fill={isUp ? "#34d399" : "#f87171"} fontSize="10" fontFamily="'DM Mono', monospace">
          {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}%
        </text>
      </svg>
    </div>
  );
}

function LegendItem({ color, label, solid, dashed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {dashed
        ? <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" /></svg>
        : <div style={{ width: 10, height: 2.5, borderRadius: 2, background: color }} />}
      <span style={{ color: "#e2e8f0", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{label}</span>
    </div>
  );
}

// ─── Sentiment Panel ───────────────────────────────────────────────────────────

function SentimentPanel({ sentiment }) {
  const { score, label, confidence, breakdown } = sentiment;
  const c = SENTIMENT_COLORS[label] ?? SENTIMENT_COLORS.Neutral;
  const needleAngle = score * 90;  // –90° bear … +90° bull

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
      style={{
        width: 288, flexShrink: 0,
        background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, padding: "20px 22px",
        backdropFilter: "blur(12px)",
      }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 16px" }}>
        Market Sentiment
      </p>

      {/* Gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
        <svg width="190" height="105" viewBox="0 0 190 105">
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          <path d="M 15 95 A 80 80 0 0 1 175 95" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 15 95 A 80 80 0 0 1 175 95" fill="none" stroke="url(#sentGrad)" strokeWidth="7" strokeLinecap="round" opacity="0.65" />
          <text x="10"  y="100" fill="#f87171" fontSize="9"  fontWeight="bold" textAnchor="middle" fontFamily="'DM Mono', monospace">Bear</text>
          <text x="95"  y="16"  fill="#94a3b8" fontSize="9"  textAnchor="middle" fontFamily="'DM Mono', monospace">Neutral</text>
          <text x="180" y="100" fill="#34d399" fontSize="9"  fontWeight="bold" textAnchor="middle" fontFamily="'DM Mono', monospace">Bull</text>
          <g transform={`rotate(${needleAngle}, 95, 95)`}>
            <line x1="95" y1="95" x2="95" y2="26" stroke={c.text} strokeWidth="2" strokeLinecap="round" />
            <circle cx="95" cy="95" r="4" fill={c.text} />
          </g>
        </svg>

        <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: "4px 16px", marginTop: -4 }}>
          <span style={{ color: c.text, fontWeight: 700, fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{label}</span>
        </div>
      </div>

      {/* Score + Confidence */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <SentMetric label="Score"      value={(score >= 0 ? "+" : "") + score.toFixed(3)} color={c.text} />
        <SentMetric label="Confidence" value={(confidence * 100).toFixed(1) + "%"}        color="#63b3ed" />
      </div>

      {/* Breakdown bars */}
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 8px" }}>
        Article Breakdown
      </p>
      <SentBar label="Positive" value={breakdown.positive} color="#34d399" />
      <SentBar label="Neutral"  value={breakdown.neutral}  color="#94a3b8" />
      <SentBar label="Negative" value={breakdown.negative} color="#f87171" />
    </motion.div>
  );
}

function SentMetric({ label, value, color }) {
  return (
    <div style={{ flex: 1, background: "rgba(15,23,42,0.6)", border: "1px solid rgba(99,179,237,0.12)", borderRadius: 8, padding: "10px 12px", textAlign: "center" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  );
}

function SentBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#cbd5e1" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, fontWeight: 600 }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 3, opacity: 0.75 }}
        />
      </div>
    </div>
  );
}

// ─── Stats Strip ───────────────────────────────────────────────────────────────

function StatsStrip({ lastClose, predictions, livePrice }) {
  const last = predictions.at(-1);
  const maxP = Math.max(...predictions.map(p => p.price));
  const minP = Math.min(...predictions.map(p => p.price));
  const change = ((last.price - lastClose) / lastClose) * 100;
  const isUp = last.price >= lastClose;
  const ciHalf = (last.upper - last.lower) / 2;

  const displayPrice = livePrice ?? lastClose;
  const liveChange = livePrice ? (((livePrice - lastClose) / lastClose) * 100) : 0;
  const liveIsUp = liveChange >= 0;

  const stats = [
    { label: "Live Price",    value: `$${displayPrice.toFixed(3)}`,                   color: liveIsUp ? "#34d399" : "#f87171" },
    { label: "Predicted End", value: `$${last.price.toFixed(2)}`,                     color: isUp ? "#34d399" : "#f87171" },
    { label: "Est. Change",   value: `${isUp ? "+" : ""}${change.toFixed(2)}%`,       color: isUp ? "#34d399" : "#f87171" },
    { label: "Forecast High", value: `$${maxP.toFixed(2)}`,                           color: "#63b3ed" },
    { label: "Forecast Low",  value: `$${minP.toFixed(2)}`,                           color: "#f87171" },
    { label: `CI Day ${predictions.length}`, value: `±$${ciHalf.toFixed(2)}`,        color: "#cbd5e1" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, backdropFilter: "blur(12px)", overflow: "hidden",
        marginBottom: 16,
      }}
    >
      {stats.map(({ label, value, color }, i) => (
        <div key={label} style={{
          flex: 1, padding: "12px 16px",
          borderRight: i < stats.length - 1 ? "1px solid rgba(99,179,237,0.08)" : "none",
        }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 4px" }}>{label}</p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, color, margin: 0 }}>{value}</p>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Controls ──────────────────────────────────────────────────────────────────

function StockSelector({ selected, onChange, stocks }) {
  const navigate = useNavigate();
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
        Select Stock
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SYMBOLS.map(sym => {
          const live = stocks[sym];
          const pct = live?.price && live?.previousClose
            ? (((live.price - live.previousClose) / live.previousClose) * 100).toFixed(2)
            : null;
          const up = pct === null ? true : Number(pct) >= 0;
          const active = sym === selected;

          return (
            <button key={sym} onClick={() => onChange(sym)} style={{
              padding: "7px 14px", borderRadius: 8,
              border: active ? "1px solid rgba(99,179,237,0.6)" : "1px solid rgba(99,179,237,0.15)",
              background: active ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.6)",
              color: active ? "#e2e8f0" : "#94a3b8",
              cursor: "pointer", transition: "all 0.2s",
              fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: active ? 600 : 400,
              backdropFilter: "blur(8px)",
            }}>
              <span>{sym}</span>
              {pct && (
                <span style={{ marginLeft: 6, fontSize: 10, color: up ? "#34d399" : "#f87171" }}>
                  {up ? "+" : ""}{pct}%
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DaysControl({ days, onChange }) {
  const presets = [3, 5, 7, 14, 21, 30];
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
        Forecast Horizon —{" "}
        <span style={{ color: "#63b3ed" }}>{days} trading day{days > 1 ? "s" : ""}</span>
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {presets.map(d => (
          <button key={d} onClick={() => onChange(d)} style={{
            padding: "5px 14px", borderRadius: 6,
            border: days === d ? "1px solid rgba(99,179,237,0.5)" : "1px solid rgba(99,179,237,0.12)",
            background: days === d ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.5)",
            color: days === d ? "#63b3ed" : "#64748b",
            fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
          }}>
            {d}d
          </button>
        ))}
      </div>
      <input type="range" min="1" max="30" value={days}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#63b3ed", cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8" }}>1d</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8" }}>30d</span>
      </div>
    </div>
  );
}

// ─── Mode Switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, onChange }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
        Prediction Scenario
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MODES.map(m => {
          const active = m.id === mode;
          return (
            <button key={m.id} onClick={() => onChange(m.id)} style={{
              padding: "10px 16px", borderRadius: 8, textAlign: "left",
              border: active ? "1px solid rgba(99,179,237,0.6)" : "1px solid rgba(99,179,237,0.15)",
              background: active ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.6)",
              cursor: "pointer", transition: "all 0.2s", backdropFilter: "blur(8px)",
              minWidth: 180,
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#e2e8f0" : "#94a3b8" }}>
                {m.label}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#64748b", marginTop: 2 }}>
                {m.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day Trading Controls ──────────────────────────────────────────────────────

function DayTradeControl({ horizonHours, onChange }) {
  const presets = [
    { hours: 12, label: "12 Hours", sub: "Same / next session" },
    { hours: 24, label: "24 Hours", sub: "Through next session" },
  ];
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
        Day-Trading Window
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {presets.map(p => (
          <button key={p.hours} onClick={() => onChange(p.hours)} style={{
            flex: 1, padding: "12px 16px", borderRadius: 8, textAlign: "left",
            border: horizonHours === p.hours ? "1px solid rgba(99,179,237,0.6)" : "1px solid rgba(99,179,237,0.15)",
            background: horizonHours === p.hours ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.6)",
            cursor: "pointer", transition: "all 0.2s",
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: horizonHours === p.hours ? "#63b3ed" : "#cbd5e1" }}>
              {p.label}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#64748b", marginTop: 2 }}>
              {p.sub}
            </div>
          </button>
        ))}
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#64748b", marginTop: 10, lineHeight: 1.5 }}>
        The model's directional signal is scaled to the selected window — a 12h
        call covers roughly the rest of today's session, while a 24h call
        projects through the next full trading session.
      </p>
    </div>
  );
}

// ─── Goal Planner Controls ──────────────────────────────────────────────────────

function GoalControl({ budget, targetReturnPct, timelineDays, onBudgetChange, onTargetChange, onTimelineChange }) {
  const timelinePresets = [
    { days: 5, label: "1 Week" },
    { days: 21, label: "1 Month" },
    { days: 63, label: "3 Months" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Investment Budget (USD)
        </p>
        <input
          type="number" min="1" value={budget}
          onChange={e => onBudgetChange(Number(e.target.value))}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 8,
            border: "1px solid rgba(99,179,237,0.2)", background: "rgba(15,23,42,0.6)",
            color: "#e2e8f0", fontFamily: "'DM Mono', monospace", fontSize: 14,
          }}
        />
      </div>

      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Target Return —{" "}
          <span style={{ color: "#63b3ed" }}>{targetReturnPct}%</span>
        </p>
        <input type="range" min="1" max="50" value={targetReturnPct}
          onChange={e => onTargetChange(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#63b3ed", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8" }}>1%</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8" }}>50%</span>
        </div>
      </div>

      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#e2e8f0", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Timeline
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {timelinePresets.map(p => (
            <button key={p.days} onClick={() => onTimelineChange(p.days)} style={{
              flex: 1, padding: "8px 12px", borderRadius: 6,
              border: timelineDays === p.days ? "1px solid rgba(99,179,237,0.5)" : "1px solid rgba(99,179,237,0.12)",
              background: timelineDays === p.days ? "rgba(99,179,237,0.15)" : "rgba(15,23,42,0.5)",
              color: timelineDays === p.days ? "#63b3ed" : "#64748b",
              fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
            }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Model Signal / Business Logic Panel ────────────────────────────────────────

function ModelSignalPanel({ signal }) {
  const { prob_up, direction, confidence_pct, tier_label } = signal;
  const profitMargin = signal.expected_profit_margin_pct
    ?? signal.expected_daily_profit_margin_pct ?? 0;
  const isUp = direction === "up";
  const color = isUp ? "#34d399" : "#f87171";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, backdropFilter: "blur(12px)",
        padding: "18px 20px", marginBottom: 16,
      }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 12px" }}>
        How The Model Reached This Call
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Direction
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color, margin: 0 }}>
            {isUp ? "▲ UP" : "▼ DOWN"}
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            P(up) — raw model output
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
            {(prob_up * 100).toFixed(1)}%
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Statistical Confidence
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: "#63b3ed", margin: 0 }}>
            {confidence_pct.toFixed(1)}% <span style={{ fontSize: 11, color: "#64748b" }}>({tier_label})</span>
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Expected Profit Margin
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color, margin: 0 }}>
            {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(2)}%
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(99,179,237,0.1)", paddingTop: 10 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          The XGBoost classifier outputs <b style={{ color: "#cbd5e1" }}>P(up)</b> — the
          probability the stock closes higher next session, based on 26
          technical &amp; sentiment features (RSI, MACD, Bollinger Bands,
          moving averages, volume, and news sentiment).{" "}
          <b style={{ color: "#cbd5e1" }}>Statistical confidence</b> measures
          how far P(up) sits from a 50/50 coin-flip, scaled against the
          model's validated accuracy (~69% AUC on historical test data) — so
          a stronger signal (e.g. P(up)=85%) yields a higher confidence tier
          (e.g. "High", ~69%) than a weak one (e.g. P(up)=52% → "Low", ~51%).{" "}
          <b style={{ color: "#cbd5e1" }}>Expected profit margin</b> is the
          probability-weighted average outcome: it multiplies the stock's
          typical daily price swing by the directional edge
          (2×P(up) − 1), so a confident bullish call on a volatile stock
          projects a larger margin (e.g. +10–15%) than a low-confidence call
          on a calm stock (e.g. +1–2%).
        </p>
      </div>
    </motion.div>
  );
}

// ─── Day-Trade Result Card ──────────────────────────────────────────────────────

function DayTradeCard({ result }) {
  const { last_close, target_price, upper, lower, target_time, horizon_hours, expected_return_pct } = result;
  const isUp = expected_return_pct >= 0;
  const color = isUp ? "#34d399" : "#f87171";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, backdropFilter: "blur(12px)",
        padding: "22px 24px", marginBottom: 16,
      }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 16px" }}>
        {horizon_hours}-Hour Price Target
      </p>

      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 8 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 36, fontWeight: 700, color }}>
          ${target_price.toFixed(2)}
        </span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 600, color }}>
          {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{expected_return_pct.toFixed(2)}%
        </span>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#64748b" }}>
          from ${last_close.toFixed(2)}
        </span>
      </div>

      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#94a3b8", margin: "0 0 16px" }}>
        Target window closes ~ {target_time}
      </p>

      <div style={{
        background: "rgba(15,23,42,0.5)", borderRadius: 8, padding: "12px 16px",
        display: "flex", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Likely Low
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 600, color: "#f87171", margin: 0 }}>
            ${lower.toFixed(2)}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
            Likely High
          </p>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 600, color: "#34d399", margin: 0 }}>
            ${upper.toFixed(2)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Goal Trajectory Chart ───────────────────────────────────────────────────────

function GoalTrajectoryChart({ trajectory, budget, targetValue }) {
  const W = 820, H = 260;
  const PAD = { top: 24, right: 20, bottom: 36, left: 72 };

  const allValues = [budget, targetValue, ...trajectory.map(t => t.value)];
  const minV = Math.min(...allValues) * 0.99;
  const maxV = Math.max(...allValues) * 1.01;
  const range = maxV - minV || 1;

  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const toX = (i) => PAD.left + (i / (trajectory.length - 1 || 1)) * cW;
  const toY = (v) => PAD.top + ((maxV - v) / range) * cH;

  const pts = trajectory.map((t, i) => ({ x: toX(i), y: toY(t.value) }));
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const yTicks = Array.from({ length: 4 }, (_, i) => minV + (range / 3) * i);
  const xLabels = trajectory.filter((_, i) => i === 0 || i === trajectory.length - 1 || (i + 1) % 5 === 0);

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.15)",
      borderRadius: 12, backdropFilter: "blur(12px)", overflow: "hidden", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Projected Portfolio Value
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          <LegendItem solid color="#63b3ed" label="Projected" />
          <LegendItem dashed color="rgba(52,211,153,0.6)" label="Target" />
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD.left - 8} y={toY(v) + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontFamily="'DM Mono', monospace">
              ${v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* Target line */}
        <line x1={PAD.left} y1={toY(targetValue)} x2={W - PAD.right} y2={toY(targetValue)}
          stroke="rgba(52,211,153,0.6)" strokeWidth="1.5" strokeDasharray="6 4" />
        <text x={W - PAD.right} y={toY(targetValue) - 6} textAnchor="end" fill="#34d399" fontSize="10" fontFamily="'DM Mono', monospace">
          Target ${targetValue.toFixed(0)}
        </text>

        {/* Start line */}
        <line x1={PAD.left} y1={toY(budget)} x2={W - PAD.right} y2={toY(budget)}
          stroke="rgba(148,163,184,0.3)" strokeWidth="1" strokeDasharray="3 3" />
        <text x={PAD.left} y={toY(budget) - 6} textAnchor="start" fill="#94a3b8" fontSize="10" fontFamily="'DM Mono', monospace">
          Start ${budget.toFixed(0)}
        </text>

        {/* Projection path */}
        <path d={path} fill="none" stroke="#63b3ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {xLabels.map((t) => {
          const i = trajectory.indexOf(t);
          return (
            <text key={t.date} x={toX(i)} y={H - PAD.bottom + 16} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="'DM Mono', monospace">
              {t.date.slice(5)}
            </text>
          );
        })}

        {pts.length > 0 && (
          <circle cx={pts.at(-1).x} cy={pts.at(-1).y} r="4" fill="#63b3ed" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
        )}
      </svg>
    </div>
  );
}

// ─── Goal Summary Card ────────────────────────────────────────────────────────

function GoalSummaryCard({ result }) {
  const {
    budget, shares_affordable, invested_amount, cash_remainder,
    timeline_days, target_return_pct, target_value, projected_value,
    projected_return_pct, goal_met_projection, probability_reach_goal,
  } = result;

  const isPositive = projected_return_pct >= 0;
  const color = isPositive ? "#34d399" : "#f87171";

  const stats = [
    { label: "Budget", value: `$${budget.toFixed(2)}` },
    { label: "Shares Affordable", value: `${shares_affordable}` },
    { label: "Invested", value: `$${invested_amount.toFixed(2)}` },
    { label: "Cash Left Over", value: `$${cash_remainder.toFixed(2)}` },
    { label: `Timeline (${timeline_days}d)`, value: `Target +${target_return_pct}%` },
    { label: "Projected Value", value: `$${projected_value.toFixed(2)}`, color },
    { label: "Projected Return", value: `${isPositive ? "+" : ""}${projected_return_pct.toFixed(2)}%`, color },
    { label: "Target Value", value: `$${target_value.toFixed(2)}`, color: "#34d399" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, backdropFilter: "blur(12px)",
        padding: "18px 20px", marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0 }}>
          Goal Projection
        </p>
        <div style={{
          padding: "4px 12px", borderRadius: 20,
          background: goal_met_projection ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
          border: `1px solid ${goal_met_projection ? "rgba(52,211,153,0.35)" : "rgba(248,113,113,0.35)"}`,
        }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: goal_met_projection ? "#34d399" : "#f87171" }}>
            {goal_met_projection ? "ON TRACK" : "BELOW TARGET"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 14 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: "rgba(15,23,42,0.5)", borderRadius: 8, padding: "10px 12px" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>
              {s.label}
            </p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: s.color ?? "#e2e8f0", margin: 0 }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{ borderTop: "1px solid rgba(99,179,237,0.1)", paddingTop: 10 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          With <b style={{ color: "#cbd5e1" }}>${budget.toFixed(2)}</b>, the model
          projects a portfolio value of{" "}
          <b style={{ color }}>${projected_value.toFixed(2)}</b> ({isPositive ? "+" : ""}
          {projected_return_pct.toFixed(2)}%) after {timeline_days} trading days —
          compounding today's directional edge daily. Hitting the{" "}
          <b style={{ color: "#34d399" }}>+{target_return_pct}%</b> target is
          estimated at a{" "}
          <b style={{ color: "#63b3ed" }}>{(probability_reach_goal * 100).toFixed(0)}%</b>{" "}
          probability, based on the model's confidence and how far the
          projection sits from the goal. This is a projection, not a
          guarantee — actual market conditions can change daily.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Milestone Alert Mockup ──────────────────────────────────────────────────────

function MilestoneAlertCard({ symbol, suggestedPrice, userId, userEmail, label }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreateAlert = async () => {
    if (!userId || !userEmail) {
      alert("Please log in to set up alerts.");
      return;
    }
    setCreating(true);
    try {
      const isUpsideTarget = true; // milestone alerts watch for the predicted target being hit
      const payload = {
        user_id: userId,
        stock_symbol: symbol,
        price_above: isUpsideTarget ? Number(suggestedPrice.toFixed(2)) : null,
        price_below: null,
        increase_percent: null,
        decrease_percent: null,
        custom_message: `AI milestone reached: ${symbol} hit your predicted target of $${suggestedPrice.toFixed(2)} (${label}).`,
        notification_email: userEmail,
      };
      const res = await createAlert(payload);
      if (res.success) setCreated(true);
      else alert(res.message ?? "Failed to create alert");
    } catch {
      alert("Could not reach backend to create alert.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, backdropFilter: "blur(12px)",
        padding: "18px 20px", marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 240 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Milestone Alert
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
          Since you can't watch the market 24/7, we can notify you by email
          the moment <b style={{ color: "#cbd5e1" }}>{symbol}</b> reaches the
          model's predicted target of{" "}
          <b style={{ color: "#34d399" }}>${suggestedPrice.toFixed(2)}</b>.
          The alert runs automatically against live prices and triggers once.
        </p>
      </div>

      <button
        onClick={handleCreateAlert}
        disabled={creating || created}
        style={{
          padding: "12px 22px", borderRadius: 8,
          border: created ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(99,179,237,0.4)",
          background: created ? "rgba(52,211,153,0.12)" : "rgba(99,179,237,0.12)",
          color: created ? "#34d399" : "#63b3ed",
          fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
          letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: creating || created ? "default" : "pointer",
          whiteSpace: "nowrap", opacity: creating ? 0.6 : 1,
        }}
      >
        {created ? "Alert Set ✓" : creating ? "Setting…" : "Notify Me at This Price"}
      </button>
    </motion.div>
  );
}

// ─── Loading ───────────────────────────────────────────────────────────────────

function LoadingSpinner({ symbol }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 320 }}>
      <svg width="56" height="56" viewBox="0 0 56 56" style={{ marginBottom: 16 }}>
        <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(99,179,237,0.12)" strokeWidth="4" />
        <circle cx="28" cy="28" r="24" fill="none" stroke="#63b3ed" strokeWidth="4"
          strokeDasharray="38 114" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 28 28" to="360 28 28" dur="0.9s" repeatCount="indefinite" />
        </circle>
      </svg>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#63b3ed", letterSpacing: "0.06em", margin: 0 }}>
        Running model for {symbol}…
      </p>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#e2e8f0", marginTop: 6 }}>
        BiLSTM + FinBERT processing
      </p>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function AIPredictionPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const requestedSymbol = String(
    searchParams.get("symbol") || location.state?.selectedSymbol || ""
  ).toUpperCase();
  const unsupportedRequestedSymbol = requestedSymbol && !SYMBOLS.includes(requestedSymbol) ? requestedSymbol : "";
  const initialSymbol = SYMBOLS.includes(requestedSymbol) ? requestedSymbol : "AAPL";

  const [symbol, setSymbol] = useState(initialSymbol);
  const [mode, setMode] = useState("standard");
  const [unsupportedNotice, setUnsupportedNotice] = useState(unsupportedRequestedSymbol);

  // standard mode
  const days = 7;

  // daytrade mode
  const [horizonHours, setHorizonHours] = useState(24);

  // goal mode
  const [budget, setBudget] = useState(1000);
  const [targetReturnPct, setTargetReturnPct] = useState(10);
  const [timelineDays, setTimelineDays] = useState(21);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRun = useRef(false);
  const hasHandledDeepLink = useRef(false);

  // Reuse the same live stock hook as the rest of the app
  const { stocks, stockList: _, marketStatus, lastUpdated } = useLiveStocks();
  const stocksList = Object.values(stocks ?? {});
  const liveStock = stocks[symbol];

  // Current logged-in user (for milestone alerts)
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  function handleSymbolChange(s) {
    setUnsupportedNotice("");
    setSymbol(s);
    setResult(null);
    runPrediction(s, mode);
  }

  function handleModeChange(m) {
    setMode(m);
    setResult(null);
    runPrediction(symbol, m);
  }

  async function runPrediction(sym, currentMode) {
    setLoading(true);
    setError("");
    setResult(null);
    hasRun.current = true;

    const body = { symbol: sym, days, mode: currentMode };

    if (currentMode === "daytrade") {
      body.horizon_hours = horizonHours;
    } else if (currentMode === "goal") {
      body.budget = budget;
      body.target_return_pct = targetReturnPct;
      body.timeline_days = timelineDays;
    }

    try {
      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) setError(data.message ?? "Prediction failed");
      else setResult(data);
    } catch {
      setError("Could not reach backend. Make sure FastAPI is running on port 8000.");
    } finally {
      setLoading(false);
    }
  }

  function handleRunClick() {
    runPrediction(symbol, mode);
  }

  // If the user comes from the chatbot with /investor/aiprediction?symbol=NVDA,
  // open that exact stock and run the standard prediction automatically.
  useEffect(() => {
    if (hasHandledDeepLink.current) return;

    const deepLinkSymbol = String(
      searchParams.get("symbol") || location.state?.selectedSymbol || ""
    ).toUpperCase();

    if (!SYMBOLS.includes(deepLinkSymbol)) {
      if (deepLinkSymbol) setUnsupportedNotice(deepLinkSymbol);
      return;
    }

    setUnsupportedNotice("");
    hasHandledDeepLink.current = true;
    setSymbol(deepLinkSymbol);
    setMode("standard");
    setResult(null);
    runPrediction(deepLinkSymbol, "standard");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-run automatically when daytrade horizon or goal parameters change,
  // but only if a result for this mode has already been shown once.
  useEffect(() => {
    if (hasRun.current && result && mode === "daytrade") {
      runPrediction(symbol, "daytrade");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizonHours]);

  const modeMeta = MODES.find(m => m.id === mode);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
      `}</style>

      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      >
        <GeneralHeader />

        <main style={{ flex: 1, padding: "28px 32px", position: "relative", zIndex: 1 }}>

          {/* ── Page title (mirrors AStockDashBoardPage style) ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ paddingBottom: 20, borderBottom: "1px solid rgba(99,179,237,0.15)", marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
                  AI Prediction
                </h1>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#cbd5e1" }}>
                  XGBoost · Technical &amp; Sentiment Features · Confidence Scoring
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 8px #3b82f6", display: "inline-block" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#3b82f6", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Model Ready
                </span>
                {lastUpdated && (
                  <>
                    <span style={{ color: "#94a3b8" }}>|</span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#e2e8f0" }}>
                      Data updated: {lastUpdated}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Live price of selected stock */}
            {liveStock && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#cbd5e1", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {symbol} · {COMPANY_NAMES[symbol]}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
                  ${liveStock.price?.toFixed(3)} <span style={{ fontSize: 13, color: "#cbd5e1" }}>USD</span>
                </p>
              </div>
            )}
          </motion.div>

          {/* ── Controls card ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
              border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: 12, backdropFilter: "blur(12px)",
              padding: "22px 24px", marginBottom: 20,
              display: "flex", flexDirection: "column", gap: 20,
            }}
          >
            <ModeSwitcher mode={mode} onChange={handleModeChange} />

            <StockSelector selected={symbol} onChange={handleSymbolChange} stocks={stocks} />

            {mode === "daytrade" && (
              <DayTradeControl horizonHours={horizonHours} onChange={setHorizonHours} />
            )}

            {mode === "goal" && (
              <GoalControl
                budget={budget}
                targetReturnPct={targetReturnPct}
                timelineDays={timelineDays}
                onBudgetChange={setBudget}
                onTargetChange={setTargetReturnPct}
                onTimelineChange={setTimelineDays}
              />
            )}

            {(mode === "daytrade" || mode === "goal") && (
              <button onClick={handleRunClick} disabled={loading} style={{
                alignSelf: "flex-start", padding: "10px 24px", borderRadius: 8,
                border: "1px solid rgba(99,179,237,0.5)", background: "rgba(99,179,237,0.15)",
                color: "#63b3ed", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase", cursor: loading ? "default" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}>
                {loading ? "Running…" : `Run ${modeMeta.label}`}
              </button>
            )}
          </motion.div>

          {/* ── Unsupported stock notice from deep link ── */}
          <AnimatePresence>
            {unsupportedNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.25)",
                  borderRadius: 8, padding: "12px 18px", marginBottom: 16,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#bfdbfe",
                }}
              >
                {unsupportedNotice} is not available on RocketTrade’s AI Prediction page yet. Showing AAPL as the default supported stock.
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: 8, padding: "12px 18px", marginBottom: 16,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#f87171",
                }}
              >
                ⚠ {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Loading ── */}
          {loading && (
            <div style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
              border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: 12, marginBottom: 16,
            }}>
              <LoadingSpinner symbol={symbol} />
            </div>
          )}

          {/* ── Results: Standard multi-day mode ── */}
          <AnimatePresence>
            {result && !loading && result.mode === "standard" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                {/* Stats strip */}
                <StatsStrip
                  lastClose={result.last_close}
                  predictions={result.predictions}
                  livePrice={liveStock?.price}
                />

                {/* Model signal / business logic explanation */}
                <ModelSignalPanel signal={result.model_signal} />

                {/* Chart + Sentiment */}
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PredictionChart
                      lastClose={result.last_close}
                      predictions={result.predictions}
                      symbol={result.symbol}
                    />
                  </div>
                  <SentimentPanel sentiment={result.sentiment} />
                </div>

                {/* Milestone alert mockup */}
                <div style={{ marginTop: 16 }}>
                  <MilestoneAlertCard
                    symbol={result.symbol}
                    suggestedPrice={result.predictions.at(-1).price}
                    userId={currentUser?.user_id}
                    userEmail={currentUser?.email}
                    label={`${result.days}-day forecast`}
                  />
                </div>

                {/* Disclaimer */}
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 14, letterSpacing: "0.06em" }}>
                  ⓘ GENERATED BY XGBOOST CLASSIFIER · TECHNICAL + SENTIMENT FEATURES · NOT FINANCIAL ADVICE
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results: Day-Trading mode ── */}
          <AnimatePresence>
            {result && !loading && result.mode === "daytrade" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <DayTradeCard result={result} />

                <ModelSignalPanel signal={result.model_signal} />

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
                      Day traders need a same-session or next-session call,
                      not a multi-week forecast. This view scales the model's
                      directional edge (P(up) = {(result.model_signal.prob_up * 100).toFixed(1)}%)
                      down to a <b style={{ color: "#cbd5e1" }}>{result.horizon_hours}-hour</b> window:
                      a 12h call covers roughly the remainder of today's
                      session, while a 24h call projects through the next
                      full session. The confidence band is intentionally
                      tighter than the multi-day forecast since short
                      horizons carry less compounding uncertainty — but also
                      less room for the signal to "play out".
                    </p>
                  </div>
                  <SentimentPanel sentiment={result.sentiment} />
                </div>

                <div style={{ marginTop: 16 }}>
                  <MilestoneAlertCard
                    symbol={result.symbol}
                    suggestedPrice={result.target_price}
                    userId={currentUser?.user_id}
                    userEmail={currentUser?.email}
                    label={`${result.horizon_hours}h day-trade target`}
                  />
                </div>

                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 14, letterSpacing: "0.06em" }}>
                  ⓘ SHORT-HORIZON CALL · MARKET CONDITIONS CAN CHANGE INTRADAY · NOT FINANCIAL ADVICE
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Results: Goal Planner mode ── */}
          <AnimatePresence>
            {result && !loading && result.mode === "goal" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
              >
                <GoalSummaryCard result={result} />

                <ModelSignalPanel signal={result.model_signal} />

                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <GoalTrajectoryChart
                      trajectory={result.trajectory}
                      budget={result.budget}
                      targetValue={result.target_value}
                    />
                  </div>
                  <SentimentPanel sentiment={result.sentiment} />
                </div>

                <div style={{ marginTop: 16 }}>
                  <MilestoneAlertCard
                    symbol={result.symbol}
                    suggestedPrice={result.last_close * (1 + result.target_return_pct / 100)}
                    userId={currentUser?.user_id}
                    userEmail={currentUser?.email}
                    label={`${result.timeline_days}-day goal target (+${result.target_return_pct}%)`}
                  />
                </div>

                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 14, letterSpacing: "0.06em" }}>
                  ⓘ LONG-TERM PROJECTION · COMPOUNDS TODAY'S SIGNAL DAILY · NOT FINANCIAL ADVICE
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Empty state ── */}
          {!hasRun.current && !loading && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 260 }}
            >
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ marginBottom: 14, opacity: 0.3 }}>
                <circle cx="26" cy="26" r="24" stroke="#63b3ed" strokeWidth="1.5" />
                <path d="M14 34 L20 24 L27 29 L35 18" stroke="#63b3ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="35" cy="18" r="2.5" fill="#63b3ed" />
              </svg>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#e2e8f0", margin: 0, letterSpacing: "0.04em" }}>
                {mode === "standard"
                  ? "Select a stock to run the multi-day forecast"
                  : `Configure your ${modeMeta.label.toLowerCase()} and click run`}
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                Forecast chart, model signal breakdown, and sentiment analysis will appear here
              </p>
            </motion.div>
          )}


        </main>

        <Footer />
      </motion.div>
    </>
  );
}

export default AIPredictionPage;
