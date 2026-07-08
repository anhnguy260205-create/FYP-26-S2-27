import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutAccount } from "../api/userApi";
import { Menu, X } from "lucide-react";

const menuItems = [
  { name: "Dashboard", path: "/adminpanel" },
  { name: "User Profiles", path: "/adminpanel/profiles" },
  { name: "User Account Management", path: "/adminpanel/useraccounts" },
  { name: "Community Management", path: "/adminpanel/posts" },
  { name: "Article Management", path: "/adminpanel/articles" },
  { name: "Subscription Management", path: "/adminpanel/subscriptions" },
  { name: "Expert Application Review", path: "/adminpanel/verifydocumentation" },
  { name: "Content Managment", path: "/adminpanel/contentmanagement" },
  { name: "Notification", path: "/adminpanel/notifications" },
];

function AdminLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      if (currentUser?.user_id) {
        await logoutAccount(currentUser.user_id);
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("currentUser");
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-48 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="h-13.5 flex items-center justify-between px-4 border-b shrink-0">
          <h1 className="text-[15px] font-bold text-slate-900">Admin Panel</h1>
          <button
            className="md:hidden text-slate-500 hover:text-slate-800"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-2 overflow-y-auto flex-1">
          {menuItems.map((item) => {
            const active =
              item.path === "/adminpanel"
                ? location.pathname === "/adminpanel"
                : location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`block rounded px-3 py-2 text-[11px] font-medium ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full text-left rounded px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Right column */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#071435] min-w-0">

        <header className="h-13.5 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden text-slate-700 hover:text-slate-900 shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold text-slate-900 truncate">{title}</h2>
              {subtitle && (
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
              AD
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold text-slate-900">Admin User</p>
              <p className="text-[9px] text-slate-500">administrator</p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-6">{children}</section>
      </div>

    </div>
  );
}

export default AdminLayout;
