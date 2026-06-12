import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RegistrationPage from "./RegistrationPage.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import Header from "../../layout/Header.jsx";

function DynamicFeatureBubbleHero() {
  const navigate = useNavigate();
  const features = [
    {
      title: "AI Assistant",
      desc: "Smart financial insights",
      size: 140,
      target: { top: "7%", left: "8%" },
      fadeDelay: "0.3s",
      floatDelay: "1.6s",
    },
    {
      title: "Market Trends",
      desc: "Live stock movement",
      size: 170,
      target: { top: "10%", right: "18%" },
      fadeDelay: "0.15s",
      floatDelay: "1.75s",
    },
    {
      title: "AI Predictions",
      desc: "Future market insights",
      size: 150,
      target: { bottom: "20%", left: "20%" },
      fadeDelay: "0.3s",
      floatDelay: "1.9s",
    },
    {
      title: "Alerts",
      desc: "Real-time notifications",
      size: 130,
      target: { bottom: "12%", right: "8%" },
      fadeDelay: "0.45s",
      floatDelay: "2.05s",
    },
    {
      title: "Professional Experts",
      desc: "Insights from industry leaders",
      size: 155,
      target: { top: "40%", left: "14%" },
      fadeDelay: "0.6s",
      floatDelay: "2.2s",
    },
  ];

  const buildKeyframes = (index) => `
    @keyframes spreadOut${index} {
      0%   { opacity: 0; transform: scale(0.2); }
      20%  { opacity: 1; transform: scale(1.05); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  return (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100%",
        overflow: "hidden",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.22) 0%, transparent 60%)",
        }}
      />

      {/* Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.15,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Hero text */}
      <div
        style={{
          position: "relative",
          zIndex: 20,
          textAlign: "center",
          padding: "0 1.5rem",
          maxWidth: "700px",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.5rem)",
            fontWeight: 700,
            lineHeight: 1.15,
            color: "white",
            margin: 0,
          }}
        >
          Discover the Future of
          <span
            style={{
              display: "block",
              background: "linear-gradient(to right, #22d3ee, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Smart Investing
          </span>
        </h1>

        <p style={{ margin: "1rem 0 1.5rem", color: "#94a3b8", fontSize: "1rem" }}>
          Explore powerful tools floating around your financial universe.
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/register")}
            style={{
              width: "150px",
              padding: "0.75rem 2rem",
              borderRadius: 14,
              background: "#06b6d4",
              color: "white",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(34,211,238,0.4)",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#22d3ee")}
            onMouseLeave={(e) => (e.target.style.background = "#06b6d4")}
          >
            Get Started
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: "0.75rem 2rem",
              width: "150px",
              borderRadius: 14,
              background: "#eab308",
              color: "white",
              fontWeight: 600,
              fontSize: "1rem",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(250,204,21,0.4)",
            }}
            onMouseEnter={(e) => (e.target.style.background = "#f59e0b")}
            onMouseLeave={(e) => (e.target.style.background = "#facc15")}
          >
            Login
          </button>
        </div>
      </div>

      {/* Feature bubbles — positioned at their target coords, resize-safe */}
      {features.map((feature, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            ...feature.target,
            width: feature.size,
            height: feature.size,
            animation: `spreadOut${index} 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${feature.fadeDelay} forwards`,
          }}
        >
          {/* inner div isolates the float so it doesn't clash with spreadOut transform */}
          <div
            style={{
              width: "100%",
              height: "100%",
              animation: `floatY 4s ease-in-out ${feature.floatDelay} infinite`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: "rgba(59,130,246,0.22)",
                border: "1px solid rgba(59,130,246,0.22)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 32px rgba(34,211,238,0.4)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(59,130,246,0.08))",
                }}
              />
              <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "white" }}>
                  {feature.title}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      <style>{`
        ${features.map((f, i) => buildKeyframes(i)).join("")}
        @keyframes floatY {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-14px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
function MarketDemo() {

}

function HomePage() {

  return (
    <motion.div
      className="bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      style={{ position: "relative" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 50 }}>
        <Header />
      </div>
      <DynamicFeatureBubbleHero />
      <Footer />
    </motion.div>



  );
}
export default HomePage; 