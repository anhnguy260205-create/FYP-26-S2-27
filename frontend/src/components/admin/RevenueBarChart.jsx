import { useEffect, useState } from "react";

function niceMax(value) {
  if (value <= 0) return 10;
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

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short" });
}

function formatMonthFull(monthKey) {
  const [year, month] = monthKey.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatCurrency(value) {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const CHART_HEIGHT = 200;
const Y_AXIS_WIDTH = 44;
const PADDING_BOTTOM = 24;
const PADDING_TOP = 12;
const BAR_GAP_RATIO = 0.35;
const MAX_BAR_WIDTH = 48;
const TOOLTIP_WIDTH = 160;

function RevenueBarChart({ series, loading }) {
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
  const maxRevenue = Math.max(0, ...series.map((p) => p.revenue));
  const yMax = niceMax(maxRevenue);

  const slotWidth = 56;
  const plotWidth = series.length * slotWidth;
  const plotSvgWidth = plotWidth + 8;

  const barWidth = Math.min(MAX_BAR_WIDTH, slotWidth * (1 - BAR_GAP_RATIO));

  const gridSteps = [0, yMax / 2, yMax];

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;

  const tooltipLeft = typeof window !== "undefined"
    ? Math.min(pointer.x + 14, window.innerWidth - TOOLTIP_WIDTH - 8)
    : pointer.x + 14;

  return (
    <div className="relative">
      <div className="flex">
        <svg
          width={Y_AXIS_WIDTH}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${Y_AXIS_WIDTH} ${CHART_HEIGHT}`}
          className="shrink-0 bg-white"
          aria-hidden="true"
        >
          {gridSteps.map((value, i) => {
            const y = PADDING_TOP + plotHeight - (value / yMax) * plotHeight;
            return (
              <text
                key={i}
                x={Y_AXIS_WIDTH - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="10"
                fill="#898781"
              >
                {formatCurrency(Math.round(value))}
              </text>
            );
          })}
        </svg>

        <div className="overflow-x-auto flex-1">
          <svg
            viewBox={`0 0 ${plotSvgWidth} ${CHART_HEIGHT}`}
            width={Math.max(plotSvgWidth, 420)}
            height={CHART_HEIGHT}
            role="img"
            aria-label="Revenue per month"
            className={loading ? "opacity-50 transition-opacity" : "transition-opacity"}
          >
            <defs>
              <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="revenueBarHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#15803d" />
              </linearGradient>
            </defs>

            {gridSteps.map((value, i) => {
              const y = PADDING_TOP + plotHeight - (value / yMax) * plotHeight;
              return (
                <line
                  key={i}
                  x1={0}
                  x2={plotSvgWidth}
                  y1={y}
                  y2={y}
                  stroke="#e1e0d9"
                  strokeWidth="1"
                />
              );
            })}

            {series.map((point, i) => {
              const x = i * slotWidth + (slotWidth - barWidth) / 2;
              const barHeight = yMax > 0 ? (point.revenue / yMax) * plotHeight : 0;
              const isHovered = hoverIndex === i;

              return (
                <g key={point.month}>
                  <path
                    d={roundedTopBarPath(x, PADDING_TOP + plotHeight - barHeight, barWidth, barHeight, 6)}
                    fill={isHovered ? "url(#revenueBarHover)" : "url(#revenueBar)"}
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "bottom",
                      transform: grown ? "scaleY(1)" : "scaleY(0)",
                      transition: `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 30}ms`,
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
                    aria-label={`${formatMonthFull(point.month)}: ${formatCurrency(point.revenue)}`}
                    onMouseEnter={(e) => {
                      setHoverIndex(i);
                      setPointer({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => setPointer({ x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setHoverIndex(null)}
                    onFocus={() => setHoverIndex(i)}
                    onBlur={() => setHoverIndex(null)}
                    style={{ cursor: "pointer", outline: "none" }}
                  />
                </g>
              );
            })}

            <line
              x1={0}
              x2={plotSvgWidth}
              y1={PADDING_TOP + plotHeight}
              y2={PADDING_TOP + plotHeight}
              stroke="#c3c2b7"
              strokeWidth="1"
            />

            {series.map((point, i) => (
              <text
                key={point.month}
                x={i * slotWidth + slotWidth / 2}
                y={CHART_HEIGHT - 6}
                textAnchor="middle"
                fontSize="10"
                fill="#898781"
              >
                {formatMonthLabel(point.month)}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {hovered && (
        <div
          className="fixed z-10 pointer-events-none bg-slate-900 text-white text-xs rounded-xl px-3.5 py-2.5 shadow-lg ring-1 ring-black/5"
          style={{ left: tooltipLeft, top: pointer.y - 48, width: TOOLTIP_WIDTH }}
        >
          <div className="flex items-center gap-1.5 font-bold text-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
            {formatCurrency(hovered.revenue)}
          </div>
          <div className="text-slate-300 mt-0.5">{formatMonthFull(hovered.month)}</div>
        </div>
      )}
    </div>
  );
}

export default RevenueBarChart;
