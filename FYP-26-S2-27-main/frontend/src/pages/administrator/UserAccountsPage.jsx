import { useEffect, useState } from "react";
import { Search, Filter, Eye, Ban, Trash2, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

function UserAccountsPage() {
  const [users, setUsers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchUsers = async (searchKeyword = "") => {
    try {
      setLoading(true);

      const url = searchKeyword
        ? `http://127.0.0.1:8000/admin/useraccounts?keyword=${encodeURIComponent(searchKeyword)}`
        : "http://127.0.0.1:8000/admin/useraccounts";

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Failed to fetch user accounts:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const menuItems = [
    { name: "Dashboard", path: "/adminpanel" },
    { name: "User Accounts", path: "/adminpanel/useraccounts" },
    { name: "User Profiles", path: "/adminpanel/profiles" },
    { name: "Community Post", path: "/adminpanel/posts" },
    { name: "Trade", path: "/adminpanel/trade" },
    { name: "Investment Guidance Article", path: "/adminpanel/articles" },
  ];

  const roleStyle = (role) => {
    if (role === "Premium") return "bg-purple-100 text-purple-700";
    if (role === "Customer") return "bg-blue-100 text-blue-700";
    return "bg-blue-100 text-blue-700";
  };

  const statusStyle = (status) => {
    if (status === "Active") return "bg-green-100 text-green-700";
    if (status === "Suspended") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 ">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-[250px] bg-white border-r border-gray-200 sticky top-0 shrink-0 z-50">
          <div className="h-[84px] flex items-center px-9 border-b border-gray-100">
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>

          <nav className="p-7 space-y-3">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`block px-4 py-3 rounded-lg text-sm font-medium ${item.name === "User Accounts"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-700 hover:bg-gray-100"
                  }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
          {/* Header */}
          <header className="h-[84px] bg-white flex items-center justify-between px-8 shrink-0 sticky top-0 z-50">
            <div>
              <h2 className="text-2xl font-bold">User Accounts</h2>
              <p className="text-base text-black mt-1">
                Search and manage all user accounts
              </p>
            </div>

            <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                AD
              </div>
              <div>
                <p className="font-semibold text-sm">Admin User</p>
                <p className="text-xs text-gray-500">administrator</p>
              </div>
            </div>
          </header>

          <div className="p-3">
            {/* Search Box */}
            <section className="bg-white rounded-lg p-7 mb-5">
              <div className="flex items-center gap-8">
                <div className="relative flex-1 max-w-[590px]">
                  <Search
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchUsers(keyword);
                      }
                    }}
                    placeholder="Search by name, email, ID, or phone..."
                    className="w-full h-12 border border-gray-300 rounded-lg pl-12 pr-4 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={() => fetchUsers(keyword)}
                  className="h-12 px-8 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Search
                </button>

                <Filter size={22} className="text-slate-500" />

                <input className="h-12 w-36 border border-gray-300 rounded-lg px-3 outline-none" />
              </div>

              <p className="text-sm text-slate-600 mt-5">
                {loading ? "Loading..." : `Found ${users.length} user(s)`}
              </p>
            </section>

            {/* Table */}
            <section className="bg-white rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Contact</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Join Date</th>
                    <th className="px-5 py-4">Last Active</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100">
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">
                            {user.initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{user.full_name}</p>
                            <p className="text-slate-500">{user.user_id}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-5 text-slate-600">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail size={15} className="text-gray-400" />
                          <span>{user.email_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={15} className="text-gray-400" />
                          <span>{user.phone_number}</span>
                        </div>
                      </td>

                      <td className="px-5 py-5">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold ${roleStyle(user.role)}`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-5">
                        <span className={`px-4 py-2 rounded-full text-xs font-bold ${statusStyle(user.account_status)}`}>
                          {user.account_status}
                        </span>
                      </td>

                      <td className="px-5 py-5 text-slate-600">{user.join_date}</td>
                      <td className="px-5 py-5 text-slate-600">{user.last_login}</td>

                      <td className="px-5 py-5">
                        <div className="flex items-center gap-5">
                          <Eye size={18} className="text-blue-600 cursor-pointer" />
                          <Ban size={18} className="text-orange-600 cursor-pointer" />
                          <Trash2 size={18} className="text-red-600 cursor-pointer" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex items-center justify-between px-7 py-5">
                <p className="text-sm text-slate-600">
                  Showing 1 to {users.length} of {users.length} results
                </p>

                <div className="flex items-center gap-3">
                  <button className="px-5 py-3 border border-gray-200 rounded-lg text-gray-400">
                    Previous
                  </button>
                  <button className="px-4 py-3 bg-blue-600 text-white rounded-lg">
                    1
                  </button>
                  <button className="px-5 py-3 border border-gray-200 rounded-lg text-gray-400">
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserAccountsPage;