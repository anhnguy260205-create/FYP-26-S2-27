import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { updateUserInformation, updateInvestorInterests, updateRiskTolerance } from "../../api/userApi.js";

const SPECIALTIES = [
  "Information Technology",
  "Financials",
  "Consumer Discretionary",
  "Communication Services",
  "Energy",
  "Real Estate",
];

function UpdateParticularPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [interests, setInterests] = useState([]);
  const [riskTolerance, setRiskTolerance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      localStorage.setItem("currentUser", JSON.stringify(updated));

      navigate("/investor");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition";
  const inputStyle = { height: "44px" };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div
        className="bg-[rgba(255,255,255,0.92)] w-full max-w-125 flex flex-col"
        style={{ borderRadius: "30px", padding: "36px 28px" }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-bold text-black text-3xl leading-tight mb-2">
            Welcome, {currentUser.username}! 👋
          </h1>
          <p className="text-gray-500 text-[15px]">
            Let's set up your profile before you start trading.
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
              Stock Interests <span className="text-gray-400 font-normal">(optional — pick any that interest you)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALTIES.map((s) => {
                const active = interests.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleInterest(s)}
                    className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                    style={{
                      background: active ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                      border: active ? "1.5px solid #0092b8" : "1.5px solid transparent",
                      color: active ? "#0092b8" : "#555",
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
            <div className="flex flex-wrap gap-2">
              {[
                { value: "Conservative", desc: "Preserve capital, low risk" },
                { value: "Moderate", desc: "Balanced growth and safety" },
                { value: "Aggressive", desc: "High growth, higher risk" },
              ].map(({ value, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRiskTolerance(riskTolerance === value ? "" : value)}
                  title={desc}
                  className="px-3 py-1.5 rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    background: riskTolerance === value ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                    border: riskTolerance === value ? "1.5px solid #0092b8" : "1.5px solid transparent",
                    color: riskTolerance === value ? "#0092b8" : "#555",
                  }}
                >
                  {riskTolerance === value ? "✓ " : ""}{value}
                </button>
              ))}
            </div>
            {riskTolerance && (
              <p className="text-[12px] text-gray-400 pl-1">
                {riskTolerance === "Conservative" && "Preserve capital, low risk"}
                {riskTolerance === "Moderate" && "Balanced growth and safety"}
                {riskTolerance === "Aggressive" && "High growth, higher risk"}
              </p>
            )}
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
            {saving ? "Saving…" : "Get Started →"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/investor")}
            className="w-full text-gray-400 text-[14px] hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default UpdateParticularPage;
