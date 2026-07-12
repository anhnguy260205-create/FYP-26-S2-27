import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
import { BellRing, Menu, X } from "lucide-react";

import { getNotifications } from "../api/notificationApi.js";
import { BellRing, ChevronDown, Menu, X } from "lucide-react";

function NavDropdown({ items }) {
  const navigate = useNavigate();
  return (
    <div className="absolute top-full left-0 mt-3 w-52 bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible
                     group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
      {items.map((item) => (
        <button
          key={item.title}
          onClick={() => item.path && navigate(item.path)}
          className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400 transition-all cursor-pointer"
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}

function DropDownMenu() {
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
    <div className="absolute right-0 mt-3 w-52 bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible
                     group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
      <button onClick={() => navigate("/expert/edit-profile")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Profile
      </button>

      <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-red-400 hover:bg-red-500/10">
        Logout
      </button>
    </div>
  );
}

function Profile() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const initials = (currentUser?.full_name || currentUser?.username || currentUser?.user_name || "??")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      style={{ height: "41px", padding: "0 8px", color: "black", fontSize: "14px", fontWeight: 600 }}
    >
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #4338ca, #7e22ce)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ fontSize: "16px", fontWeight: 700, color: "white" }}>{initials}</span>
      </div>
      <span className="hidden xl:inline">{currentUser?.full_name || currentUser?.username || currentUser?.user_name || "User"}</span>
    </button>
  );
}

function ProfileButton() {
  return (
    <div className="relative group">
      <Profile />
      <DropDownMenu />
    </div>
  );
}

function ExpertHeader() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!currentUser?.user_id) return;
    getNotifications(currentUser.user_id)
      .then((res) => { if (res.success) setHasUnread(res.notifications.some((n) => n.is_unread)); })
      .catch(() => { });
  }, [currentUser?.user_id]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const close = () => setMobileOpen(false);
  const go = (path) => { navigate(path); close(); };

  const navLinks = [
    {
      label: "DashBoard",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      activePaths: ["/watchlist", "/realtimedashboard"],
      submenu: [
        { title: "Watchlist", path: "/watchlist" },
        { title: "Real-time Dashboard", path: "/realtimedashboard" },
      ],
    },
    {
      label: "Questions",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      onClick: () => navigate("/expert/questions"),
    },
    {
      label: "My Portfolio",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      onClick: () => navigate("/expert/portfolio"),
    },
    {
      label: "Learning Content",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      onClick: () => navigate("/expert/knowledge-hub"),
    },
    {
      label: "Community Forum",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      onClick: () => navigate("/forum"),
    },

  ];

  return (
    <>
      <div
        className="w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50 px-4 md:px-8"
        style={{ height: "60px", borderBottom: "0.667px solid rgba(28,57,142,0.3)" }}
      >
        <img
          alt="logo"
          src={logo}
          onClick={() => navigate("/expert")}
          className="cursor-pointer w-17.5 md:w-25 lg:w-30"
          style={{ height: "auto" }}
        />

        {/* Desktop nav — md and above */}
        <div className="hidden md:flex items-center gap-6 lg:gap-10">
          {navLinks.map((link) => {
            const active = isActive(link);
            return (
              <div key={link.label} className="relative group py-2">
                <a
                  href="#"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 -mx-2.5 font-bold text-[14px] lg:text-[15px] leading-6 whitespace-nowrap transition-colors duration-200 ${active ? "text-[#00D3F2] bg-[#00D3F2]/10" : "text-slate-600 hover:text-slate-900"}`}
                  onClick={(e) => { e.preventDefault(); link.onClick?.(); }}
                >
                  {link.label}
                  {link.submenu && (
                    <ChevronDown size={14} className="opacity-60 transition-transform duration-200 group-hover:rotate-180" />
                  )}
                </a>
                <span
                  className={`absolute -bottom-1 left-2.5 right-2.5 h-0.75 rounded-full transition-transform duration-300 ease-out origin-left ${active ? "bg-[#00D3F2] scale-x-100" : "bg-slate-300 scale-x-0 group-hover:scale-x-100"
                    }`}
                />
                {link.submenu && <NavDropdown items={link.submenu} />}
              </div>
            );
          })}
        </div>

        {/* Desktop right — md and above */}
        <div className="hidden md:flex items-center gap-3 lg:gap-8">
          <button
            onClick={() => navigate("/expert/notifications")}
            className={`group relative flex items-center gap-2 rounded-full px-3 py-2 font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D3F2] ${notifHighlighted ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <BellRing size={25} />
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
              Notification
            </span>
          </button>
          <ProfileButton />
        </div>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => navigate("/expert/notifications")}
            className={`group relative p-2 rounded-full transition-colors duration-150 ${notifHighlighted ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Notification"
          >
            <BellRing size={25} />
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
              Notification
            </span>
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-800 p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>


      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-15 z-40 bg-white overflow-y-auto">
          <div className="px-4 py-4">
            {navLinks.map((link) => (
              <div key={link.label} className="mb-1">
                <button
                  className="w-full text-left px-4 py-3 font-bold text-slate-900 hover:bg-gray-50 rounded-xl"
                  onClick={() => { link.onClick?.(); close(); }}
                >
                  {link.label}
                </button>
              </div>
            ))}

            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
              <button
                onClick={() => go("/expert/edit-profile")}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ExpertHeader;
