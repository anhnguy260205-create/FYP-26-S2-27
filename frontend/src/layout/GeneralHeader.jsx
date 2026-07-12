import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
import { BellRing, Menu, X } from "lucide-react";

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
import { getNotifications } from "../api/notificationApi.js";
import { BellRing, ChevronDown, Menu, MessageCircle, X } from "lucide-react";

import ChatDock from "../components/chat/ChatDock.jsx";

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
      <button onClick={() => navigate("/investor/edit-profile")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Profile
      </button>
      <button onClick={() => navigate("/investor/subscription")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Subscription
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
        width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #0092b8, #155dfc)",
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

  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

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
      label: "Knowledge Hub",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      activePaths: ["/investor/educationcontent", "/investor/expertportfolio", "/investor/aichatbot"],
      submenu: [
        { title: "Educational Content", path: "/investor/educationcontent" },
        { title: "Expert Portfolio", path: "/investor/expertportfolio" },
        { title: "AI Chatbot", path: "/investor/aichatbot" },
      ],
    },
    {
      label: "Community Forum",
      gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      activePaths: ["/forum"],
      onClick: () => navigate("/forum"),
    },
    {
      label: "Transactions",
      gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      activePaths: ["/investor/portfolio-overview", "/investor/transaction-history"],
      submenu: [
        { title: "Portfolio Overview", path: "/investor/portfolio-overview" },
        { title: "Transaction History", path: "/investor/transaction-history" },
      ],
    },

  ];

  const isActive = (link) =>
    link.activePaths?.some((p) => location.pathname.startsWith(p)) ?? false;

  return (
    <>
      <div
        className="w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50 px-4 lg:px-8"
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
        <div className="hidden lg:flex items-center gap-4 xl:gap-8">
          {navLinks.map((link) => {
            const active = isActive(link);
            return (
              <div key={link.label} className="relative group">
                <a
                  href="#"
                  className="font-bold text-[13px] xl:text-[16px] bg-clip-text text-transparent leading-6 whitespace-nowrap"
                  style={{ backgroundImage: link.gradient }}
                  onClick={(e) => { e.preventDefault(); link.onClick?.(); }}
                >
                  {link.label}
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
              onClick={() => navigate("/investor/notification")}
              className={`group relative flex items-center gap-2 rounded-full px-3 py-2 font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00D3F2] ${notifHighlighted ? "bg-[#00D3F2]/10 text-[#00D3F2]" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
            >
              <BellRing size={25} />
              <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-[11px] font-medium text-white opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-[opacity,visibility] duration-150 z-50">
                Notification
              </span>
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
            onClick={() => navigate("/investor/notification")}
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


      {/* Messenger panel — triggered from the nav bar icon, renders only for logged-in investors */}
      <ChatDock ref={chatDockRef} hideBubble onUnreadChange={setChatUnread} />
    </>
  );
}

export default GeneralHeader;
