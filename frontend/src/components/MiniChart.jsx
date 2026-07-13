import { memo, useId, useMemo } from "react";

const MAX_SPARKLINE_POINTS = 32;

function MiniChart({ candles, width = 120, height = 40, responsive = false }) {
  const reactId = useId();
  const gradientId = `spark-grad-${reactId.replace(/:/g, "")}`;
  const prices = useMemo(() => {
    const sourceCandles = candles ?? [];

    if (sourceCandles.length < 2) return [];

    const step = Math.max(
      1,
      Math.ceil(sourceCandles.length / MAX_SPARKLINE_POINTS)
    );

    const sampled = sourceCandles
      .filter((_, index) => index % step === 0)
      .map((c) => c.close);

    const last = sourceCandles.at(-1)?.close;
    if (sampled.at(-1) !== last) sampled.push(last);

    return sampled;
  }, [candles]);

  // ── Need at least 2 points to draw a line ──────────────────────────────────
  if (prices.length < 2) {
    return (
      <svg
        width={responsive ? "100%" : width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio={responsive ? "none" : undefined}
      >
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
  const first = prices[0];
  const last = prices[prices.length - 1];
  const isUp = last >= first;

  const color = isUp ? "#4ade80" : "#f87171";   // green-400 / red-400
  const glowColor = isUp
    ? "rgba(74,222,128,0.25)"
    : "rgba(248,113,113,0.25)";

  // ── Scale prices → SVG coordinates ────────────────────────────────────────
  const pad = 6;   // padding so dots aren't clipped at edges
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;   // avoid division by zero on flat lines

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

  return (
    <svg
      width={responsive ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={responsive ? "none" : undefined}
      overflow="visible"
      style={{ display: "block" }}
    >
      <defs>
        {/* Vertical gradient for the area fill */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
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
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={toX(prices.length - 1)}
        cy={toY(last)}
        r={2}
        fill={color}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />

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

export default memo(MiniChart);
