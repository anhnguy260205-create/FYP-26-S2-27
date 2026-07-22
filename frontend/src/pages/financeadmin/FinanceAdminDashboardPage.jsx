import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BadgeDollarSign,
  Loader2,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import RevenueBarChart from "../../components/admin/RevenueBarChart.jsx";

const REVENUE_API = `${import.meta.env.VITE_API_URL}/admin/revenue-by-month`;
const PAYMENT_API = `${import.meta.env.VITE_API_URL}/admin/payment-summary`;

const RANGE_OPTIONS = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
];

// Keys must match REVENUE_SOURCES in backend/app/entity/models/wallet.py.
const REVENUE_SOURCES = [
  { key: "subscription", label: "Subscriptions", dot: "bg-green-500" },
  { key: "trade_fee", label: "Trading fees", dot: "bg-sky-500" },
  { key: "gift_commission", label: "Gift commission", dot: "bg-amber-500" },
];

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function FinanceAdminDashboardPage() {
  const navigate = useNavigate();
  const [months, setMonths] = useState(6);
  const [revenue, setRevenue] = useState({ total: 0, series: [], by_source: {}, all_time: {} });
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [payments, setPayments] = useState(null);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    setRevenueLoading(true);
    authFetch(`${REVENUE_API}?months=${months}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRevenue(d); })
      .finally(() => setRevenueLoading(false));
  }, [months]);

  useEffect(() => {
    authFetch(PAYMENT_API)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPayments(d); })
      .finally(() => setPaymentsLoading(false));
  }, []);

  const allTimeTotal = revenue.all_time?.total ?? 0;
  const netFlow = payments?.net_flow ?? 0;
  const largeWithdrawals = payments?.large_cash_out ?? 0;

  const statCards = [
    {
      title: "All-Time Revenue",
      value: revenueLoading && !allTimeTotal ? "—" : money(allTimeTotal),
      icon: <BadgeDollarSign size={22} />,
      color: "text-green-600",
      bg: "bg-green-50",
      sub: "Platform profit booked to date",
    },
    {
      title: `Revenue · Last ${months}M`,
      value: revenueLoading ? "—" : money(revenue.total),
      icon: <TrendingUp size={22} />,
      color: "text-blue-600",
      bg: "bg-blue-50",
      sub: "Across all revenue sources",
    },
    {
      title: "Net Cash Flow",
      value: paymentsLoading ? "—" : money(netFlow),
      icon: <Wallet size={22} />,
      color: netFlow >= 0 ? "text-emerald-600" : "text-red-600",
      bg: netFlow >= 0 ? "bg-emerald-50" : "bg-red-50",
      sub: "Cash in minus cash out",
    },
    {
      title: "Large Withdrawals",
      value: paymentsLoading ? "—" : largeWithdrawals,
      icon: <ShieldAlert size={22} />,
      color: largeWithdrawals > 0 ? "text-amber-600" : "text-slate-500",
      bg: largeWithdrawals > 0 ? "bg-amber-50" : "bg-gray-50",
      sub: `Cash-out ≥ ${money(payments?.large_threshold ?? 1000).replace(".00", "")}`,
    },
  ];

  return (
    <FinanceAdminLayout title="Dashboard" subtitle="Profit analysis and platform financial health">
      <div className="space-y-6">
        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.title}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums truncate">{card.value}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.bg} ${card.color}`}>
                  {card.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Profit analysis chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Profit Analysis</h3>
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
                    months === opt.months
                      ? "bg-white text-green-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
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

          {/* Where the profit comes from */}
          {revenue.by_source && (
            <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REVENUE_SOURCES.map((source) => (
                <div key={source.key} className="rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-sm ${source.dot}`} />
                    <span className="text-xs font-medium text-gray-500">{source.label}</span>
                  </div>
                  <div className="font-bold text-slate-900 tabular-nums">
                    {money(revenue.by_source[source.key] ?? 0)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Revenue Analysis", desc: "Trends & commission ledger", path: "/finance-admin/revenue" },
            { label: "Payment Transactions", desc: "Cash in / out monitoring", path: "/finance-admin/payments" },
            { label: "Financial Reports", desc: "Daily / weekly / monthly", path: "/finance-admin/reports" },
          ].map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow transition"
            >
              <p className="font-bold text-slate-900">{link.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{link.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-blue-600 text-sm font-medium">
                Open <ArrowRight size={14} className="group-hover:translate-x-0.5 transition" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </FinanceAdminLayout>
  );
}

export default FinanceAdminDashboardPage;
