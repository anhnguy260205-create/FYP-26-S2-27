import { useEffect, useState } from "react";
import { Users, Star, BookOpen, TrendingUp, Loader2, ArrowRight } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";
import SignupsBarChart from "../../components/admin/SignupsBarChart.jsx";
import UserTypesPieChart from "../../components/admin/UserTypesPieChart.jsx";

const API = `${import.meta.env.VITE_API_URL}/admin`;

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

function AdminPanelPage() {
  const [stats, setStats] = useState({ total_users: 0, total_premium: 0, total_experts: 0 });
  const [recentSubs, setRecentSubs] = useState([]);
  const [signupDays, setSignupDays] = useState(30);
  const [signupStats, setSignupStats] = useState({ total: 0, series: [] });
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [userTypes, setUserTypes] = useState({ total: 0, breakdown: [] });
  const [userTypesLoading, setUserTypesLoading] = useState(false);

  useEffect(() => {
    authFetch(`${API}/dashboard-stats`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d); });

    authFetch(`${API}/subscriptions`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRecentSubs(d.subscriptions.slice(0, 5)); });

    setUserTypesLoading(true);
    authFetch(`${API}/user-types`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setUserTypes(d); })
      .finally(() => setUserTypesLoading(false));
  }, []);

  useEffect(() => {
    setSignupsLoading(true);
    authFetch(`${API}/signup-stats?days=${signupDays}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setSignupStats(d); })
      .finally(() => setSignupsLoading(false));
  }, [signupDays]);

  const statCards = [
    { title: "Total Users", value: stats.total_users, icon: <Users size={24} />, color: "text-blue-600", bg: "bg-blue-50" },
    { title: "Premium Subscribers", value: stats.total_premium, icon: <Star size={24} />, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Total Experts", value: stats.total_experts, icon: <BookOpen size={24} />, color: "text-green-600", bg: "bg-green-50" },
  ];

  const planStyle = (plan) =>
    plan === "premium" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

  const statusStyle = (status) =>
    status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  return (
    <AdminLayout title="Dashboard Overview" subtitle="Welcome back! Here's what's happening today.">
      <div className="space-y-6">
        {/* Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {statCards.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 flex justify-between items-start"
            >
              <div>
                <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <h3 className="text-3xl font-bold text-slate-900 mt-0.5">{stat.value}</h3>
              </div>
            </div>
          ))}
        </section>

        {/* Signups trend + user composition */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* New User Signups */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-1">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">New User Signups</h3>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-slate-900">{signupStats.total}</span> new users in the last {signupDays} days
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 self-start sm:self-center">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    onClick={() => setSignupDays(opt.days)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${signupDays === opt.days
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              {signupStats.series.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-gray-400 py-14">
                  {signupsLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Loading…</span>
                    </>
                  ) : (
                    <span>No signup data yet.</span>
                  )}
                </div>
              ) : (
                <SignupsBarChart series={signupStats.series} loading={signupsLoading} />
              )}
            </div>
          </div>

          {/* User Types */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900">User Types</h3>
                <p className="text-sm text-gray-500">Breakdown by account type</p>
              </div>
            </div>

            {userTypes.breakdown.filter((d) => d.count > 0).length === 0 ? (
              <div className="flex items-center justify-center gap-2 text-gray-400 py-14">
                {userTypesLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Loading…</span>
                  </>
                ) : (
                  <span>No user data yet.</span>
                )}
              </div>
            ) : (
              <UserTypesPieChart
                breakdown={userTypes.breakdown}
                total={userTypes.total}
                loading={userTypesLoading}
              />
            )}
          </div>
        </section>

        {/* Recent Subscriptions */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="font-bold text-lg text-slate-900">Recent Subscriptions</h3>
            <a
              href="/adminpanel/subscriptions"
              className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
            >
              View All <ArrowRight size={14} />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Subscribed On</th>
                  <th className="px-6 py-4">Renewal Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSubs.map((sub) => (
                  <tr key={sub.sub_id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{sub.email_address}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${planStyle(sub.plan_type)}`}>
                        {sub.plan_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyle(sub.sub_status)}`}>
                        {sub.sub_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{sub.sub_date}</td>
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{sub.sub_renewal_date ?? "—"}</td>
                  </tr>
                ))}
                {recentSubs.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">No subscriptions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPanelPage;
