import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { firebaseLogin } from "../../api/userApi";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import image1 from "../../images/image1.png";

function ImageStockMarketTradingCharts() {
  return (
    <div className="flex flex-col gap-6 w-full">

      {/* Image */}
      <div className="relative w-full h-64 lg:h-[400px] overflow-hidden">
        <img alt="" src={image1} className="absolute inset-0 w-full h-full object-cover rounded-[30px]" />
        <div className="absolute inset-0 bg-black/35 rounded-[30px]" />
        <div className="absolute bottom-8 left-8 right-8 text-white z-10">
          <h1 className="text-lg font-bold leading-tight mb-2">
            Smart Trading Starts Here
          </h1>
          <p className="text-sm text-gray-200 leading-relaxed">
            Join thousands of investors leveraging data-driven insights to
            grow their portfolios.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="flex gap-3 lg:gap-5 w-full">
        {[
          { value: "50K+", label: "Active Users" },
          { value: "2M+", label: "Daily Trades" },
          { value: "18.4%", label: "Avg. Return" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-4 lg:p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer"
          >
            <h2 className="text-cyan-400 text-2xl lg:text-4xl font-bold mb-1 lg:mb-2">{stat.value}</h2>
            <p className="text-gray-300 text-sm lg:text-lg">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, formData.email.trim(), formData.password);
      const result = await firebaseLogin(formData.email.trim());
      if (!result.success) {
        alert(result.message || "Failed to load user profile");
        return;
      }
      localStorage.setItem("currentUser", JSON.stringify(result.user));
      const role = result.user.role;
      if (role === "investor") navigate("/investor/edit-profile");
      else if (role === "expert") navigate("/expert/edit-profile");
      else if (role === "admin") navigate("/adminpanel");
      else alert("Unknown role: " + role);
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        alert("Incorrect email or password.");
      } else if (error.code === "auth/user-not-found") {
        alert("No account found with this email.");
      } else if (error.code === "auth/too-many-requests") {
        alert("Too many failed attempts. Try again later.");
      } else {
        console.error(error);
        alert("Failed to login");
      }
    }
  };

  const inputStyle = {
    height: "40px",
    borderColor: "rgba(0,0,0,0.15)",
  };

  const focusStyle = (e) => {
    e.target.style.borderColor = "#0092b8";
    e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
  };
  const blurStyle = (e) => {
    e.target.style.borderColor = "rgba(0,0,0,0.15)";
    e.target.style.boxShadow = "none";
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 md:px-12 lg:px-24 py-10">
        <div className="flex flex-col md:flex-row md:items-center gap-8 lg:gap-16 max-w-7xl w-full">

          {/* Form Card */}
          <div
            className="bg-[rgba(255,255,255,0.82)] w-full md:max-w-[460px] md:shrink-0 flex flex-col justify-center"
            style={{ borderRadius: "30px", minHeight: "500px", padding: "30px 20px", backdropFilter: "blur(16px)" }}
          >
            <div className="text-center">
              <h1 className="font-bold text-black leading-[1.1] text-3xl md:text-[40px]">
                Welcome Back
              </h1>
              <p className="text-black mt-2 mb-8 text-base md:text-[20px]" style={{ marginTop: "8px", marginBottom: "36px" }}>
                Log in to your Deskstock account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-[14px] text-gray-700 pl-1">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Password</label>
                  <label
                    className="text-blue-700 text-[14px] cursor-pointer"
                    onClick={() => navigate("/reset-password")}
                  >
                    Forget password?
                  </label>
                </div>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  required
                  className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                style={{ height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
              >
                Sign In
              </button>
            </form>

            <button
              type="button"
              onClick={() => navigate("/register")}
              className="w-full font-semibold text-white text-[16px] leading-6 cursor-pointer mt-3"
              style={{
                height: "52px",
                borderRadius: "12px",
                backgroundImage: "linear-gradient(174.015deg, rgb(2,6,24) 0%, rgb(22,36,86) 50%, rgb(15,23,43) 100%)",
                boxShadow: "0px 10px 10px rgba(0,184,219,0.3)",
              }}
            >
              Create Account
            </button>
          </div>

          {/* Image — hidden on mobile */}
          <div className="hidden md:flex flex-1 justify-center lg:justify-end">
            <div className="w-full max-w-[500px]">
              <ImageStockMarketTradingCharts />
            </div>
          </div>

        </div>
      </main>
    </motion.div>
  );
}

export default LoginPage;
