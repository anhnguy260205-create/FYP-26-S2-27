import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { fetchRating, fetchSectorRanking } from "../../api/ratingApi.js";

// ─── Constants ───────────────────────────────────────────────────────────────

const SECTORS = [
  { key: "Technology", label: "Technology" },
  { key: "Financials", label: "Financials" },
  { key: "Healthcare", label: "Health Care" },
  { key: "ConsumerDisc", label: "Consumer Disc." },
  { key: "ConsumerStaples", label: "Consumer Staples" },
  { key: "Energy", label: "Energy" },
  { key: "Industrials", label: "Industrials" },
  { key: "Materials", label: "Materials" },
  { key: "RealEstate", label: "Real Estate" },
  { key: "Utilities", label: "Utilities" },
  { key: "CommServices", label: "Comm. Services" },
];

// Light-theme card surface, matching the shared token set used on
// LoggedInHomePage.jsx / ForumPage.jsx (white card, slate-200 ring).
const CARD_LIGHT = "rounded-2xl bg-white shadow-md shadow-slate-900/5 ring-1 ring-slate-200";

// Text sitting directly on the page's blue-to-white gradient (title area),
// same tokens as ForumPage.jsx's PAGE object.
const PAGE = {
  heading: "#0B1D4F",
  sub: "#33477A",
};

// Label → color theme (Seeking-Alpha-style: green buy, amber hold, red sell).
// Text/ring colors are darker, more saturated hues tuned for contrast on a
// white card; rgba tint backgrounds/borders are kept light.
const LABEL_THEME = {
  "Strong Buy": { text: "#0F9D58", ring: "#0F9D58", bg: "rgba(15,157,88,0.12)", border: "rgba(15,157,88,0.4)" },
  "Buy": { text: "#059669", ring: "#059669", bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.35)" },
  "Hold": { text: "#B45309", ring: "#B45309", bg: "rgba(180,83,9,0.12)", border: "rgba(180,83,9,0.35)" },
  "Sell": { text: "#C2410C", ring: "#C2410C", bg: "rgba(194,65,12,0.12)", border: "rgba(194,65,12,0.35)" },
  "Strong Sell": { text: "#DC2626", ring: "#DC2626", bg: "rgba(220,38,38,0.12)", border: "rgba(220,38,38,0.4)" },
};

const GRADE_COLOR = {
  A: "#0F9D58", B: "#059669", C: "#B45309", D: "#C2410C", F: "#DC2626", "N/A": "#64748b",
};

// Model confidence badge theme (from backend `confidence.level`)
const CONF_THEME = {
  high: { label: "High confidence", text: "#059669", bg: "rgba(5,150,105,0.12)", border: "rgba(5,150,105,0.35)" },
  medium: { label: "Medium confidence", text: "#B45309", bg: "rgba(180,83,9,0.12)", border: "rgba(180,83,9,0.35)" },
  low: { label: "Low confidence", text: "#C2410C", bg: "rgba(194,65,12,0.12)", border: "rgba(194,65,12,0.35)" },
  unknown: { label: "Unrated model", text: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.3)" },
};

const themeFor = (label) => LABEL_THEME[label] || LABEL_THEME["Hold"];
const pct = (x) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const money = (x) => (x == null ? "—" : `$${Number(x).toFixed(2)}`);


// ─── Score gauge (semicircle) ────────────────────────────────────────────────

function ScoreGauge({ score, label }) {
  const theme = themeFor(label);
  const W = 260, H = 150, cx = W / 2, cy = 130, r = 100;
  const clamped = Math.max(0, Math.min(100, score ?? 0));
  // angle: 180° (left) → 0° (right)
  const angle = Math.PI * (1 - clamped / 100);
  const toXY = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const [sx, sy] = toXY(Math.PI);
  const [ex, ey] = toXY(0);
  const [nx, ny] = toXY(angle);
  const largeBg = 1;
  const valueAngleSpan = Math.PI - angle;
  const largeVal = valueAngleSpan > Math.PI ? 1 : 0;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-65">
      {/* track */}
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeBg} 1 ${ex} ${ey}`}
        fill="none" stroke="#E2E8F0" strokeWidth="14" strokeLinecap="round" />
      {/* value arc */}
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${largeVal} 1 ${nx} ${ny}`}
        fill="none" stroke={theme.ring} strokeWidth="14" strokeLinecap="round" />
      <text x={cx} y={cy - 28} textAnchor="middle" fontSize="46" fontWeight="800" fill="#0B1D4F">
        {Math.round(clamped)}
      </text>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="12" fill="#5B6C88">/ 100</text>
    </svg>
  );
}

function Stars({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= full;
        const isHalf = i === full + 1 && half;
        return (
          <span key={i} className="text-lg" style={{ color: filled || isHalf ? "#F59E0B" : "#CBD5E1" }}>
            {isHalf ? "⯨" : "★"}
          </span>
        );
      })}
    </div>
  );
}


// ─── Main page ───────────────────────────────────────────────────────────────

export default function QuantRatingPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [query, setQuery] = useState("AAPL");
  const [rating, setRating] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rankLoading, setRankLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRating = useCallback(async (sym) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRating(sym);
      if (!res.success) {
        setError(res.message || "Rating unavailable");
        setRating(null);
      } else {
        setRating(res);
        setSymbol(res.symbol);
        loadRanking(res.sector);
      }
    } catch {
      setError("Network error");
      setRating(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRanking = useCallback(async (sectorKey) => {
    setRankLoading(true);
    try {
      const res = await fetchSectorRanking(sectorKey);
      setRanking(res.success ? res : null);
    } catch {
      setRanking(null);
    } finally {
      setRankLoading(false);
    }
  }, []);

  useEffect(() => { loadRating("AAPL"); }, [loadRating]);

  const submit = (e) => {
    e.preventDefault();
    const sym = query.trim().toUpperCase();
    if (sym) loadRating(sym);
  };

  const theme = rating ? themeFor(rating.label) : LABEL_THEME["Hold"];
  const upside = rating && rating.targetMeanPrice && rating.currentPrice
    ? rating.targetMeanPrice / rating.currentPrice - 1 : null;
  const metrics = rating?.modelMetrics || {};

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}>
      <GeneralHeader />

      <main className="max-w mx-auto ">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: PAGE.heading }}>Sector Quant Ratings</h1>
          <p className="text-sm mt-1" style={{ color: PAGE.sub }}>
            Calibrated machine-learning buy ratings, modelled per GICS sector. Each score is a true,
            calibrated probability — not a black-box index.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={submit} className="flex gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter ticker (e.g. AAPL, JPM, XOM)"
            className="flex-1 bg-white border border-[rgba(11,29,79,0.25)] rounded-lg px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00D3F2]"
          />
          <button type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#00D3F2] hover:bg-[#00b8d4] text-[#004450] font-semibold transition">
            Rate
          </button>
        </form>

        {/* Sector quick-jump */}
        <div className="flex flex-wrap gap-2 mb-8">
          {SECTORS.map((s) => (
            <button key={s.key}
              onClick={() => loadRanking(s.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${ranking?.sector === s.key
                ? "bg-[#00D3F2]/15 border-[#00D3F2] text-[#004450]"
                : "bg-white border-[rgba(11,29,79,0.25)] text-[#33477A] hover:border-[#0B1D4F]/50"
                }`}>
              {s.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg text-sm" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.3)", color: "#DC2626" }}>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Rating card ── */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {loading ? (
                <SkeletonCard key="skeleton" />
              ) : rating ? (
                <motion.div key={rating.symbol}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border p-6 shadow-md shadow-slate-900/5"
                  style={{ background: "#FFFFFF", borderColor: theme.border }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{rating.symbol}</div>
                      <div className="text-xs text-slate-500 truncate max-w-45">{rating.name}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                        {rating.sectorLabel}
                      </span>
                      <ConfidenceBadge confidence={rating.confidence} />
                    </div>
                  </div>

                  <div className="flex flex-col items-center my-3">
                    <ScoreGauge score={rating.score} label={rating.label} />
                    <span className="px-4 py-1.5 rounded-full text-sm font-bold -mt-2"
                      style={{ color: theme.text, background: theme.bg, border: `1px solid ${theme.border}` }}>
                      {rating.label}
                    </span>
                    <div className="mt-2"><Stars value={rating.stars} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
                    <Stat label="Buy probability" value={pct(rating.buyProbability)} />
                    <Stat label="Decision threshold" value={pct(rating.threshold)} />
                    <Stat label="Price" value={money(rating.currentPrice)} />
                    <Stat label="Analyst target" value={money(rating.targetMeanPrice)} />
                    {upside != null && (
                      <Stat label="Implied upside"
                        value={`${upside >= 0 ? "+" : ""}${(upside * 100).toFixed(1)}%`}
                        color={upside >= 0 ? "#059669" : "#DC2626"} />
                    )}
                  </div>

                  {/* Model reliability — the transparency edge over Seeking Alpha */}
                  <div className="mt-5 pt-4 border-t border-slate-200">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Model reliability</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Buy prec." value={pct(metrics.buyPrecisionCv)} />
                      <MiniStat label="CV AUC" value={metrics.aucBuyCv != null ? metrics.aucBuyCv.toFixed(3) : "—"} />
                      <MiniStat label="Sell prec." value={pct(metrics.sellPrecisionCv)} />
                    </div>
                    {metrics.trainedAt && (
                      <div className="text-[10px] text-slate-500 mt-2 text-center">
                        Trained {String(metrics.trainedAt).slice(0, 10)}
                        {metrics.reliable === false && " · flagged low-confidence"}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* ── Factor grades + leaderboard ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Factor grades */}
            {rating && (
              <div className={`${CARD_LIGHT} p-6`}>
                <h2 className="text-sm font-semibold text-slate-900 mb-1">Factor Grades</h2>
                <p className="text-xs text-slate-500 mb-4">Percentile rank within the {rating.sectorLabel} cohort.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {(rating.factorGrades || []).map((g) => (
                    <div key={g.factor} className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
                      <div className="text-2xl font-extrabold" style={{ color: GRADE_COLOR[g.grade] || "#64748b" }}>
                        {g.grade}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 leading-tight">{g.factor}</div>
                      <div className="h-1.5 mt-2 rounded-full bg-slate-200 overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${g.percentile ?? 0}%`, background: GRADE_COLOR[g.grade] || "#64748b" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sector leaderboard */}
            <div className={`${CARD_LIGHT} p-6`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Sector Leaderboard {ranking ? `· ${ranking.sectorLabel}` : ""}
                  </h2>
                  {ranking && <ConfidenceBadge confidence={ranking.confidence} />}
                </div>
                {rankLoading && <span className="text-xs text-slate-500">Loading…</span>}
              </div>
              {ranking?.ranking?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-2 font-medium">#</th>
                        <th className="py-2 pr-2 font-medium">Symbol</th>
                        <th className="py-2 pr-2 font-medium">Score</th>
                        <th className="py-2 pr-2 font-medium">Rating</th>
                        <th className="py-2 font-medium text-right">Stars</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.ranking.map((r) => {
                        const t = themeFor(r.label);
                        const active = r.symbol === symbol;
                        return (
                          <tr key={r.symbol}
                            onClick={() => loadRating(r.symbol)}
                            className={`border-b border-slate-100 cursor-pointer transition ${active ? "bg-[#00D3F2]/10" : "hover:bg-slate-50"
                              }`}>
                            <td className="py-2.5 pr-2 text-slate-500 tabular-nums">{r.rank}</td>
                            <td className="py-2.5 pr-2 font-semibold text-slate-900">{r.symbol}</td>
                            <td className="py-2.5 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="tabular-nums text-slate-700 w-7">{r.score}</span>
                                <div className="h-1.5 w-20 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${r.score}%`, background: t.ring }} />
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 pr-2">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded"
                                style={{ color: t.text, background: t.bg }}>{r.label}</span>
                            </td>
                            <td className="py-2.5 text-right text-amber-600">
                              {"★".repeat(Math.round(r.stars))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                !rankLoading && <div className="text-sm text-slate-500 py-6 text-center">Select a sector to see rankings.</div>
              )}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 mt-8 max-w-3xl">
          Ratings are model-generated and for educational purposes only — not investment advice.
          Scores reflect the calibrated probability of the model's BUY class over its training horizon.
        </p>
      </main>

      <Footer />
    </div>
  );
}


// ─── Small components ────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }) {
  if (!confidence) return null;
  const c = CONF_THEME[confidence.level] || CONF_THEME.unknown;
  const auc = confidence.auc != null ? ` · AUC ${Number(confidence.auc).toFixed(2)}` : "";
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
      title="Out-of-sample reliability of the model behind this sector's ratings">
      {c.label}{auc}
    </span>
  );
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="font-semibold tabular-nums" style={{ color: color || "#0F172A" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-100 py-2">
      <div className="text-sm font-bold text-slate-800 tabular-nums">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="rounded-2xl border border-slate-200 p-6 animate-pulse shadow-md shadow-slate-900/5" style={{ background: "#FFFFFF" }}>
      <div className="h-6 w-24 bg-slate-200 rounded mb-3" />
      <div className="h-32 w-full bg-slate-100 rounded-xl mb-4" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded" />)}
      </div>
    </motion.div>
  );
}
