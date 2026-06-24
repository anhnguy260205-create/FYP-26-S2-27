import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import Header from "../../layout/Header.jsx";

const BUBBLE_META = [
  { size: 140, fadeDelay: "0.3s",  floatDelay: "1.6s"  },
  { size: 170, fadeDelay: "0.15s", floatDelay: "1.75s" },
  { size: 150, fadeDelay: "0.3s",  floatDelay: "1.9s"  },
  { size: 130, fadeDelay: "0.45s", floatDelay: "2.05s" },
  { size: 155, fadeDelay: "0.6s",  floatDelay: "2.2s"  },
];

function DynamicFeatureBubbleHero() {
  const navigate = useNavigate();
  const [hero, setHero] = useState({ title: "Discover the Future of Smart Investing", description: "Explore powerful tools floating around your financial universe." });
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const heroItem = data.content.find((c) => c.section === "hero");
        const featureItems = data.content.filter((c) => c.section === "feature");
        if (heroItem) setHero(heroItem);
        setFeatures(featureItems);
      })
      .catch(() => {});
  }, []);

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
      { tx: "-20vw", ty: "-32vh" }, // top-left
      { tx: "38vw", ty: "-20vh" }, // top-right
      { tx: "-10vw", ty: "40vh" }, // bottom-left
      { tx: "36vw", ty: "30vh" }, // bottom-right
      { tx: "-40vw", ty: "0vh" }, // mid-left
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
      className="hero-section"
      style={{
        position: "relative",
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
          <span
            style={{
              display: "block",
              background: "linear-gradient(to right, #22d3ee, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {hero.title}
          </span>
        </h1>

        <p style={{ margin: "1rem 0 1.5rem", color: "#94a3b8", fontSize: "1rem" }}>
          {hero.description}
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

      {/* Feature bubbles — all anchored at 50%/50%, moved via translate */}
      {features.map((feature, index) => {
        const meta = BUBBLE_META[index] || BUBBLE_META[0];
        return (
          <div
            key={feature.content_id}
            className="feature-bubble"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: meta.size,
              height: meta.size,
              animation: `spreadOut${index} 1.4s cubic-bezier(0.22, 1, 0.36, 1) ${meta.fadeDelay} forwards, floatY${index} 4s ease-in-out ${meta.floatDelay} infinite`,
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
                  {feature.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}

      <style>{`
        .hero-section {
          height: 130vh;
          margin-top: -25vh;
          margin-bottom: -20vh;
        }
        @media (max-width: 640px) {
          .hero-section {
            height: auto;
            min-height: 70vh;
            margin-top: 0;
            margin-bottom: 0;
          }
          .feature-bubble { display: none; }
        }
        ${features.map((f, i) => buildKeyframes(i, f.size, f.target)).join("")}
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
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white "
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <Header />
      <main className="flex-1 p-4 sm:p-7.5">

        <DynamicFeatureBubbleHero />
      </main>

      <Footer />
    </motion.div>



  );
}
export default HomePage; 