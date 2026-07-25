import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { User } from "lucide-react";
import { lookupAccount, requestPasswordResetOtp, verifyPasswordResetOtp, resetPassword } from "../../api/userApi";

const inputStyle = {
  height: "40px",
  borderColor: "rgba(0,0,0,0.15)",
};

function focusStyle(e) {
  e.target.style.borderColor = "#00A9C4";
  e.target.style.boxShadow = "0 0 0 3px rgba(0,211,242,0.18)";
}

function blurStyle(e) {
  e.target.style.borderColor = "rgba(0,0,0,0.15)";
  e.target.style.boxShadow = "none";
}

function maskEmail(email) {
  if (!email) return "";
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return user[0] + "***@" + domain;
}

function Stepper({ current }) {
  const steps = ["Email", "Profile", "Verify", "Password"];
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${i + 1 <= current
                  ? "border-[#00D3F2] text-[#004450]"
                  : "bg-white border-gray-300 text-gray-400"
                }`}
              style={i + 1 <= current ? { background: "#00D3F2" } : undefined}
            >
              {i + 1}
            </div>
            <span className="text-[11px] mt-1 text-gray-500">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 border-t-2 border-dashed mb-4 mx-1 transition-all ${current > i + 1 ? "border-[#00D3F2]" : "border-gray-300"
                }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || "");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [profile, setProfile] = useState({ username: null, full_name: null });

  const passwordRules = {
    length: (p) => p.length >= 8 && p.length <= 24,
    letter: (p) => /[a-zA-Z]/.test(p),
    number: (p) => /[0-9]/.test(p),
  };
  const passwordValid = Object.values(passwordRules).every((fn) => fn(newPassword));

  const stepIndex = { email: 1, preview: 2, otp: 3, password: 4 };

  // Step 1: look up account — show profile card or error
  const handleLookup = async (e) => {
    e.preventDefault();
    setEmailError("");
    setLoading(true);
    try {
      const result = await lookupAccount(email.trim().toLowerCase());
      if (!result.success) {
        setEmailError(result.message || "No account found with this email address.");
        return;
      }
      setProfile({ username: result.username, full_name: result.full_name });
      setStep("preview");
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: user confirms profile — send OTP
  const handleConfirmProfile = async () => {
    setLoading(true);
    try {
      const result = await requestPasswordResetOtp(email.trim().toLowerCase());
      if (!result.success) {
        alert(result.message || "Failed to send code");
        return;
      }
      setStep("otp");
    } catch {
      alert("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await verifyPasswordResetOtp(email.trim().toLowerCase(), otpCode.trim());
      if (!result.success) {
        alert(result.message || "Invalid or expired code");
        return;
      }
      setStep("password");
    } catch {
      alert("Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  // Step 4: set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordValid) {
      alert("Password does not meet the requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(email.trim().toLowerCase(), otpCode.trim(), newPassword);
      if (!result.success) {
        alert(result.message || "Failed to reset password");
        return;
      }
      alert("Password reset successfully. Please log in with your new password.");
      navigate("/login");
    } catch {
      alert("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    email: "Reset Password",
    preview: "Is this your account?",
    otp: "Enter Verification Code",
    password: "Set New Password",
  };

  const subtitles = {
    email: "Enter your account email to get started",
    preview: "Confirm this is the account you want to reset",
    otp: `We've sent a 6-digit code to ${maskEmail(email)}`,
    password: "Choose a strong new password for your account",
  };

  const displayName = profile.full_name || profile.username || "Your Account";

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Header />
      <main
        className="flex-1 flex items-center justify-center px-4 md:px-12 lg:px-16 py-10"
        style={{ background: "linear-gradient(to bottom, rgba(0,211,242,0.10) 0%, #F8FAFC 45%, #F8FAFC 100%)" }}
      >
        <div
          className="w-full max-w-115 flex flex-col justify-center"
          style={{
            borderRadius: "28px", minHeight: "500px", padding: "36px 32px",
            background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)",
            boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
          }}
        >
          <div className="text-center">
            <h1 className="font-bold text-black leading-[1.1] text-3xl md:text-[40px]">
              {titles[step]}
            </h1>
            <p className="text-black mt-2 mb-8 text-base md:text-[18px]" style={{ marginTop: "8px", marginBottom: "36px" }}>
              {subtitles[step]}
            </p>
          </div>

          <Stepper current={stepIndex[step]} />

          {/* Step 1 — Email */}
          {step === "email" && (
            <form onSubmit={handleLookup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  required
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={{ ...inputStyle, borderColor: emailError ? "#ef4444" : "rgba(0,0,0,0.15)" }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                {emailError && (
                  <p className="text-[13px] pl-1 mt-1" style={{ color: "#ef4444" }}>{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                style={{ height: "54px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </form>
          )}

          {/* Step 2 — Profile preview */}
          {step === "preview" && (
            <div className="flex flex-col gap-5">
              {/* Profile card */}
              <div
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{ background: "rgba(0,211,242,0.08)", border: "1px solid rgba(0,211,242,0.25)" }}
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: "56px", height: "56px", borderRadius: "50%",
                    background: "#00D3F2",
                  }}
                >
                  <User size={26} color="#004450" />
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-[17px]">{displayName}</p>
                  <p className="text-gray-500 text-[13px] mt-0.5">{maskEmail(email)}</p>
                </div>
              </div>

              <button
                onClick={handleConfirmProfile}
                disabled={loading}
                className="w-full font-semibold text-[16px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                style={{ height: "54px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}
              >
                {loading ? "Sending code..." : "This is my account — Send Code"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setProfile({ username: null, full_name: null }); }}
                className="text-[14px] hover:underline cursor-pointer text-center"
                style={{ color: "#00A9C4" }}
              >
                Not my account — try a different email
              </button>
            </div>
          )}

          {/* Step 3 — OTP */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition tracking-widest"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                style={{ height: "54px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <button
                type="button"
                onClick={handleConfirmProfile}
                className="text-[14px] hover:underline cursor-pointer text-center"
                style={{ color: "#00A9C4" }}
              >
                Resend code
              </button>
            </form>
          )}

          {/* Step 4 — New password */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
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
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                style={{ height: "54px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}
              >
                {loading ? "Saving..." : "Reset Password"}
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-center text-sm text-gray-700 mt-3 cursor-pointer"
          >
            Back to{" "}
            <span className="font-semibold" style={{ color: "#00A9C4" }}>Login</span>
          </button>
        </div>
      </main>
    </motion.div>
  );
}

export default ResetPasswordPage;
