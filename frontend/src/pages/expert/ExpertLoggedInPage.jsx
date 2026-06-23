import { useEffect, useState } from "react";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";

function ExpertLoggedInPage() {
  const [hero, setHero] = useState({
    title: "Lead the Future of Wealth Management",
    description: "Provide trusted investment expertise and data-driven strategies to help clients achieve their goals.",
  });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const expertHero = data.content.find((c) => c.section === "expert");
        if (expertHero) setHero(expertHero);
      })
      .catch(() => {});
  }, []);

  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <ConsultantHeader />

      <main className="flex-1 p-7.5">
        <div
          style={{
            position: "relative",
            height: "130vh",
            width: "100%",
            overflow: "hidden",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: "-25vh",
            marginBottom: "-20vh",
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

            <p
              style={{
                margin: "1rem 0 1.5rem",
                color: "#94a3b8",
                fontSize: "1rem",
              }}
            >
              {hero.description}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </motion.div>
  );
}

export default ExpertLoggedInPage;