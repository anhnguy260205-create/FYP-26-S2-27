
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import ExpertHeader from "../../layout/RoleHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertPortfolio, saveExpertPortfolio } from "../../api/expertApi.js";

const STORAGE_KEY = "rocketTradeExpertPortfolio";

const emptyHolding = {
  ticker: "",
  company_name: "",
  asset_class: "Equity",
  sector: "",
  units: 0,
  average_buy_price: 0,
  current_price: 0,
  total_invested: 0,
  allocation_percentage: 0,
  purchase_rationale: "",
};

const EMPTY_PORTFOLIO = {
  portfolio_name: "",
  status: "Active",
  target_audience: "",
  investment_objective: "",
  time_horizon: "",
  risk_level: "Moderate",
  description: "",
  cash_balance: 0,
  holdings: [],
};

function normaliseHoldings(holdings) {
  if (!Array.isArray(holdings)) return [];
  return holdings.map((h) => ({ ...emptyHolding, ...h }));
}

function loadInitialPortfolio() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return { ...EMPTY_PORTFOLIO, ...parsed, holdings: normaliseHoldings(parsed.holdings) };
    } catch {
      /* ignore broken local data */
    }
  }
  return EMPTY_PORTFOLIO;
}

export default function CreateExpertPortfolioPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const loggedInName = currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email || "Consultant";
  const [portfolio, setPortfolio] = useState(loadInitialPortfolio);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const totalAllocation = useMemo(() => (portfolio.holdings || []).reduce((sum, h) => sum + Number(h.allocation_percentage || 0), 0), [portfolio.holdings]);

  useEffect(() => {
    let active = true;
    getExpertPortfolio(currentUser?.user_id)
      .then((data) => {
        if (!active || !data?.success || !data?.portfolio) return;
        const backendPortfolio = { ...EMPTY_PORTFOLIO, ...data.portfolio, holdings: normaliseHoldings(data.portfolio.holdings) };
        setPortfolio(backendPortfolio);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(backendPortfolio));
      })
      .catch(() => {
        // Backend unavailable — keep the locally-drafted portfolio.
      });
    return () => {
      active = false;
    };
  }, [currentUser?.user_id]);

  function updateField(field, value) {
    setPortfolio((prev) => ({ ...prev, [field]: value }));
  }

  function updateHolding(index, field, value) {
    setPortfolio((prev) => {
      const holdings = [...(prev.holdings || [])];
      holdings[index] = { ...holdings[index], [field]: value };
      if (["units", "average_buy_price"].includes(field)) {
        const units = Number(holdings[index].units || 0);
        const price = Number(holdings[index].average_buy_price || 0);
        holdings[index].total_invested = Number((units * price).toFixed(2));
      }
      return { ...prev, holdings };
    });
  }

  function addHolding() {
    setPortfolio((prev) => ({ ...prev, holdings: [...(prev.holdings || []), { ...emptyHolding }] }));
  }

  function removeHolding(index) {
    setPortfolio((prev) => ({ ...prev, holdings: (prev.holdings || []).filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setMessage("");
    if (!portfolio.portfolio_name?.trim()) {
      setMessage("Portfolio name is required.");
      return;
    }
    if (!portfolio.holdings?.length) {
      setMessage("Add at least one holding.");
      return;
    }
    if (Math.round(totalAllocation * 10) / 10 !== 100) {
      setMessage("Total allocation must equal 100% before saving.");
      return;
    }
    const payload = {
      ...portfolio,
      created_by: loggedInName,
      created_at: portfolio.created_at || new Date().toISOString(),
      last_rebalanced: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setSaving(true);
    try {
      await saveExpertPortfolio(currentUser?.user_id, payload);
      setMessage("Portfolio saved to backend and local storage.");
    } catch {
      setMessage("Backend unavailable, portfolio saved locally for testing.");
    } finally {
      setSaving(false);
      setTimeout(() => navigate("/expert/portfolio"), 600);
    }
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <ExpertHeader />
      <main className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <button onClick={() => navigate("/expert/portfolio")} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-900">
            <ArrowLeft size={16} /> Back to Portfolio
          </button>
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Create / Edit Expert Portfolio</h1>
              <p className="text-sm text-slate-300">Enter portfolio details, assign weights and explain purchase rationale. Total allocation must equal 100%.</p>
            </div>
            <div className={`rounded-full px-4 py-2 text-sm font-bold ${Math.round(totalAllocation) === 100 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-orange-50 text-orange-700 border border-orange-200"}`}>
              Total Allocation: {totalAllocation.toFixed(1)}%
            </div>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block"><span className="text-sm font-bold text-slate-700">Portfolio Name</span><input value={portfolio.portfolio_name || ""} onChange={(e) => updateField("portfolio_name", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" /></label>
              <label className="block"><span className="text-sm font-bold text-slate-700">Risk Level</span><select value={portfolio.risk_level || "Moderate"} onChange={(e) => updateField("risk_level", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500"><option>Conservative</option><option>Moderate</option><option>Moderate-Aggressive</option><option>Aggressive</option></select></label>
              <label className="block"><span className="text-sm font-bold text-slate-700">Target Audience</span><input value={portfolio.target_audience || ""} onChange={(e) => updateField("target_audience", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" /></label>
              <label className="block"><span className="text-sm font-bold text-slate-700">Time Horizon</span><input value={portfolio.time_horizon || ""} onChange={(e) => updateField("time_horizon", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" /></label>
              <label className="md:col-span-2 block"><span className="text-sm font-bold text-slate-700">Investment Objective</span><input value={portfolio.investment_objective || ""} onChange={(e) => updateField("investment_objective", e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" /></label>
              <label className="md:col-span-2 block"><span className="text-sm font-bold text-slate-700">Portfolio Description</span><textarea value={portfolio.description || ""} onChange={(e) => updateField("description", e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" /></label>
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-950">Asset Distribution Table</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">Showing {(portfolio.holdings || []).length} asset{(portfolio.holdings || []).length === 1 ? "" : "s"}</span>
              <button onClick={addHolding} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-700"><Plus size={16} /> Add Holding</button>
            </div>
            <div className="space-y-4">
              {(portfolio.holdings || []).map((holding, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between"><b className="text-slate-900">Holding {index + 1}</b><button onClick={() => removeHolding(index)} className="text-red-600 hover:text-red-800"><Trash2 size={17} /></button></div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Stock Ticker</span>
                      <input placeholder="e.g. JNJ" value={holding.ticker || ""} onChange={(e) => updateHolding(index, "ticker", e.target.value.toUpperCase())} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Market symbol used to identify the stock.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Company Name</span>
                      <input placeholder="e.g. Johnson & Johnson" value={holding.company_name || ""} onChange={(e) => updateHolding(index, "company_name", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Full company name shown to users.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Asset Class</span>
                      <input placeholder="e.g. Equity" value={holding.asset_class || ""} onChange={(e) => updateHolding(index, "asset_class", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Type of investment, such as equity or ETF.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Sector</span>
                      <input placeholder="e.g. Healthcare" value={holding.sector || ""} onChange={(e) => updateHolding(index, "sector", e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Industry sector used for diversification view.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Units Held</span>
                      <input type="number" placeholder="e.g. 35" value={holding.units || 0} onChange={(e) => updateHolding(index, "units", Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Number of shares in this portfolio.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Average Buy Price</span>
                      <input type="number" placeholder="e.g. 151.20" value={holding.average_buy_price || 0} onChange={(e) => updateHolding(index, "average_buy_price", Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Average purchase price per share.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Total Invested</span>
                      <input type="number" placeholder="e.g. 5292" value={holding.total_invested || 0} onChange={(e) => updateHolding(index, "total_invested", Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Total cost value for this holding.</span>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Allocation Weight (%)</span>
                      <input type="number" placeholder="e.g. 15" value={holding.allocation_percentage || 0} onChange={(e) => updateHolding(index, "allocation_percentage", Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Percentage of the portfolio assigned to this asset.</span>
                    </label>
                    <label className="md:col-span-4 block">
                      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">Purchase Rationale</span>
                      <textarea placeholder="Explain why this stock is included in the portfolio..." value={holding.purchase_rationale || ""} onChange={(e) => updateHolding(index, "purchase_rationale", e.target.value)} rows={3} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 outline-none focus:border-cyan-500" />
                      <span className="mt-1 block text-[11px] text-slate-500">Short explanation that users will read to understand the recommendation.</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {message && <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{message}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => navigate("/expert/portfolio")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:opacity-60"><Save size={17} /> {saving ? "Saving..." : "Save Portfolio"}</button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
