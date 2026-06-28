import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/apiClient.js";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import useLiveStocks from "../../api/useLiveStocks.js";
import { createAlert } from "../../api/alertApi.js";

// ─── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL;

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


// ─── Prediction Chart (SVG, matches project dark theme) ────────────────────────

function PredictionChart({ lastClose, predictions, symbol, todayCandles = [] }) {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const W = 900, H = 360;
  const PAD_L = 72, PAD_R = 88, PAD_T = 20;
  const VOL_H = 32, VOL_GAP = 8;
  const cTop = PAD_T;
  const cBot = H - 64;
  const CHART_H = cBot - cTop;
  const vTop = cBot + VOL_GAP;
  const xLabelY = vTop + VOL_H + 14;
  const cW = W - PAD_L - PAD_R;

  // last 390 1-min bars = full trading day
  const mktCandles = todayCandles.slice(-390);
  const hasCandles = mktCandles.length > 0;

  // "Now" divider: 55% market hours, 45% prediction
  const divX = PAD_L + cW * 0.55;
  const predW = W - PAD_R - divX;

  // price scale
  const candlePrices = mktCandles.map(c => c.close ?? c.value ?? lastClose);
  const allPrices = [lastClose, ...candlePrices, ...predictions.map(p => p.upper), ...predictions.map(p => p.lower)];
  const minP = Math.min(...allPrices) * 0.997;
  const maxP = Math.max(...allPrices) * 1.003;
  const priceRange = maxP - minP || 1;
  const toY = p => cTop + ((maxP - p) / priceRange) * CHART_H;

  // market-hours x mapping
  const mktToX = i =>
    PAD_L + (mktCandles.length > 1 ? (i / (mktCandles.length - 1)) * (divX - PAD_L - 2) : 0);

  const mktPts = mktCandles.map((c, i) => ({ x: mktToX(i), y: toY(c.close ?? c.value ?? lastClose) }));
  const mktPath = mktPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const mktArea = mktPts.length > 1
    ? `${mktPath} L ${mktPts.at(-1).x.toFixed(1)},${cBot} L ${mktPts[0].x.toFixed(1)},${cBot} Z`
    : "";

  // connection point (last candle → prediction)
  const connX = hasCandles ? mktPts.at(-1).x : divX;
  const connY = hasCandles ? mktPts.at(-1).y : toY(lastClose);

  // prediction x mapping
  const predToX = i => divX + ((i + 1) / predictions.length) * predW;
  const predMidPts = predictions.map((p, i) => ({ x: predToX(i), y: toY(p.price) }));
  const predUpPts  = predictions.map((p, i) => ({ x: predToX(i), y: toY(p.upper) }));
  const predLowPts = predictions.map((p, i) => ({ x: predToX(i), y: toY(p.lower) }));

  // band closed path: conn → upper → lower reversed → close
  const bandD =
    `M ${connX.toFixed(1)},${connY.toFixed(1)} ` +
    predUpPts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " " +
    [...predLowPts].reverse().map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // volume
  const maxVol = Math.max(...mktCandles.map(c => c.volume ?? 0), 1);

  // y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => minP + (priceRange / 4) * i);

  // x-axis labels — market hours
  const etFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const mktXLabels = (() => {
    if (!hasCandles) return [];
    const step = Math.max(1, Math.floor(mktCandles.length / 4));
    return mktCandles
      .filter((_, i) => i % step === 0 || i === mktCandles.length - 1)
      .map(c => {
        const idx = mktCandles.indexOf(c);
        const ms = c.time > 1e10 ? c.time : c.time * 1000;
        return { x: mktToX(idx), label: etFmt.format(new Date(ms)) };
      });
  })();

  // x-axis labels — prediction hours from now
  const gap = Math.ceil(predictions.length / 4);
  const predXLabels = predictions
    .map((_, i) => i)
    .filter(i => i === 0 || i === predictions.length - 1 || i % gap === 0)
    .map(i => {
      const hours = (i + 1) * 24;
      const label = hours < 48 ? `+${hours}h` : `+${Math.round(hours / 24)}d`;
      return { x: predToX(i), label };
    });

  const lastPrice = predictions.at(-1)?.price ?? lastClose;
  const pctChange = ((lastPrice - lastClose) / lastClose) * 100;
  const isUp = lastPrice >= lastClose;

  function handleMouseMove(e) {
    const el = svgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const svgY = ((e.clientY - rect.top) / rect.height) * H;

    if (svgX < PAD_L || svgX > W - PAD_R || svgY < cTop || svgY > cBot) {
      setHover(null);
      return;
    }

    let price = null, timeLabel = null, inPredZone = false;

    if (svgX <= divX && mktPts.length > 0) {
      const ratio = (svgX - PAD_L) / Math.max(divX - PAD_L, 1);
      const idx = Math.max(0, Math.min(mktPts.length - 1, Math.round(ratio * (mktPts.length - 1))));
      const c = mktCandles[idx];
      price = c.close ?? c.value ?? lastClose;
      const ms = c.time > 1e10 ? c.time : c.time * 1000;
      timeLabel = etFmt.format(new Date(ms));
    } else if (svgX > divX && predMidPts.length > 0) {
      inPredZone = true;
      const ratio = (svgX - divX) / Math.max(predW, 1);
      const idx = Math.max(0, Math.min(predMidPts.length - 1, Math.round(ratio * (predMidPts.length - 1))));
      price = predictions[idx]?.price ?? lastPrice;
      const hours = (idx + 1) * 24;
      timeLabel = hours < 48 ? `+${hours}h` : `+${Math.round(hours / 24)}d`;
    }

    if (price !== null) {
      setHover({ x: svgX, y: toY(price), price, timeLabel, inPredZone });
    }
  }

  return (
    <div style={{
      background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
      border: "1px solid rgba(99,179,237,0.15)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 8px" }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Price Chart & Forecast — {symbol}
        </span>
        <div style={{ display: "flex", gap: 16 }}>
          <LegendItem solid color="#34d399" label="Market hours" />
          <LegendItem dashed color="rgba(148,163,184,0.55)" label="Prediction" />
        </div>
      </div>

      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", cursor: "crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="mktGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#34d399" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="predBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#94a3b8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.04" />
          </linearGradient>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(148,163,184,0.12)" strokeWidth="3" />
          </pattern>
          <filter id="softBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" />
          </filter>
          <filter id="predGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="predLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>

        {/* grid + y-axis */}
        {yTicks.map((v, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            <text x={PAD_L - 8} y={toY(v) + 4} textAnchor="end" fill="#cbd5e1" fontSize="10" fontFamily="'DM Mono', monospace">
              {v >= 1000 ? v.toFixed(0) : v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* previous-close dashed reference */}
        <line x1={PAD_L} y1={toY(lastClose)} x2={W - PAD_R} y2={toY(lastClose)}
          stroke="rgba(148,163,184,0.45)" strokeWidth="1" strokeDasharray="5 4" />

        {/* prediction zone: hatch + band */}
        <rect x={divX} y={cTop} width={predW} height={CHART_H} fill="url(#hatch)" />
        <path d={bandD} fill="url(#predBandGrad)" filter="url(#softBlur)" />

        {/* market-hours area + line */}
        {mktArea && <path d={mktArea} fill="url(#mktGrad)" />}
        {mktPath && (
          <path d={mktPath} fill="none" stroke="#34d399" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* prediction upper/lower dashed (blurred) */}
        <path d={`M ${connX.toFixed(1)},${connY.toFixed(1)} ` + predUpPts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="1" strokeDasharray="4 3" filter="url(#softBlur)" />
        <path d={`M ${connX.toFixed(1)},${connY.toFixed(1)} ` + predLowPts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="none" stroke="rgba(148,163,184,0.45)" strokeWidth="1" strokeDasharray="4 3" filter="url(#softBlur)" />

        {/* prediction centre line — glow pass then sharp line */}
        <path d={`M ${connX.toFixed(1)},${connY.toFixed(1)} ` + predMidPts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="none" stroke="rgba(96,165,250,0.35)" strokeWidth="6"
          strokeLinecap="round" strokeLinejoin="round" filter="url(#predGlow)" />
        <path d={`M ${connX.toFixed(1)},${connY.toFixed(1)} ` + predMidPts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")}
          fill="none" stroke="url(#predLineGrad)" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* "Now" divider */}
        <line x1={divX} y1={cTop} x2={divX} y2={cBot} stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4 3" />

        {/* "PREDICTION" watermark in hatched zone */}
        <text x={divX + predW / 2} y={cTop + 22} textAnchor="middle"
          fill="rgba(148,163,184,0.4)" fontSize="10" fontFamily="'DM Mono', monospace" letterSpacing="0.12em">
          PREDICTION
        </text>

        {/* last market-hours dot */}
        {hasCandles && (
          <circle cx={connX} cy={connY} r="3.5" fill="#34d399" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
        )}

        {/* volume bars */}
        {mktCandles.map((c, i) => {
          const bx = mktToX(i);
          const bh = ((c.volume ?? 0) / maxVol) * VOL_H;
          const green = c.close >= (mktCandles[i - 1]?.close ?? c.close);
          return (
            <rect key={i} x={bx - 1} y={vTop + VOL_H - bh} width={2} height={bh}
              fill={green ? "rgba(52,211,153,0.5)" : "rgba(248,113,113,0.4)"} />
          );
        })}
        {hasCandles && (
          <text x={PAD_L - 8} y={vTop + VOL_H} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="'DM Mono', monospace">Vol</text>
        )}

        {/* x-axis: market-hours time labels */}
        {mktXLabels.map(({ x, label }, i) => (
          <g key={i}>
            <rect x={x - 22} y={xLabelY - 11} width={44} height={15} rx={3} fill="rgba(15,23,42,0.7)" />
            <text x={x} y={xLabelY} textAnchor="middle" fill="#cbd5e1" fontSize="11" fontFamily="'DM Mono', monospace">{label}</text>
          </g>
        ))}
        {!hasCandles && (
          <text x={PAD_L + (divX - PAD_L) / 2} y={xLabelY} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="'DM Mono', monospace">Today</text>
        )}

        {/* x-axis: prediction labels */}
        {predXLabels.map(({ x, label }, i) => (
          <g key={i}>
            <rect x={x - 20} y={xLabelY - 11} width={40} height={15} rx={3} fill="rgba(15,23,42,0.7)" />
            <text x={x} y={xLabelY} textAnchor="middle" fill="#a5b4fc" fontSize="11" fontFamily="'DM Mono', monospace">{label}</text>
          </g>
        ))}

        {/* end dot on prediction line */}
        {predMidPts.length > 0 && (
          <circle cx={predMidPts.at(-1).x} cy={predMidPts.at(-1).y}
            r="4" fill="#818cf8" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
        )}

        {/* ── top price bar ── */}
        {/* Prev Close — top left */}
        <text x={PAD_L} y={cTop - 6} textAnchor="start"
          fill="#64748b" fontSize="9" fontFamily="'DM Mono', monospace" letterSpacing="0.06em">
          PREV CLOSE
        </text>
        <text x={PAD_L} y={cTop + 6} textAnchor="start"
          fill="#94a3b8" fontSize="12" fontWeight="600" fontFamily="'DM Mono', monospace">
          ${lastClose.toFixed(2)}
        </text>

        {/* Predicted price + change — top right */}
        {predMidPts.length > 0 && (
          <>
            <text x={W - PAD_R} y={cTop - 6} textAnchor="end"
              fill="#64748b" fontSize="9" fontFamily="'DM Mono', monospace" letterSpacing="0.06em">
              FORECAST END
            </text>
            <text x={W - PAD_R} y={cTop + 6} textAnchor="end"
              fill="#a5b4fc" fontSize="13" fontWeight="700" fontFamily="'DM Mono', monospace">
              ${lastPrice.toFixed(2)}
            </text>
            <text x={W - PAD_R} y={cTop + 19} textAnchor="end"
              fill={isUp ? "#34d399" : "#f87171"} fontSize="11" fontFamily="'DM Mono', monospace">
              {isUp ? "▲" : "▼"} {Math.abs(pctChange).toFixed(2)}%
            </text>
          </>
        )}

        {/* ── interactive crosshair ── */}
        {hover && (
          <g pointerEvents="none">
            {/* vertical line */}
            <line x1={hover.x} y1={cTop} x2={hover.x} y2={cBot}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            {/* horizontal line */}
            <line x1={PAD_L} y1={hover.y} x2={W - PAD_R} y2={hover.y}
              stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="3 3" />
            {/* dot on the line */}
            <circle cx={hover.x} cy={hover.y} r="4"
              fill={hover.inPredZone ? "#818cf8" : "#34d399"}
              stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
            {/* price pill on y-axis */}
            <rect x={0} y={hover.y - 10} width={PAD_L - 5} height={20} rx={4}
              fill="#0f172a" stroke={hover.inPredZone ? "rgba(129,140,248,0.5)" : "rgba(52,211,153,0.5)"} strokeWidth={1} />
            <text x={PAD_L - 9} y={hover.y + 4} textAnchor="end"
              fill="#e2e8f0" fontSize="10" fontWeight="bold" fontFamily="'DM Mono', monospace">
              ${hover.price.toFixed(2)}
            </text>
            {/* time/date pill on x-axis */}
            <rect x={hover.x - 26} y={cBot + 3} width={52} height={17} rx={4}
              fill="#0f172a" stroke={hover.inPredZone ? "rgba(129,140,248,0.4)" : "rgba(99,179,237,0.4)"} strokeWidth={1} />
            <text x={hover.x} y={cBot + 15} textAnchor="middle"
              fill={hover.inPredZone ? "#a5b4fc" : "#94a3b8"} fontSize="9" fontFamily="'DM Mono', monospace">
              {hover.timeLabel}
            </text>
          </g>
        )}
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

// ─── Analyst Recommendation Panel ─────────────────────────────────────────────

const REC_COLORS = {
  "Strong Buy":  "#34d399",
  "Buy":         "#86efac",
  "Hold":        "#fbbf24",
  "Sell":        "#f87171",
  "Strong Sell": "#ef4444",
};

function AnalystPanel({ symbol }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authFetch(`${API_BASE}/predict/analyst/${symbol}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) return (
    <div style={{ width: 280, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", height: 300,
      background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
      border: "1px solid rgba(99,179,237,0.15)", borderRadius: 12, }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#64748b" }}>Loading…</span>
    </div>
  );

  if (!data) return null;

  const { rec_label, rec_mean, target_price, target_high, target_low, num_analysts, volatility, breakdown } = data;
  const color = REC_COLORS[rec_label] ?? "#94a3b8";

  // Gauge needle: rec_mean 1=Strong Buy(right), 5=Strong Sell(left)
  // angle in degrees: -90 (left) to +90 (right)
  const needleAngle = ((5 - rec_mean) / 4) * 180 - 90;

  const bd = breakdown ?? {};
  const total = (bd.strong_buy ?? 0) + (bd.buy ?? 0) + (bd.hold ?? 0) + (bd.sell ?? 0) + (bd.strong_sell ?? 0);
  const barMax = Math.max(bd.strong_buy ?? 0, bd.buy ?? 0, bd.hold ?? 0, bd.sell ?? 0, bd.strong_sell ?? 0, 1);

  const BreakdownRow = ({ label, count, barColor }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#cbd5e1", width: 84, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${(count / barMax) * 100}%` }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ height: "100%", background: barColor, borderRadius: 99 }}
        />
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#94a3b8", width: 22, textAlign: "right" }}>{count}</span>
    </div>
  );

  const InfoRow = ({ label, value, valueColor, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#e2e8f0", margin: 0 }}>{label}</p>
        {sub && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#64748b", margin: "2px 0 0" }}>{sub}</p>}
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 700, color: valueColor ?? "#e2e8f0" }}>{value}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.1 }}
      style={{
        width: 280, flexShrink: 0,
        background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, padding: "20px 22px",
      }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 14px" }}>
        Analyst Recommendation
      </p>

      {/* Gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        <svg width="200" height="110" viewBox="0 0 200 110">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#ef4444" />
              <stop offset="25%"  stopColor="#f87171" />
              <stop offset="50%"  stopColor="#fbbf24" />
              <stop offset="75%"  stopColor="#86efac" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="14" strokeLinecap="round" />
          {/* Coloured arc */}
          <path d="M 15 95 A 85 85 0 0 1 185 95" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round" opacity="0.75" />
          {/* Zone labels */}
          <text x="8"   y="104" fill="#ef4444" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="'DM Mono', monospace">SS</text>
          <text x="40"  y="62"  fill="#f87171" fontSize="8" textAnchor="middle" fontFamily="'DM Mono', monospace">Sell</text>
          <text x="100" y="18"  fill="#fbbf24" fontSize="8" textAnchor="middle" fontFamily="'DM Mono', monospace">Hold</text>
          <text x="160" y="62"  fill="#86efac" fontSize="8" textAnchor="middle" fontFamily="'DM Mono', monospace">Buy</text>
          <text x="192" y="104" fill="#34d399" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="'DM Mono', monospace">SB</text>
          {/* Needle */}
          <g transform={`rotate(${needleAngle}, 100, 95)`}>
            <line x1="100" y1="95" x2="100" y2="22" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="100" cy="95" r="5" fill={color} />
          </g>
        </svg>

        {/* Label */}
        <div style={{ marginTop: -6, background: `${color}20`, border: `1px solid ${color}50`, borderRadius: 20, padding: "4px 18px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color }}>{rec_label}</span>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#64748b", marginTop: 6, textAlign: "center" }}>
          Based on {num_analysts} analysts
        </p>
      </div>

      {/* Breakdown bars */}
      <div style={{ marginBottom: 14 }}>
        <BreakdownRow label="Strong Buy"  count={bd.strong_buy  ?? 0} barColor="#34d399" />
        <BreakdownRow label="Buy"         count={bd.buy         ?? 0} barColor="#86efac" />
        <BreakdownRow label="Hold"        count={bd.hold        ?? 0} barColor="#fbbf24" />
        <BreakdownRow label="Sell"        count={bd.sell        ?? 0} barColor="#f87171" />
        <BreakdownRow label="Strong Sell" count={bd.strong_sell ?? 0} barColor="#ef4444" />
      </div>

      {/* Info rows */}
      <div>
        {target_price && (
          <InfoRow
            label="12-Month Price Target"
            value={`$${target_price.toFixed(2)}`}
            valueColor="#63b3ed"
            sub={target_low && target_high ? `Range $${target_low} – $${target_high}` : undefined}
          />
        )}
        <InfoRow label="Price Volatility" value={volatility} />
      </div>
    </motion.div>
  );
}

// ─── Sentiment Panel ───────────────────────────────────────────────────────────

function SentimentPanel({ sentiment }) {
  const { score, label, confidence, breakdown } = sentiment;
  const c = SENTIMENT_COLORS[label] ?? SENTIMENT_COLORS.Neutral;
  const needleAngle = score * 90;  // –90° bear … +90° bull

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.15 }}
      style={{
        width: 288, flexShrink: 0,
        background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12, padding: "20px 22px",
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
          transition={{ duration: 0.25, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 3, opacity: 0.75 }}
        />
      </div>
    </div>
  );
}

// ─── Stats Strip ───────────────────────────────────────────────────────────────

function StatsStrip({ lastClose, predictions, livePrice }) {
  const last = predictions.at(-1);
  const forecastHigh = Math.max(...predictions.map(p => p.upper));
  const forecastLow  = Math.min(...predictions.map(p => p.lower));
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
    { label: "Forecast High", value: `$${forecastHigh.toFixed(2)}`,                   color: "#34d399" },
    { label: "Forecast Low",  value: `$${forecastLow.toFixed(2)}`,                    color: "#f87171" },
    { label: `CI Day ${predictions.length}`, value: `±$${ciHalf.toFixed(2)}`,        color: "#cbd5e1" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex",
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12,        marginBottom: 16,
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

// ─── Model Signal Panel ────────────────────────────────────────────────────────

function ModelSignalPanel({ signal }) {
  const { prob_up, direction, confidence_pct, tier_label } = signal;
  const profitMargin = signal.expected_profit_margin_pct ?? signal.expected_daily_profit_margin_pct ?? 0;
  const isUp = direction === "up";
  const color = isUp ? "#34d399" : "#f87171";
  const tierColor = { Low: "#f59e0b", Moderate: "#63b3ed", High: "#34d399" }[tier_label] ?? "#63b3ed";
  const probPct = prob_up * 100;

  const label9 = { fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" };
  const Bar = ({ fill, color: c, bg = "rgba(255,255,255,0.06)" }) => (
    <div style={{ height: 5, borderRadius: 99, background: bg, overflow: "hidden", marginTop: 8 }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ height: "100%", background: c, borderRadius: 99 }}
      />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
        border: "1px solid rgba(99,179,237,0.15)",
        borderRadius: 12,        padding: "20px 24px", marginBottom: 16,
      }}
    >
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3b82f6", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 18px" }}>
        Model Signal Breakdown
      </p>

      <div className="ai-model-signal-grid" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.4fr 1fr", gap: 20 }}>

        {/* Direction badge */}
        <div style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{isUp ? "▲" : "▼"}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 700, color, marginTop: 6 }}>
            {isUp ? "BULL" : "BEAR"}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#64748b", marginTop: 2 }}>direction</span>
        </div>

        {/* P(UP) gauge */}
        <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "14px 16px" }}>
          <p style={label9}>Probability Up — raw output</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: probPct >= 50 ? "#34d399" : "#f87171" }}>
              {probPct.toFixed(1)}%
            </span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#64748b" }}>
              {probPct >= 50 ? "bullish lean" : "bearish lean"}
            </span>
          </div>
          {/* Split bar: red 0–50, green 50–100, marker at prob_up */}
          <div style={{ position: "relative", marginTop: 10 }}>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
              <div style={{ width: "50%", background: "rgba(248,113,113,0.25)" }} />
              <div style={{ width: "50%", background: "rgba(52,211,153,0.25)" }} />
            </div>
            <motion.div
              initial={{ left: "50%" }}
              animate={{ left: `${probPct}%` }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ position: "absolute", top: -3, width: 12, height: 12, borderRadius: "50%", background: probPct >= 50 ? "#34d399" : "#f87171", border: "2px solid #0f172a", transform: "translateX(-50%)", marginTop: 0 }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#f87171" }}>Bearish 0%</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#94a3b8" }}>50%</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#34d399" }}>100% Bullish</span>
          </div>
        </div>

        {/* Confidence */}
        <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "14px 16px" }}>
          <p style={label9}>Statistical Confidence</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: tierColor }}>
              {confidence_pct.toFixed(1)}%
            </span>
          </div>
          <div style={{ display: "inline-block", marginTop: 6, padding: "2px 10px", borderRadius: 99, background: `${tierColor}20`, border: `1px solid ${tierColor}50` }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 700, color: tierColor }}>{tier_label}</span>
          </div>
          <Bar fill={confidence_pct} color={tierColor} />
        </div>

        {/* Profit margin */}
        <div style={{ background: "rgba(15,23,42,0.5)", borderRadius: 10, padding: "14px 16px" }}>
          <p style={label9}>Expected Margin</p>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color }}>
            {profitMargin >= 0 ? "+" : ""}{profitMargin.toFixed(2)}%
          </span>
          <Bar fill={Math.abs(profitMargin) * 10} color={color} />
        </div>

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
        borderRadius: 12,        padding: "18px 20px", marginBottom: 16,
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

// ─── Section Label ─────────────────────────────────────────────────────────────

function SectionLabel({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600, color: "#cbd5e1", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {text}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(99,179,237,0.12)" }} />
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function AIPredictionPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [days, setDays] = useState(7);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRun = useRef(false);

  const { stocks, candles, marketStatus, lastUpdated } = useLiveStocks();
  const liveStock = stocks[symbol];
  const symbolCandles = candles?.[symbol] ?? [];

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");

  function handleSymbolChange(s) {
    setSymbol(s);
    setResult(null);
    runPrediction(s, days);
  }

  function handleDaysChange(d) {
    setDays(d);
    if (hasRun.current) runPrediction(symbol, d);
  }

  async function runPrediction(sym, currentDays = days) {
    setLoading(true);
    setError("");
    setResult(null);
    hasRun.current = true;
    try {
      const res = await authFetch(`${API_BASE}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: sym, days: currentDays, mode: "standard" }),
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

  // Auto-run on mount
  useEffect(() => {
    runPrediction("AAPL", 7);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500;600&family=DM+Sans:wght@300;400;500;600&display=swap');
        @media (max-width: 640px) {
          .ai-page-header { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
          .ai-tomorrows-call { grid-template-columns: repeat(2, 1fr) !important; }
          .ai-model-signal-grid { grid-template-columns: 1fr !important; }
          .ai-stats-strip { overflow-x: auto; }
          .ai-stats-strip > div { min-width: 520px; }
          .ai-chart-wrap { overflow-x: auto; }
          .ai-analyst-row { flex-direction: column !important; gap: 16px !important; }
        }
      `}</style>

      <motion.div
        className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <GeneralHeader />

        <main className="flex-1 p-4 md:p-7" style={{ position: "relative", zIndex: 1 }}>

          {/* ── Page title (mirrors AStockDashBoardPage style) ── */}
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
            className="ai-page-header"
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
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}
            style={{
              background: "linear-gradient(145deg, rgba(15,23,42,0.85), rgba(30,41,59,0.65))",
              border: "1px solid rgba(99,179,237,0.15)",
              borderRadius: 12,              padding: "22px 24px", marginBottom: 20,
              display: "flex", flexDirection: "column", gap: 20,
            }}
          >
            <div>
              <SectionLabel icon="🏢" text="Select Stock" />
              <StockSelector selected={symbol} onChange={handleSymbolChange} stocks={stocks} />
            </div>
            <div>
              <SectionLabel icon="📅" text="Forecast Horizon" />
              <DaysControl days={days} onChange={handleDaysChange} />
            </div>
          </motion.div>

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

          {/* ── Results ── */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.45 }}
                style={{ display: "flex", flexDirection: "column", gap: 28 }}
              >

                {/* ── Section: Tomorrow's call ── */}
                <section>
                  <SectionLabel icon="⚡" text="Tomorrow's Call" />
                  {result.predictions?.[0] && (() => {
                    const p0 = result.predictions[0];
                    const ret = ((p0.price - result.last_close) / result.last_close) * 100;
                    const up = ret >= 0;
                    const accentColor = up ? "#34d399" : "#f87171";
                    return (
                      <div className="ai-tomorrows-call" style={{
                        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12,
                      }}>
                        {[
                          { label: "Predicted Price", value: `$${p0.price.toFixed(2)}`, color: accentColor, large: true },
                          { label: "Expected Move", value: `${up ? "▲ +" : "▼ "}${ret.toFixed(2)}%`, color: accentColor },
                          { label: "Likely Low", value: `$${p0.lower.toFixed(2)}`, color: "#f87171" },
                          { label: "Likely High", value: `$${p0.upper.toFixed(2)}`, color: "#34d399" },
                        ].map(({ label, value, color, large }) => (
                          <div key={label} style={{
                            background: "linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,41,59,0.7))",
                            border: `1px solid ${color}30`,
                            borderLeft: `3px solid ${color}`,
                            borderRadius: 10, padding: "16px 18px",
                          }}>
                            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 8px" }}>{label}</p>
                            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: large ? 26 : 18, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
                            {label === "Predicted Price" && (
                              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#64748b", margin: "6px 0 0" }}>
                                from ${result.last_close.toFixed(2)} prev close · {p0.date}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </section>

                {/* ── Section: Market snapshot ── */}
                <section>
                  <SectionLabel icon="📊" text="Market Snapshot" />
                  <div className="ai-stats-strip overflow-x-auto">
                    <div style={{ minWidth: 520 }}>
                      <StatsStrip
                        lastClose={result.last_close}
                        predictions={result.predictions}
                        livePrice={liveStock?.price}
                      />
                    </div>
                  </div>
                </section>

                {/* ── Section: AI model signal ── */}
                <section>
                  <SectionLabel icon="🤖" text="AI Model Signal" />
                  <ModelSignalPanel signal={result.model_signal} />
                </section>

                {/* ── Section: Price chart + side panels ── */}
                <section>
                  <SectionLabel icon="📈" text={`Price Chart & ${result.days}-Day Forecast`} />
                  <div className="ai-analyst-row" style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                    <div className="ai-chart-wrap overflow-x-auto" style={{ flex: 1, minWidth: 0 }}>
                      <PredictionChart
                        lastClose={result.last_close}
                        predictions={result.predictions}
                        symbol={result.symbol}
                        todayCandles={symbolCandles}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      <SentimentPanel sentiment={result.sentiment} />
                      <AnalystPanel symbol={result.symbol} />
                    </div>
                  </div>
                </section>

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
                Select a stock to run the forecast
              </p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
                Next-day signal, forecast chart, and sentiment analysis will appear here
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
