import Footer from "../../layout/Footer.jsx";
import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { requestPasswordResetOtp } from "../../api/userApi";
import image1 from "../../images/image1.png";

function ImageStockMarketTradingCharts() {
  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative w-125 h-100 overflow-hidden"
        data-name="Image (Stock market trading charts)"
      >
        <img alt="" src={image1} className="absolute inset-0 w-full h-full object-cover rounded-[30px]" />
        <div className="absolute inset-0 bg-black/35 rounded-[30px]" />
        <div className="absolute bottom-10 left-10 right-10 text-white z-10">
          <h1 className="text-4 font-bold leading-tight mb-4">
            Forgot Your Password?
          </h1>
          <p className="text-2 text-gray-200 leading-relaxed">
            No worries — we'll send a verification code to your email so you
            can get back to trading.
          </p>
        </div>
      </div>
    </div>
  );
}

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

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await requestPasswordResetOtp(email.trim().toLowerCase());

      if (!result.success) {
        alert(result.message || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate("/reset-password", { state: { email: email.trim().toLowerCase() } });
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}>

      <Header />
      <main className="flex-1 p-7.5">
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
                  Forgot Password
                </h1>
                <p
                  className="text-black mt-2 mb-8"
                  style={{ fontSize: "20px", marginTop: "8px", marginBottom: "36px" }}
                >
                  {submitted
                    ? "We've sent a 6-digit code to your email"
                    : "Enter your account email to receive a reset code"}
                </p>
              </div>

              {!submitted ? (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
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
              ) : (
                <div className="flex flex-col gap-5">
                  <div
                    className="rounded-[14px] px-4 py-3 text-[14px] text-gray-700"
                    style={{ background: "rgba(0,146,184,0.08)", border: "1px solid rgba(0,146,184,0.25)" }}
                  >
                    A verification code has been sent to <b>{email}</b>. Please
                    check your inbox (and spam folder).
                  </div>

                  <button
                    type="button"
                    onClick={handleContinue}
                    className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                    style={{
                      height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                    }}>
                    Enter Verification Code
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="text-blue-700 text-[14px] hover:underline cursor-pointer"
                  >
                    Resend code
                  </button>
                </div>
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
            <div className="flex-1 flex justify-end">
              <ImageStockMarketTradingCharts />
            </div>
          </div>
        </div>
      </main>
    </motion.div>
  );
}

export default ForgotPasswordPage;
