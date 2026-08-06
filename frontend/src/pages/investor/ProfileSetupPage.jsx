import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  updateUserInformation,
  updateInvestorInterests,
  setTransactionPin,
} from "../../api/userApi.js";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, COUNTRIES, joinAddress } from "../../utils/countryCodes.js";

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

const inputCls =
  "w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition";

function StepDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: i === step ? 26 : 8,
            height: 8,
            borderRadius: 999,
            background: i === step ? "#0092b8" : "rgba(0,0,0,0.12)",
            transition: "all 0.2s",
          }}
        />
      ))}
    </div>
  );
}

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  const [step, setStep] = useState(0); // 0 info · 1 set pin · 2 confirm pin

  // Step 1 — personal information
  const [fullName, setFullName] = useState("");
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [interests, setInterests] = useState([]);

  // Steps 2 & 3 — transaction PIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleInterest = (s) =>
    setInterests((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const nextFromInfo = () => {
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!country) return setError("Please select your country.");
    setError("");
    setStep(1);
  };

  const nextFromPin = () => {
    if (pin.length !== 6) return setError("PIN must be exactly 6 digits.");
    setError("");
    setStep(2);
  };

  const handleFinish = async () => {
    if (confirmPin.length !== 6) return setError("Please re-enter your 6-digit PIN.");
    if (pin !== confirmPin) return setError("PINs do not match. Please try again.");
    setSaving(true);
    setError("");
    try {
      const fullPhone = `${dialCode} ${phone.trim()}`;
      const address = joinAddress(city, country);
      await updateUserInformation(
        currentUser.user_id,
        currentUser.username,
        fullName.trim(),
        currentUser.email_address,
        fullPhone,
        address
      );
      if (interests.length > 0) {
        await updateInvestorInterests(currentUser.user_id, interests.join(","));
      }
      const pinRes = await setTransactionPin(pin, confirmPin);
      if (!pinRes.success) {
        setError(pinRes.message || "Could not set your PIN. Please try again.");
        setSaving(false);
        return;
      }

      const updated = {
        ...currentUser,
        full_name: fullName.trim(),
        phone_number: fullPhone,
        address: address,
        interests: interests.join(","),
        has_pin: true,
      };
      sessionStorage.setItem("currentUser", JSON.stringify(updated));

      // New accounts are auto-activated on the free Basic plan (see
      // Investor.createAccount), so go straight to the investor home — the
      // risk-assessment prompt shows there. Subscription page is still
      // reachable later for anyone who wants to upgrade to Premium.
      navigate("/investor");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const pinBoxStyle = (val, err) => ({
    height: 58,
    fontSize: 30,
    letterSpacing: "16px",
    textAlign: "center",
    borderRadius: 14,
    border: err ? "1.5px solid #ef4444" : "1px solid #d1d5db",
    background: "#F8FAFC",
    color: "#0F172A",
    outline: "none",
    width: "100%",
    fontFamily: "monospace",
  });

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
          borderRadius: 24,
          padding: "clamp(20px, 5vw, 36px) clamp(18px, 5vw, 28px)",
          border: "1px solid rgba(11,29,79,0.25)",
          boxShadow: "0 20px 45px rgba(15,23,42,0.12)",
        }}
      >
        <StepDots step={step} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(22px, 6vw, 28px)", color: "#0B1D4F", fontFamily: "'DM Mono', monospace" }}>
                  Welcome, {currentUser.username}! 👋
                </h1>
                <p className="text-[14px]" style={{ color: "#5B6C88" }}>
                  Let's set up your profile before you start trading.
                </p>
              </div>

              <div className="flex flex-col gap-4">
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
                    style={{ height: 48 }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[13px] text-gray-600 pl-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="rounded-[14px] border border-gray-300 bg-white px-2 text-[14px] text-gray-800 focus:outline-none"
                      style={{ height: 48, maxWidth: 150 }}
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={`${c.iso}-${c.code}`} value={c.code}>
                          {c.iso} {c.code}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      placeholder="9123 4567"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setError(""); }}
                      className={inputCls}
                      style={{ height: 48 }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[13px] text-gray-600 pl-1">City</label>
                  <input
                    type="text"
                    placeholder="e.g. Singapore"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={inputCls}
                    style={{ height: 48 }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[13px] text-gray-600 pl-1">Country *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputCls}
                    style={{ height: 48, color: country ? "#1f2937" : "#9ca3af" }}
                  >
                    <option value="">Select your country…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c.iso + c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

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
                            minHeight: 44,
                          }}
                        >
                          {active ? "✓ " : ""}{s}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-red-500 text-[13px] font-medium">{error}</p>}

                <button
                  onClick={nextFromInfo}
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all"
                  style={{ height: 54, background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
                >
                  Continue →
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="setpin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(20px, 5.5vw, 26px)", color: "#0B1D4F", fontFamily: "'DM Mono', monospace" }}>
                  Create a transaction PIN
                </h1>
                <p className="text-[14px]" style={{ color: "#5B6C88" }}>
                  You'll enter this 6-digit PIN to confirm every buy, sell and cash-out.
                </p>
              </div>

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                style={pinBoxStyle(pin, error)}
              />

              {error && <p className="text-red-500 text-[13px] font-medium mt-3">{error}</p>}

              <button
                onClick={nextFromPin}
                disabled={pin.length !== 6}
                className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-5 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
                style={{ height: 54, background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
              >
                Continue →
              </button>
              <button
                type="button"
                onClick={() => { setStep(0); setError(""); }}
                className="w-full text-gray-400 text-[14px] mt-2 hover:text-gray-600"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="confirmpin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <h1 className="font-bold leading-tight mb-2" style={{ fontSize: "clamp(20px, 5.5vw, 26px)", color: "#0B1D4F", fontFamily: "'DM Mono', monospace" }}>
                  Confirm your PIN
                </h1>
                <p className="text-[14px]" style={{ color: "#5B6C88" }}>
                  Re-enter the 6-digit PIN to make sure it matches.
                </p>
              </div>

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="••••••"
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                style={pinBoxStyle(confirmPin, error)}
              />

              {error && <p className="text-red-500 text-[13px] font-medium mt-3">{error}</p>}

              <button
                onClick={handleFinish}
                disabled={saving || confirmPin.length !== 6}
                className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-5 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
                style={{ height: 54, background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
              >
                {saving ? "Setting up…" : "Finish setup →"}
              </button>
              <button
                type="button"
                onClick={() => { setStep(1); setConfirmPin(""); setError(""); }}
                disabled={saving}
                className="w-full text-gray-400 text-[14px] mt-2 hover:text-gray-600"
              >
                ← Back
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
