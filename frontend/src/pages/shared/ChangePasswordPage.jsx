import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { changePassword } from "../../api/userApi.js";
import { getPageBackground, getAvatarGradient } from "../../utils/userRole.js";

/* ─── Design tokens (match InvestorProfilePage) ──────────────── */
const HEADING = "#0B1D4F";
const TEXT_BODY = "#0F172A";
const TEXT_MUTED = "#33477A";
const TEXT_MUTED2 = "#5B6C88";
const CARD_BG = "#FFFFFF";
const CARD_BORDER = "rgba(11,29,79,0.25)";
const CARD_SHADOW = "0 4px 20px rgba(15,23,42,0.06)";

function focusStyle(e) {
  e.target.style.border = "1px solid rgba(0,211,243,0.6)";
  e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.15)";
}

function blurStyle(e) {
  e.target.style.border = "1px solid rgba(15,23,42,0.15)";
  e.target.style.boxShadow = "none";
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={{ fontSize: "12px", fontWeight: 600, color: TEXT_MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          style={{
            height: "44px", borderRadius: "10px",
            border: "1px solid rgba(15,23,42,0.15)",
            padding: "0 44px 0 14px",
            fontSize: "14px", color: TEXT_BODY,
            background: "#F8FAFC",
            width: "100%", outline: "none", transition: "all 0.15s",
          }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", color: TEXT_MUTED2, cursor: "pointer" }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = {
    length: (p) => p.length >= 8 && p.length <= 24,
    letter: (p) => /[a-zA-Z]/.test(p),
    number: (p) => /[0-9]/.test(p),
  };
  const passwordValid = Object.values(passwordRules).every((fn) => fn(newPassword));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!passwordValid) {
      setError("Password does not meet the requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from your current password.");
      return;
    }

    setLoading(true);
    try {
      // Current password is verified server-side. (Client-side reauthenticate
      // starts a new Firebase session, which invalidates the MFA session and
      // makes the backend reject the request.)
      const result = await changePassword(currentPassword, newPassword);
      if (!result.success) {
        setError(result.message || result.detail?.message || "Failed to change password.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        background: getPageBackground(),
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GeneralHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[460px]">
          <div
            style={{
              width: "100%",
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: "24px",
              padding: "36px 28px",
              boxShadow: CARD_SHADOW,
            }}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="flex items-center justify-center mb-4"
                style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: getAvatarGradient(),
                }}
              >
                <Lock size={26} color="#fff" />
              </div>
              <h1 className="leading-tight text-center" style={{ fontSize: 24, fontWeight: 700, color: HEADING }}>
                Change Password
              </h1>
              <p style={{ fontSize: "13px", color: TEXT_MUTED2, marginTop: "4px" }} className="text-center">
                Enter your current password to set a new one
              </p>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "rgba(34,197,94,0.12)", border: "2px solid #22c55e",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>✓</span>
                </div>
                <p className="font-semibold text-[16px] text-center" style={{ color: "#0F9D58" }}>
                  Password changed successfully!
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full text-white font-semibold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  style={{
                    height: "44px", borderRadius: "10px", marginTop: "8px",
                    backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)",
                    boxShadow: "0 8px 18px rgba(0,146,184,0.25)",
                  }}
                >
                  Go Back
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <PasswordField
                  label="Current Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter your current password"
                />
                <div className="flex flex-col gap-1">
                  <PasswordField
                    label="New Password"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="Enter new password"
                  />
                  {newPassword.length > 0 && (
                    <div className="mt-1 flex flex-col gap-1">
                      {[
                        { key: "length", label: "8–24 characters" },
                        { key: "letter", label: "At least one letter" },
                        { key: "number", label: "At least one number" },
                      ].map(({ key, label }) => {
                        const passed = passwordRules[key](newPassword);
                        return (
                          <span key={key} className="flex items-center gap-1.5 text-[12px]" style={{ color: passed ? "#0F9D58" : "#DC2626" }}>
                            <span>{passed ? "✓" : "✗"}</span>{label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
                <PasswordField
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password"
                />

                {error && (
                  <p className="text-[13px] text-center -mt-2" style={{ color: "#DC2626" }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold text-[14px] hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
                  style={{
                    height: "44px", borderRadius: "10px",
                    backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)",
                    boxShadow: "0 8px 18px rgba(0,146,184,0.25)",
                  }}
                >
                  {loading ? "Updating..." : "Change Password"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full flex items-center justify-center gap-2 font-medium text-[13px] hover:opacity-70 transition-opacity cursor-pointer"
                  style={{ color: TEXT_MUTED2 }}
                >
                  <ArrowLeft size={15} /> Back
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

export default ChangePasswordPage;
