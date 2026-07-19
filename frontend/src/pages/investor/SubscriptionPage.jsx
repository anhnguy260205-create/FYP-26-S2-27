import { useEffect, useState } from "react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { getSubscriptionStatus, updateSubscriptionStatus } from "../../api/userApi.js";

function usePlanContent() {
  const [freeFeatures, setFreeFeatures] = useState([]);
  const [premiumFeatures, setPremiumFeatures] = useState([]);
  const [freePlan, setFreePlan] = useState({ name: "Starter", price: "$0.00", priceSubtitle: "forever, no card needed" });
  const [premiumPlan, setPremiumPlan] = useState({ name: "Pro", price: "$20.99", priceSubtitle: "per month, billed annually" });

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const c = data.content;
        setFreeFeatures(c.filter((x) => x.section === "free_investor").map((x) => x.title));
        setPremiumFeatures(c.filter((x) => x.section === "premium_investor").map((x) => x.title));

        const freeName = c.find((x) => x.content_id === "free_plan_name");
        const freePrice = c.find((x) => x.content_id === "free_plan_price");
        if (freeName || freePrice) setFreePlan({
          name: freeName?.title ?? "Starter",
          price: freePrice?.title ?? "$0.00",
          priceSubtitle: freePrice?.description ?? "forever, no card needed",
        });

        const premName = c.find((x) => x.content_id === "premium_plan_name");
        const premPrice = c.find((x) => x.content_id === "premium_plan_price");
        if (premName || premPrice) setPremiumPlan({
          name: premName?.title ?? "Pro",
          price: premPrice?.title ?? "$20.99",
          priceSubtitle: premPrice?.description ?? "per month, billed annually",
        });
      })
      .catch(() => { });
  }, []);

  return { freeFeatures, premiumFeatures, freePlan, premiumPlan };
}

function Badge({ children, type }) {
  const s =
    type === "free"
      ? { background: "rgba(37,99,235,0.12)", color: "#1D4ED8", border: "0.5px solid rgba(37,99,235,0.35)" }
      : { background: "rgba(217,119,6,0.12)", color: "#92400E", border: "0.5px solid rgba(217,119,6,0.35)" };
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
      ? { background: "#2563EB", color: "#fff" }
      : { background: "#D97706", color: "#fff" };
  const textColor = type === "free" ? "#33477A" : "#8A6A3F";
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

function FreeTier({ userId, currentSubscriptionStatus, features, plan }) {
  const [hovered, setHovered] = useState(false);
  const isSubscribed = currentSubscriptionStatus === "basic" || currentSubscriptionStatus === "premium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.2 }}
      style={{
        background: "#FFFFFF",
        border: hovered ? "1.5px solid #1D4ED8" : "1.5px solid #0B1D4F",
        borderRadius: "24px",
        padding: "28px 32px",
        width: "400px",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(37,99,235,0.25), 0 0 0 1px rgba(37,99,235,0.2)"
          : "0 4px 20px rgba(15,23,42,0.12)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Badge type="free">Free</Badge>
      <p style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 6px", color: "#0B1D4F" }}>{plan.name}</p>
      <p style={{ fontSize: "36px", fontWeight: 600, lineHeight: 1, margin: "0 0 4px", color: "#1D4ED8" }}>{plan.price}</p>
      <p style={{ fontSize: "13px", margin: "0 0 20px", color: "#475569" }}>{plan.priceSubtitle}</p>
      <div style={{ height: "0.5px", background: "rgba(11,29,79,0.15)", marginBottom: "16px" }} />

      {features.map((f) => <Feature key={f} type="free">{f}</Feature>)}

      <button
        disabled={isSubscribed}
        style={{
          width: "100%",
          marginTop: "22px",
          padding: "11px 0",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: isSubscribed ? "not-allowed" : "pointer",
          border: "none",
          background: isSubscribed ? "#475569" : "#2563EB",
          color: isSubscribed ? "#CBD5E1" : "#fff",
          opacity: isSubscribed ? 0.75 : 1,
          transition: "opacity 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isSubscribed) return;
          e.currentTarget.style.opacity = "0.88";
          e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = isSubscribed ? "0.75" : "1";
          e.currentTarget.style.transform = "scale(1)";
        }}
        onClick={() => updateSubscriptionStatus(userId, "basic")}
      >
        {isSubscribed ? "Current plan active" : "Get started"}
      </button>
    </motion.div>
  );
}

function PremiumTier({ userId, currentSubscriptionStatus, features, plan }) {
  const [hovered, setHovered] = useState(false);
  const isPremium = currentSubscriptionStatus === "premium";

  return (
    <div

      style={{
        background: "#FFFFFF",
        flexDirection: "column",
        border: hovered ? "1.5px solid #D97706" : "1.5px solid #92400E",
        borderRadius: "24px",
        padding: "28px 32px",
        width: "400px",
        cursor: "pointer",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 40px rgba(217,119,6,0.25), 0 0 0 1px rgba(217,119,6,0.2)"
          : "0 4px 20px rgba(15,23,42,0.12)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Badge type="premium">⭐ Premium</Badge>
      <p style={{ fontSize: "22px", fontWeight: 500, margin: "0 0 6px", color: "#78350F" }}>{plan.name}</p>
      <p style={{ fontSize: "36px", fontWeight: 600, lineHeight: 1, margin: "0 0 4px", color: "#B45309" }}>{plan.price}</p>
      <p style={{ fontSize: "13px", margin: "0 0 20px", color: "#8A6A3F" }}>{plan.priceSubtitle}</p>
      <div style={{ height: "0.5px", background: "rgba(217,119,6,0.15)", marginBottom: "16px" }} />
      {features.map((f) => <Feature key={f} type="premium">{f}</Feature>)}
      <button
        disabled={isPremium}
        style={{
          width: "100%",
          marginTop: "90px",
          paddingTop: "16px",
          padding: "11px 0",
          borderRadius: "12px",
          fontSize: "14px",
          fontWeight: 500,
          cursor: isPremium ? "not-allowed" : "pointer",
          border: "none",
          background: isPremium ? "#78716C" : "#D97706",
          color: isPremium ? "#E7E5E4" : "#fff",
          opacity: isPremium ? 0.75 : 1,
          transition: "opacity 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isPremium) return;
          e.currentTarget.style.opacity = "0.88";
          e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = isPremium ? "0.75" : "1";
          e.currentTarget.style.transform = "scale(1)";
        }}
        onClick={() => updateSubscriptionStatus(userId, "premium")}
      >
        {isPremium ? "Premium active" : "Upgrade now"}
      </button>
    </div>
  );
}

function SubscriptionPage() {
  const user = JSON.parse(sessionStorage.getItem("currentUser") || "null");
  const userId = user?.user_id;
  const [currentSubscriptionStatus, setCurrentSubscriptionStatus] = useState(
    user?.subscription_status || "inactive"
  );
  const { freeFeatures, premiumFeatures, freePlan, premiumPlan } = usePlanContent();

  useEffect(() => {
    if (!userId) return;

    const loadSubscriptionStatus = async () => {
      const result = await getSubscriptionStatus(userId);
      if (!result.success) return;

      const nextStatus = result.subscription_status || "inactive";
      setCurrentSubscriptionStatus(nextStatus);
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({ ...user, subscription_status: nextStatus })
      );
    };

    loadSubscriptionStatus();
  }, [userId]);

  return (
    <motion.div
      className="min-h-screen flex flex-col  text-white" style={{ background: "linear-gradient(to bottom, #73ADFF 0%, #FFFFFF 33%, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <GeneralHeader />
      <main className="flex-1 p-4 sm:p-7.5">
        <div
          className="flex gap-50"
          style={{ justifyContent: "center", alignItems: "center", paddingTop: "90px", paddingBottom: "90px" }}
        >
          <FreeTier userId={userId} currentSubscriptionStatus={currentSubscriptionStatus} features={freeFeatures} plan={freePlan} />
          <PremiumTier userId={userId} currentSubscriptionStatus={currentSubscriptionStatus} features={premiumFeatures} plan={premiumPlan} />
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

export default SubscriptionPage;
