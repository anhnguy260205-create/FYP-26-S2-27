import { useEffect, useState } from "react";

// Small column chart for "logins per date" — a compact companion to
// SignupsBarChart, sized for an embedded card rather than a full dashboard.
// There is no hours-online tracking anywhere in the app; this counts fresh
// logins (real login_mfa_session rows), not duration.

function niceMax(value) {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function roundedTopBarPath(x, y, width, height, radius) {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  const bottom = y + height;
  return `
    M ${x},${bottom}
    L ${x},${y + r}
    Q ${x},${y} ${x + r},${y}
    L ${x + width - r},${y}
    Q ${x + width},${y} ${x + width},${y + r}
    L ${x + width},${bottom}
    Z
  `;
}

function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const CHART_HEIGHT = 220;
const Y_AXIS_WIDTH = 28;
const PADDING_BOTTOM = 26;
const PADDING_TOP = 14;
const BAR_GAP = 10;
const TOOLTIP_WIDTH = 150;

function LoginActivityChart({ series, loading }) {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    setGrown(false);
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, [series]);

  if (!series || series.length === 0) return null;

  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const maxCount = Math.max(0, ...series.map((p) => p.count));
  const yMax = niceMax(maxCount);

  const slotWidth = 48;
  const plotWidth = series.length * slotWidth;
  const barWidth = slotWidth - BAR_GAP;

  const gridSteps = [0, yMax];
  const hovered = hoverIndex !== null ? series[hoverIndex] : null;

  const tooltipLeft = typeof window !== "undefined"
    ? Math.min(pointer.x + 14, window.innerWidth - TOOLTIP_WIDTH - 8)
    : pointer.x + 14;

  return (
    <div className="relative">
      <div className="flex">
        <svg width={Y_AXIS_WIDTH} height={CHART_HEIGHT} viewBox={`0 0 ${Y_AXIS_WIDTH} ${CHART_HEIGHT}`} className="shrink-0" aria-hidden="true">
          {gridSteps.map((value, i) => {
            const y = PADDING_TOP + plotHeight - (value / yMax) * plotHeight;
            return (
              <text key={i} x={Y_AXIS_WIDTH - 6} y={y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#94a3b8">
                {Math.round(value)}
              </text>
            );
          })}
        </svg>

        <svg
          viewBox={`0 0 ${plotWidth} ${CHART_HEIGHT}`}
          width={plotWidth}
          height={CHART_HEIGHT}
          role="img"
          aria-label="Logins per day"
          className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}
        >
          <defs>
            <linearGradient id="loginBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="loginBarHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          <line x1={0} x2={plotWidth} y1={PADDING_TOP + plotHeight} y2={PADDING_TOP + plotHeight} stroke="#e2e8f0" strokeWidth="1" />

          {series.map((point, i) => {
            const x = i * slotWidth + (slotWidth - barWidth) / 2;
            const barHeight = yMax > 0 ? (point.count / yMax) * plotHeight : 0;
            const isHovered = hoverIndex === i;

            return (
              <g key={point.date}>
                <path
                  d={roundedTopBarPath(x, PADDING_TOP + plotHeight - barHeight, barWidth, Math.max(barHeight, point.count > 0 ? 3 : 0), 4)}
                  fill={isHovered ? "url(#loginBarHover)" : "url(#loginBar)"}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom",
                    transform: grown ? "scaleY(1)" : "scaleY(0)",
                    transition: `transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms`,
                  }}
                />
                <rect
                  x={i * slotWidth}
                  y={PADDING_TOP}
                  width={slotWidth}
                  height={plotHeight}
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatFullDate(point.date)}: ${point.count} login${point.count === 1 ? "" : "s"}`}
                  onMouseEnter={(e) => { setHoverIndex(i); setPointer({ x: e.clientX, y: e.clientY }); }}
                  onMouseMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(i)}
                  onBlur={() => setHoverIndex(null)}
                  style={{ cursor: "pointer", outline: "none" }}
                />
              </g>
            );
          })}

          {series.map((point, i) => (
            <text key={point.date} x={i * slotWidth + slotWidth / 2} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">
              {formatShortDate(point.date)}
            </text>
          ))}
        </svg>
      </div>

      {hovered && (
        <div
          className="fixed z-10 pointer-events-none bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-lg ring-1 ring-black/5"
          style={{ left: tooltipLeft, top: pointer.y - 48, width: TOOLTIP_WIDTH }}
        >
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
            {hovered.count} login{hovered.count === 1 ? "" : "s"}
          </div>
          <div className="text-slate-300 mt-0.5">{formatFullDate(hovered.date)}</div>
        </div>
      )}
    </div>
  );
}

export default LoginActivityChart;
