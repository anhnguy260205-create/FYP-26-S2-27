function MiniChart({ candles, width = 120, height = 40 }) {
  // ── Need at least 2 points to draw a line ──────────────────────────────────
  if (!candles || candles.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0} y1={height / 2}
          x2={width} y2={height / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
        />
      </svg>
    );
  }

  // ── Use close prices as the data series ────────────────────────────────────
  const prices = candles.map((c) => c.close);
  const first  = prices[0];
  const last   = prices[prices.length - 1];
  const isUp   = last >= first;

  const color      = isUp ? "#4ade80" : "#f87171";   // green-400 / red-400
  const dotColor   = isUp ? "#86efac" : "#fca5a5";   // green-300 / red-300
  const glowColor  = isUp
    ? "rgba(74,222,128,0.25)"
    : "rgba(248,113,113,0.25)";

  // ── Scale prices → SVG coordinates ────────────────────────────────────────
  const pad    = 6;   // padding so dots aren't clipped at edges
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const range  = maxP - minP || 1;   // avoid division by zero on flat lines

  const toX = (i) =>
    pad + (i / (prices.length - 1)) * (width - pad * 2);

  const toY = (p) =>
    pad + ((maxP - p) / range) * (height - pad * 2);

  // Build SVG path string
  const points = prices.map((p, i) => `${toX(i)},${toY(p)}`);
  const linePath = `M ${points.join(" L ")}`;

  // Area fill path (close back along bottom)
  const areaPath =
    `M ${toX(0)},${height} ` +
    `L ${points.join(" L ")} ` +
    `L ${toX(prices.length - 1)},${height} Z`;

  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      overflow="visible"
      style={{ display: "block" }}
    >
      <defs>
        {/* Vertical gradient for the area fill */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />

      {/* Glow — slightly blurred duplicate line */}
      <path
        d={linePath}
        fill="none"
        stroke={glowColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "blur(3px)" }}
      />

      {/* Main line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots on each data point */}
      {prices.map((p, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(p)}
          r={i === prices.length - 1 ? 3 : 2}          // last dot slightly bigger
          fill={i === prices.length - 1 ? color : dotColor}
          stroke={i === prices.length - 1 ? "rgba(0,0,0,0.4)" : "none"}
          strokeWidth="1"
        />
      ))}

      {/* Pulsing ring on the last (live) dot */}
      <circle
        cx={toX(prices.length - 1)}
        cy={toY(last)}
        r="5"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.5"
      >
        <animate
          attributeName="r"
          values="3;7;3"
          dur="2s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0;0.6"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export default MiniChart;
