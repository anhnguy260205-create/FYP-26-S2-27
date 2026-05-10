import { useState } from "react";
import { useNavigate } from "react-router";
import svgPaths from "../../../user/rationPage/svg-g8yitry7y5";

function Icon() {
  return (
    <div className="relative shrink-0 size-[32px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g id="Icon">
          <path d={svgPaths.pc093400} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p28b2e480} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.pbd22060} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p132bcf80} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p8dd6d00} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p65fba00} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.pc59ed00} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p18f98ec0} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
          <path d={svgPaths.p21a6c00} stroke="#00D3F2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.66667" />
        </g>
      </svg>
    </div>
  );
}

function Navigation() {
  const navigate = useNavigate();
  return (
    <nav
      className="w-full bg-white shrink-0 flex items-center justify-between px-8"
      style={{ height: "72px", borderBottom: "0.667px solid rgba(28,57,142,0.3)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
        <Icon />
        <span
          className="font-bold text-[20px] bg-clip-text text-transparent whitespace-nowrap"
          style={{ backgroundImage: "linear-gradient(90deg, rgb(0, 211, 243) 0%, rgb(81, 162, 255) 100%)" }}
        >
          Deskstock
        </span>
      </div>

      {/* Nav Links */}
      <div className="flex items-center gap-8">
        {[
          { label: "About Us", gradient: "linear-gradient(164.407deg, rgb(2, 6, 24) 0%, rgb(22, 36, 86) 50%, rgb(15, 23, 43) 100%)" },
          { label: "Support", gradient: "linear-gradient(165.069deg, rgb(2, 6, 24) 0%, rgb(22, 36, 86) 50%, rgb(15, 23, 43) 100%)" },
        ].map((link) => (
          <a
            key={link.label}
            href="#"
            className="font-bold text-[16px] bg-clip-text text-transparent leading-[24px] whitespace-nowrap hover:opacity-70 transition-opacity"
            style={{ backgroundImage: link.gradient }}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="font-bold text-[16px] bg-clip-text text-transparent leading-[24px] whitespace-nowrap px-5 rounded-[10px]"
          style={{
            height: "41.333px",
            border: "0.667px solid rgba(43,127,255,0.5)",
            backgroundImage: "linear-gradient(156.038deg, rgb(2, 6, 24) 0%, rgb(22, 36, 86) 50%, rgb(15, 23, 43) 100%)",
          }}
        >
          Sign In
        </button>
        <button
          className="font-medium text-[16px] text-white leading-[24px] whitespace-nowrap px-5 rounded-[10px]"
          style={{
            height: "41.333px",
            background: "linear-gradient(90deg, #0092b8, #155dfc)",
            boxShadow: "0px 10px 15px 0px rgba(0,184,219,0.2), 0px 4px 6px 0px rgba(0,184,219,0.2)",
          }}
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}

const riskLevels = ["Conservative", "Moderate", "Aggressive", "Speculative"];

export function RegistrationPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    riskLevel: "",
    accountType: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{ backgroundImage: "linear-gradient(144.583deg, rgb(2, 6, 24) 0%, rgb(22, 36, 86) 50%, rgb(15, 23, 43) 100%)" }}
    >
      <Navigation />

      {/* Content Area — fills remaining height */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column — Form */}
        <div
          className="flex items-center justify-start shrink-0 overflow-y-auto"
          style={{ width: "764px", paddingLeft: "72px", paddingRight: "0px", paddingTop: "40px", paddingBottom: "40px" }}
        >
          {/* Form Card */}
          <div
            className="bg-[rgba(255,255,255,0.82)] w-[692px] shrink-0 flex flex-col justify-center"
            style={{
              borderRadius: "90px",
              minHeight: "680px",
              padding: "64px 76px",
              backdropFilter: "blur(16px)",
            }}
          >
            <h1
              className="font-bold text-black leading-[1.1]"
              style={{ fontSize: "64px" }}
            >
              Open an account
            </h1>
            <p
              className="text-black mt-2 mb-8"
              style={{ fontSize: "24px", marginTop: "8px", marginBottom: "36px" }}
            >
              Let's Trade with RocketTrading
            </p>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-bold text-[28px] text-black mb-2">Account Created!</h2>
                <p className="text-gray-600 text-[17px] mb-1">
                  Welcome, <span className="font-semibold" style={{ color: "#0092b8" }}>{formData.username}</span>
                </p>
                <p className="text-gray-500 text-[15px]">
                  Registered as a <span className="capitalize font-medium">{formData.accountType}</span>{" "}
                  · <span className="font-medium">{formData.riskLevel}</span> risk
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 px-8 py-3 rounded-[14px] text-white font-medium text-[16px]"
                  style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
                >
                  Back to Form
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Username */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "52px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="w-full rounded-[14px] border bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "52px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Risk Level */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Stock Risk Level</label>
                  <div className="relative">
                    <select
                      value={formData.riskLevel}
                      onChange={(e) => handleChange("riskLevel", e.target.value)}
                      required
                      className="w-full rounded-[14px] bg-white px-4 text-[15px] text-gray-800 focus:outline-none transition appearance-none cursor-pointer"
                      style={{
                        height: "52px",
                        border: "1px solid rgba(0,0,0,0.15)",
                      }}
                    >
                      <option value="" disabled>Select your risk tolerance</option>
                      {riskLevels.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Account Type */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "investor", label: "Investor", desc: "Grow my portfolio" },
                      { value: "consultant", label: "Consultant / Expert", desc: "Provide trading insights" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange("accountType", type.value)}
                        className="flex flex-col items-start px-5 py-4 rounded-[14px] border-2 transition-all text-left"
                        style={{
                          borderColor: formData.accountType === type.value ? "#0092b8" : "rgba(0,0,0,0.12)",
                          background: formData.accountType === type.value ? "rgba(0,146,184,0.06)" : "white",
                        }}
                      >
                        <span
                          className="font-semibold text-[14px]"
                          style={{ color: formData.accountType === type.value ? "#0092b8" : "#1f2937" }}
                        >
                          {type.label}
                        </span>
                        <span className="text-[12px] text-gray-500 mt-0.5">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all"
                  style={{
                    height: "54px",
                    background: "linear-gradient(90deg, #0092b8, #155dfc)",
                    boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                  }}
                >
                  Create Account
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column — Stock Image */}
        <div className="flex-1 flex flex-col justify-center gap-5 pr-[72px] pl-8 py-10">
          {/* Image Card */}
          <div
            className="relative overflow-hidden w-full"
            style={{
              borderRadius: "40px",
              flex: "1 1 0",
              maxHeight: "500px",
            }}
          >
    
            {/* Overlay gradient */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(2,6,24,0.78) 0%, rgba(2,6,24,0.1) 60%, transparent 100%)" }} />
            {/* Caption */}
            <div className="absolute bottom-7 left-7 right-7">
              <p className="text-white font-bold text-[24px] leading-tight">Smart Trading Starts Here</p>
              <p className="text-[rgba(255,255,255,0.72)] text-[15px] mt-1.5">
                Join thousands of investors leveraging data-driven insights to grow their portfolios.
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 shrink-0">
            {[
              { label: "Active Users", value: "50K+" },
              { label: "Daily Trades", value: "2M+" },
              { label: "Avg. Return", value: "18.4%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center justify-center py-5 rounded-[20px]"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.11)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span
                  className="font-bold text-[22px] bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, rgb(0, 211, 243) 0%, rgb(81, 162, 255) 100%)" }}
                >
                  {stat.value}
                </span>
                <span className="text-[rgba(255,255,255,0.55)] text-[13px] mt-1">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}