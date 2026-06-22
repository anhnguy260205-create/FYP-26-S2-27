import Footer from "../../layout/Footer.jsx";
import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { verifyPasswordResetOtp, resetPassword, requestPasswordResetOtp } from "../../api/userApi";



const inputStyle = {
  height: "40px",
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

function Stepper({ current }) {
  const steps = ["Email", "Verify", "Password"];
  return (
    <div className="flex items-center mb-8">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${i + 1 <= current
                ? "bg-orange-500 border-orange-500 text-white"
                : "bg-white border-gray-300 text-gray-400"
                }`}
            >
              {i + 1}
            </div>
            <span className="text-[11px] mt-1 text-gray-500">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 border-t-2 border-dashed mb-4 mx-1 transition-all ${current > i + 1 ? "border-orange-500" : "border-white"}`} />
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
  const [step, setStep] = useState(location.state?.email ? "otp" : "email");
  const [loading, setLoading] = useState(false);

  const stepIndex = { email: 1, otp: 2, password: 3 };

  // Step 0: if user lands here directly without email, ask for it first
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await requestPasswordResetOtp(email.trim().toLowerCase());
      if (!result.success) {
        alert(result.message || "Failed to send code");
        return;
      }
      setStep("otp");
    } catch (error) {
      console.error(error);
      alert("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: verify OTP
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
    } catch (error) {
      console.error(error);
      alert("Failed to verify code");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
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
    } catch (error) {
      console.error(error);
      alert("Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const titles = {
    email: "Reset Password",
    otp: "Enter Verification Code",
    password: "Set New Password",
  };

  const subtitles = {
    email: "Enter your account email to receive a reset code",
    otp: `We've sent a 6-digit code to ${email || "your email"}`,
    password: "Choose a strong new password for your account",
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}>

      <Header />
      <main className="flex justify-center p-7.5">
        <div className="flex items-center justify-center min-h-screen px-24" style={{ marginTop: "-80px", paddingBottom: "-80px" }}>
          <div className="flex flex-row items-center gap-30 max-w-7xl w-full">
            {/* Form Card */}
            <div
              className="bg-[rgba(255,255,255,0.82)] w-175 shrink-0 flex flex-col justify-center"
              style={{ borderRadius: "30px", minHeight: "500px", padding: "30px 20px", backdropFilter: "blur(16px)", }}>


              <div className="text-center">
                <h1
                  className="font-bold text-black leading-[1.1]"
                  style={{ fontSize: "40px" }}
                >
                  {titles[step]}
                </h1>
                <p
                  className="text-black mt-2 mb-8"
                  style={{ fontSize: "20px", marginTop: "8px", marginBottom: "36px" }}
                >
                  {subtitles[step]}
                </p>
              </div>

              <Stepper current={stepIndex[step]} />
              {step === "email" && (
                <form onSubmit={handleRequestOtp} className="flex flex-col gap-5">

                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-[14px] text-gray-700 pl-1">Email Address</label>
                    <input
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                    style={{
                      height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                    }}>
                    {loading ? "Sending..." : "Send Verification Code"}
                  </button>
                </form>
              )}

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
                    className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                    style={{
                      height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                    }}>
                    {loading ? "Verifying..." : "Verify Code"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    className="text-blue-700 text-[14px] hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                </form>
              )}

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
                      minLength={6}
                      className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                      style={inputStyle}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
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
                    className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                    style={{
                      height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                    }}>
                    {loading ? "Saving..." : "Reset Password"}
                  </button>
                </form>
              )}

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full font-semibold text-white text-[16px] leading-6 cursor-pointer"
                style={{
                  height: "52px",
                  borderRadius: "12px",
                  backgroundImage: "linear-gradient(174.015deg, rgb(2,6,24) 0%, rgb(22,36,86) 50%, rgb(15,23,43) 100%)",
                  boxShadow: "0px 10px 10px rgba(0,184,219,0.3)",
                  marginTop: "12px"
                }}
              >
                Back to Login
              </button>
            </div>

          </div>
        </div>
      </main>
    </motion.div>
  );
}

export default ResetPasswordPage;
