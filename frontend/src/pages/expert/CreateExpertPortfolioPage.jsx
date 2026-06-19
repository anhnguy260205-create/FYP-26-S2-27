import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Briefcase, Link as LinkIcon, Plus, Save, Trash2 } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { createExpertPortfolio, getExpertPortfolioByUser, updateExpertPortfolio } from "../../api/expertApi.js";

const emptyHolding = { ticker: "", company_name: "", sector: "", allocation_pct: "", current_price: "", return_pct: "", purchase_rationale: "" };

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

function totalAllocation(holdings) {
  return holdings.reduce((sum, h) => sum + Number(h.allocation_pct || 0), 0);
}

export default function CreateExpertPortfolioPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = currentUser();
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [portfolioId, setPortfolioId] = useState(null);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    experience_years: "",
    linked_in_url: "",
    portfolio_name: "",
    description: "",
    risk_level: "Moderate",
    target_audience: "",
    strategy_notes: "",
    holdings: [{ ...emptyHolding }],
  });

  const isEditMode = Boolean(portfolioId) || location.state?.mode === "edit";
  const total = useMemo(() => totalAllocation(formData.holdings), [formData.holdings]);
  const allocationOk = Math.abs(total - 100) < 0.01;

  useEffect(() => {
    async function loadExisting() {
      if (!user?.user_id) {
        setCheckingExisting(false);
        return;
      }
      try {
        const data = await getExpertPortfolioByUser(user.user_id);
        const expert = data.expert;
        const portfolio = data.portfolio || expert?.portfolio;
        if (portfolio) {
          setPortfolioId(portfolio.portfolio_id);
          setFormData({
            experience_years: String(expert?.experience_years ?? ""),
            linked_in_url: expert?.linked_in_url || "",
            portfolio_name: portfolio.portfolio_name || "",
            description: portfolio.description || "",
            risk_level: portfolio.risk_level || "Moderate",
            target_audience: portfolio.target_audience || "",
            strategy_notes: portfolio.strategy_notes || "",
            holdings: portfolio.holdings?.length ? portfolio.holdings.map((h) => ({
              ticker: h.ticker || "",
              company_name: h.company_name || "",
              sector: h.sector || "",
              allocation_pct: String(h.allocation_pct ?? ""),
              current_price: h.current_price != null ? String(h.current_price) : "",
              return_pct: h.return_pct != null ? String(h.return_pct) : "",
              purchase_rationale: h.purchase_rationale || "",
            })) : [{ ...emptyHolding }],
          });
        }
      } catch {
        // No existing portfolio yet. Create mode is valid.
      } finally {
        setCheckingExisting(false);
      }
    }
    loadExisting();
  }, [user?.user_id]);

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function updateHolding(index, field, value) {
    setFormData((prev) => ({
      ...prev,
      holdings: prev.holdings.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
  }

  function addHolding() {
    setFormData((prev) => ({ ...prev, holdings: [...prev.holdings, { ...emptyHolding }] }));
  }

  function removeHolding(index) {
    setFormData((prev) => ({ ...prev, holdings: prev.holdings.filter((_, i) => i !== index).length ? prev.holdings.filter((_, i) => i !== index) : [{ ...emptyHolding }] }));
  }

  function validate() {
    if (!user?.user_id) return "Please log in again.";
    if (!formData.portfolio_name.trim()) return "Portfolio name is required.";
    if (!formData.description.trim()) return "Description is required.";
    if (!formData.target_audience.trim()) return "Target audience is required.";
    const validHoldings = formData.holdings.filter((h) => h.ticker.trim());
    if (!validHoldings.length) return "At least one stock allocation is required.";
    for (const h of validHoldings) {
      if (Number(h.allocation_pct) <= 0) return `Allocation for ${h.ticker || "a holding"} must be above 0%.`;
      if (!h.purchase_rationale.trim()) return `Purchase rationale for ${h.ticker || "a holding"} is required.`;
    }
    if (!allocationOk) return `Total allocation must equal 100%. Current total is ${total.toFixed(1)}%.`;
    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setMessage(err);
      return;
    }

    const payload = {
      user_id: user.user_id,
      experience_years: Number(formData.experience_years || 0),
      linked_in_url: formData.linked_in_url.trim() || null,
      portfolio_name: formData.portfolio_name.trim(),
      description: formData.description.trim(),
      risk_level: formData.risk_level,
      target_audience: formData.target_audience.trim(),
      strategy_notes: formData.strategy_notes.trim() || null,
      holdings: formData.holdings
        .filter((h) => h.ticker.trim())
        .map((h) => ({
          ticker: h.ticker.trim().toUpperCase(),
          company_name: h.company_name.trim() || null,
          sector: h.sector.trim() || null,
          allocation_pct: Number(h.allocation_pct || 0),
          current_price: h.current_price !== "" ? Number(h.current_price) : null,
          return_pct: h.return_pct !== "" ? Number(h.return_pct) : null,
          purchase_rationale: h.purchase_rationale.trim(),
        })),
    };

    setLoading(true);
    setMessage("");
    try {
      if (portfolioId) {
        await updateExpertPortfolio(portfolioId, user.user_id, payload);
        setMessage("Portfolio updated successfully.");
      } else {
        const result = await createExpertPortfolio(payload);
        if (result.portfolio?.portfolio_id) setPortfolioId(result.portfolio.portfolio_id);
        setMessage("Portfolio created successfully.");
      }
      setTimeout(() => navigate("/expert/portfolio"), 700);
    } catch (error) {
      setMessage(error.message || "Failed to save portfolio.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingExisting) {
    return <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" /></div>;
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
          <button type="button" onClick={() => navigate("/expert/portfolio")} className="flex items-center gap-2 mb-6 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} /> Back to Portfolio
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">{isEditMode ? "Edit Expert Portfolio" : "Create Expert Portfolio"}</h1>
              <p className="text-gray-400">Define your strategy, risk profile, target audience, allocation table, and purchase rationale.</p>
            </div>
            <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold hover:opacity-90 disabled:opacity-50">
              <Save size={18} /> {loading ? "Saving..." : isEditMode ? "Save Updates" : "Publish Portfolio"}
            </button>
          </div>

          {message && <div className={`mb-6 rounded-xl border p-4 ${message.includes("successfully") ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>{message}</div>}

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2"><Briefcase size={20} /> Strategy Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Portfolio Name *" value={formData.portfolio_name} onChange={(v) => updateField("portfolio_name", v)} placeholder="e.g. Balanced AI Growth Portfolio" />
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Risk Level *</label>
                    <select value={formData.risk_level} onChange={(e) => updateField("risk_level", e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500">
                      <option className="bg-slate-900">Conservative</option>
                      <option className="bg-slate-900">Moderate</option>
                      <option className="bg-slate-900">Aggressive</option>
                      <option className="bg-slate-900">Very Aggressive</option>
                    </select>
                  </div>
                  <Field label="Target Audience *" value={formData.target_audience} onChange={(v) => updateField("target_audience", v)} placeholder="e.g. Premium users seeking medium-term growth" />
                  <Field label="Years of Experience" type="number" value={formData.experience_years} onChange={(v) => updateField("experience_years", v)} placeholder="0" />
                  <div className="md:col-span-2">
                    <Field label="LinkedIn URL" value={formData.linked_in_url} onChange={(v) => updateField("linked_in_url", v)} placeholder="https://linkedin.com/in/yourprofile" icon={<LinkIcon size={16} />} />
                  </div>
                  <div className="md:col-span-2">
                    <TextArea label="Portfolio Description *" value={formData.description} onChange={(v) => updateField("description", v)} rows={4} placeholder="Summarise the portfolio strategy and what investors should understand." />
                  </div>
                  <div className="md:col-span-2">
                    <TextArea label="Strategy Notes" value={formData.strategy_notes} onChange={(v) => updateField("strategy_notes", v)} rows={4} placeholder="Explain rebalancing approach, time horizon, risk controls, or market assumptions." />
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold">Asset Allocation</h2>
                    <p className="text-sm text-gray-400">Search/add tickers, assign weights, and explain the purchase rationale.</p>
                  </div>
                  <button type="button" onClick={addHolding} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 font-semibold"><Plus size={16} /> Add Stock</button>
                </div>

                <div className="p-6 space-y-4">
                  {formData.holdings.map((holding, index) => (
                    <div key={index} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                        <div className="md:col-span-2"><Field label="Ticker *" value={holding.ticker} onChange={(v) => updateHolding(index, "ticker", v.toUpperCase())} placeholder="AAPL" /></div>
                        <div className="md:col-span-3"><Field label="Company Name" value={holding.company_name} onChange={(v) => updateHolding(index, "company_name", v)} placeholder="Apple Inc." /></div>
                        <div className="md:col-span-2"><Field label="Sector" value={holding.sector} onChange={(v) => updateHolding(index, "sector", v)} placeholder="Technology" /></div>
                        <div className="md:col-span-2"><Field label="Allocation % *" type="number" value={holding.allocation_pct} onChange={(v) => updateHolding(index, "allocation_pct", v)} placeholder="20" /></div>
                        <div className="md:col-span-3 flex items-end"><button type="button" onClick={() => removeHolding(index)} className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20"><Trash2 size={16} /> Remove</button></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <Field label="Current Price (optional)" type="number" value={holding.current_price} onChange={(v) => updateHolding(index, "current_price", v)} placeholder="189.20" />
                        <Field label="Return % (optional)" type="number" value={holding.return_pct} onChange={(v) => updateHolding(index, "return_pct", v)} placeholder="12.5" />
                      </div>
                      <TextArea label="Purchase Rationale *" value={holding.purchase_rationale} onChange={(v) => updateHolding(index, "purchase_rationale", v)} rows={3} placeholder="Explain why this stock is included and how it supports the strategy." />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 sticky top-24">
                <h2 className="text-lg font-bold mb-4">Allocation Check</h2>
                <div className="text-5xl font-bold mb-2" style={{ color: allocationOk ? "#22c55e" : total > 100 ? "#ef4444" : "#fbbf24" }}>{total.toFixed(1)}%</div>
                <p className="text-sm text-gray-400 mb-5">Total allocation must equal exactly 100% before submission.</p>
                <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-4">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${Math.min(total, 100)}%` }} />
                </div>
                <div className="space-y-2 text-sm">
                  {formData.holdings.filter((h) => h.ticker).map((h, i) => (
                    <div key={`${h.ticker}-${i}`} className="flex justify-between gap-3 py-2 border-b border-white/10">
                      <span className="font-mono text-gray-300">{h.ticker}</span>
                      <span className="font-bold">{Number(h.allocation_pct || 0).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <button type="submit" disabled={loading || !allocationOk} className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold hover:opacity-90 disabled:opacity-40">
                  <Save size={18} /> {loading ? "Saving..." : "Save Portfolio"}
                </button>
              </div>
            </aside>
          </section>
        </form>
      </main>
      <Footer />
    </motion.div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", icon }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
      <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus-within:border-cyan-500">
        {icon}
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent focus:outline-none text-white placeholder-gray-500" />
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 resize-vertical text-white placeholder-gray-500" />
    </div>
  );
}
