import { Link, useLocation, useNavigate } from "react-router-dom";
import { logoutAccount } from "../api/userApi";

const menuItems = [
  { name: "Dashboard", path: "/adminpanel" },
  { name: "User Accounts", path: "/adminpanel/useraccounts" },
  { name: "User Profiles", path: "/adminpanel/profiles" },
  { name: "Community Post", path: "/adminpanel/posts" },
  { name: "Investment Guidance Articles", path: "/adminpanel/articles" },
  { name: "Expert Application Review", path: "/adminpanel/verifydocumentation" }
];

function AdminLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const handleLogout = async () => {
    if (!currentUser?.user_id) {
      localStorage.removeItem("currentUser");
      navigate("/");
      return;
    }

    try {
      const data = await logoutAccount(currentUser.user_id);
      if (data.success) {
        localStorage.removeItem("currentUser");
        navigate("/");
      } else {
        console.error("Logout failed:", data.message || data);
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">

      {/* Sidebar — fixed, never scrolls */}
      <aside className="w-47.9 shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen">
        <div className="h-13.5 flex items-center px-4 border-b shrink-0">
          <h1 className="text-[15px] font-bold text-slate-900">Admin Panel</h1>
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
                className={`block rounded px-3 py-2 text-[11px] font-medium ${active
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

      {/* Right column — header stays fixed, content scrolls */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#071435]">

        <header className="h-13.5 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
              AD
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-900">Admin User</p>
              <p className="text-[9px] text-slate-500">administrator</p>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6">{children}</section>
      </div>

    </div>
  );
}

export default AdminLayout;
