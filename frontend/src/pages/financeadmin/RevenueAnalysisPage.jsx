import { useEffect, useState } from "react";
import { DollarSign, Gift, Loader2, LineChart, TrendingUp } from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import RevenueBarChart from "../../components/admin/RevenueBarChart.jsx";

const REVENUE_API = `${import.meta.env.VITE_API_URL}/admin/revenue-by-month`;
const LEDGER_API = `${import.meta.env.VITE_API_URL}/admin/revenue-ledger`;

const RANGE_OPTIONS = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
];

// Keys match REVENUE_SOURCES in backend/app/entity/models/wallet.py.
const SOURCES = [
  { key: "subscription", label: "Subscriptions", icon: DollarSign, color: "text-green-600", bg: "bg-green-50", dot: "bg-green-500" },
  { key: "trade_fee", label: "Trading fees", icon: TrendingUp, color: "text-sky-600", bg: "bg-sky-50", dot: "bg-sky-500" },
  { key: "gift_commission", label: "Gift commission", icon: Gift, color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
];

const FILTERS = [
  { key: "all", label: "All Sources" },
  { key: "subscription", label: "Subscriptions" },
  { key: "trade_fee", label: "Trading fees" },
  { key: "gift_commission", label: "Gift commission" },
];

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

function RevenueAnalysisPage() {
  const [months, setMonths] = useState(6);
  const [revenue, setRevenue] = useState({ total: 0, series: [], by_source: {}, all_time: {} });
  const [revenueLoading, setRevenueLoading] = useState(false);

  const [filter, setFilter] = useState("all");
  const [ledger, setLedger] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    setRevenueLoading(true);
    authFetch(`${REVENUE_API}?months=${months}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRevenue(d); })
      .finally(() => setRevenueLoading(false));
  }, [months]);

  useEffect(() => {
    setLedgerLoading(true);
    const q = filter === "all" ? "" : `source=${filter}&`;
    authFetch(`${LEDGER_API}?${q}limit=100`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setLedger(d.transactions); })
      .finally(() => setLedgerLoading(false));
  }, [filter]);

  const allTime = revenue.all_time || {};
  const dotFor = (source) => SOURCES.find((s) => s.key === source)?.dot || "bg-slate-400";
  const labelFor = (source) => SOURCES.find((s) => s.key === source)?.label || source;

  return (
    <FinanceAdminLayout title="Revenue Analysis" subtitle="Monitor platform revenue sources and trends">
      <div className="space-y-6">
        {/* Source summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOURCES.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
                    <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{money(allTime[s.key] ?? 0)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">All-time</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg} ${s.color}`}>
                    <Icon size={22} />
                  </div>
                </div>
              </div>
            );
          })}
          <div className="bg-slate-900 rounded-2xl p-5 shadow-sm text-white">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-black mt-1 tabular-nums">{money(allTime.total ?? 0)}</p>
            <p className="text-[11px] text-slate-400 mt-1">All sources, all-time</p>
          </div>
        </div>

        {/* Trend chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <LineChart size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Revenue Trend</h3>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-slate-900">{money(revenue.total)}</span> in the last {months} months
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-center">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  onClick={() => setMonths(opt.months)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    months === opt.months ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            {revenue.series.length === 0 ? (
              <div className="flex items-center justify-center gap-2 text-gray-400 py-14">
                {revenueLoading ? (
                  <><Loader2 size={16} className="animate-spin" /><span>Loading…</span></>
                ) : (
                  <span>No revenue data yet.</span>
                )}
              </div>
            ) : (
              <RevenueBarChart series={revenue.series} loading={revenueLoading} />
            )}
          </div>

          {revenue.by_source && (
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SOURCES.map((s) => (
                <div key={s.key} className="rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-sm ${s.dot}`} />
                    <span className="text-xs font-medium text-gray-500">{s.label} · last {months}M</span>
                  </div>
                  <div className="font-bold text-slate-900 tabular-nums">{money(revenue.by_source[s.key] ?? 0)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue ledger */}
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  filter === f.key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-slate-600"
                }`}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-sm text-slate-500 self-center">
              {ledgerLoading ? "Loading..." : `${ledger.length} entr${ledger.length === 1 ? "y" : "ies"}`}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.revenue_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 text-slate-700">
                        <span className={`w-2 h-2 rounded-sm ${dotFor(row.source)}`} />
                        {labelFor(row.source)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.user_name}</td>
                    <td className="px-6 py-4 text-slate-500">{row.description || "—"}</td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600 tabular-nums">+{money(row.amount)}</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
                {ledger.length === 0 && !ledgerLoading && (
                  <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-400">No revenue entries found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FinanceAdminLayout>
  );
}

export default RevenueAnalysisPage;
