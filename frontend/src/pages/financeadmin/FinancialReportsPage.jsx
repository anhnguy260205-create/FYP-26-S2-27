import { useEffect, useMemo, useState } from "react";
import { Download, FileBarChart2, Loader2 } from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const LEDGER_API = `${import.meta.env.VITE_API_URL}/admin/revenue-ledger`;
const SUMMARY_API = `${import.meta.env.VITE_API_URL}/admin/payment-summary`;

const SOURCES = [
  { key: "subscription", label: "Subscriptions" },
  { key: "trade_fee", label: "Trading fees" },
  { key: "gift_commission", label: "Gift commission" },
];

const PERIODS = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
];

const money = (value) =>
  `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Bucket key + human label for a date under the chosen period.
function periodKey(date, period) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  if (period === "day") return { key: `${y}-${m}-${d}`, label: date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) };
  if (period === "month") return { key: `${y}-${m}`, label: date.toLocaleDateString("en-US", { year: "numeric", month: "long" }) };
  // week — Monday-anchored
  const monday = new Date(date);
  const day = (monday.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(monday.getDate() - day);
  const wy = monday.getFullYear();
  const wm = String(monday.getMonth() + 1).padStart(2, "0");
  const wd = String(monday.getDate()).padStart(2, "0");
  return { key: `${wy}-${wm}-${wd}`, label: `Week of ${monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` };
}

function FinancialReportsPage() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    Promise.all([
      authFetch(`${LEDGER_API}?limit=500`).then((r) => r.json()),
      authFetch(SUMMARY_API).then((r) => r.json()),
    ])
      .then(([led, sum]) => {
        if (led.success) setLedger(led.transactions);
        if (sum.success) setSummary(sum);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    const buckets = new Map();
    for (const t of ledger) {
      if (!t.created_at) continue;
      const { key, label } = periodKey(new Date(t.created_at), period);
      if (!buckets.has(key)) {
        buckets.set(key, { key, label, subscription: 0, trade_fee: 0, gift_commission: 0, total: 0, count: 0 });
      }
      const b = buckets.get(key);
      b[t.source] = (b[t.source] || 0) + Number(t.amount || 0);
      b.total += Number(t.amount || 0);
      b.count += 1;
    }
    return Array.from(buckets.values()).sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [ledger, period]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.subscription += r.subscription;
        acc.trade_fee += r.trade_fee;
        acc.gift_commission += r.gift_commission;
        acc.total += r.total;
        acc.count += r.count;
        return acc;
      },
      { subscription: 0, trade_fee: 0, gift_commission: 0, total: 0, count: 0 }
    );
  }, [rows]);

  const exportCsv = () => {
    const header = ["Period", "Subscriptions", "Trading fees", "Gift commission", "Total", "Transactions"];
    const lines = rows.map((r) => [
      r.label, r.subscription.toFixed(2), r.trade_fee.toFixed(2),
      r.gift_commission.toFixed(2), r.total.toFixed(2), r.count,
    ]);
    lines.push(["TOTAL", totals.subscription.toFixed(2), totals.trade_fee.toFixed(2),
      totals.gift_commission.toFixed(2), totals.total.toFixed(2), totals.count]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FinanceAdminLayout title="Financial Reports" subtitle="Revenue breakdown for management, with export">
      <div className="space-y-6">
        {/* Headline summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Report Revenue", value: money(totals.total), sub: "Sum of periods below" },
            ...SOURCES.map((s) => ({ title: s.label, value: money(totals[s.key]), sub: "In this report" })),
          ].map((c) => (
            <div key={c.title} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{c.title}</p>
              <p className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{c.value}</p>
              <p className="text-[11px] text-slate-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                  period === p.key ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>

        {/* Report table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-16">
              <Loader2 size={16} className="animate-spin" /> Loading report…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-gray-400 py-16">
              <FileBarChart2 size={28} />
              <span>No revenue recorded yet.</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Period</th>
                  <th className="px-6 py-4 text-right">Subscriptions</th>
                  <th className="px-6 py-4 text-right">Trading fees</th>
                  <th className="px-6 py-4 text-right">Gift commission</th>
                  <th className="px-6 py-4 text-right">Total</th>
                  <th className="px-6 py-4 text-right">Txns</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{r.label}</td>
                    <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{money(r.subscription)}</td>
                    <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{money(r.trade_fee)}</td>
                    <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{money(r.gift_commission)}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900 tabular-nums">{money(r.total)}</td>
                    <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                  <td className="px-6 py-4">Total</td>
                  <td className="px-6 py-4 text-right tabular-nums">{money(totals.subscription)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{money(totals.trade_fee)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{money(totals.gift_commission)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{money(totals.total)}</td>
                  <td className="px-6 py-4 text-right tabular-nums">{totals.count}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-400">
          Reports aggregate the platform revenue ledger (subscriptions, trading fees, gift commission).
          Net cash flow this period: <span className="font-semibold text-slate-600">{summary ? money(summary.net_flow) : "—"}</span>.
        </p>
      </div>
    </FinanceAdminLayout>
  );
}

export default FinancialReportsPage;
