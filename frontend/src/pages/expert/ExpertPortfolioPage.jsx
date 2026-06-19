import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Calendar,
  DollarSign,
  Clock,
  Edit2,
  Link as LinkIcon,
  PieChart,
  Star,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import { getExpertPortfolioByUser } from "../../api/expertApi.js";

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EX";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatDate(value, fallback = "—") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatMoney(value, fallback = "—") {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return fallback;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatNumber(value, fallback = "—") {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n.toLocaleString();
}

function formatPct(value, fallback = "—", showPlus = true) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return `${showPlus && n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function riskTone(risk = "") {
  const normalized = String(risk).toLowerCase();
  if (normalized.includes("low") || normalized.includes("conservative")) return { bg: "#ecfdf5", color: "#047857", border: "#a7f3d0" };
  if (normalized.includes("high") || normalized.includes("aggressive")) return { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" };
  return { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" };
}

function sectorForHolding(holding) {
  return holding?.sector || holding?.sector_name || holding?.category || "Uncategorised";
}

function holdingWeight(holding) {
  return Number(holding?.allocation_pct ?? holding?.weight_pct ?? holding?.weight ?? 0);
}

function StarRating({ value = 0 }) {
  const rating = Number(value) || 0;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={14}
          strokeWidth={1.8}
          fill={index < Math.round(rating) ? "#111827" : "transparent"}
          color="#111827"
        />
      ))}
    </div>
  );
}

function SmallIconCard({ icon: Icon, title, value, subtitle, positive }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-700">
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] font-semibold text-gray-500">{title}</p>
          <p className={`mt-1 text-lg font-bold ${positive ? "text-emerald-600" : "text-gray-950"}`}>{value}</p>
          {subtitle && <p className="mt-1 text-[10px] font-medium text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ label, value, sub, positive }) {
  return (
    <div className="border-l border-gray-200 px-8 first:border-l-0 first:pl-0">
      <p className="text-[11px] font-semibold text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${positive ? "text-emerald-600" : "text-gray-950"}`}>{value}</p>
      {sub && <p className="mt-1 text-[10px] font-medium text-gray-500">{sub}</p>}
    </div>
  );
}

function AllocationDonut({ sectors }) {
  const colors = ["#111827", "#4b5563", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"];
  let cursor = 0;
  const gradientStops = sectors.length
    ? sectors.map((sector, index) => {
        const start = cursor;
        cursor += sector.value;
        return `${colors[index % colors.length]} ${start}% ${cursor}%`;
      }).join(", ")
    : "#e5e7eb 0% 100%";

  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${gradientStops})` }}>
        <div className="absolute inset-8 rounded-full bg-white" />
      </div>
      <div className="flex-1 space-y-3">
        {sectors.map((sector, index) => (
          <div key={sector.name} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[index % colors.length] }} />
              <span className="truncate text-gray-700">{sector.name}</span>
            </div>
            <span className="font-semibold text-gray-950">{sector.value.toFixed(0)}%</span>
          </div>
        ))}
        {!sectors.length && <p className="text-xs text-gray-500">No allocation data yet.</p>}
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${active ? "border-gray-950 text-gray-950" : "border-transparent text-gray-500 hover:text-gray-950"}`}
    >
      {children}
    </button>
  );
}

export default function ExpertPortfolioPage() {
  const navigate = useNavigate();
  const user = currentUser();
  const [expert, setExpert] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showAllHoldings, setShowAllHoldings] = useState(false);

  useEffect(() => {
    async function loadPortfolio() {
      if (!user?.user_id) {
        setLoading(false);
        setError("Please log in again.");
        return;
      }
      try {
        const data = await getExpertPortfolioByUser(user.user_id);
        setExpert(data.expert || null);
        setPortfolio(data.portfolio || data.expert?.portfolio || null);
      } catch (err) {
        setError(err.message || "Portfolio not found.");
      } finally {
        setLoading(false);
      }
    }
    loadPortfolio();
  }, [user?.user_id]);

  const holdings = useMemo(() => Array.isArray(portfolio?.holdings) ? portfolio.holdings : [], [portfolio?.holdings]);
  const totalAllocation = useMemo(() => holdings.reduce((sum, holding) => sum + holdingWeight(holding), 0), [holdings]);
  const cashAllocation = Math.max(0, 100 - totalAllocation);
  const visibleHoldings = showAllHoldings ? holdings : holdings.slice(0, 5);

  const expertName = expert?.full_name || user?.full_name || user?.username || "Expert";
  const expertUsername = expert?.username || user?.username || "expert";
  const rating = Number(expert?.rating || portfolio?.rating || 0);
  const reviewCount = Number(expert?.rating_count || portfolio?.rating_count || 0);
  const followers = expert?.followers_count || portfolio?.followers_count || 0;
  const experience = Number(expert?.experience_years || 0);
  const targetMarket = portfolio?.target_audience || "General Investors";
  const totalInvested = Number(portfolio?.total_amount_invested || portfolio?.total_invested || 0);
  const avgAnnualReturn = portfolio?.avg_annual_return_pct ?? portfolio?.annual_return_pct;
  const totalReturn = portfolio?.total_return_pct ?? portfolio?.return_pct;
  const tone = riskTone(portfolio?.risk_level);

  const sectorAllocations = useMemo(() => {
    const grouped = new Map();
    holdings.forEach((holding) => {
      const sector = sectorForHolding(holding);
      grouped.set(sector, (grouped.get(sector) || 0) + holdingWeight(holding));
    });
    if (cashAllocation > 0.01) grouped.set("Cash", (grouped.get("Cash") || 0) + cashAllocation);
    return Array.from(grouped.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [holdings, cashAllocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-gray-950">
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <motion.div className="min-h-screen bg-white text-gray-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ConsultantHeader />
        <main className="mx-auto max-w-5xl px-8 py-10">
          <button onClick={() => navigate("/expert")} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-950">
            <ArrowLeft size={16} /> Back to Expert List
          </button>
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <Briefcase className="mx-auto mb-4 h-14 w-14 text-gray-400" />
            <h1 className="text-3xl font-bold">No Expert Portfolio Yet</h1>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">{error || "Create your expert portfolio to publish your strategy, allocation, and purchase rationale."}</p>
            <button onClick={() => navigate("/expert/create-portfolio")} className="mt-8 inline-flex items-center gap-2 rounded-md bg-gray-950 px-5 py-3 text-sm font-bold text-white hover:bg-gray-800">
              <Edit2 size={16} /> Create Expert Portfolio
            </button>
          </div>
        </main>
      </motion.div>
    );
  }

  const holdingsTable = (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Stock Ticker</th>
              <th className="px-4 py-3">Company Name</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Weight (%)</th>
              <th className="px-4 py-3">Current Price</th>
              <th className="px-4 py-3">Total Invested</th>
              <th className="px-4 py-3">Return (%)</th>
              <th className="px-4 py-3">Purchase Rationale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleHoldings.map((holding, index) => {
              const weight = holdingWeight(holding);
              const rowInvested = totalInvested ? (totalInvested * weight) / 100 : Number(holding.total_invested || holding.market_value || 0);
              const rowReturn = holding.return_pct ?? holding.gain_loss_pct;
              return (
                <tr key={holding.holding_id || `${holding.ticker}-${index}`} className="align-top hover:bg-gray-50/70">
                  <td className="px-4 py-4 font-semibold text-gray-500">{index + 1}</td>
                  <td className="px-4 py-4 font-mono font-bold text-gray-950">{holding.ticker || "—"}</td>
                  <td className="px-4 py-4 font-semibold text-gray-800">{holding.company_name || "—"}</td>
                  <td className="px-4 py-4 text-gray-600">{sectorForHolding(holding)}</td>
                  <td className="px-4 py-4 font-bold text-gray-950">{weight.toFixed(1)}%</td>
                  <td className="px-4 py-4 text-gray-700">{formatMoney(holding.current_price, "—")}</td>
                  <td className="px-4 py-4 text-gray-700">{formatMoney(rowInvested, "—")}</td>
                  <td className={`px-4 py-4 font-bold ${Number(rowReturn) >= 0 ? "text-emerald-600" : "text-red-600"}`}>{formatPct(rowReturn)}</td>
                  <td className="max-w-[260px] px-4 py-4 leading-relaxed text-gray-700">{holding.purchase_rationale || "—"}</td>
                </tr>
              );
            })}
            {!visibleHoldings.length && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500">No holdings added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {holdings.length > 5 && (
        <div className="border-t border-gray-100 px-4 py-3 text-center">
          <button type="button" onClick={() => setShowAllHoldings((prev) => !prev)} className="rounded border border-gray-300 px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50">
            {showAllHoldings ? "Show Less" : "View All Holdings"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <motion.div className="min-h-screen bg-white text-gray-950" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <ConsultantHeader />
      <main className="mx-auto max-w-[1240px] px-8 py-8">
        <div className="mb-5 flex items-center justify-between gap-5">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight">View Expert Portfolio</h1>
            <button onClick={() => navigate("/expert")} className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-950">
              <ArrowLeft size={14} /> Back to Expert List
            </button>
          </div>
          <button onClick={() => navigate("/expert/create-portfolio", { state: { mode: "edit" } })} className="inline-flex items-center gap-2 rounded-md bg-gray-950 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-gray-800">
            <Edit2 size={16} /> Edit Portfolio
          </button>
        </div>

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-6 border-b border-gray-200 p-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 bg-white text-2xl font-bold text-gray-500">
                {initials(expertName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-950">{expertName}</h2>
                  <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-700">★ {rating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-700">{expert?.specialisation || portfolio?.specialisation || "Technical Analysis Expert"} · {experience} years experience</p>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{portfolio.description || "This expert portfolio explains the consultant's investment strategy, stock allocation, and purchase rationale."}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-gray-600">
                  <span className="inline-flex items-center gap-1.5"><Calendar size={14} /> Created on {formatDate(portfolio.created_at)}</span>
                  <span className="inline-flex items-center gap-1.5"><Target size={14} /> Target Market: {targetMarket}</span>
                  <span className="inline-flex items-center gap-1.5"><Users size={14} /> Followers: {formatNumber(followers, "0")}</span>
                  {expert?.linked_in_url && <a href={expert.linked_in_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"><LinkIcon size={14} /> LinkedIn</a>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-stretch gap-6 lg:justify-end">
              <div className="rounded-md border border-gray-200 px-5 py-4 shadow-sm">
                <p className="text-[11px] font-bold text-gray-500">Expert Rating</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">{rating.toFixed(1)}</span>
                  <StarRating value={rating} />
                </div>
                <p className="mt-1 text-[10px] text-gray-500">({reviewCount ? formatNumber(reviewCount) : "No"} reviews)</p>
              </div>
              <MetricBlock label="Total Return (All Time)" value={formatPct(totalReturn)} positive />
              <MetricBlock label="Avg. Annual Return" value={formatPct(avgAnnualReturn)} positive />
              <div className="border-l border-gray-200 px-8">
                <p className="text-[11px] font-semibold text-gray-500">Risk Level</p>
                <span className="mt-2 inline-flex rounded px-3 py-1 text-xs font-bold" style={{ background: tone.bg, color: tone.color, border: `1px solid ${tone.border}` }}>
                  {portfolio.risk_level || "Moderate"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex border-b border-gray-200 px-5">
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>Overview</TabButton>
            <TabButton active={activeTab === "holdings"} onClick={() => setActiveTab("holdings")}>Holdings</TabButton>
            <TabButton active={activeTab === "performance"} onClick={() => setActiveTab("performance")}>Performance</TabButton>
            <TabButton active={activeTab === "activity"} onClick={() => setActiveTab("activity")}>Activity</TabButton>
            <TabButton active={activeTab === "about"} onClick={() => setActiveTab("about")}>About the Expert</TabButton>
          </div>
        </section>

        {activeTab === "overview" && (
          <section className="mt-6 space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-bold">Portfolio Overview</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <SmallIconCard icon={DollarSign} title="Total Amount Invested" value={formatMoney(totalInvested)} subtitle="Across all investors" />
                <SmallIconCard icon={PieChart} title="Total Holdings" value={String(holdings.length)} subtitle="Stocks" />
                <SmallIconCard icon={Briefcase} title="Cash Balance" value={`${cashAllocation.toFixed(1)}%`} subtitle="of portfolio" />
                <SmallIconCard icon={Calendar} title="Last Rebalanced" value={formatDate(portfolio.updated_at)} subtitle={`Next on ${formatDate(portfolio.next_rebalanced_at || portfolio.next_rebalance_date, "—")}`} />
                <SmallIconCard icon={TrendingUp} title="Total Return (All Time)" value={formatPct(totalReturn)} subtitle="Since inception" positive />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
              <div>
                <h3 className="mb-3 text-base font-bold">Portfolio Holdings</h3>
                {holdingsTable}
                <p className="mt-2 text-[11px] text-gray-500">* Returns shown are net of all fees and expenses when available.</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold">Portfolio Allocation</h3>
                  <span className="text-xs font-bold text-gray-700">Total Allocation&nbsp;&nbsp; {totalAllocation.toFixed(0)}%</span>
                </div>
                <AllocationDonut sectors={sectorAllocations} />
                <div className="mt-6 space-y-3 border-t border-gray-100 pt-5 text-sm">
                  <div className="flex justify-between"><span className="text-gray-600">Total Equity Allocation</span><span className="font-bold">{totalAllocation.toFixed(0)}%</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Cash Allocation</span><span className="font-bold">{cashAllocation.toFixed(0)}%</span></div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-2 text-base font-bold">About This Portfolio</h3>
              <p className="text-sm leading-relaxed text-gray-700">{portfolio.strategy_notes || portfolio.description || "No additional portfolio notes have been provided yet."}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-gray-600"><Calendar size={14} /> Inception Date: {formatDate(portfolio.created_at)}</p>
            </div>
          </section>
        )}

        {activeTab === "holdings" && (
          <section className="mt-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Portfolio Holdings</h3>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">{totalAllocation.toFixed(1)}% allocated</span>
            </div>
            {holdingsTable}
          </section>
        )}

        {activeTab === "performance" && (
          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
            <SmallIconCard icon={TrendingUp} title="Total Return (All Time)" value={formatPct(totalReturn)} subtitle="Since inception" positive />
            <SmallIconCard icon={BarChart3} title="Avg. Annual Return" value={formatPct(avgAnnualReturn)} subtitle="Annualised performance" positive />
            <SmallIconCard icon={Clock} title="Last Rebalanced" value={formatDate(portfolio.updated_at)} subtitle="Latest portfolio update" />
          </section>
        )}

        {activeTab === "activity" && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">Portfolio Activity</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <p><strong>Created:</strong> {formatDate(portfolio.created_at)}</p>
              <p><strong>Last Updated:</strong> {formatDate(portfolio.updated_at)}</p>
              <p><strong>Status:</strong> {portfolio.status || "published"}</p>
            </div>
          </section>
        )}

        {activeTab === "about" && (
          <section className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-bold">About the Expert</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-300 text-lg font-bold text-gray-500">{initials(expertName)}</div>
                <div>
                  <p className="font-bold text-gray-950">{expertName}</p>
                  <p className="text-sm text-gray-600">@{expertUsername}</p>
                  <p className="mt-2 text-sm text-gray-700">{experience} years of experience · {expert?.verification_status || "pending"} verification</p>
                </div>
              </div>
              <div className="text-sm text-gray-700">
                <p><strong>Email:</strong> {expert?.email || "—"}</p>
                <p className="mt-2"><strong>Expert Status:</strong> {expert?.expert_status || "active"}</p>
                <p className="mt-2"><strong>Verification Score:</strong> {expert?.verification_score ?? "—"}</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </motion.div>
  );
}
