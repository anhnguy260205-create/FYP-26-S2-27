import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setTransactionPin, updateUserInformation } from "../api/userApi";
import { COUNTRY_CODES, DEFAULT_COUNTRY_CODE, COUNTRIES, joinAddress, splitAddress } from "../utils/countryCodes";


export default function ForceAccountSetupModal({ open, needsInfo, needsPin, user, onDone }) {
  const initialPhase = needsInfo ? "info" : "pin";
  const [phase, setPhase] = useState(initialPhase); // "info" | "pin" | "confirm"

  // Personal info
  const existing = splitAddress(user?.address || "");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [dialCode, setDialCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState(existing.city || "");
  const [country, setCountry] = useState(existing.country || "");

  // PIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pinRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPhase(needsInfo ? "info" : "pin");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && (phase === "pin" || phase === "confirm")) {
      setTimeout(() => pinRef.current?.focus(), 60);
    }
  }, [phase, open]);

  const saveInfo = async () => {
    if (!fullName.trim()) return setError("Please enter your full name.");
    if (!phone.trim()) return setError("Please enter your phone number.");
    if (!country) return setError("Please select your country.");
    setSaving(true);
    setError("");
    try {
      const fullPhone = `${dialCode} ${phone.trim()}`;
      const address = joinAddress(city, country);
      const res = await updateUserInformation(
        user.user_id,
        user.username,
        fullName.trim(),
        user.email_address,
        fullPhone,
        address
      );
      if (res && res.success === false) {
        setError(res.message || "Could not save your details. Please try again.");
        return;
      }
      try {
        const u = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
        u.full_name = fullName.trim();
        u.phone_number = fullPhone;
        u.address = address;
        sessionStorage.setItem("currentUser", JSON.stringify(u));
      } catch { /* ignore */ }
      if (needsPin) { setPhase("pin"); } else { onDone?.(); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const nextPin = () => {
    if (pin.length !== 6) return setError("PIN must be exactly 6 digits.");
    setError("");
    setPhase("confirm");
  };

  const savePin = async () => {
    if (confirmPin.length !== 6) return setError("Please re-enter your 6-digit PIN.");
    if (pin !== confirmPin) {
      setError("PINs do not match. Please try again.");
      setConfirmPin(""); setPin(""); setPhase("pin");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await setTransactionPin(pin, confirmPin);
      if (!res.success) { setError(res.message || "Could not set your PIN."); return; }
      try {
        const u = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
        u.has_pin = true;
        sessionStorage.setItem("currentUser", JSON.stringify(u));
      } catch { /* ignore */ }
      onDone?.();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = {
    width: "100%", height: 46, padding: "0 12px", borderRadius: 12,
    border: "1px solid #d1d5db", background: "#F8FAFC", color: "#0F172A",
    fontSize: 15, outline: "none",
  };
  const label = { fontSize: 12, fontWeight: 600, color: "#5B6C88", margin: "0 0 6px", display: "block" };
  const pinBox = {
    height: 60, width: "100%", textAlign: "center", fontFamily: "monospace",
    fontSize: 30, letterSpacing: "16px", borderRadius: 14,
    border: error ? "1.5px solid #ef4444" : "1px solid #d1d5db",
    background: "#F8FAFC", color: "#0F172A", outline: "none",
  };
  const primaryBtn = (disabled) => ({
    width: "100%", height: 50, marginTop: 22, borderRadius: 14, border: "none",
    fontSize: 15, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "#94A3B8" : "#00D3F2", color: "#004450",
  });

  const totalSteps = (needsInfo ? 1 : 0) + (needsPin ? 1 : 0);
  const currentStep = phase === "info" ? 1 : (needsInfo ? 2 : 1);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1100] flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.75)", backdropFilter: "blur(3px)" }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            style={{
              background: "#fff", borderRadius: 20, padding: "30px 28px",
              width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(15,23,42,0.35)",
              maxHeight: "90vh", overflowY: "auto",
            }}
          >
            {totalSteps > 1 && (
              <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", marginBottom: 8, letterSpacing: "0.08em" }}>
                STEP {currentStep} OF {totalSteps}
              </p>
            )}

            {phase === "info" && (
              <>
                <div style={{ fontSize: 26, marginBottom: 8 }}>📇</div>
                <h2 style={{ fontSize: 21, fontWeight: 700, color: "#0B1D4F", marginBottom: 6 }}>
                  Complete your profile
                </h2>
                <p style={{ fontSize: 13, color: "#5B6C88", marginBottom: 20, lineHeight: 1.5 }}>
                  A few details are now required before you continue.
                </p>

                <label style={label}>Full name *</label>
                <input style={field} value={fullName} placeholder="Your full name"
                  onChange={(e) => { setFullName(e.target.value); setError(""); }} />

                <label style={{ ...label, marginTop: 14 }}>Phone number *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select
                    value={dialCode}
                    onChange={(e) => setDialCode(e.target.value)}
                    style={{ ...field, width: 120, flex: "0 0 120px" }}
                  >
                    {COUNTRY_CODES.map((c, i) => (
                      <option key={`${c.iso}-${i}`} value={c.code}>{c.iso} {c.code}</option>
                    ))}
                  </select>
                  <input style={{ ...field, flex: 1 }} value={phone} placeholder="9123 4567" type="tel"
                    onChange={(e) => { setPhone(e.target.value); setError(""); }} />
                </div>

                <label style={{ ...label, marginTop: 14 }}>City</label>
                <input style={field} value={city} placeholder="e.g. Singapore"
                  onChange={(e) => setCity(e.target.value)} />

                <label style={{ ...label, marginTop: 14 }}>Country *</label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setError(""); }}
                  style={{ ...field, color: country ? "#0F172A" : "#94A3B8" }}
                >
                  <option value="">Select your country…</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.iso + c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>

                {error && <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, marginTop: 10 }}>{error}</p>}
                <button type="button" onClick={saveInfo} disabled={saving} style={primaryBtn(saving)}>
                  {saving ? "Saving…" : (needsPin ? "Continue" : "Save & Continue")}
                </button>
              </>
            )}

            {phase === "pin" && (
              <>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🔐</div>
                <h2 style={{ fontSize: 21, fontWeight: 700, color: "#0B1D4F", marginBottom: 6 }}>
                  Set your transaction PIN
                </h2>
                <p style={{ fontSize: 13, color: "#5B6C88", marginBottom: 22, lineHeight: 1.5 }}>
                  A 6-digit PIN is required to buy, sell and cash out. Set it once to continue.
                </p>
                <input
                  ref={pinRef} type="password" inputMode="numeric" maxLength={6} value={pin}
                  placeholder="••••••" style={pinBox}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 6) nextPin(); }}
                />
                {error && <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, marginTop: 8 }}>{error}</p>}
                <button type="button" onClick={nextPin} disabled={pin.length !== 6} style={primaryBtn(pin.length !== 6)}>
                  Continue
                </button>
              </>
            )}

            {phase === "confirm" && (
              <>
                <div style={{ fontSize: 26, marginBottom: 8 }}>🔐</div>
                <h2 style={{ fontSize: 21, fontWeight: 700, color: "#0B1D4F", marginBottom: 6 }}>
                  Confirm your PIN
                </h2>
                <p style={{ fontSize: 13, color: "#5B6C88", marginBottom: 22, lineHeight: 1.5 }}>
                  Re-enter the same 6-digit PIN to make sure it matches.
                </p>
                <input
                  ref={pinRef} type="password" inputMode="numeric" maxLength={6} value={confirmPin}
                  placeholder="••••••" style={pinBox}
                  onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && confirmPin.length === 6) savePin(); }}
                />
                {error && <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, marginTop: 8 }}>{error}</p>}
                <button type="button" onClick={savePin} disabled={saving || confirmPin.length !== 6} style={primaryBtn(saving || confirmPin.length !== 6)}>
                  {saving ? "Saving…" : "Set PIN"}
                </button>
                <button type="button" onClick={() => { setPhase("pin"); setConfirmPin(""); setError(""); }} disabled={saving}
                  style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#5B6C88", fontSize: 14, cursor: "pointer" }}>
                  Back
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
