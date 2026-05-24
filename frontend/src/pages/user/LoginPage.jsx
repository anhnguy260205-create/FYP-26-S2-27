import Footer from "../../layout/Footer.jsx";
import Header from "../../layout/Header.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { loginAccount } from "../../api/userApi";
import image1 from "../../images/image1.png";

function ImageStockMarketTradingCharts() {
  return (
    <div className="flex flex-col gap-6">

      {/* Image Container */}
      <div
        className="relative w-125 h-100 overflow-hidden"
        data-name="Image (Stock market trading charts)"
      >
        {/* Background Image */}
        <img alt="" src={image1} className="absolute inset-0 w-full h-full object-cover rounded-[30px]"/>

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/35 rounded-[30px]" />

        {/* Text Content */}
        <div className="absolute bottom-10 left-10 right-10 text-white z-10">
          <h1 className="text-4 font-bold leading-tight mb-4">
            Smart Trading Starts Here
          </h1>

          <p className="text-2 text-gray-200 leading-relaxed">
            Join thousands of investors leveraging data-driven insights to
            grow their portfolios.
          </p>
        </div>
      </div>

      {/* Statistics Cards OUTSIDE image */}
      <div className="flex gap-5 w-125">

        {/* Card 1 */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">
            50K+
          </h2>

          <p className="text-gray-300 text-lg">
            Active Users
          </p>
        </div>

        {/* Card 2 */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">
            2M+
          </h2>

          <p className="text-gray-300 text-lg">
            Daily Trades
          </p>
        </div>

        {/* Card 3 */}
        <div className="flex-1 bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center transition-all duration-300 hover:bg-cyan-500/20 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.35)] hover:-translate-y-1 cursor-pointer">
          <h2 className="text-cyan-400 text-4xl font-bold mb-2">
            18.4%
          </h2>

          <p className="text-gray-300 text-lg">
            Avg. Return
          </p>
        </div>

      </div>
    </div>
  );
}
function LoginPage(){
    const navigate = useNavigate();
    // Store form data in React state 
    const [formData, setFormData] = useState({
       username: "",
       password: "",
     });

    const handleChange = (field, value) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    };
     
    const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const payload = {
      username: formData.username,
      password: formData.password,
    };

    const result = await loginAccount(payload);

    if (!result.success) {
      alert(result.message || "Invalid username or password");
      return;
    }

    localStorage.setItem("currentUser", JSON.stringify(result.user));

    //  Redirect based on role
    const role = result.user.role;
    if (role === "investor") navigate("/investor/loggedhome");
    else if (role === "expert") navigate("/forum");
    else if (role === "admin") navigate("/adminpanel");
    else alert("Unknown role: " + role);

  } catch (error) {
    console.error(error);
    alert("Failed to login");
  }
}; 
    return(
      <motion.div 
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}>

        <Header/>
        <main className="flex-1 p-7.5">
          <div className="flex items-center justify-center min-h-screen px-24" style={{marginTop:"-80px", paddingBottom:"-80px"}}>
            <div className="flex flex-row items-center gap-30 max-w-7xl w-full">
            {/* Form Card */}
            <div
            className="bg-[rgba(255,255,255,0.82)] w-175 shrink-0 flex flex-col justify-center"
            style={{borderRadius: "30px", minHeight: "500px", padding: "30px 20px", backdropFilter: "blur(16px)",}}>
            <div className="text-center">
              <h1
              className="font-bold text-black leading-[1.1]"
              style={{ fontSize: "40px" }}
            >
              Welcome Back
             </h1>
             <p
              className="text-black mt-2 mb-8"
              style={{ fontSize: "20px", marginTop: "8px", marginBottom: "36px" }}
            >
              Log in to your Deskstock account
             </p>
            </div>

            
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


                {/* Password */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <label className="font-semibold text-[14px] text-gray-700 pl-1">Password</label>
                    <label className="text-blue-700 text-[14px]" onClick={()=>navigate("#")}> Forget password?</label>
                  </div>
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

               
              {/* Submit */}
              <button
                  type="submit"
                  className="w-full text-white font-semibold text-[16px] rounded-[14px] mt-1 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer"
                  style={{height: "54px", background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)",
                  }}>
                  Sign In 
              </button>
            </form>
              {/* Create Account button — cyan gradient */}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className=" w-full font-semibold text-white text-[16px] leading-6 cursor-pointer"
                  style={{
                    height: "52px",
                    borderRadius: "12px",
                    backgroundImage: "linear-gradient(174.015deg, rgb(2,6,24) 0%, rgb(22,36,86) 50%, rgb(15,23,43) 100%)",
                    boxShadow: "0px 10px 10px rgba(0,184,219,0.3)",
                    marginTop: "12px"
                  }}
                >
                  Create Account
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
export default LoginPage;
