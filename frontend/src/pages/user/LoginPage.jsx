import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { firebaseLogin, verifyLoginOtp, resendLoginOtp } from "../../api/userApi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import login from "../../images/login.jpg";

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Email OTP (2nd factor) — backend sends a code for non-admin logins
  const [stage, setStage] = useState("login");   // "login" | "otp"
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [resendMsg, setResendMsg] = useState("");

  const handleChange = (field, value) => {
    setError("");
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goToRole = (user) => {
    sessionStorage.setItem("currentUser", JSON.stringify(user));
    const role = user.role;
    if (role === "investor") {
      const dismissed = localStorage.getItem(`profileSetupDismissed_${user.user_id}`) === "1";
      if (user.first_login) navigate("/investor/subscription");
      else if (!user.full_name && !dismissed) navigate("/investor/update-particular");
      else navigate("/investor");
    }
    else if (role === "expert") navigate(!user.full_name ? "/expert/updateparticular" : "/expert");
    else if (role === "admin") navigate("/adminpanel");
    else setError("Unknown role: " + role);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError("");
    setResendMsg("");
    setLoading(true);
    try {
      const result = await verifyLoginOtp(otp.trim());
      if (!result.success) {
        setOtpError(result.message || "Verification failed");
        return;
      }
      goToRole(result.user);
    } catch {
      setOtpError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpError("");
    setResendMsg("");
    try {
      const result = await resendLoginOtp();
      setResendMsg(result.message || (result.success ? "A new code has been sent." : "Failed to resend."));
    } catch {
      setResendMsg("Failed to resend — please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // 1. Authenticate directly with Firebase.
      // This avoids one extra Render backend request before login.
      await signInWithEmailAndPassword(auth, formData.email.trim().toLowerCase(), formData.password);

      // 2. Load user profile (token set by Firebase; authFetch picks it up automatically)
      const result = await firebaseLogin();
      if (!result.success) {
        setError(result.message || "Failed to load user profile");
        return;
      }
      // Non-admin logins need an email OTP — backend has already sent it
      if (result.mfa_required) {
        setResendMsg(result.message || "We sent a 6-digit verification code to your email.");
        setStage("otp");
        return;
      }
      goToRole(result.user);

    } catch (err) {
      console.error("[LOGIN ERROR]", err.code, err.message, err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error — check your internet connection and try again.");
      } else if (err.message === "Failed to fetch") {
        setError("Cannot reach backend. For local testing, set frontend/.env VITE_API_URL=http://localhost:8000 and restart npm run dev.");
      } else {
        setError(`Login failed (${err.code || err.message || "unknown"}). See browser console for details.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { height: "46px", borderColor: "rgba(0,0,0,0.15)" };
  const focusStyle = (e) => { e.target.style.borderColor = "#00A9C4"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,242,0.18)"; };
  const blurStyle = (e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-white"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
    >
      <Header />
      <main className="flex-1 flex flex-col md:flex-row">

        {/* Form half */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-12 lg:px-16 py-10"
          style={{ background: "linear-gradient(to bottom, rgba(0,211,242,0.10) 0%, #F8FAFC 45%, #F8FAFC 100%)" }}>
          <div className="w-full max-w-115 flex flex-col justify-center"
            style={{
              borderRadius: "28px", minHeight: "500px", padding: "36px 32px",
              background: "#FFFFFF", border: "1px solid rgba(15,23,42,0.08)",
              boxShadow: "0 20px 50px rgba(15,23,42,0.10)",
            }}>

            {stage === "otp" ? (
              <>
                <div className="text-center">
                  <h1 className="font-bold text-black leading-[1.1] text-3xl md:text-[40px]">Verify It's You</h1>
                  <p className="text-black mt-2 mb-8 text-base md:text-[18px]" style={{ marginTop: "8px", marginBottom: "36px" }}>
                    We sent a 6-digit code to <b>{formData.email.trim().toLowerCase()}</b>
                  </p>
                </div>

                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[14px] text-gray-700 pl-1">Verification code</label>
                    <input
                      id="otp" name="otp" type="text" inputMode="numeric" maxLength={6}
                      placeholder="Enter 6-digit code" value={otp} required autoFocus
                      onChange={(e) => { setOtpError(""); setOtp(e.target.value.replace(/\D/g, "")); }}
                      className="w-full rounded-[14px] bg-white px-4 text-[22px] tracking-[8px] text-gray-800 placeholder-gray-400 focus:outline-none transition text-center font-mono"
                      style={{ ...inputStyle, height: "52px", border: otpError ? "1.5px solid #ef4444" : "1px solid #d1d5db" }}
                      onFocus={focusStyle} onBlur={blurStyle}
                    />
                    {otpError && (
                      <p className="text-[13px] font-medium mt-1" style={{ color: "#ef4444" }}>{otpError}</p>
                    )}
                    {resendMsg && (
                      <p className="text-[13px] font-medium mt-1" style={{ color: "#0E7490" }}>{resendMsg}</p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || otp.length !== 6}
                    className="w-full font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ height: "54px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}>
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </button>

                  <div className="flex justify-between text-[14px] px-1">
                    <span className="text-[#00A9C4] font-medium cursor-pointer" onClick={handleResend}>Resend code</span>
                    <span className="text-gray-600 cursor-pointer"
                      onClick={() => { setStage("login"); setOtp(""); setOtpError(""); setResendMsg(""); }}>
                      Back to login
                    </span>
                  </div>
                </form>
              </>
            ) : (
            <>
            <div className="text-center">
              <h1 className="font-bold text-black leading-[1.1] text-3xl md:text-[40px]">Welcome Back</h1>
              <p className="text-black mt-2 mb-8 text-base md:text-[20px]" style={{ marginTop: "8px", marginBottom: "36px" }}>
                Log in to your RocketTrade account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">Email</label>
                <input
                  id="email" name="email"
                  type="email" placeholder="Enter your email"
                  value={formData.email} required autoComplete="email"
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={inputStyle} onFocus={focusStyle} onBlur={blurStyle}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Password</label>
                  <label className="text-[#00A9C4] font-medium text-[14px] cursor-pointer"
                    onClick={() => navigate("/reset-password")}>
                    Forgot password?
                  </label>
                </div>
                <input
                  id="password" name="password"
                  type="password" placeholder="Enter your password"
                  value={formData.password} required autoComplete="current-password"
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="w-full rounded-[14px] bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={{ ...inputStyle, border: error ? "1.5px solid #ef4444" : "1px solid #d1d5db" }}
                  onFocus={focusStyle} onBlur={blurStyle}
                />
                {error && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-[13px] font-medium" style={{ color: "#ef4444" }}>{error}</p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ height: "46px", background: "#00D3F2", color: "#004450", boxShadow: "0px 10px 24px rgba(0,211,242,0.30)" }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-sm text-gray-700 mt-3">
              Don't have an account?{" "}
              <a onClick={() => navigate("/register")} className="text-[#00A9C4] font-semibold cursor-pointer">
                Create Account
              </a>
            </p>
            </>
            )}
          </div>
        </div>

        {/* Image half — full-bleed cover, hidden on mobile */}
        <div className="hidden md:block md:w-1/2 relative overflow-hidden">
          <img alt="" src={login} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
          <div className="absolute bottom-12 left-10 right-10 text-white z-10">
            <h1 className="text-3xl lg:text-4xl font-extrabold leading-tight mb-3 [text-shadow:0_2px_10px_rgba(0,0,0,0.7)]">Smart Trading Starts Here</h1>
            <p className="text-sm lg:text-base font-medium text-gray-100 leading-relaxed [text-shadow:0_1px_6px_rgba(0,0,0,0.7)]">
              Join thousands of investors leveraging data-driven insights to grow their portfolios.
            </p>
          </div>
        </div>
      </main>
    </motion.div>
  );
}

export default LoginPage;
