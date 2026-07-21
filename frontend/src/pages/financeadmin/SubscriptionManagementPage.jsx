import { useEffect, useState } from "react";
import { DollarSign, Loader2, Users } from "lucide-react";
import FinanceAdminLayout from "../../layout/FinanceAdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import RevenueBarChart from "../../components/admin/RevenueBarChart.jsx";
import UserTypesPieChart from "../../components/admin/UserTypesPieChart.jsx";

const API = `${import.meta.env.VITE_API_URL}/admin/subscriptions`;
const REVENUE_API = `${import.meta.env.VITE_API_URL}/admin/revenue-by-month`;
const USER_TYPES_API = `${import.meta.env.VITE_API_URL}/admin/user-types`;

const RANGE_OPTIONS = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
];

function SubscriptionManagementPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [revenueMonths, setRevenueMonths] = useState(6);
  const [revenueStats, setRevenueStats] = useState({ total: 0, series: [] });
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [userTypes, setUserTypes] = useState({ breakdown: [] });
  const [userTypesLoading, setUserTypesLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await authFetch(API);
      const data = await res.json();
      if (data.success) setSubscriptions(data.subscriptions);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  useEffect(() => {
    setRevenueLoading(true);
    authFetch(`${REVENUE_API}?months=${revenueMonths}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRevenueStats(d); })
      .finally(() => setRevenueLoading(false));
  }, [revenueMonths]);

  useEffect(() => {
    setUserTypesLoading(true);
    authFetch(USER_TYPES_API)
      .then((r) => r.json())
      .then((d) => { if (d.success) setUserTypes(d); })
      .finally(() => setUserTypesLoading(false));
  }, []);

  const filtered = filter === "all"
    ? subscriptions
    : subscriptions.filter((s) => s.plan_type === filter);

  const planStyle = (plan) =>
    plan === "premium" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

  const statusStyle = (status) =>
    status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  const investorBreakdown = userTypes.breakdown.filter(
    (d) => d.type === "Basic Investor" || d.type === "Premium Investor"
  );
  const investorTotal = investorBreakdown.reduce((sum, d) => sum + d.count, 0);

  return (
    <FinanceAdminLayout title="Subscription Management" subtitle="View all investor subscriptions">
      {/* Revenue + Investor Tiers */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-1">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <DollarSign size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">Revenue</h3>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-slate-900">
                    ${revenueStats.total.toLocaleString("en-US")}
                  </span> in the last {revenueMonths} months
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-center">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.months}
                  onClick={() => setRevenueMonths(opt.months)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
                    revenueMonths === opt.months
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
            {revenueStats.series.length === 0 ? (
              <div className="flex items-center justify-center gap-2 text-gray-400 py-14">
                {revenueLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>No revenue data yet.</span>
                )}
              </div>
            ) : (
              <RevenueBarChart series={revenueStats.series} loading={revenueLoading} />
            )}
          </div>
        </div>

        {/* Investor Tiers */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">Investor Tiers</h3>
              <p className="text-sm text-gray-500">Basic vs premium</p>
            </div>
          </div>

          {investorBreakdown.filter((d) => d.count > 0).length === 0 ? (
            <div className="flex items-center justify-center gap-2 text-gray-400 py-14">
              {userTypesLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Loading…</span>
                </>
              ) : (
                <span>No investor data yet.</span>
              )}
            </div>
          ) : (
            <UserTypesPieChart
              breakdown={investorBreakdown}
              total={investorTotal}
              loading={userTypesLoading}
            />
          )}
        </div>
      </section>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6">
        {["all", "premium", "basic"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${
              filter === type
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-slate-600"
            }`}
          >
            {type === "all" ? "All Plans" : `${type.charAt(0).toUpperCase() + type.slice(1)} Plan`}
          </button>
        ))}
        <span className="ml-auto text-sm text-slate-500 self-center">
          {loading ? "Loading..." : `${filtered.length} subscription(s)`}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Username</th>
              <th className="px-6 py-4">Plan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Subscribed On</th>
              <th className="px-6 py-4">Renewal Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sub) => (
              <tr key={sub.sub_id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-slate-900">{sub.email_address}</td>
                <td className="px-6 py-4 text-slate-600">{sub.username}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${planStyle(sub.plan_type)}`}>
                    {sub.plan_type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(sub.sub_status)}`}>
                    {sub.sub_status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">{sub.sub_date}</td>
                <td className="px-6 py-4 text-slate-500">{sub.sub_renewal_date ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan="6" className="px-6 py-10 text-center text-gray-400">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </FinanceAdminLayout>
  );
}

export default SubscriptionManagementPage;
