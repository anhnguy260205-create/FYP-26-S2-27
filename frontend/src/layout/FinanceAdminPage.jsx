import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DollarSign, FileCheck2, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { logoutAccount } from "../api/userApi";

const menuItems = [
  {
    name: "Dashboard",
    path: "/finance-admin",
    icon: LayoutDashboard,
  },
  {
    name: "Expert Document Verification",
    path: "/finance-admin/document-verification",
    icon: FileCheck2,
  },
  {
    name: "Subscription Management",
    path: "/finance-admin/subscriptions",
    icon: DollarSign,
  },
];

function FinanceAdminLayout({ title, subtitle, children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const profileMenuRef = useRef(null);

  let currentUser = null;

  try {
    currentUser = JSON.parse(
      sessionStorage.getItem("currentUser") || "null"
    );
  } catch {
    sessionStorage.removeItem("currentUser");
  }

  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuOpen]);

  const handleLogout = async () => {
    try {
      if (currentUser?.user_id) {
        await logoutAccount(currentUser.user_id);
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      sessionStorage.removeItem("currentUser");
      navigate("/");
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          flex h-screen w-56 shrink-0 flex-col
          border-r border-gray-200 bg-white
          transition-transform duration-300 ease-in-out
          md:static
          ${sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div>
            <h1 className="text-[15px] font-bold text-slate-900">
              Finance Admin
            </h1>

            <p className="text-[9px] text-slate-500">
              Administration Panel
            </p>
          </div>

          <button
            className="text-slate-500 hover:text-slate-800 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const active = location.pathname === item.path;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2 rounded px-3 py-2.5
                  text-[11px] font-medium
                  ${active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-700 hover:bg-slate-100"
                  }
                `}
              >
                <Icon size={15} />

                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-[#071435]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="shrink-0 text-slate-700 hover:text-slate-900 md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-bold text-slate-900">
                {title}
              </h2>

              {subtitle && (
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div
            className="relative shrink-0"
            ref={profileMenuRef}
          >
            <button
              onClick={() =>
                setProfileMenuOpen((previous) => !previous)
              }
              className="flex items-center gap-2"
              aria-haspopup="true"
              aria-expanded={profileMenuOpen}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                HR
              </div>

              <div className="hidden text-left sm:block">
                <p className="text-[10px] font-semibold text-slate-900">
                  Finance Admin
                </p>

                <p className="text-[9px] text-slate-500">
                  Financial management                </p>
              </div>
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-500 hover:bg-red-50"
                >
                  <LogOut size={16} />

                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </section>
      </div>
    </div>
  );
}

export default FinanceAdminLayout;