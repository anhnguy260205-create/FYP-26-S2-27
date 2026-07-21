import { useEffect, useState } from "react";
import { Users, Star, BookOpen, TrendingUp, Loader2 } from "lucide-react";
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
  const [stats, setStats] = useState({ total_users: 0, total_basic: 0, total_premium: 0, total_experts: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [signupDays, setSignupDays] = useState(30);
  const [signupStats, setSignupStats] = useState({ total: 0, series: [] });
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [userTypes, setUserTypes] = useState({ total: 0, breakdown: [] });
  const [userTypesLoading, setUserTypesLoading] = useState(false);

  useEffect(() => {
    setStatsLoading(true);
    authFetch(`${API}/dashboard-stats`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d); })
      .finally(() => setStatsLoading(false));

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
    { title: "Basic Investors", value: stats.total_basic, icon: <Users size={24} />, color: "text-indigo-600", bg: "bg-indigo-50" },
    { title: "Premium Investors", value: stats.total_premium, icon: <Star size={24} />, color: "text-purple-600", bg: "bg-purple-50" },
    { title: "Total Experts", value: stats.total_experts, icon: <BookOpen size={24} />, color: "text-green-600", bg: "bg-green-50" },
  ];

  return (
    <AdminLayout title="Dashboard Overview" subtitle="Welcome back! Here's what's happening today.">
      <div className="space-y-6">
        {/* Stat Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
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
                <h3 className="text-3xl font-bold text-slate-900 mt-0.5">
                  {statsLoading ? <span className="text-lg text-gray-400 font-medium">Loading…</span> : stat.value}
                </h3>
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
      </div>
    </AdminLayout>
  );
}

export default AdminPanelPage;
