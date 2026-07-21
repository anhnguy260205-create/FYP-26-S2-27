import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
import { BellRing, ChevronDown, Menu, MessageCircle, X } from "lucide-react";

import ChatDock from "../components/chat/ChatDock.jsx";
import NotificationDock from "../components/notifications/NotificationDock.jsx";
import { getAvatarGradient } from "../utils/userRole.js";

function NavDropdown({ items }) {
  const navigate = useNavigate();
  return (
    <div className="absolute top-full left-0 mt-3 w-52 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible -translate-y-1.5
                     group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-[opacity,transform,visibility] duration-200 ease-out z-50">
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
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "null");

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
    <div className="absolute right-0 mt-3 w-52 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden opacity-0 invisible -translate-y-1.5
                     group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-[opacity,transform,visibility] duration-200 ease-out z-50">
      <button onClick={() => navigate("/investor/edit-profile")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Profile
      </button>
      <button onClick={() => navigate("/investor/subscription")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Subscription
      </button>
      <button onClick={() => navigate("/reviews")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Reviews
      </button>
      <div className="border-t border-white/10" />
      <button onClick={() => navigate("/about-us")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        About Us
      </button>
      <button onClick={() => navigate("/support")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Help Center
      </button>
      <div className="border-t border-white/10" />
      <button onClick={handleLogout} className="w-full text-left px-5 py-3 text-red-400 hover:bg-red-500/10">
        Logout
      </button>
    </div>
  );
}

function Profile() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "null");
  const initials = (currentUser?.full_name || currentUser?.username || currentUser?.user_name || "??")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      style={{ height: "41px", padding: "0 8px", color: "black", fontSize: "14px", fontWeight: 600 }}
    >
      <div style={{
        width: "40px", height: "40px", borderRadius: "50%", background: getAvatarGradient(),
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

function GeneralHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const chatDockRef = useRef(null);
  const notifDockRef = useRef(null);
  const desktopRightRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || sessionStorage.getItem("currentUser") || "{}");

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
      label: "Dashboard",
      activePaths: ["/watchlist", "/realtimedashboard"],
      submenu: [
        { title: "Watchlist", path: "/watchlist" },
        { title: "Real-time Dashboard", path: "/realtimedashboard" },
      ],
    },
    {
      label: "Knowledge Hub",
      activePaths: ["/investor/educationcontent", "/investor/expertportfolio", "/investor/aichatbot"],
      submenu: [
        { title: "Educational Content", path: "/investor/educationcontent" },
        { title: "Expert Portfolio", path: "/investor/expertportfolio" },
        { title: "AI Chatbot", path: "/investor/aichatbot" },
      ],
    },
    {
      label: "Forum Community",
      activePaths: ["/forum"],
      onClick: () => navigate("/forum"),
    },
    {
      label: "Transactions",
      activePaths: [
        "/investor/portfolio-overview",
        "/investor/transaction-history",
        "/investor/cash",
      ],
      submenu: [
        { title: "Portfolio Overview", path: "/investor/portfolio-overview" },
        { title: "Transaction History", path: "/investor/transaction-history" },
        { title: "Cash In / Cash Out", path: "/investor/cash" },
      ],
    },

  ];

  const isActive = (link) =>
    link.activePaths?.some((p) => location.pathname.startsWith(p)) ?? false;

  return (
    <>
      <div
        className={`w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50 px-5 lg:px-10 transition-shadow duration-200 ${scrolled ? "shadow-[0_4px_20px_rgba(15,23,42,0.15)]" : "shadow-[0_1px_16px_rgba(15,23,42,0.08)]"}`}
        style={{ height: "60px", borderBottom: "0.667px solid rgba(28,57,142,0.3)" }}
      >
        <img
          alt="logo"
          src={logo}
          onClick={() => navigate("/investor")}
          className="cursor-pointer w-17.5 md:w-25 lg:w-30"
          style={{ height: "auto" }}
        />

        {/* Desktop nav — lg and above */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-10">
          {navLinks.map((link) => {
            const active = isActive(link);
            return (
              <div key={link.label} className="relative group py-2">
                <a
                  href="#"
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 -mx-2.5 font-bold text-[13px] xl:text-[15px] leading-6 whitespace-nowrap transition-colors duration-200 ${active ? "text-[#00D3F2] bg-[#00D3F2]/10" : "text-slate-600 hover:text-slate-900"}`}
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

        {/* Desktop right — lg and above */}
        <div className="hidden lg:flex items-center gap-1" ref={desktopRightRef}>
          <div className="flex items-center gap-1">
            <button
              data-chat-trigger
              onClick={() => chatDockRef.current?.toggleOpen(desktopRightRef.current.getBoundingClientRect())}
              className={`group relative flex items-center gap-2 rounded-full px-3 py-2 font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D3F2] ${chatUnread > 0 ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              aria-label="Messenger"
            >
              <MessageCircle size={25} />
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
                Messenger
              </span>
              {chatUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {chatUnread > 99 ? "99+" : chatUnread}
                </span>
              )}
            </button>
            <button
              data-notification-trigger
              onClick={() => notifDockRef.current?.toggleOpen(desktopRightRef.current.getBoundingClientRect())}
              className={`group relative flex items-center gap-2 rounded-full px-3 py-2 font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D3F2] ${notifUnread > 0 ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
              aria-label="Notifications"
            >
              <BellRing size={25} />
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
                Notification
              </span>
              {notifUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {notifUnread > 99 ? "99+" : notifUnread}
                </span>
              )}
            </button>
          </div>
          <ProfileButton />
        </div>

        {/* Mobile / tablet right */}
        <div className="flex lg:hidden items-center gap-1">
          <button
            data-chat-trigger
            onClick={(e) => chatDockRef.current?.toggleOpen(e.currentTarget.getBoundingClientRect())}
            className={`group relative p-2 rounded-full transition-colors duration-150 ${chatUnread > 0 ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Messenger"
          >
            <MessageCircle size={25} />
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
              Messenger
            </span>
            {chatUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {chatUnread > 99 ? "99+" : chatUnread}
              </span>
            )}
          </button>
          <button
            data-notification-trigger
            onClick={(e) => notifDockRef.current?.toggleOpen(e.currentTarget.getBoundingClientRect())}
            className={`group relative p-2 rounded-full transition-colors duration-150 ${notifUnread > 0 ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100"}`}
            aria-label="Notification"
          >
            <BellRing size={25} />
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
              Notification
            </span>
            {notifUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {notifUnread > 99 ? "99+" : notifUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors duration-150"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>


      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-15 z-40 bg-white overflow-y-auto">
          <div className="px-4 py-4">
            {navLinks.map((link) => {
              const active = isActive(link);
              return (
                <div key={link.label} className="mb-1">
                  <button
                    className={`w-full text-left px-4 py-3 font-bold rounded-xl ${active ? "text-[#00D3F2] bg-[#00D3F2]/10" : "text-slate-900 hover:bg-gray-50"}`}
                    onClick={() => { if (!link.submenu) { link.onClick?.(); close(); } }}
                  >
                    {link.label}
                  </button>
                  {link.submenu && (
                    <div className="ml-4 border-l-2 border-gray-100 pl-3 mb-1">
                      {link.submenu.map((item) => {
                        const subActive = location.pathname.startsWith(item.path);
                        return (
                          <button
                            key={item.title}
                            className={`w-full text-left px-4 py-2.5 text-sm rounded-xl ${subActive ? "text-[#00D3F2] font-semibold bg-[#00D3F2]/10" : "text-gray-600 hover:text-[#00D3F2] hover:bg-gray-50"}`}
                            onClick={() => go(item.path)}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
              <button
                onClick={() => go("/investor/edit-profile")}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Profile
              </button>
              <button
                onClick={() => go("/investor/subscription")}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Subscription
              </button>
              <button
                onClick={() => go("/reviews")}
                className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Reviews
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

      {/* Messenger panel — triggered from the nav bar icon, renders only for logged-in investors */}
      <ChatDock ref={chatDockRef} hideBubble onUnreadChange={setChatUnread} />
      {/* Notification panel — triggered from the nav bar bell icon */}
      <NotificationDock ref={notifDockRef} onUnreadChange={setNotifUnread} />
    </>
  );
}

export default GeneralHeader;
