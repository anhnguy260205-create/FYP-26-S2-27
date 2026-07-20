
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, PieChart, Search, Share2, Edit3, TrendingUp, Wallet, Layers, Clock3 } from "lucide-react";
import ExpertHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertPortfolio } from "../../api/expertApi.js";
import { authFetch } from "../../api/apiClient.js";

function formatCurrency(value) {
  const n = Number(value || 0);
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value || "-"}</p>
    </div>
  );
}

function AllocationBar({ holdings }) {
  const segments = holdings.filter((h) => Number(h.allocation_percentage || 0) > 0);
  return (
    <div className="overflow-hidden rounded-full border border-slate-200 bg-slate-100 h-4 flex">
      {segments.map((h, idx) => (
        <div
          key={`${h.ticker}-${idx}`}
          title={`${h.ticker} ${h.allocation_percentage}%`}
          style={{ width: `${Number(h.allocation_percentage || 0)}%` }}
          className={idx % 5 === 0 ? "bg-cyan-500" : idx % 5 === 1 ? "bg-blue-500" : idx % 5 === 2 ? "bg-indigo-500" : idx % 5 === 3 ? "bg-emerald-500" : "bg-purple-500"}
        />
      ))}
    </div>
  );
}

export default function ExpertPortfolioPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const loggedInName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || "Consultant";
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [publishing, setPublishing] = useState(false);

  // Publish the portfolio to the investor homepage (premium users can view it).
  const togglePublish = async () => {
    setPublishing(true);
    try {
      const res = await authFetch(`${import.meta.env.VITE_API_URL}/expert/portfolio-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !portfolio.is_published }),
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio((p) => ({ ...p, is_published: data.is_published }));
      } else {
        alert(data.message || "Failed to update publish status.");
      }
    } catch {
      alert("Could not reach backend.");
    } finally {
      setPublishing(false);
    }
  };

  useEffect(() => {
    if (!currentUser?.user_id) { setLoading(false); return; }
    getExpertPortfolio(currentUser.user_id)
      .then((data) => {
        if (data?.success && data.portfolio) setPortfolio(data.portfolio);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [currentUser?.user_id]);

  const holdings = Array.isArray(portfolio?.holdings) ? portfolio.holdings : [];
  const filteredHoldings = holdings.filter((h) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [h.ticker, h.company_name, h.asset_class, h.sector].some((v) => String(v || "").toLowerCase().includes(q));
  });

  const totals = useMemo(() => {
    const invested = holdings.reduce((sum, h) => sum + Number(h.total_invested || 0), 0);
    const allocation = holdings.reduce((sum, h) => sum + Number(h.allocation_percentage || 0), 0);
    return { invested, allocation };
  }, [holdings]);

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <ExpertHeader />
      <main className="flex flex-col gap-8" style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>
        <div className="mx-auto max-w">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>

              <h1 className="text-3xl font-bold text-white">View My Portfolio</h1>
              <p className="mt-1 text-sm text-slate-300">Manage and review the portfolio you've published to investors</p>
            </div>
            {portfolio && (
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">● {portfolio.status || "Active"}</span>
                <button onClick={() => navigate("/expert/create-portfolio")} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                  <Edit3 size={16} /> Edit Portfolio
                </button>
                <button onClick={togglePublish} disabled={publishing}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60 ${portfolio.is_published
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                  <Share2 size={16} />
                  {publishing ? "Saving…" : portfolio.is_published ? "Published ✓ (click to unpublish)" : "Publish to Homepage"}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="h-6 w-52 bg-slate-200 rounded animate-pulse mb-4" />
              <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
            </div>
          ) : !portfolio ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm text-center flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700"><Briefcase size={28} /></div>
              <h2 className="text-xl font-bold text-slate-950">You haven't created a portfolio yet</h2>
              <p className="text-sm text-slate-500 max-w-md">
                Build a model portfolio to share your holdings, allocation and rationale with investors.
              </p>
              <button onClick={() => navigate("/expert/create-portfolio")}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
                <Edit3 size={16} /> Create Portfolio
              </button>
            </div>
          ) : (
          <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700"><Briefcase size={28} /></div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-950">{portfolio.portfolio_name}</h2>
                    <p className="text-sm text-slate-500">Expert-created portfolio overview</p>
                  </div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{portfolio.description}</p>
              </div>
              <div className="grid min-w-[320px] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex justify-between gap-6"><span className="text-slate-500">Created Date</span><b className="text-slate-900">{formatDate(portfolio.created_at)}</b></div>
                <div className="flex justify-between gap-6"><span className="text-slate-500">Created By</span><b className="text-slate-900">{loggedInName}</b></div>
                <div className="flex justify-between gap-6"><span className="text-slate-500">Target Market</span><b className="text-right text-slate-900">{portfolio.target_audience}</b></div>
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<TrendingUp size={18} />} label="Total Amount Invested" value={formatCurrency(totals.invested)} />
            <StatCard icon={<Layers size={18} />} label="Total Holdings" value={holdings.length} />
            <StatCard icon={<Wallet size={18} />} label="Cash Balance" value={formatCurrency(portfolio.cash_balance)} />
            <StatCard icon={<Clock3 size={18} />} label="Last Rebalanced" value={formatDate(portfolio.last_rebalanced)} />
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <PieChart className="text-cyan-700" size={22} />
              <h3 className="text-xl font-bold text-slate-950">Portfolio Overview</h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <InfoBlock label="Investment Objective" value={portfolio.investment_objective} />
              <InfoBlock label="Time Horizon" value={portfolio.time_horizon} />
              <InfoBlock label="Risk Level" value={portfolio.risk_level} />
              <InfoBlock label="Target Market / Audience" value={portfolio.target_audience} />
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-950">Portfolio Distribution</h3>
                <p className="mt-1 text-sm text-slate-500">Total allocation should equal 100% before publishing.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticker/company" className="h-11 w-64 rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700">Total Allocation</span>
                <span className={`font-bold ${Math.round(totals.allocation) === 100 ? "text-emerald-700" : "text-orange-600"}`}>{totals.allocation.toFixed(1)}%</span>
              </div>
              <AllocationBar holdings={holdings} />
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Stock Ticker</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Asset Class</th>
                    <th className="px-4 py-3">Units</th>
                    <th className="px-4 py-3">Buy Price</th>
                    <th className="px-4 py-3">Total Invested</th>
                    <th className="px-4 py-3">Weight</th>
                    <th className="px-4 py-3">Purchase Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {filteredHoldings.map((h, index) => (
                    <tr key={`${h.ticker}-${index}`} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-semibold text-slate-500">{index + 1}</td>
                      <td className="px-4 py-4 font-bold text-cyan-700">{h.ticker}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{h.company_name}</td>
                      <td className="px-4 py-4 text-slate-600">{h.asset_class}</td>
                      <td className="px-4 py-4 text-slate-600">{Number(h.units || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 text-slate-600">${Number(h.average_buy_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(h.total_invested)}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-cyan-50 px-3 py-1 font-bold text-cyan-700">{Number(h.allocation_percentage || 0).toFixed(1)}%</span></td>
                      <td className="px-4 py-4 max-w-xs text-slate-600">{h.purchase_rationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredHoldings.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No holdings match your search.</div>}
            </div>
          </section>
          </>
          )}
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
