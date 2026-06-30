import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { auth } from "../../firebase.js";
import { changePassword } from "../../api/userApi.js";

const inputStyle = {
  height: "44px",
  borderColor: "rgba(0,0,0,0.15)",
};

function focusStyle(e) {
  e.target.style.borderColor = "#0092b8";
  e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
}

function blurStyle(e) {
  e.target.style.borderColor = "rgba(0,0,0,0.15)";
  e.target.style.boxShadow = "none";
}

function PasswordField({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-[14px] text-gray-700 pl-1">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full rounded-[14px] border border-gray-300 bg-white px-4 pr-11 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
          style={inputStyle}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
      // Verify current password via Firebase client SDK (most reliable method)
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Current password is incorrect.");
      } else {
        setError("Failed to verify current password. Please try again.");
      }
      setLoading(false);
      return;
    }

    try {
      const result = await changePassword(newPassword);
      if (!result.success) {
        setError(result.message || "Failed to change password.");
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
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[460px]">
          <div
            className="bg-[rgba(255,255,255,0.82)] w-full flex flex-col justify-center"
            style={{ borderRadius: "30px", padding: "36px 28px" }}
          >
            {/* Icon + title */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="flex items-center justify-center mb-4"
                style={{
                  width: "56px", height: "56px", borderRadius: "16px",
                  background: "linear-gradient(135deg,#0092b8,#155dfc)",
                }}
              >
                <Lock size={26} color="#fff" />
              </div>
              <h1 className="font-bold text-black text-[32px] leading-tight text-center">
                Change Password
              </h1>
              <p className="text-gray-500 text-[14px] mt-1 text-center">
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
                <p className="text-green-600 font-semibold text-[16px] text-center">
                  Password changed successfully!
                </p>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-2 hover:opacity-90 transition-all cursor-pointer"
                  style={{
                    height: "52px",
                    background: "linear-gradient(90deg,#0092b8,#155dfc)",
                    boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                  }}
                >
                  Go Back
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                    <div className="mt-1 flex flex-col gap-1 pl-1">
                      {[
                        { key: "length", label: "8–24 characters" },
                        { key: "letter", label: "At least one letter" },
                        { key: "number", label: "At least one number" },
                      ].map(({ key, label }) => {
                        const passed = passwordRules[key](newPassword);
                        return (
                          <span key={key} className="flex items-center gap-1.5 text-[12px]" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
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
                  <p className="text-red-500 text-[13px] text-center -mt-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                  style={{
                    height: "52px",
                    background: "linear-gradient(90deg,#0092b8,#155dfc)",
                    boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                  }}
                >
                  {loading ? "Updating..." : "Change Password"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full flex items-center justify-center gap-2 font-semibold text-gray-500 text-[14px] hover:text-gray-700 transition cursor-pointer mt-1"
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
