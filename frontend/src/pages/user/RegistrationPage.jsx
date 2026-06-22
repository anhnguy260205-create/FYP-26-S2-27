import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { motion } from "framer-motion";
import { createAccount } from "../../api/userApi";
import image1 from "../../images/image1.png";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

function ImageStockMarketTradingCharts() {
  return (
    <div className="flex flex-col gap-6">
      <div className="relative w-125 h-100 overflow-hidden" data-name="Image (Stock market trading charts)">
        <img alt="" src={image1} className="absolute inset-0 w-full h-full object-cover rounded-[30px]" />
        <div className="absolute inset-0 bg-black/35 rounded-[30px]" />
        <div className="absolute bottom-10 left-10 right-10 text-white z-10">
          <h1 className="text-4 font-bold leading-tight mb-4">Smart Trading Starts Here</h1>
          <p className="text-2 text-gray-200 leading-relaxed">
            Join thousands of investors leveraging data-driven insights to grow their portfolios.
          </p>
        </div>
      </div>

      <div className="flex gap-5 w-125">
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">50K+</h2>
          <p className="text-gray-300 text-lg">Active Users</p>
        </div>
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">2M+</h2>
          <p className="text-gray-300 text-lg">Daily Trades</p>
        </div>
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">18.4%</h2>
          <p className="text-gray-300 text-lg">Avg. Return</p>
        </div>
      </div>
    </div>
  );
}

function RegistrationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    accountType: "",

  });


  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const passwordRules = {
    length: (p) => p.length >= 8 && p.length <= 24,
    letter: (p) => /[a-zA-Z]/.test(p),
    number: (p) => /[0-9]/.test(p),
    special: (p) => /[^a-zA-Z0-9]/.test(p),
  };

  const passwordValid = Object.values(passwordRules).every((fn) => fn(formData.password));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      alert("Username cannot be empty.");
      return;
    }

    if (!formData.accountType) {
      alert("Please select an account type (Investor or Expert).");
      return;
    }

    if (!passwordValid) {
      alert("Password does not meet the requirements.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // 1. Firebase creates the auth account and secures the password
      const cleanEmail = formData.email.trim().toLowerCase();
      const firebaseUser = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);

      // 2. Backend creates the profile
      const payload = {
        role: formData.accountType,
        username: formData.username.trim(),
        email_address: cleanEmail,
      };

      const result = await createAccount(payload);
      if (!result.success) {
        await firebaseUser.user.delete();// rollback Firebase if the backend is failed
        alert(result.message || "Account already exists");
        return;
      }

      navigate("/login");

    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        alert("This email is already registered.");
      } else if (error.code === "auth/weak-password") {
        alert("Password must be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please enter a valid email address.");
      } else {
        console.error(error);
        alert("Failed to create account");
      }
    }
  };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}>

      <Header />
      <main className="flex-1 p-7.5">
        <div className="flex items-center justify-center min-h-screen px-24">
          <div className="flex flex-row items-center gap-30 max-w-7xl w-full">

            {/* Form Card */}
            <div
              className="bg-[rgba(255,255,255,0.82)] w-175 shrink-0 flex flex-col justify-center"
              style={{ borderRadius: "30px", minHeight: "500px", padding: "30px 20px", backdropFilter: "blur(16px)" }}>

              <div className="text-center">
                <h1 className="font-bold text-black leading-[1.1]" style={{ fontSize: "40px" }}>
                  Open an account
                </h1>
                <p className="text-black mt-2 mb-8" style={{ fontSize: "20px", marginTop: "8px", marginBottom: "36px" }}>
                  Let's Trade with RocketTrading
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                {/* Username */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Username</label>
                  <input
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    required
                    className="w-full rounded-[14px] border bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{ height: "40px", borderColor: "rgba(0,0,0,0.15)" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0092b8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                    className="w-full rounded-[14px] border bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{ height: "40px", borderColor: "rgba(0,0,0,0.15)" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0092b8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{ height: "40px", borderColor: "rgba(0,0,0,0.15)" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0092b8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; }}
                  />
                  {/* Live password requirements */}
                  {formData.password.length > 0 && (
                    <div className="mt-2 flex flex-col gap-1 pl-1">
                      {[
                        { key: "length", label: "8–24 characters" },
                        { key: "letter", label: "At least one letter" },
                        { key: "number", label: "At least one number" },
                        { key: "special", label: "At least one special character" },
                      ].map(({ key, label }) => {
                        const passed = passwordRules[key](formData.password);
                        return (
                          <span key={key} className="flex items-center gap-1.5 text-[12px]" style={{ color: passed ? "#16a34a" : "#dc2626" }}>
                            <span>{passed ? "✓" : "✗"}</span>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{ height: "40px", borderColor: "rgba(0,0,0,0.15)" }}
                    onFocus={(e) => { e.target.style.borderColor = "#0092b8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>

                {/* Account Type */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "investor", label: "Investor", desc: "Grow my portfolio" },
                      { value: "expert", label: "Expert", desc: "Provide trading insights" },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => handleChange("accountType", type.value)}
                        className="flex flex-col items-start px-5 py-4 rounded-[14px] border-2 transition-all text-left"
                        style={{
                          borderColor: formData.accountType === type.value ? "#0092b8" : "rgba(0,0,0,0.12)",
                          background: formData.accountType === type.value ? "rgba(0,146,184,0.06)" : "white",
                        }}
                      >
                        <span className="font-semibold text-[14px]" style={{ color: formData.accountType === type.value ? "#0092b8" : "#1f2937" }}>
                          {type.label}
                        </span>
                        <span className="text-[12px] text-gray-500 mt-0.5">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>


                {/* Terms */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="mt-1 w-4 h-4 rounded border-blue-900/30 bg-slate-900/50 text-cyan-500 focus:ring-cyan-500"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-600">
                    I acknowledge that I have read, understood, and agree to RocketTrade's{' '}
                    <a href="#" className="text-blue-500 hover:text-blue-500 transition-colors">Terms and Conditions</a>
                    {' '}and{' '}
                    <a href="#" className="text-blue-500 hover:text-blue-500 transition-colors">Privacy Policy</a>
                  </label>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  style={{ height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}>
                  Create Account
                </button>
              </form>

              {/* Sign In Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-400">
                  Already have an account?{' '}
                  <a href="/login" className="text-blue-500 hover:text-blue-600 transition-colors font-semibold">Sign In</a>
                </p>
              </div>
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

export default RegistrationPage;
