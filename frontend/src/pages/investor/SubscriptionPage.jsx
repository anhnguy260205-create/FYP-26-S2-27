import { useEffect, useState } from "react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { getSubscriptionStatus, updateSubscriptionStatus } from "../../api/userApi.js";
import { CARD_HOVER } from "../../components/dashboard/DashboardKit.jsx";

const ACCENT = "#00D3F2";
const ACCENT_TEXT = "#004450";

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

function Badge({ children, accent }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "4px 10px",
        borderRadius: "6px",
        background: accent ? "rgba(0,211,242,0.14)" : "rgba(51,65,85,0.08)",
        color: accent ? ACCENT_TEXT : "#334155",
        border: accent ? "1px solid rgba(0,211,242,0.4)" : "1px solid rgba(51,65,85,0.18)",
      }}
    >
      {children}
    </span>
  );
}

function Feature({ children, accent }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "14px", marginBottom: "12px" }}>
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: "1px",
          background: accent ? ACCENT : "#334155",
          color: accent ? ACCENT_TEXT : "#fff",
        }}
      >
        <Check size={12} strokeWidth={3} />
      </span>
      <span style={{ color: "#334155", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function PlanCard({ accent, recommended, badgeLabel, plan, features, ctaLabel, lockedLabel, isCurrent, isLocked, onSelect }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: accent ? 0.28 : 0.18 }}
      className={`relative flex flex-col rounded-2xl bg-white p-8 ${CARD_HOVER} ${
        accent
          ? "ring-2 ring-[#00D3F2]/50 shadow-lg shadow-[#00D3F2]/10 hover:shadow-xl hover:shadow-[#00D3F2]/20"
          : "ring-1 ring-slate-200 shadow-md shadow-slate-900/5 hover:shadow-xl hover:shadow-slate-900/10 hover:ring-slate-300"
      }`}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: "-13px",
            left: "32px",
            background: ACCENT,
            color: ACCENT_TEXT,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "5px 12px",
            borderRadius: "999px",
            boxShadow: "0 4px 14px rgba(0,211,242,0.35)",
          }}
        >
          Most popular
        </span>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <Badge accent={accent}>{badgeLabel}</Badge>
        {isCurrent && <span style={{ fontSize: "11px", fontWeight: 600, color: "#0F766E" }}>Current plan</span>}
      </div>

      <p style={{ fontSize: "20px", fontWeight: 600, margin: "0 0 6px", color: "#0F172A" }}>{plan.name}</p>
      <p
        style={{
          fontSize: "34px",
          fontWeight: 700,
          lineHeight: 1,
          margin: "0 0 4px",
          color: "#0F172A",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {plan.price}
      </p>
      <p style={{ fontSize: "13px", margin: "0 0 20px", color: "#64748B" }}>{plan.priceSubtitle}</p>
      <div style={{ height: "1px", background: "rgba(15,23,42,0.08)", marginBottom: "18px" }} />

      <div style={{ flex: 1 }}>
        {features.map((f) => (
          <Feature key={f} accent={accent}>{f}</Feature>
        ))}
      </div>

      <button
        disabled={isLocked}
        onClick={onSelect}
        style={{
          width: "100%",
          marginTop: "24px",
          padding: "12px 0",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 600,
          border: "none",
          cursor: isLocked ? "not-allowed" : "pointer",
          background: isLocked ? "#E2E8F0" : accent ? ACCENT : "#0F172A",
          color: isLocked ? "#94A3B8" : accent ? ACCENT_TEXT : "#fff",
          transition: "opacity 0.2s, transform 0.15s",
        }}
        onMouseEnter={(e) => {
          if (isLocked) return;
          e.currentTarget.style.opacity = "0.88";
          e.currentTarget.style.transform = "scale(0.98)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {isLocked ? lockedLabel : ctaLabel}
      </button>
    </motion.div>
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

  const isPremium = currentSubscriptionStatus === "premium";
  const isBasic = currentSubscriptionStatus === "basic";
  // Verified experts get premium access as a complimentary perk of their
  // expert status, not a purchased plan — show that instead of pricing cards.
  const isVerifiedExpert =
    user?.is_expert === true &&
    ["approved", "active"].includes(String(user?.verification_status || "").toLowerCase());

  if (isVerifiedExpert) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
      >
        <GeneralHeader />
        <main style={{ flex: 1, maxWidth: 700, margin: "0 auto", width: "100%", padding: "88px 24px 96px", display: "flex", alignItems: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ textAlign: "center", width: "100%", background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.15)", borderRadius: 20, padding: "48px 36px" }}
          >
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 999, background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.4)", color: "#F97316", fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
              ★ Expert
            </div>
            <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, color: "#0F172A", margin: "0 0 12px", letterSpacing: "0.04em" }}>
              You already have full Premium access
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: "0 auto", maxWidth: "460px", lineHeight: 1.7 }}>
              As a verified expert, every premium investor feature is unlocked on your account automatically —
              no subscription to buy or renew. This stays active for as long as your expert verification does.
            </p>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
    >
      <GeneralHeader />
      <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: "center" }}
        >
          <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, color: "#0F172A", margin: "0 0 10px", letterSpacing: "0.04em" }}>
            Choose your plan
          </h1>
          <p style={{ fontSize: "15px", color: "#64748B", margin: "0 auto", maxWidth: "480px" }}>
            Start free, upgrade whenever you need deeper tools for your portfolio.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 400px))",
            justifyContent: "center",
            alignItems: "stretch",
            gap: "32px",
            maxWidth: "900px",
            margin: "0 auto",
            paddingTop: "48px",
            paddingBottom: "96px",
          }}
        >
          <PlanCard
            accent={false}
            recommended={false}
            badgeLabel="Free"
            plan={freePlan}
            features={freeFeatures}
            ctaLabel="Get started"
            lockedLabel={isPremium ? "Included in Premium" : "Current plan"}
            isCurrent={isBasic}
            isLocked={isBasic || isPremium}
            onSelect={() => updateSubscriptionStatus(userId, "basic")}
          />
          <PlanCard
            accent
            recommended
            badgeLabel="Premium"
            plan={premiumPlan}
            features={premiumFeatures}
            ctaLabel="Upgrade now"
            lockedLabel="Current plan"
            isCurrent={isPremium}
            isLocked={isPremium}
            onSelect={() => updateSubscriptionStatus(userId, "premium")}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default SubscriptionPage;
