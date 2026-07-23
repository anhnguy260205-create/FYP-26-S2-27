import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, ShieldAlert, Wallet } from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const TXN_API = `${import.meta.env.VITE_API_URL}/admin/wallet-transactions`;
const SUMMARY_API = `${import.meta.env.VITE_API_URL}/admin/payment-summary`;

// txn_type values come from backend/app/entity/models/wallet.py.
const TYPE_META = {
  cash_in: { label: "Cash In", badge: "bg-green-100 text-green-700" },
  cash_out: { label: "Cash Out", badge: "bg-red-100 text-red-700" },
  platform_fee: { label: "Platform Fee", badge: "bg-sky-100 text-sky-700" },
  gift_sent: { label: "Gift Sent", badge: "bg-amber-100 text-amber-700" },
  gift_received: { label: "Gift Received", badge: "bg-purple-100 text-purple-700" },
  compensation: { label: "Payout", badge: "bg-indigo-100 text-indigo-700" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "cash_in", label: "Cash In" },
  { key: "cash_out", label: "Cash Out" },
  { key: "platform_fee", label: "Fees" },
  { key: "gift_received", label: "Gifts" },
  { key: "compensation", label: "Payouts" },
];

const money = (value) =>
  `$${Math.abs(Number(value || 0)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

function PaymentTransactionsPage() {
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authFetch(SUMMARY_API)
      .then((r) => r.json())
      .then((d) => { if (d.success) setSummary(d); })
      .finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = filter === "all" ? "" : `txn_type=${filter}&`;
    authFetch(`${TXN_API}?${q}limit=200`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setTxns(d.transactions); })
      .finally(() => setLoading(false));
  }, [filter]);

  const threshold = summary?.large_threshold ?? 1000;
  const netFlow = summary?.net_flow ?? 0;

  const cards = [
    {
      title: "Total Cash In",
      value: summaryLoading ? "—" : money(summary?.cash_in?.total),
      sub: summaryLoading ? "" : `${summary?.cash_in?.count ?? 0} deposits`,
      icon: <ArrowDownCircle size={22} />, color: "text-green-600", bg: "bg-green-50",
    },
    {
      title: "Total Cash Out",
      value: summaryLoading ? "—" : money(summary?.cash_out?.total),
      sub: summaryLoading ? "" : `${summary?.cash_out?.count ?? 0} withdrawals`,
      icon: <ArrowUpCircle size={22} />, color: "text-red-600", bg: "bg-red-50",
    },
    {
      title: "Net Cash Flow",
      value: summaryLoading ? "—" : `${netFlow < 0 ? "-" : ""}${money(netFlow)}`,
      sub: "In minus out",
      icon: <Wallet size={22} />, color: netFlow >= 0 ? "text-emerald-600" : "text-red-600",
      bg: netFlow >= 0 ? "bg-emerald-50" : "bg-red-50",
    },
    {
      title: "Large Withdrawals",
      value: summaryLoading ? "—" : (summary?.large_cash_out ?? 0),
      sub: `Cash-out ≥ ${money(threshold).replace(".00", "")}`,
      icon: <ShieldAlert size={22} />,
      color: (summary?.large_cash_out ?? 0) > 0 ? "text-amber-600" : "text-slate-500",
      bg: (summary?.large_cash_out ?? 0) > 0 ? "bg-amber-50" : "bg-gray-50",
    },
  ];

  return (
    <FinanceAdminLayout title="Payment Transactions" subtitle="Monitor cash in / out, gifts, fees and payouts">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <div key={c.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.title}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums truncate">{c.value}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{c.sub}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.color}`}>
                  {c.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
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
            {loading ? "Loading..." : `${txns.length} transaction(s)`}
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Bank</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => {
                const meta = TYPE_META[t.txn_type] || { label: t.txn_type, badge: "bg-gray-100 text-gray-600" };
                const isLarge = t.txn_type === "cash_out" && Math.abs(t.amount) >= threshold;
                const credit = Number(t.amount) >= 0;
                return (
                  <tr key={t.wallet_txn_id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 ${isLarge ? "bg-amber-50/40" : ""}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{t.user_name}</p>
                      <p className="text-xs text-slate-400">{t.email_address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${meta.badge}`}>{meta.label}</span>
                      {isLarge && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                          <ShieldAlert size={10} /> Review
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {t.bank_name ? (
                        <span>{t.bank_name}{t.account_number_masked ? ` · ${t.account_number_masked}` : ""}</span>
                      ) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                        t.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-semibold tabular-nums ${credit ? "text-green-600" : "text-red-600"}`}>
                      {credit ? "+" : "-"}{money(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(t.created_at)}</td>
                  </tr>
                );
              })}
              {txns.length === 0 && !loading && (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FinanceAdminLayout>
  );
}

export default PaymentTransactionsPage;
