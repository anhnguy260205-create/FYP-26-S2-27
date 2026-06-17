import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  Users,
  MoreVertical,
} from "lucide-react";
import { Link } from "react-router-dom";
import AdminLayout from "../../layout/AdminPage.jsx";

function AdminPanelPage() {
  const menuItems = [
    {
      name: "Dashboard",
      path: "/adminpanel",
    },
    {
      name: "User Accounts",
      path: "/adminpanel/useraccounts",
    },
    {
      name: "User Profiles",
      path: "/adminpanel/profiles",
    },
    {
      name: "Community Post",
      path: "/adminpanel/posts",
    },
    {
      name: "Trade",
      path: "/adminpanel/trade",
    },
    {
      name: "Investment Guidance Articles",
      path: "/adminpanel/articles",
    },
  ];

  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231",
      change: "+12.5%",
      icon: <DollarSign size={24} />,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Total Orders",
      value: "2,345",
      change: "+8.2%",
      icon: <ShoppingCart size={24} />,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "Total Users",
      value: "12,456",
      change: "+3.1%",
      icon: <Users size={24} />,
      color: "text-black",
      bg: "bg-gray-50",
    },
  ];

  const orders = [
    ["#12345", "John Doe", "$129.00", "Completed", "2026-05-04"],
    ["#12346", "Jane Smith", "$89.00", "Processing", "2026-05-04"],
    ["#12347", "Mike Johnson", "$249.00", "Completed", "2026-05-03"],
    ["#12348", "Sarah Williams", "$159.00", "Pending", "2026-05-03"],
    ["#12349", "David Brown", "$199.00", "Completed", "2026-05-02"],
  ];

  const getStatusStyle = (status) => {
    if (status === "Completed") return "bg-green-100 text-green-700";
    if (status === "Processing") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <AdminLayout
      title="Dashboard Overview"
      subtitle="Welcome back! Here's what's happening today."
    >
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top Header */}
      <header className="h-[72px] bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 shrink-0 z-50">
        <h1 className="text-2xl font-bold">Admin Panel</h1>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            AD
          </div>
          <div>
            <p className="font-semibold text-sm">Admin User</p>
            <p className="text-xs text-gray-500">administrator</p>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[230px] min-h-[calc(100vh-72px)] bg-white border-r border-gray-200 p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`block w-full text-left px-3 py-3 rounded-lg text-sm transition ${item.name === "Dashboard"
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-slate-700 hover:bg-gray-100"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <motion.main
          className="flex-1 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <section className="mb-8 text-white">
            <h2 className="text-3xl font-bold mb-2">Dashboard Overview</h2>
            <p className="text-sm text-gray-200">
              Welcome back! Here's what's happening today.
            </p>
          </section>

          {/* Stat Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.title}
                className="bg-white rounded-lg shadow p-6 flex justify-between items-start"
              >
                <div>
                  <div
                    className={`w-11 h-11 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}
                  >
                    {stat.icon}
                  </div>
                  <p className="text-sm text-gray-500">{stat.title}</p>
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                </div>

                <p className="text-sm text-green-600 mt-4">↗ {stat.change}</p>
              </div>
            ))}
          </section>

          {/* Revenue Chart */}
          <section className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-3xl font-bold mb-6">Revenue Overview</h2>

            <div className="w-full flex justify-center">
              <svg width="560" height="280" viewBox="0 0 560 280">
                <line x1="70" y1="20" x2="70" y2="230" stroke="#9ca3af" />
                <line x1="70" y1="230" x2="520" y2="230" stroke="#9ca3af" />

                {[20, 70, 120, 170, 230].map((y) => (
                  <line
                    key={y}
                    x1="70"
                    y1={y}
                    x2="520"
                    y2={y}
                    stroke="#e5e7eb"
                    strokeDasharray="4"
                  />
                ))}

                {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m, i) => (
                  <text
                    key={m}
                    x={70 + i * 90}
                    y="250"
                    fontSize="12"
                    fill="#6b7280"
                    textAnchor="middle"
                  >
                    {m}
                  </text>
                ))}

                {["0", "7000", "14000", "21000", "28000"].map((v, i) => (
                  <text
                    key={v}
                    x="60"
                    y={234 - i * 52}
                    fontSize="12"
                    fill="#6b7280"
                    textAnchor="end"
                  >
                    {v}
                  </text>
                ))}

                <path
                  d="M70 150 C110 90, 145 80, 180 95 C220 115, 235 140, 270 125 C320 100, 330 60, 380 35 C430 10, 480 20, 520 45 L520 230 L70 230 Z"
                  fill="#93c5fd"
                  opacity="0.65"
                />

                <path
                  d="M70 150 C110 90, 145 80, 180 95 C220 115, 235 140, 270 125 C320 100, 330 60, 380 35 C430 10, 480 20, 520 45"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                />
              </svg>
            </div>
          </section>

          {/* Recent Orders */}
          <section className="bg-white rounded-lg shadow overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5">
              <h3 className="font-bold text-lg">Recent Orders</h3>
              <button className="text-blue-600 text-sm font-medium">
                View All
              </button>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y border-gray-200">
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order[0]} className="border-b border-gray-200">
                    <td className="px-6 py-4 font-medium">{order[0]}</td>
                    <td className="px-6 py-4 text-gray-600">{order[1]}</td>
                    <td className="px-6 py-4 font-medium">{order[2]}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(
                          order[3]
                        )}`}
                      >
                        {order[3]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{order[4]}</td>
                    <td className="px-6 py-4 text-gray-500">
                      <MoreVertical size={18} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </motion.main>
      </AdminLayout>
  );
}

export default AdminPanelPage;