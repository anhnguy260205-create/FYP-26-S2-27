import { createChart } from "lightweight-charts";
import { useEffect, useRef, useState, useCallback } from "react";

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"];
const RANGE_LIMITS = {
  "1D": 390,     // 1m candles
  "1W": 390,
  "1M": 30,      // 30 daily candles
  "3M": 90,
  "6M": 180,
  "1Y": 52,      // weekly candles
};

function filterByRange(data, range) {
  if (!data || data.length === 0) return [];

  const limit = RANGE_LIMITS[range] || 390;

  // return latest candles
  return data.slice(-limit);
}

function normalizeChartData(data) {
  const byTime = new Map();

  data.forEach((bar) => {
    const time =
      typeof bar.time === "number"
        ? Math.floor(bar.time / 1000)
        : Math.floor(new Date(bar.time).getTime() / 1000);
    const value = Number(bar.close);

    if (!Number.isFinite(time) || !Number.isFinite(value)) return;

    // lightweight-charts requires strictly ascending, unique times.
    // If a live/update candle shares a timestamp with history, keep the newest one.
    byTime.set(time, { time, value });
  });

  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

export default function InteractiveChart({data = [], symbol = "STOCK", requestRangeData,}) {
  const [selectedRange, setSelectedRange] = useState("1D");

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const selectedRangeRef = useRef(selectedRange);

  useEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,

      layout: {
        background: { color: "#ffffff" },
        textColor: "#6b7280",
        fontFamily: "Inter, sans-serif",
      },

      grid: {
        vertLines: {
          color: "#f1f5f9",
        },
        horzLines: {
          color: "#f1f5f9",
        },
      },

      rightPriceScale: {
        borderVisible: false,
      },

      timeScale: {
  borderVisible: false,
  timeVisible: true,
  secondsVisible: false,

  tickMarkFormatter: (time) => {
    const date = new Date(time * 1000);

    // 1D and 1W -> show hours
    if (selectedRangeRef.current === "1D" || selectedRangeRef.current === "1W") {
      return `${date.getHours()}:${String(
        date.getMinutes()
      ).padStart(2, "0")}`;
    }

    if (
  selectedRangeRef.current === "1Y"
) {
  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
    }
  );
}

return date.toLocaleDateString(
  "en-US",
  {
    day: "numeric",
    month: "short",
  }
);
  },
},

      crosshair: {
        vertLine: {
          color: "#9ca3af",
          width: 1,
          style: 2,
          labelBackgroundColor: "#111827",
        },

        horzLine: {
          color: "#9ca3af",
          width: 1,
          style: 2,
          labelBackgroundColor: "#111827",
        },
      },
    });

    // GREEN AREA SERIES
    const series = chart.addAreaSeries({
      lineColor: "#16a34a",

      topColor: "rgba(22,163,74,0.25)",

      bottomColor: "rgba(22,163,74,0.01)",

      lineWidth: 2,

      crosshairMarkerVisible: true,

      crosshairMarkerRadius: 4,

      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // TOOLTIP
    const toolTip = document.createElement("div");

    toolTip.style = `
      position: absolute;
      display: none;
      padding: 12px;
      box-sizing: border-box;
      font-size: 12px;
      z-index: 1000;
      top: 20px;
      left: 20px;
      pointer-events: none;
      border-radius: 10px;
      background: #111827;
      color: white;
      min-width: 120px;
    `;

    chartContainerRef.current.appendChild(toolTip);

    chart.subscribeCrosshairMove((param) => {
      if (
        !param.point ||
        !param.time ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        toolTip.style.display = "none";
        return;
      }

      const data = param.seriesData.get(series);

      if (!data) return;

      toolTip.style.display = "block";

      toolTip.innerHTML = `
        <div style="font-size:14px;font-weight:600;margin-bottom:6px;">
          ${data.value.toFixed(2)}
        </div>

        <div style="color:#9ca3af;">
          ${new Date(param.time * 1000).toLocaleString()}
        </div>
      `;
    });

    // RESPONSIVE
    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // UPDATE DATA
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;

    const filtered = filterByRange(data, selectedRange);

    const formatted = normalizeChartData(filtered);

    seriesRef.current.setData(formatted);

    chartRef.current.timeScale().fitContent();
  }, [data, selectedRange]);

  const visibleData = filterByRange(data, selectedRange);
  const lastBar = visibleData.at(-1);
  const firstBar = visibleData[0];

  const pctChange =
    lastBar && firstBar
      ? (
          ((lastBar.close - firstBar.close) /
            firstBar.close) *
          100
        ).toFixed(2)
      : null;

  const isUp = pctChange >= 0;

  const handleRange = useCallback((range) => {
  setSelectedRange(range);

  if (requestRangeData) {
    requestRangeData(symbol, range);
  }
}, [symbol, requestRangeData]);
  return (
    <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "20px",
        boxShadow:
          "0 4px 20px rgba(0,0,0,0.06)",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: "#111827",
          }}
        >
          {symbol}
        </h2>

        {lastBar && (
          <>
            <span
              style={{
                fontSize: "22px",
                fontWeight: "600",
                color: "#111827",
              }}
            >
              {lastBar.close.toFixed(2)}
            </span>

            <span
              style={{
                color: isUp
                  ? "#16a34a"
                  : "#dc2626",
                fontWeight: "600",
              }}
            >
              {isUp ? "+" : ""}
              {pctChange}%
            </span>
          </>
        )}
      </div>

      {/* RANGE BUTTONS */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {RANGES.map((range) => {
          const active = selectedRange === range;

          return (
            <button
              key={range}
              onClick={() => handleRange(range)}
              style={{
                padding: "6px 14px",
                borderRadius: "999px",
                border: "none",

                background: active
                  ? "#111827"
                  : "#f3f4f6",

                color: active
                  ? "#ffffff"
                  : "#6b7280",

                cursor: "pointer",

                fontWeight: "600",

                transition: "0.2s",
              }}
            >
              {range}
            </button>
          );
        })}
      </div>

      {/* CHART */}
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: "500px",
          position: "relative",
        }}
      />
    </div>
  );
}
