import { createChart } from "lightweight-charts";
import { useEffect, useRef, useState, useCallback } from "react";
import ComparisonChart from "./ComparisonChart.jsx";

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y"];
const RANGE_LIMITS = { "1D": 390, "1W": 390, "1M": 30, "3M": 90, "6M": 180, "1Y": 52 };
const ET_TIME_ZONE = "America/New_York";

// Distinct colors for comparison lines
const COMPARE_COLORS = [
  "#e91e8c", "#2196f3", "#ff9800", "#9c27b0",
  "#00bcd4", "#ff5722", "#4caf50", "#795548",
];

/* ─── time helpers ──────────────────────────────────────────── */
function toUnixSeconds(time) {
  if (typeof time === "number") return Math.floor(time > 10_000_000_000 ? time / 1000 : time);
  const parsed = new Date(time).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : NaN;
}

function getEtDateParts(unixSeconds) {
  const date = new Date(unixSeconds * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false,
    day: "numeric", month: "short", year: "2-digit",
  }).formatToParts(date);
  return (type) => parts.find((p) => p.type === type)?.value ?? "";
}

function formatChartTime(time, range = "1D", includeDateForIntraday = false) {
  const unixSeconds = toUnixSeconds(time);
  if (!Number.isFinite(unixSeconds)) return "";
  const get = getEtDateParts(unixSeconds);
  const clock = `${get("hour")}:${get("minute")}`;
  if (range === "1D" || range === "1W") return includeDateForIntraday ? `${get("day")} ${get("month")} ${clock}` : clock;
  if (range === "1Y") return `${get("month")} '${get("year")}`;
  return `${get("day")} ${get("month")}`;
}

function getTimeScaleOptions(range) {
  return {
    borderVisible: false,
    timeVisible: range === "1D" || range === "1W",
    secondsVisible: false,
    tickMarkFormatter: (time) => formatChartTime(time, range),
  };
}

function filterByRange(data, range) {
  if (!data || data.length === 0) return [];
  return data.slice(-(RANGE_LIMITS[range] || 390));
}

function normalizeChartData(data) {
  const byTime = new Map();
  data.forEach((bar) => {
    const time = toUnixSeconds(bar.time);
    const value = Number(bar.close);
    if (!Number.isFinite(time) || !Number.isFinite(value)) return;
    byTime.set(time, { time, value });
  });
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
//Transfer absolute price data to % change from first point for better visual comparison
function normalizeToPercent(data) {
  if (!data.length) return [];

  const base = data[0].value;
  if (!base) return [];

  return data.map((point) => ({
    time: point.time,
    value: ((point.value - base) / base) * 100,
  }));
}

function findValueAtTime(data, time) {
  const normalizedTime = toUnixSeconds(time);
  const point = data.find((item) => item.time === normalizedTime);
  return point?.value ?? null;
}

function getSeriesValue(point) {
  if (!point) return null;
  const value = point.value ?? point.close;
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function calcPercentChange(value, base) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(base)) || Number(base) === 0) return null;
  return ((Number(value) - Number(base)) / Number(base)) * 100;
}

/** Normalize a series to % change from its first point */
/* ─── Plots legend panel ─────────────────────────────────────── */
function PlotsPanel({ plots, onRemove, onToggle, onClose, mainSymbol, mainPrice, mainPct, position, hoverRows }) {
  if (plots.length === 0) return null;
  return (
    <div style={{
      position: "absolute", top: 16, left: 16, zIndex: 20,
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
      boxShadow: "0 4px 16px rgba(0,0,0,0.10)", padding: "10px 14px", minWidth: 280,
      pointerEvents: "auto",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, color: "#111827" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="10" width="3" height="3" rx="1" fill="#6b7280" />
            <rect x="5.5" y="6" width="3" height="7" rx="1" fill="#6b7280" />
            <rect x="10" y="2" width="3" height="11" rx="1" fill="#6b7280" />
          </svg>
          Plots
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      </div>

      {/* Main symbol row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ width: 12, height: 12, borderRadius: 3, background: "#16a34a", flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: "#111827", flex: 1 }}>{mainSymbol}</span>
        {mainPrice !== null && mainPrice !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", minWidth: 64, textAlign: "right" }}>
            ${mainPrice.toFixed(2)}
          </span>
        )}
        {mainPct !== null && mainPct !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: mainPct >= 0 ? "#16a34a" : "#dc2626", minWidth: 58, textAlign: "right" }}>
            {mainPct >= 0 ? "+" : ""}{mainPct.toFixed(2)}%
          </span>
        )}
      </div>

      {/* Comparison rows */}
      {plots.map((plot) => {
        const hoverRow = hoverRows[plot.symbol];
        const price = hoverRow?.price ?? plot.latestPrice;
        const pct = hoverRow?.pct ?? plot.latestPct;

        return (
          <div key={plot.symbol} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
            {/* Remove */}
            <button onClick={() => onRemove(plot.symbol)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>
              ×
            </button>
            {/* Toggle */}
            <div onClick={() => onToggle(plot.symbol)} style={{ cursor: "pointer", flexShrink: 0 }}>
              <div style={{
                width: 28, height: 16, borderRadius: 999,
                background: plot.visible ? plot.color : "#d1d5db",
                position: "relative", transition: "background 0.2s",
              }}>
                <div style={{
                  position: "absolute", top: 2, left: plot.visible ? 14 : 2,
                  width: 12, height: 12, borderRadius: "50%", background: "#fff",
                  transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }} />
              </div>
            </div>
            {/* Color dot */}
            <span style={{ width: 12, height: 12, borderRadius: 3, background: plot.color, flexShrink: 0 }} />
            {/* Symbol */}
            <span style={{ fontSize: 13, color: "#111827", flex: 1 }}>{plot.name || plot.symbol}</span>
            {/* Latest price */}
            {price !== null && price !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 600, color: "#111827", minWidth: 64, textAlign: "right" }}>
                ${price.toFixed(2)}
              </span>
            )}
            {pct !== null && pct !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 600, color: pct >= 0 ? "#16a34a" : "#dc2626", minWidth: 58, textAlign: "right" }}>
                {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── InteractiveChart ───────────────────────────────────────── */
export default function InteractiveChart({
  data = [],
  symbol = "STOCK",
  requestRangeData,
  stockList,
  compareDataBySymbol = {},
  candleRanges = {},
  fetchCompareData,
}) {
  const [selectedRange, setSelectedRange] = useState("1D");
  const [comparePlots, setComparePlots] = useState([]); // { symbol, color, visible, seriesRef, data, name, latestPrice, latestPct, basePrice }
  const [showPlots, setShowPlots] = useState(false);
  const [pendingCompare, setPendingCompare] = useState(null);
  const [plotPanelPosition, setPlotPanelPosition] = useState({ left: 16, top: 16 });
  const [plotHoverData, setPlotHoverData] = useState({
    mainPrice: null,
    mainPct: null,
    rows: {},
  });

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const mainPriceDataRef = useRef([]);
  const selectedRangeRef = useRef(selectedRange);
  const comparePlotsRef = useRef(comparePlots);
  const mainBasePriceRef = useRef(null);
  const colorIndexRef = useRef(0);

  useEffect(() => { selectedRangeRef.current = selectedRange; }, [selectedRange]);
  useEffect(() => { comparePlotsRef.current = comparePlots; }, [comparePlots]);

  /* ── build chart once ── */
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: { background: { color: "#ffffff" }, textColor: "#6b7280", fontFamily: "Inter, sans-serif" },
      localization: { timeFormatter: (time) => formatChartTime(time, selectedRangeRef.current, true) },
      grid: { vertLines: { color: "#f1f5f9" }, horzLines: { color: "#f1f5f9" } },
      rightPriceScale: { borderVisible: false },
      timeScale: getTimeScaleOptions(selectedRangeRef.current),
      crosshair: {
        vertLine: { color: "#9ca3af", width: 1, style: 2, labelBackgroundColor: "#111827" },
        horzLine: { color: "#9ca3af", width: 1, style: 2, labelBackgroundColor: "#111827" },
      },
    });

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
    mainSeriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !param.time || param.point.x < 0 || param.point.y < 0) {
        return;
      }

      const panelWidth = 300;
      const panelHeight = 72 + comparePlotsRef.current.length * 32;
      const maxLeft = Math.max(8, chartContainerRef.current.clientWidth - panelWidth - 8);
      const maxTop = Math.max(8, chartContainerRef.current.clientHeight - panelHeight - 8);

      setPlotPanelPosition({
        left: Math.min(Math.max(param.point.x + 16, 8), maxLeft),
        top: Math.min(Math.max(param.point.y + 16, 8), maxTop),
      });

      const d = param.seriesData.get(series);
      const mainDisplayValue = getSeriesValue(d);
      const mainPrice = findValueAtTime(mainPriceDataRef.current, param.time) ?? mainDisplayValue;
      const rows = {};

      comparePlotsRef.current.forEach((plot) => {
        if (!plot.visible) return;
        const point = param.seriesData.get(plot.seriesRef);
        const pct = getSeriesValue(point);
        const price = findValueAtTime(plot.priceData ?? [], param.time);
        if (price === null && pct === null) return;

        rows[plot.symbol] = {
          price,
          pct,
        };
      });

      setPlotHoverData({
        mainPrice,
        mainPct: calcPercentChange(mainPrice, mainBasePriceRef.current),
        rows,
      });
    });

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    ro.observe(chartContainerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []);

  /* ── update main series on data/range change ── */
  useEffect(() => {
    if (!mainSeriesRef.current || data.length === 0) return;
    const filtered = filterByRange(data, selectedRange);
    const formatted = normalizeChartData(filtered);
    const hasComparePlots = comparePlots.length > 0;
    const displayData = hasComparePlots ? normalizeToPercent(formatted) : formatted;

    chartRef.current.applyOptions({
      localization: { timeFormatter: (time) => formatChartTime(time, selectedRange, true) },
      timeScale: getTimeScaleOptions(selectedRange),
    });
    mainSeriesRef.current.applyOptions({
      priceFormat: hasComparePlots
        ? { type: "percent", precision: 2, minMove: 0.01 }
        : { type: "price", precision: 2, minMove: 0.01 },
    });
    mainSeriesRef.current.setData(displayData);
    mainPriceDataRef.current = formatted;
    mainBasePriceRef.current = formatted[0]?.value ?? null;
    const latestMainPrice = formatted.at(-1)?.value ?? null;
    setPlotHoverData((prev) => ({
      ...prev,
      mainPrice: latestMainPrice,
      mainPct: calcPercentChange(latestMainPrice, mainBasePriceRef.current),
    }));
    chartRef.current.timeScale().fitContent();
  }, [comparePlots.length, data, selectedRange]);

  /* ── add a comparison series ── */
  const addCompareSeries = useCallback((sym, compData, name) => {
    if (!chartRef.current) return;
    if (comparePlotsRef.current.find((p) => p.symbol === sym)) return;

    const color = COMPARE_COLORS[colorIndexRef.current % COMPARE_COLORS.length];
    colorIndexRef.current += 1;

    const filtered = filterByRange(compData, selectedRangeRef.current);
    const normalized = normalizeChartData(filtered);
    const percentData = normalizeToPercent(normalized);

    const series = chartRef.current.addLineSeries({
      color,
      lineWidth: 2,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      lastValueVisible: true,
      priceFormat: { type: "percent", precision: 2, minMove: 0.01 },
    });

    series.setData(percentData);
    chartRef.current.timeScale().fitContent();

    const basePrice = normalized[0]?.value ?? null;
    const latestPrice = normalized.length > 0 ? normalized[normalized.length - 1].value : null;
    const latestPct = percentData.length > 0 ? percentData[percentData.length - 1].value : null;

    setComparePlots((prev) => [...prev, { symbol: sym, name: name || sym, color, visible: true, seriesRef: series, rawData: compData, priceData: normalized, latestPrice, latestPct, basePrice }]);
    setShowPlots(true);
  }, []);

  useEffect(() => {
    if (!pendingCompare) return;
    if (candleRanges[pendingCompare.symbol] !== selectedRange) return;

    const compData = compareDataBySymbol[pendingCompare.symbol];
    if (!Array.isArray(compData) || compData.length === 0) return;

    addCompareSeries(pendingCompare.symbol, compData, pendingCompare.name);
    queueMicrotask(() => setPendingCompare(null));
  }, [addCompareSeries, candleRanges, compareDataBySymbol, pendingCompare, selectedRange]);

  useEffect(() => {
    queueMicrotask(() => {
      setComparePlots((prev) =>
        prev.map((plot) => {
          if (candleRanges[plot.symbol] !== selectedRange) return plot;

          const compData = compareDataBySymbol[plot.symbol];
          if (!Array.isArray(compData) || compData.length === 0) return plot;

          const priceData = normalizeChartData(filterByRange(compData, selectedRange));
          const percentData = normalizeToPercent(priceData);
          plot.seriesRef.setData(percentData);
          const basePrice = priceData[0]?.value ?? null;
          const latestPrice = priceData.length > 0 ? priceData[priceData.length - 1].value : null;
          const latestPct = percentData.length > 0 ? percentData[percentData.length - 1].value : null;

          return {
            ...plot,
            rawData: compData,
            priceData,
            latestPrice,
            latestPct,
            basePrice,
          };
        })
      );
    });
  }, [candleRanges, compareDataBySymbol, selectedRange]);

  /* ── handle MiniBoard card click ── */
  const handleCompare = useCallback(async (sym) => {
    if (!sym || sym === symbol) return;

    // Toggle off if already active
    const existing = comparePlotsRef.current.find((p) => p.symbol === sym);
    if (existing) {
      removePlot(sym);
      return;
    }

    const range = selectedRangeRef.current;
    const compData = compareDataBySymbol[sym];

    if (candleRanges[sym] === range && Array.isArray(compData) && compData.length > 0) {
      addCompareSeries(sym, compData, sym);
      return;
    }

    setPendingCompare({ symbol: sym, name: sym });
    requestRangeData?.(sym, range);

    // Fetch data for the symbol
    if (fetchCompareData) {
      try {
        const result = await fetchCompareData(sym, selectedRangeRef.current);
        if (result && result.data) {
          addCompareSeries(sym, result.data, result.name || sym);
        }
      } catch (e) {
        console.error("Failed to fetch compare data for", sym, e);
      }
    } else if (!requestRangeData) {
      // No fetcher provided — show placeholder with empty data or stub
      console.warn("fetchCompareData prop not provided. Pass it to enable comparisons.");
    }
  }, [addCompareSeries, candleRanges, compareDataBySymbol, fetchCompareData, requestRangeData, symbol]);

  /* ── remove a plot ── */
  function removePlot(sym) {
    setComparePlots((prev) => {
      const plot = prev.find((p) => p.symbol === sym);
      if (plot?.seriesRef && chartRef.current) {
        try {
          chartRef.current.removeSeries(plot.seriesRef);
        } catch {
          console.debug("Comparison series was already removed.");
        }
      }
      const next = prev.filter((p) => p.symbol !== sym);
      if (next.length === 0) setShowPlots(false);
      return next;
    });
  }

  /* ── toggle a plot visibility ── */
  function togglePlot(sym) {
    setComparePlots((prev) =>
      prev.map((p) => {
        if (p.symbol !== sym) return p;
        const nowVisible = !p.visible;
        try {
          p.seriesRef.applyOptions({ visible: nowVisible });
        } catch {
          console.debug("Comparison series visibility could not be changed.");
        }
        return { ...p, visible: nowVisible };
      })
    );
  }

  /* ── close plots panel (hide, keep series) ── */
  function closePlotsPanel() { setShowPlots(false); }

  const visibleData = filterByRange(data, selectedRange);
  const lastBar = visibleData.at(-1);
  const firstBar = visibleData[0];
  const pctChange = lastBar && firstBar ? (((lastBar.close - firstBar.close) / firstBar.close) * 100).toFixed(2) : null;
  const isUp = pctChange >= 0;
  const activeSymbols = comparePlots.map((p) => p.symbol);

  const handleRange = useCallback((range) => {
    setSelectedRange(range);
    if (requestRangeData) requestRangeData(symbol, range);
    comparePlotsRef.current.forEach((plot) => {
      requestRangeData?.(plot.symbol, range);
    });
  }, [symbol, requestRangeData]);

  return (
    <div style={{ background: "#ffffff", borderRadius: "20px", padding: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111827" }}>{symbol}</h2>
        {lastBar && (
          <>
            <span style={{ fontSize: "22px", fontWeight: "600", color: "#111827" }}>{lastBar.close.toFixed(2)}</span>
            <span style={{ color: isUp ? "#16a34a" : "#dc2626", fontWeight: "600" }}>
              {isUp ? "+" : ""}{pctChange}%
            </span>
          </>
        )}
      </div>

      {/* COMPARE LABEL + MINI BOARD */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="#6b7280" strokeWidth="1.5" />
            <line x1="3" y1="7" x2="11" y2="7" stroke="#6b7280" strokeWidth="1.5" />
            <line x1="7" y1="3" x2="7" y2="11" stroke="#6b7280" strokeWidth="1.5" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Compare to</span>
          {comparePlots.length > 0 && !showPlots && (
            <button onClick={() => setShowPlots(true)} style={{ marginLeft: "auto", fontSize: 12, color: "#6366f1", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
              Show plots ({comparePlots.length})
            </button>
          )}
        </div>
        <ComparisonChart stocks={stockList} onCompare={handleCompare} activeSymbols={activeSymbols} />
      </div>

      {/* RANGE BUTTONS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        {RANGES.map((range) => {
          const active = selectedRange === range;
          return (
            <button key={range} onClick={() => handleRange(range)} style={{
              padding: "6px 14px", borderRadius: "999px", border: "none",
              background: active ? "#111827" : "#f3f4f6",
              color: active ? "#ffffff" : "#6b7280",
              cursor: "pointer", fontWeight: "600", transition: "0.2s",
            }}>
              {range}
            </button>
          );
        })}
      </div>

      {/* CHART + PLOTS PANEL */}
      <div ref={chartContainerRef} style={{ width: "100%", height: "500px", position: "relative" }}>
        {showPlots && (
          <PlotsPanel
            plots={comparePlots}
            mainSymbol={symbol}
            mainPrice={plotHoverData.mainPrice}
            mainPct={plotHoverData.mainPct}
            position={plotPanelPosition}
            hoverRows={plotHoverData.rows}
            onRemove={removePlot}
            onToggle={togglePlot}
            onClose={closePlotsPanel}
          />
        )}
      </div>
    </div>
  );
}
