import { useState } from "react";
import { Link } from "react-router-dom";
import RegistrationPage from "./RegistrationPage.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import Header from "../../layout/Header.jsx";

function DynamicFeatureBubbleHero() {
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
      target: { top: "10%", right: "6%" },
      fadeDelay: "0.15s",
      floatDelay: "1.75s",
    },
    {
      title: "Portfolio",
      desc: "Track investments",
      size: 150,
      target: { bottom: "9%", left: "10%" },
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
      title: "Analytics",
      desc: "Deep data insights",
      size: 155,
      target: { top: "40%", left: "4%" },
      fadeDelay: "0.6s",
      floatDelay: "2.2s",
    },
  ];

  // Build a unique CSS animation per bubble that goes from center to its target corner
  const buildKeyframes = (index, size, target) => {
    const half = size / 2;
    // translate from center to 0,0 offset at final position
    // We use translate trick: start at CSS center offset, end at 0
    const directions = [
      `translate(-50%, -50%)`,  // will be overridden per bubble
    ];

    // Map target position to a translate offset from center
    // Each bubble's final resting place is its `target` styles (top/left/bottom/right)
    // We animate using translate so absolute position stays at 50%/50% then moves
    const moves = [
      { tx: "-38vw", ty: "-38vh" }, // top-left
      { tx: "38vw",  ty: "-38vh" }, // top-right
      { tx: "-38vw", ty: "38vh"  }, // bottom-left
      { tx: "38vw",  ty: "38vh"  }, // bottom-right
      { tx: "-40vw", ty: "0vh"   }, // mid-left
    ];

    const { tx, ty } = moves[index] || { tx: "0", ty: "0" };

    return `
      @keyframes spreadOut${index} {
        0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
        20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
        100% { opacity: 1; transform: translate(calc(${tx} - 50%), calc(${ty} - 50%)) scale(1); }
      }
      @keyframes floatY${index} {
        0%, 100% { transform: translate(calc(${tx} - 50%), calc(${ty} - 50%)) translateY(0px); }
        50%       { transform: translate(calc(${tx} - 50%), calc(${ty} - 50%)) translateY(-14px); }
      }
    `;
  };

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
          maxWidth: 520,
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

        <button
          style={{
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
      </div>

      {/* Feature bubbles — all anchored at 50%/50%, moved via translate */}
      {features.map((feature, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: feature.size,
            height: feature.size,
            animation: `spreadOut${index} 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${feature.fadeDelay} forwards, floatY${index} 5s ease-in-out ${feature.floatDelay} infinite`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
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
            <div
              style={{
                position: "absolute",
                inset: 8,
                borderRadius: "50%",
                border: "1px solid rgba(34,211,238,0.25)",
                animation: "spin 10s linear infinite",
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
      ))}

      <style>{`
        ${features.map((f, i) => buildKeyframes(i, f.size, f.target)).join("")}
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function HomePage(){

  return (
    <motion.div 
    className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    >
      <main className="flex-1 p-7.5">
       <Header/>
       <DynamicFeatureBubbleHero/>
      </main>

      <Footer/>
    </motion.div>
    
    
    
  );
}
export default HomePage; 