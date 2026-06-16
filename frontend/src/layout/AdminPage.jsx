import { Link, useLocation } from "react-router-dom";

const menuItems = [
  { name: "Dashboard", path: "/adminpanel" },
  { name: "User Accounts", path: "/adminpanel/useraccounts" },
  { name: "User Profiles", path: "/adminpanel/profiles" },
  { name: "Community Post", path: "/adminpanel/posts" },
  { name: "Trade", path: "/adminpanel/trade" },
  { name: "Investment Guidance Articles", path: "/adminpanel/articles" },
];

function AdminLayout({ title, subtitle, children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-[190px] bg-white border-r border-gray-200">
          <div className="h-[54px] flex items-center px-4 border-b">
            <h1 className="text-[15px] font-bold text-slate-900">Admin Panel</h1>
          </div>

          <nav className="px-3 py-4 space-y-2">
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
        </aside>

        <main className="flex-1 bg-[#071435] min-h-screen">
          <header className="h-[54px] bg-white border-b border-gray-200 flex items-center justify-between px-6">
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

          <section className="p-6">{children}</section>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;