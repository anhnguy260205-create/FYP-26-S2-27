import logo from "../images/logo.png";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  {
    label: "Help Center",
    path: "/support",
    gradient:
      "linear-gradient(173.863deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
  },
  {
    label: "About Us",
    path: "/about-us",
    gradient:
      "linear-gradient(174.615deg, rgb(2,6,24) 7.9473%, rgb(22,36,86) 50%, rgb(15,23,43) 92.053%)",
  },
];

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div
        className="w-full bg-white flex items-center  justify-between shrink-0 sticky top-0 z-50 px-4 md:px-8 shadow-sm"
        style={{ height: "60px", borderBottom: "0.667px solid rgba(28,57,142,0.3)" }}
      >
        <img
          alt="logo"
          src={logo}
          onClick={() => navigate("/")}
          className="cursor-pointer w-17.5 md:w-25 lg:w-30"
          style={{ height: "auto" }}
        />

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-8">
          {LINKS.map((link) => {
            const active = location.pathname.startsWith(link.path);
            return (
              <div key={link.label} className="relative group">
                <button
                  type="button"
                  className={`font-bold text-[16px] leading-6 whitespace-nowrap cursor-pointer transition-colors ${active ? "text-[#00D3F2]" : "bg-clip-text text-transparent"}`}
                  style={active ? undefined : { backgroundImage: link.gradient }}
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </button>
                <span
                  className={`absolute bottom-0 left-0 h-0.5 w-full bg-[#00D3F2] rounded-full transition-transform duration-300 origin-left ${active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
                />
              </div>
            );
          })}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-slate-800 p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-x-0 top-15 z-40 bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {LINKS.map((link) => {
              const active = location.pathname.startsWith(link.path);
              return (
                <button
                  key={link.label}
                  type="button"
                  className={`block w-full text-left px-4 py-3 font-bold rounded-xl ${active ? "text-[#00D3F2] bg-[#00D3F2]/10" : "text-slate-800 hover:bg-gray-50"}`}
                  onClick={() => {
                    navigate(link.path);
                    setMobileOpen(false);
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
