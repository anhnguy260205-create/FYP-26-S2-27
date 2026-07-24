import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { updateUserInformation, updateInvestorInterests, updateRiskTolerance } from "../../api/userApi.js";
import { useContentManagement, fillTemplate } from "../../utils/contentManagement.js";

const SPECIALTIES = [
  "Information Technology",
  "Financials",
  "Consumer Discretionary",
  "Communication Services",
  "Energy",
  "Real Estate",
  "Health Care",
  "Consumer Staples",
  "Industrials",
  "Materials",
  "Utilities",
];

function UpdateParticularPage() {
  const { text } = useContentManagement();
  const headingTemplate = text("update_particular_heading", "Welcome, {username}! 👋").title;
  const subtitle = text("update_particular_desc", "Let's set up your profile before you start trading.").title;
  const submitCta = text("update_particular_submit_cta", "Get Started →").title;
  const skipCta = text("update_particular_skip_cta", "Skip for now").title;
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [interests, setInterests] = useState([]);
  const [riskTolerance, setRiskTolerance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const handleSkip = () => {
    if (dontAskAgain && currentUser.user_id) {
      localStorage.setItem(`profileSetupDismissed_${currentUser.user_id}`, "1");
    }
    navigate("/investor");
  };

  const toggleInterest = (s) =>
    setInterests((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateUserInformation(
        currentUser.user_id,
        currentUser.username,
        fullName.trim(),
        currentUser.email_address,
        phone,
        address
      );

      if (interests.length > 0) {
        await updateInvestorInterests(currentUser.user_id, interests.join(","));
      }
      if (riskTolerance) {
        await updateRiskTolerance(currentUser.user_id, riskTolerance);
      }

      // Patch localStorage so rest of the app sees updated values immediately
      const updated = { ...currentUser, full_name: fullName.trim(), interests: interests.join(","), risk_tolerance: riskTolerance };
      sessionStorage.setItem("currentUser", JSON.stringify(updated));

      navigate("/investor");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition";
  const inputStyle = { height: "48px" };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="bg-white w-full max-w-125 flex flex-col"
        style={{
          borderRadius: "24px",
          padding: "clamp(20px, 5vw, 36px) clamp(18px, 5vw, 28px)",
          border: "1px solid rgba(11,29,79,0.25)",
          boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
        }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(22px, 6vw, 30px)", color: "#0B1D4F", fontFamily: "'DM Mono', monospace" }}>
            {fillTemplate(headingTemplate, { username: currentUser.username })}
          </h1>
          <p className="text-[14px]" style={{ color: "#5B6C88" }}>
            {subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Full Name */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[13px] text-gray-600 pl-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Kim Nguyen"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setError(""); }}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[13px] text-gray-600 pl-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. +65 9123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1">
            <label className="font-semibold text-[13px] text-gray-600 pl-1">Location</label>
            <input
              type="text"
              placeholder="e.g. Singapore"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {/* Interests */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[13px] text-gray-600 pl-1">
              Stock Interests <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPECIALTIES.map((s) => {
                const active = interests.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleInterest(s)}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-semibold transition-all text-left"
                    style={{
                      background: active ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                      border: active ? "1.5px solid #0092b8" : "1.5px solid transparent",
                      color: active ? "#0092b8" : "#555",
                      minHeight: "44px",
                    }}
                  >
                    {active ? "✓ " : ""}{s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="flex flex-col gap-2">
            <label className="font-semibold text-[13px] text-gray-600 pl-1">
              Risk Tolerance <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "Conservative", desc: "Preserve capital, low risk" },
                { value: "Moderate", desc: "Balanced growth and safety" },
                { value: "Aggressive", desc: "High growth, higher risk" },
              ].map(({ value, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRiskTolerance(riskTolerance === value ? "" : value)}
                  className="flex flex-col items-center justify-center px-2 py-2 rounded-[10px] text-[12px] font-semibold transition-all text-center"
                  style={{
                    background: riskTolerance === value ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                    border: riskTolerance === value ? "1.5px solid #0092b8" : "1.5px solid transparent",
                    color: riskTolerance === value ? "#0092b8" : "#555",
                    minHeight: "52px",
                  }}
                >
                  <span>{riskTolerance === value ? "✓ " : ""}{value}</span>
                  <span style={{ fontSize: 10, fontWeight: 400, color: riskTolerance === value ? "#0092b8" : "#999", marginTop: 2 }}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-[13px] font-medium">{error}</p>
          )}

          {/* Buttons */}
          <button
            type="submit"
            disabled={saving}
            className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
            style={{
              height: "54px",
              background: "linear-gradient(90deg, #0092b8, #155dfc)",
              boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
            }}
          >
            {saving ? "Saving…" : submitCta}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-gray-400 text-[14px] hover:text-gray-600 transition-colors"
          >
            {skipCta}
          </button>

          <label className="flex items-center justify-center gap-2 text-[12px] text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              style={{ accentColor: "#0092b8" }}
            />
            Don't ask me again on login
          </label>
        </form>
      </div>
    </motion.div>
  );
}

export default UpdateParticularPage;
