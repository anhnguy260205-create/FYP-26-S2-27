import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
import { getNotifications } from "../api/notificationApi.js";
import { BellRing, Menu, X } from "lucide-react";


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
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));

  const handleLogout = async () => {
    if (!currentUser?.user_id) {
      sessionStorage.removeItem("currentUser");
      navigate("/");
      return;
    }
    try {
      const data = await logoutAccount(currentUser.user_id);
      if (data.success) {
        sessionStorage.removeItem("currentUser");
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
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser"));
  const initials = (currentUser?.username || currentUser?.user_name || currentUser?.full_name || "??")
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
      <span className="hidden xl:inline">{currentUser?.username || currentUser?.user_name || "Guest"}</span>
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

function ConsultantHeader() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!currentUser?.user_id) return;
    getNotifications(currentUser.user_id)
      .then((res) => { if (res.success) setHasUnread(res.notifications.some((n) => n.is_unread)); })
      .catch(() => {});
  }, [currentUser?.user_id]);

  const handleLogout = async () => {
    if (!currentUser?.user_id) {
      sessionStorage.removeItem("currentUser");
      navigate("/");
      return;
    }
    try {
      const data = await logoutAccount(currentUser.user_id);
      if (data.success) {
        sessionStorage.removeItem("currentUser");
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
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
          {navLinks.map((link) => (
            <div key={link.label} className="relative group">
              <a
                href="#"
                className="font-bold text-[14px] lg:text-[16px] bg-clip-text text-transparent leading-6 whitespace-nowrap"
                style={{ backgroundImage: link.gradient }}
                onClick={(e) => { e.preventDefault(); link.onClick?.(); }}
              >
                {link.label}
              </a>
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-950 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              {link.submenu && <NavDropdown items={link.submenu} />}
            </div>
          ))}
        </div>

        {/* Desktop right — md and above */}
        <div className="hidden md:flex items-center gap-3 lg:gap-8">
          <button
            onClick={() => navigate("/expert/notifications")}
            className={`flex items-center gap-2 font-medium ${
              hasUnread ? "text-cyan-400" : "text-slate-800 hover:text-cyan-500"
            }`}
          >
            <BellRing size={18} />
            <span className="hidden lg:inline">Notification</span>
          </button>
          <ProfileButton />
        </div>

        {/* Mobile right */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => navigate("/expert/notifications")}
            className={hasUnread ? "text-cyan-400" : "text-slate-800 hover:text-cyan-500"}
            aria-label="Notifications"
          >
            <BellRing size={20} />
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

export default ConsultantHeader;
