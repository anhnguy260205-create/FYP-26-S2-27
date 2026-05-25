import { useState } from "react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";

function Badge({ children, type }) {
  const s =
    type === "free"
      ? { background: "rgba(37,99,235,0.25)", color: "#93C5FD", border: "0.5px solid rgba(147,197,253,0.3)" }
      : { background: "rgba(251,191,36,0.2)", color: "#FDE68A", border: "0.5px solid rgba(253,230,138,0.3)" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: "100px",
        marginBottom: "14px",
        ...s,
      }}
    >
      {children}
    </span>
  );
}

function Feature({ children, type }) {
  const iconStyle =
    type === "free"
      ? { background: "rgba(37,99,235,0.3)", color: "#93C5FD" }
      : { background: "rgba(251,191,36,0.25)", color: "#FCD34D" };
  const textColor = type === "free" ? "#8BA9D8" : "#C6A96B";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", marginBottom: "10px" }}>
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "11px",
          ...iconStyle,
        }}
      >
        ✓
      </span>
      <span style={{ color: textColor }}>{children}</span>
    </div>
  );
}

function FreeTier() {
  const [hovered, setHovered] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();

    alert("The feature is coming soon!")
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{
        background: "#0B1D4F",
        border: hovered ? "1.5px solid #60A5FA" : "1.5px solid #2563EB",
        borderRadius: "24px",
        padding: "28px 32px",
        width: "320px",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(37,99,235,0.45), 0 0 0 1px rgba(96,165,250,0.3)"
          : "0 4px 20px rgba(37,99,235,0.2)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Badge type="free">Free</Badge>
      <p style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 6px", color: "#E0EEFF" }}>Starter</p>
      <p style={{ fontSize: "36px", fontWeight: 600, lineHeight: 1, margin: "0 0 4px", color: "#60A5FA" }}>$0</p>
      <p style={{ fontSize: "13px", margin: "0 0 20px", color: "#6B89C4" }}>forever, no card needed</p>
      <div style={{ height: "0.5px", background: "rgba(59,130,246,0.2)", marginBottom: "16px" }} />
      <Feature type="free">Up to 3 projects</Feature>
      <Feature type="free">5 GB storage</Feature>
      <Feature type="free">Community support</Feature>
      <button
        style={{
          width: "100%",
          marginTop: "22px",
          padding: "11px 0",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          border: "none",
          background: "#2563EB",
          color: "#fff",
          transition: "opacity 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(0.98)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
        onClick={handleSubmit}
      >
        Get started
      </button>
    </motion.div>
  );
}

function PremiumTier() {
  const [hovered, setHovered] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();

    alert("The feature is coming soon!")
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      style={{
        background: "linear-gradient(145deg, #0B1D4F 0%, #0E2460 60%, #102870 100%)",
        border: hovered ? "1.5px solid #FDE68A" : "1.5px solid #FBBF24",
        borderRadius: "24px",
        padding: "28px 32px",
        width: "320px",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(251,191,36,0.35), 0 0 0 1px rgba(253,230,138,0.3)"
          : "0 4px 20px rgba(251,191,36,0.2)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Badge type="premium">⭐ Premium</Badge>
      <p style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 6px", color: "#FFFBEB" }}>Pro</p>
      <p style={{ fontSize: "36px", fontWeight: 600, lineHeight: 1, margin: "0 0 4px", color: "#FCD34D" }}>$12</p>
      <p style={{ fontSize: "13px", margin: "0 0 20px", color: "#B8945A" }}>per month, billed annually</p>
      <div style={{ height: "0.5px", background: "rgba(251,191,36,0.2)", marginBottom: "16px" }} />
      <Feature type="premium">Unlimited projects</Feature>
      <Feature type="premium">100 GB storage</Feature>
      <Feature type="premium">Priority support</Feature>
      <button
        style={{
          width: "100%",
          marginTop: "22px",
          padding: "11px 0",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: "pointer",
          border: "none",
          background: "#D97706",
          color: "#fff",
          transition: "opacity 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "scale(0.98)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "scale(1)"; }}
        onClick={handleSubmit}
      >
        Upgrade now
      </button>
    </motion.div>
  );
}

function SubscriptionPage() {
  return (
    <motion.div
      className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-7.5">
        <div
          className="flex gap-50"
          style={{ justifyContent: "center", alignItems: "center", paddingTop: "40px" }}
        >
          <FreeTier />
          <PremiumTier />
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

export default SubscriptionPage;