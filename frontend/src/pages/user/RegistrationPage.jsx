import Header from "../../layout/Header.jsx";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { createAccount } from "../../api/userApi";
import img from "../../images/image1.png";
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

// reCAPTCHA v2 checkbox — set VITE_RECAPTCHA_SITE_KEY in frontend/.env.
// If unset, the widget is hidden and the backend skips verification (dev mode).
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

function RegistrationPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── reCAPTCHA v2 widget (loads Google script once, renders explicitly) ──
  const recaptchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) return;
    const render = () => {
      if (window.grecaptcha?.render && recaptchaRef.current && widgetIdRef.current === null) {
        widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
        });
      }
    };
    if (window.grecaptcha?.render) {
      render();
      return;
    }
    window.__onRecaptchaLoad = render;
    if (!document.querySelector('script[src*="recaptcha/api.js"]')) {
      const s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?onload=__onRecaptchaLoad&render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  const resetCaptcha = () => {
    if (RECAPTCHA_SITE_KEY && window.grecaptcha && widgetIdRef.current !== null) {
      window.grecaptcha.reset(widgetIdRef.current);
    }
  };

  const passwordRules = {
    length: (p) => p.length >= 8 && p.length <= 24,
    letter: (p) => /[a-zA-Z]/.test(p),
    number: (p) => /[0-9]/.test(p),
  };

  const passwordValid = Object.values(passwordRules).every((fn) => fn(formData.password));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      alert("Username cannot be empty.");
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

    let recaptchaToken = "";
    if (RECAPTCHA_SITE_KEY) {
      recaptchaToken = window.grecaptcha?.getResponse(widgetIdRef.current) || "";
      if (!recaptchaToken) {
        alert("Please tick the \"I'm not a robot\" box.");
        return;
      }
    }

    setLoading(true);
    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const firebaseUser = await createUserWithEmailAndPassword(auth, cleanEmail, formData.password);

      const payload = {
        // Roles are merged — everyone registers as an investor and can later
        // upgrade to expert from within the app.
        role: "investor",
        username: formData.username.trim(),
        email_address: cleanEmail,
        recaptcha_token: recaptchaToken,
      };

      const result = await createAccount(payload);
      if (!result.success) {
        await firebaseUser.user.delete();
        resetCaptcha();
        alert(result.message || "Account already exists");
        return;
      }

      navigate("/login");

    } catch (error) {
      resetCaptcha();
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
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { height: "40px", borderColor: "rgba(0,0,0,0.15)" };
  const focusStyle = (e) => { e.target.style.borderColor = "#0092b8"; e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)"; };
  const blurStyle = (e) => { e.target.style.borderColor = "rgba(0,0,0,0.15)"; e.target.style.boxShadow = "none"; };

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-white text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Header />
      <main className="flex-1 flex flex-col md:flex-row">

        {/* Form half */}
        <div className="flex-1 flex items-center justify-center px-4 md:px-12 lg:px-16 py-10 bg-white">
          <div
            className="bg-[rgba(255,255,255,0.82)] w-full max-w-115 flex flex-col justify-center"
            style={{ borderRadius: "30px", minHeight: "500px", padding: "30px 20px" }}
          >
            <div className="text-center">
              <h1 className="font-bold text-black leading-[1.1] text-3xl md:text-[40px]">
                Open an account
              </h1>
              <p className="text-black mt-2 mb-8 text-base md:text-[20px]" style={{ marginTop: "8px", marginBottom: "36px" }}>
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
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
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
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
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
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
                {formData.password.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 pl-1">
                    {[
                      { key: "length", label: "8–24 characters" },
                      { key: "letter", label: "At least one letter" },
                      { key: "number", label: "At least one number" },
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
                  style={inputStyle}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
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
                  I acknowledge that I have read, understood, and agree to RocketTrade's{" "}
                  <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">Terms and Conditions</a>
                  {" "}and{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 transition-colors">Privacy Policy</a>
                </label>
              </div>

              {/* reCAPTCHA */}
              {RECAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <div ref={recaptchaRef} />
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
              >
                {loading ? "Creating Account…" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{" "}
                <a href="/login" className="text-blue-500 hover:text-blue-600 transition-colors font-semibold">Sign In</a>
              </p>
            </div>
          </div>
        </div>

        {/* Image half — full-bleed cover, sticks in view while the form scrolls, hidden on mobile */}
        <div className="hidden md:block md:w-1/2 md:self-start md:sticky md:top-[60px] md:h-[calc(100vh-60px)] relative overflow-hidden">
          <img alt="" src={img} className="absolute inset-0 w-full h-full object-cover" />
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

export default RegistrationPage;
