import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { authFetch } from "../../api/apiClient.js";
import { Award, TrendingUp, BarChart3, FileText, CheckCircle2, Clock } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;

const mono = "'DM Mono', monospace";
const sans = "'DM Sans', sans-serif";

const C = {
  card: "#FFFFFF",
  border: "rgba(11,29,79,0.25)",
  accent: "#00D3F2",
  accentText: "#004450",
  cyan: "#0E7490",
  success: "#0F9D58",
  muted: "#5B6C88",
  text: "#0F172A",
  heading: "#0B1D4F",
  sub: "#33477A",
};

function ProgressCard({ icon: Icon, title, current, target, unit, done }) {
  const pct = Math.max(0, Math.min(100, (current / target) * 100));
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", flex: 1, minWidth: 260 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Icon size={18} color={done ? C.success : C.cyan} />
        <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.heading }}>{title}</span>
        {done && <CheckCircle2 size={16} color={C.success} style={{ marginLeft: "auto" }} />}
      </div>
      <p style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: done ? C.success : C.text, margin: "0 0 8px" }}>
        {current}{unit} <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>/ {target}{unit}</span>
      </p>
      <div style={{ height: 8, borderRadius: 6, background: "rgba(11,29,79,0.08)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 6, background: done ? C.success : `linear-gradient(90deg, ${C.accent}, #155dfc)`, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export default function BecomeExpertPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const res = await authFetch(`${API_BASE}/expert/eligibility`);
      const data = await res.json();
      if (data.success) setInfo(data);
      else setError(data.message || "Failed to load eligibility.");
    } catch {
      setError("Could not reach backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/expert/apply`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        // Mark this session as an expert applicant so expert pages unlock.
        sessionStorage.setItem("currentUser", JSON.stringify({ ...currentUser, is_expert: true }));
        navigate("/expert/documents");
      } else {
        setError(data.message || "Application failed.");
      }
    } catch {
      setError("Could not reach backend.");
    } finally {
      setApplying(false);
    }
  };

  const status = info?.verification_status;
  const stocksDone = info ? info.distinct_stocks >= info.required_stocks : false;
  const marginDone = info ? info.profit_margin >= info.required_profit_margin : false;

  return (
    <motion.div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(to bottom, #73ADFF 0%, #FFFFFF 12%, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />

      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "32px 24px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,211,242,0.12)", border: "1px solid rgba(0,211,242,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Award size={26} color={C.cyan} />
          </div>
          <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.heading, margin: 0 }}>Become an Expert</h1>
          <p style={{ fontFamily: sans, fontSize: 14, color: C.sub, margin: "8px auto 0", maxWidth: 560 }}>
            Prove your trading skill to unlock expert privileges — publish educational articles,
            share your portfolio with premium users, and enjoy complimentary premium benefits.
          </p>
        </div>

        {loading ? (
          <p style={{ fontFamily: mono, fontSize: 13, color: C.muted, textAlign: "center", padding: "60px 0" }}>Loading…</p>
        ) : (
          <>
            {/* Requirement progress */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <ProgressCard icon={BarChart3} title="Different Stocks Traded"
                current={info?.distinct_stocks ?? 0} target={info?.required_stocks ?? 30} unit="" done={stocksDone} />
              <ProgressCard icon={TrendingUp} title="Profit Margin"
                current={info?.profit_margin ?? 0} target={info?.required_profit_margin ?? 200} unit="%" done={marginDone} />
            </div>

            {/* Status / action */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px", textAlign: "center" }}>
              {status === "approved" || status === "active" ? (
                <>
                  <CheckCircle2 size={26} color={C.success} style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.success, margin: 0 }}>You are a verified expert!</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    You can now publish articles, share your portfolio and enjoy premium benefits.
                  </p>
                </>
              ) : status === "pending" ? (
                <>
                  <Clock size={26} color="#B45309" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#B45309", margin: 0 }}>Application under review</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    Your documents are being reviewed. You will be notified once a decision is made.
                  </p>
                </>
              ) : info?.has_applied ? (
                <>
                  <FileText size={26} color={C.cyan} style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: 0 }}>Application started — submit your documents</p>
                  <button onClick={() => navigate("/expert/documents")}
                    style={{ marginTop: 14, padding: "12px 26px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)" }}>
                    Upload Documents →
                  </button>
                </>
              ) : info?.eligible ? (
                <>
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: 0 }}>
                    🎉 You meet the requirements!
                  </p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    Apply now and upload supporting documents (certificates, degrees, employment letters) for review.
                  </p>
                  <button onClick={handleApply} disabled={applying}
                    style={{ marginTop: 14, padding: "12px 26px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)", opacity: applying ? 0.6 : 1 }}>
                    {applying ? "Applying…" : "Apply to Become an Expert →"}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.heading, margin: 0 }}>Keep trading to qualify</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    Trade at least {info?.required_stocks ?? 30} different stocks and reach a{" "}
                    {info?.required_profit_margin ?? 200}% profit margin to apply for expert status.
                  </p>
                </>
              )}
              {error && <p style={{ fontFamily: sans, fontSize: 13, color: "#DC2626", marginTop: 12 }}>{error}</p>}
            </div>
          </>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
