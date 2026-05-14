import Footer from "../../components/Footer.jsx";
import Header from "../../components/Header.jsx";
import { useState } from "react";
import { motion } from "framer-motion";
function RegistrationPage(){
    // Store form data in React state 
    const [formData, setFormData] = useState({
       username: "",
       fullName: "",
       email: "",
       phoneNumber: "",
       location: "",
       password: "",
       confirmPassword: "",
       accountType: "",
     });

    const [submitted, setSubmitted] = useState(false);
    // Update data into React frontend
    const handleChange = (field, value) => {
      setFormData((prev) => ({
      ...prev,
      [field]: value,}));
     };
    // validate form data and handle submission
    const handleSubmit = (e) => {
     e.preventDefault();
     if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
     setSubmitted(true);};
    return(
      <motion.div 
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
            >

        <Header/>
        <div>
            <div className="flex items-center justify-center min-h-screen overflow-y-auto"
          style={{ paddingTop: "60px" }}>
          {/* Form Card */}
          <div
            className="bg-[rgba(255,255,255,0.82)] w-173 shrink-0 flex flex-col justify-center"
            style={{
              borderRadius: "30px",
              minHeight: "500px",
              padding: "30px 20px",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="text-center">
              <h1
              className="font-bold text-black leading-[1.1]"
              style={{ fontSize: "40px" }}
            >
              Open an account
             </h1>
             <p
              className="text-black mt-2 mb-8"
              style={{ fontSize: "20px", marginTop: "8px", marginBottom: "36px" }}
            >
              Let's Trade with RocketTrading
             </p>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="font-bold text-[28px] text-black mb-2">Account Created!</h2>
                <p className="text-gray-600 text-[17px] mb-1">
                  Welcome, <span className="font-semibold" style={{ color: "#0092b8" }}>{formData.username}</span>
                </p>
                <p className="text-gray-500 text-[15px]">
                  Registered as a <span className="capitalize font-medium">{formData.accountType}</span>{" "}
                  · <span className="font-medium">{formData.riskLevel}</span> risk
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 px-8 py-3 rounded-[14px] text-white font-medium text-[16px]"
                  style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)" }}
                >
                  Back to Form
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Username */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={(e) => handleChange("username", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Full Name */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
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
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Phone Number */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phoneNumber}
                    onChange={(e) => handleChange("phoneNumber", e.target.value)}
                    required
                    className="w-full rounded-[14px] border bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Location */}
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Location</label>
                  <input
                    type="text"
                    placeholder="Enter your location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    required
                    className="w-full rounded-[14px] border border-gray-300 bg-white px-4 text-[15px] text-gray-800 placeholder-gray-400 focus:outline-none transition"
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
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
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
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
                    style={{
                      height: "40px",
                      borderColor: "rgba(0,0,0,0.15)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0092b8";
                      e.target.style.boxShadow = "0 0 0 3px rgba(0,146,184,0.15)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.15)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                </div>

                

                {/* Account Type */}
                <div className="flex flex-col gap-2">
                  <label className="font-semibold text-[14px] text-gray-700 pl-1">Account Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "investor", label: "Investor", desc: "Grow my portfolio" },
                      { value: "consultant", label: "Consultant / Expert", desc: "Provide trading insights" },
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
                        <span
                          className="font-semibold text-[14px]"
                          style={{ color: formData.accountType === type.value ? "#0092b8" : "#1f2937" }}
                        >
                          {type.label}
                        </span>
                        <span className="text-[12px] text-gray-500 mt-0.5">{type.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                  {/* Risk Tolerance */}  
                <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 w-4 h-4 rounded border-blue-900/30 bg-slate-900/50 text-cyan-500 focus:ring-cyan-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I acknowledge that I have read, understood, and agree to RocketTrade's {' '}
                  <a href="#" className="text-blue-500 hover:text-blue-500 transition-colors">
                    Terms and Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-500 hover:text-blue-500 transition-colors">
                    Privacy Policy
                  </a>
                </label>
              </div>
                
                {/* Submit */}
                <button
                  type="submit"
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all"
                  style={{
                    height: "54px",
                    background: "linear-gradient(90deg, #0092b8, #155dfc)",
                    boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                  }}
                >
                  Create Account
                </button>
              </form>
            )}
              {/* Sign In Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-400">
                Already have an account?{' '}
                <a href="#" className="text-blue-500 hover:text-blue-600 transition-colors font-semibold">
                  Sign In
                </a>
              </p>
            </div>
            </div>
          </div>

        </div>
        <Footer/>
       </motion.div>
    );
}
export default RegistrationPage;