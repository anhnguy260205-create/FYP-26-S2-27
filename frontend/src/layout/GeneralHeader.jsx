import { useNavigate } from "react-router-dom";
import logo from "../images/logo.png";
import { logoutAccount } from "../api/userApi";
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
      <button onClick={() => navigate("/edit-profile")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Edit Profile
      </button>
      <button onClick={() => navigate("/settings")} className="w-full text-left px-5 py-3 text-gray-300 hover:bg-white/5 hover:text-cyan-400">
        Settings
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
  const currentUser = JSON.parse(
    localStorage.getItem("currentUser")
  );
  return (
    <button
      className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      style={{ height: "41px", padding: "0 16px", color: "#00D3F2", fontSize: "14px", fontWeight: 600, gap: "8px" }}
    >
      <div style={{
        width: "26px", height: "26px", borderRadius: "50%", background: "linear-gradient(135deg, #0092b8, #155dfc)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </div>

      {/* Dynamic username */}
      {currentUser?.username || "Guest"}
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
  const navLinks = [
    {
      label: "DashBoard",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      submenu: [
        { title: "Watchlist Management", path: "/investor/watchlist" },
        { title: "Real-time Dashboard", path: "/investor/realtimedashboard" },
      ],
    },
    {
      label: "AI Prediction",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      onClick: () => navigate("/investor/aiprediction")
    },
    {
      label: "Knowledge Hub",
      gradient: "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      submenu: [
        { title: "Educational Content", path: "#" },
        { title: "Expert Advice", path: "#" },
        { title: "AI Chatbot", path: "#" },
      ],
    },
    {
      label: "Community",
      gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
    },
    {
      label: "Transactions",
      gradient: "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
      submenu: [
        { title: "Trading Portal", path: "/transactions/trading" },
        { title: "Transaction History", path: "/transactions/history" },
      ],
    },
  ];

  return (
    <div className="w-full bg-white flex items-center justify-between shrink-0 sticky top-0 z-50"
      style={{ height: "60px", borderBottom: "0.667px solid rgba(28,57,142,0.3)", padding: "0 32px" }}>

      <img alt="logo" src={logo} onClick={() => navigate("/investor/loggedhome")} style={{ width: "120px", height: "130px" }} className="cursor-pointer" />

      <div className="flex items-center gap-8">
        {navLinks.map((link) => (
          <div key={link.label} className="relative group">
            <a
              href="#"
              className="font-bold text-[16px] bg-clip-text text-transparent leading-6 whitespace-nowrap hover:opacity-70 transition-opacity"
              style={{ backgroundImage: link.gradient }}
              onClick={link.onClick}
            >
              {link.label}
            </a>
            {link.submenu && <NavDropdown items={link.submenu} />}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-8">
        <ProfileButton />
      </div>
    </div>
  );
}

export default GeneralHeader;
