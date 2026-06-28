import { useEffect, useState } from "react";
import { Users, Star, BookOpen } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { authFetch } from "../../api/apiClient.js";

const API = `${import.meta.env.VITE_API_URL}/admin`;

function AdminPanelPage() {
  const [stats, setStats] = useState({ total_users: 0, total_premium: 0, total_experts: 0 });
  const [recentSubs, setRecentSubs] = useState([]);

  useEffect(() => {
    authFetch(`${API}/dashboard-stats`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d); });

    authFetch(`${API}/subscriptions`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setRecentSubs(d.subscriptions.slice(0, 5)); });
  }, []);

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
      <div>
        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat) => (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6 flex justify-between items-start">
              <div>
                <div className={`w-11 h-11 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <h3 className="text-3xl font-bold">{stat.value}</h3>
              </div>
            </div>
          ))}
        </section>

        {/* Recent Subscriptions */}
        <section className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="font-bold text-lg">Recent Subscriptions</h3>
            <a href="/adminpanel/subscriptions" className="text-blue-600 text-sm font-medium">View All</a>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-y border-gray-200">
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Subscribed On</th>
                <th className="px-6 py-4">Renewal Date</th>
              </tr>
            </thead>
            <tbody>
              {recentSubs.map((sub) => (
                <tr key={sub.sub_id} className="border-b border-gray-200">
                  <td className="px-6 py-4 font-medium">{sub.full_name}</td>
                  <td className="px-6 py-4 text-gray-600">{sub.email_address}</td>
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
                  <td className="px-6 py-4 text-gray-500">{sub.sub_date}</td>
                  <td className="px-6 py-4 text-gray-500">{sub.sub_renewal_date ?? "—"}</td>
                </tr>
              ))}
              {recentSubs.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-400">No subscriptions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AdminLayout>
  );
}

export default AdminPanelPage;
