import { useEffect, useState } from "react";
import AdminLayout from "../../layout/AdminPage.jsx";

const API = `${import.meta.env.VITE_API_URL}/admin/subscriptions`;

function SubscriptionManagementPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
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

  const filtered = filter === "all"
    ? subscriptions
    : subscriptions.filter((s) => s.plan_type === filter);

  const planStyle = (plan) =>
    plan === "premium" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700";

  const statusStyle = (status) =>
    status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600";

  return (
    <AdminLayout title="Subscription Management" subtitle="View all investor subscriptions">
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-4">User</th>
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
                <td className="px-6 py-4 font-medium text-slate-900">{sub.full_name}</td>
                <td className="px-6 py-4 text-slate-600">{sub.email_address}</td>
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
                <td colSpan="7" className="px-6 py-10 text-center text-gray-400">
                  No subscriptions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default SubscriptionManagementPage;
