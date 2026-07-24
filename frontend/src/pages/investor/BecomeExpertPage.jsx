import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { authFetch } from "../../api/apiClient.js";
import { Award, TrendingUp, BarChart3, FileText, CheckCircle2, Clock, Plus, Trash2, Sparkles, Users, Star } from "lucide-react";
import { useContentManagement, fillTemplate } from "../../utils/contentManagement.js";

const API_BASE = import.meta.env.VITE_API_URL;
const DOC_TYPES = ["certification", "degree", "employment", "other"];
const SPECIALTIES = [
  "Information Technology", "Financials", "Consumer Discretionary", "Communication Services",
  "Energy", "Real Estate", "Health Care", "Consumer Staples", "Industrials", "Materials", "Utilities",
];
const RISK_LEVELS = ["Conservative", "Moderate", "Aggressive"];

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

const docTypeStyle = (type) => {
  if (type === "certification") return { color: "#a855f7", bg: "rgba(168,85,247,0.1)", border: "rgba(168,85,247,0.3)" };
  if (type === "degree") return { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.3)" };
  if (type === "employment") return { color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" };
  return { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.25)" };
};

const inputCls = "w-full rounded-[10px] px-3 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none transition";
const inputStyle = { height: 42, background: "white", border: "1px solid #d1d5db" };

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

// Informational — explains what verified experts get and what unlocks the
// monthly compensation payout. Not tied to any live data; the app's actual
// compensation eligibility check is verified + at least one premium
// follower (see Expert Compensation page for real numbers).
function BenefitsCard() {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 24 }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={16} color={C.cyan} />
            <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.heading, letterSpacing: "0.04em", margin: 0, textTransform: "uppercase" }}>Benefits</p>
          </div>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            Once verified, every premium investor feature unlocks on your account automatically —
            complimentary, no subscription needed. You can also publish educational articles and
            share your portfolio with the community.
          </p>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TrendingUp size={16} color={C.cyan} />
            <p style={{ fontFamily: mono, fontSize: 12, fontWeight: 700, color: C.heading, letterSpacing: "0.04em", margin: 0, textTransform: "uppercase" }}>Monthly Compensation</p>
          </div>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 10px", lineHeight: 1.7 }}>
            To unlock the monthly compensation payout, keep up all three:
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            <li style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13, color: C.text }}>
              <Users size={14} color={C.cyan} /> Reach 100 followers
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13, color: C.text }}>
              <Star size={14} color={C.cyan} /> Keep a rating of 4.5★ or higher
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: sans, fontSize: 13, color: C.text }}>
              <Clock size={14} color={C.cyan} /> Stay active online at least 3 hours a week
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Step 1 of the application — personal + professional particulars. Must be
// completed (all fields filled) before the document-submission step unlocks.
function ParticularsForm({ initial, onContinue, onCancel, submitLabel = "Continue to Documents →" }) {
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(initial.phone_number ?? "");
  const [address, setAddress] = useState(initial.address ?? "");
  const [experienceYears, setExperienceYears] = useState(initial.experience_years ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(initial.linked_in_url ?? "");
  const [riskTolerance, setRiskTolerance] = useState(initial.risk_tolerance ?? "");
  const [interests, setInterests] = useState(
    initial.interests ? initial.interests.split(",").map((s) => s.trim()).filter(Boolean) : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleInterest = (s) =>
    setInterests((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const complete = fullName.trim() && phoneNumber.trim() && address.trim() &&
    experienceYears !== "" && linkedInUrl.trim() && riskTolerance && interests.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!complete) return;
    setSaving(true);
    setError("");
    try {
      const infoRes = await authFetch(`${API_BASE}/user/update-information/${initial.user_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), phone_number: phoneNumber.trim(), address: address.trim() }),
      });
      const infoData = await infoRes.json();
      if (!infoData.success) { setError(infoData.message || "Failed to save your details."); return; }

      const profileRes = await authFetch(`${API_BASE}/expert/update-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experience_years: Number(experienceYears),
          linked_in_url: linkedInUrl.trim(),
        }),
      });
      const profileData = await profileRes.json();
      if (!profileData.success) { setError(profileData.message || "Failed to save your details."); return; }

      const interestsRes = await authFetch(`${API_BASE}/user/update-interests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests: interests.join(",") }),
      });
      const interestsData = await interestsRes.json();
      if (!interestsData.success) { setError(interestsData.message || "Failed to save your interests."); return; }

      const riskRes = await authFetch(`${API_BASE}/user/update-risk-tolerance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk_tolerance: riskTolerance }),
      });
      const riskData = await riskRes.json();
      if (!riskData.success) { setError(riskData.message || "Failed to save your risk tolerance."); return; }

      onContinue({
        full_name: fullName.trim(), phone_number: phoneNumber.trim(), address: address.trim(),
        experience_years: Number(experienceYears), linked_in_url: linkedInUrl.trim(),
        risk_tolerance: riskTolerance, interests: interests.join(","),
      });
    } catch {
      setError("Could not reach backend. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ textAlign: "left" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Your Details</p>
      <div className="grid grid-cols-2 gap-2">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name"
          className={inputCls} style={inputStyle} />
        <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Phone number"
          className={inputCls} style={inputStyle} />
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address"
          className={inputCls} style={inputStyle} />
        <input type="number" min="0" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} placeholder="Years of experience"
          className={inputCls} style={inputStyle} />
        <input value={linkedInUrl} onChange={(e) => setLinkedInUrl(e.target.value)} placeholder="LinkedIn URL"
          className={inputCls} style={{ ...inputStyle, gridColumn: "span 2" }} />
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Risk Tolerance</p>
        <div className="grid grid-cols-3 gap-2">
          {RISK_LEVELS.map((level) => (
            <button key={level} type="button" onClick={() => setRiskTolerance(riskTolerance === level ? "" : level)}
              className="px-2 py-2 rounded-[10px] text-[12px] font-semibold text-center"
              style={{
                background: riskTolerance === level ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                border: riskTolerance === level ? "1.5px solid #0092b8" : "1.5px solid transparent",
                color: riskTolerance === level ? "#0092b8" : "#555",
              }}>
              {riskTolerance === level ? "✓ " : ""}{level}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Stock Interests</p>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map((s) => {
            const active = interests.includes(s);
            return (
              <button key={s} type="button" onClick={() => toggleInterest(s)}
                className="px-3 py-2 rounded-[10px] text-[12px] font-semibold text-left"
                style={{
                  background: active ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.06)",
                  border: active ? "1.5px solid #0092b8" : "1.5px solid transparent",
                  color: active ? "#0092b8" : "#555",
                }}>
                {active ? "✓ " : ""}{s}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p style={{ fontFamily: sans, fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="submit" disabled={!complete || saving}
          style={{ padding: "12px 26px", borderRadius: 12, border: "none", cursor: (!complete || saving) ? "not-allowed" : "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)", opacity: (!complete || saving) ? 0.5 : 1 }}>
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={saving}
            style={{ padding: "12px 18px", borderRadius: 12, border: "none", background: "transparent", color: C.muted, fontFamily: mono, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// Step 2 — supporting documents. Only reachable once particulars are saved.
function DocumentsForm({ userId, initialDocs, onSubmitted }) {
  const [docs, setDocs] = useState(initialDocs || []);
  const [docForm, setDocForm] = useState({ name: "", url: "", type: "certification" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addDoc = () => {
    if (!docForm.name.trim() || !docForm.url.trim()) return;
    setDocs((prev) => [...prev, { ...docForm }]);
    setDocForm({ name: "", url: "", type: "certification" });
  };

  const removeDoc = (i) => setDocs((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (docs.length === 0) { setError("Please add at least one document."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/expert/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, documents: docs }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || "Failed to save documents."); return; }
      onSubmitted();
    } catch {
      setError("Could not reach backend. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" style={{ textAlign: "left" }}>
      {docs.length > 0 && (
        <div className="flex flex-col gap-2">
          {docs.map((doc, i) => {
            const c = docTypeStyle(doc.type);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <FileText size={14} color={c.color} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#1e293b", fontWeight: 600, margin: 0 }}>{doc.name}</p>
                    <p style={{ fontSize: 11, color: C.cyan, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {doc.url.length > 45 ? doc.url.slice(0, 45) + "…" : doc.url}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: c.bg, border: `1px solid ${c.border}`, color: c.color, textTransform: "uppercase" }}>{doc.type}</span>
                  <button type="button" onClick={() => removeDoc(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(220,38,38,0.7)", padding: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Add Document</p>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input value={docForm.name} onChange={(e) => setDocForm((f) => ({ ...f, name: e.target.value }))} placeholder="Document name"
            className={inputCls} style={inputStyle} />
          <select value={docForm.type} onChange={(e) => setDocForm((f) => ({ ...f, type: e.target.value }))}
            className="w-full h-10.5 rounded-[10px] bg-white border border-gray-300 px-3 text-gray-800 text-sm">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input value={docForm.url} onChange={(e) => setDocForm((f) => ({ ...f, url: e.target.value }))} placeholder="Document URL (Google Drive, Dropbox…)"
            className={inputCls} style={{ ...inputStyle, flex: 1 }} />
          <button type="button" onClick={addDoc} disabled={!docForm.name.trim() || !docForm.url.trim()}
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 14px", borderRadius: 10, background: C.cyan, border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: (!docForm.name.trim() || !docForm.url.trim()) ? 0.4 : 1 }}>
            <Plus size={13} /> Add
          </button>
        </div>
      </div>

      {error && <p style={{ fontFamily: sans, fontSize: 13, color: "#DC2626", margin: 0 }}>{error}</p>}

      <button type="submit" disabled={saving}
        style={{ padding: "12px 26px", borderRadius: 12, border: "none", cursor: saving ? "not-allowed" : "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)", opacity: saving ? 0.6 : 1 }}>
        {saving ? "Submitting…" : "Submit Application →"}
      </button>
    </form>
  );
}

// Rendered once the investor has an in-progress application (Expert row
// exists, not yet approved). Gates document submission behind a particulars
// step — the investor can't reach the document form until phone, address,
// experience and LinkedIn are all saved.
function ApplicationForm({ userId, onSubmitted }) {
  const [prefill, setPrefill] = useState(null);
  const [stage, setStage] = useState("particulars");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // risk_tolerance/interests live on the investor row, not returned by
      // /user/expert-information — pull them from the cached session profile.
      const sessionUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
      try {
        const res = await authFetch(`${API_BASE}/user/expert-information/${userId}`);
        const data = await res.json();
        const base = data.success ? data.expert_information : {};
        const info = {
          ...base,
          risk_tolerance: sessionUser.risk_tolerance || null,
          interests: sessionUser.interests || null,
        };
        setPrefill(info);
        const complete = info.full_name && info.phone_number && info.address &&
          info.experience_years != null && info.linked_in_url && info.risk_tolerance && info.interests;
        setStage(complete ? "documents" : "particulars");
      } catch {
        setPrefill({ user_id: userId });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading || !prefill) {
    return <p style={{ fontFamily: mono, fontSize: 13, color: C.muted, textAlign: "center", padding: "40px 0" }}>Loading…</p>;
  }

  if (stage === "particulars") {
    return (
      <ParticularsForm
        initial={{ ...prefill, user_id: userId }}
        onContinue={(saved) => {
          setPrefill((prev) => ({ ...prev, ...saved }));
          setStage("documents");
        }}
      />
    );
  }

  return <DocumentsForm userId={userId} initialDocs={prefill.documents} onSubmitted={onSubmitted} />;
}

// Lets an already-applied expert (verified or pending) revisit and edit
// their particulars — separate from the one-time application gate above.
function UpdateParticularsPanel({ userId, onClose }) {
  const [prefill, setPrefill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const sessionUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
      try {
        const res = await authFetch(`${API_BASE}/user/expert-information/${userId}`);
        const data = await res.json();
        const base = data.success ? data.expert_information : {};
        setPrefill({
          ...base,
          risk_tolerance: sessionUser.risk_tolerance || null,
          interests: sessionUser.interests || null,
        });
      } catch {
        setPrefill({ user_id: userId });
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading || !prefill) {
    return <p style={{ fontFamily: mono, fontSize: 13, color: C.muted, textAlign: "center", padding: "20px 0" }}>Loading…</p>;
  }

  if (saved) {
    return (
      <div style={{ textAlign: "center" }}>
        <CheckCircle2 size={22} color={C.success} style={{ margin: "0 auto 6px" }} />
        <p style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.success, margin: 0 }}>Details saved.</p>
      </div>
    );
  }

  return (
    <ParticularsForm
      initial={{ ...prefill, user_id: userId }}
      submitLabel="Save Changes"
      onContinue={() => setSaved(true)}
      onCancel={onClose}
    />
  );
}

export default function BecomeExpertPage() {
  const { text } = useContentManagement();
  const header = text("header_become_expert_page", "Become an Expert", "Prove your trading skill to unlock expert privileges — publish educational articles, share your portfolio with premium users, and enjoy complimentary premium benefits.");
  const approvedHeading = text("become_expert_approved_heading", "You are a verified expert!").title;
  const approvedDesc = text("become_expert_approved_desc", "You can now publish articles, share your portfolio and enjoy premium benefits.").title;
  const pendingHeading = text("become_expert_pending_heading", "Application under review").title;
  const pendingDesc = text("become_expert_pending_desc", "Your documents are being reviewed. You will be notified once a decision is made.").title;
  const appliedHeading = text("become_expert_applied_heading", "Application started — submit your documents").title;
  const eligibleHeading = text("become_expert_eligible_heading", "🎉 You meet the requirements!").title;
  const eligibleDesc = text("become_expert_eligible_desc", "Apply now to fill in your details and upload supporting documents for review.").title;
  const eligibleCta = text("become_expert_eligible_cta", "Apply to Become an Expert →").title;
  const defaultHeading = text("become_expert_default_heading", "Keep trading to qualify").title;
  const defaultDescTemplate = text("become_expert_default_desc", "Trade at least {stocks} different stocks and reach a {margin}% profit margin to apply for expert status.").title;
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState("");
  const [editingParticulars, setEditingParticulars] = useState(false);

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

  // Creates the expert application (Expert row) — the investor stays a plain
  // investor (is_expert only flips on admin approval); this just unlocks the
  // particulars step below, in place.
  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/expert/apply`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await load();
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
  const isVerified = status === "approved" || status === "active";

  return (
    <motion.div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(to bottom, #B273FF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />

      <main style={{ flex: 1, maxWidth: 900, margin: "0 auto", width: "100%", padding: "88px 24px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(0,211,242,0.12)", border: "1px solid rgba(0,211,242,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Award size={26} color={C.cyan} />
          </div>
          <h1 style={{ fontFamily: mono, fontSize: 28, fontWeight: 700, color: C.heading, margin: 0, letterSpacing: "0.04em" }}>{header.title}</h1>
          <p style={{ fontFamily: sans, fontSize: 14, color: C.sub, margin: "8px auto 0", maxWidth: 560 }}>
            {header.description}
          </p>
        </div>

        {loading ? (
          <p style={{ fontFamily: mono, fontSize: 13, color: C.muted, textAlign: "center", padding: "60px 0" }}>Loading…</p>
        ) : (
          <>
            <BenefitsCard />

            {/* Requirement progress — only relevant before an application exists */}
            {!info?.has_applied && (
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
                <ProgressCard icon={BarChart3} title="Different Stocks Traded"
                  current={info?.distinct_stocks ?? 0} target={info?.required_stocks ?? 30} unit="" done={stocksDone} />
                <ProgressCard icon={TrendingUp} title="Profit Margin"
                  current={info?.profit_margin ?? 0} target={info?.required_profit_margin ?? 200} unit="%" done={marginDone} />
              </div>
            )}

            {/* Status / action */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 26px", textAlign: ((isVerified || status === "pending") && editingParticulars) || (!isVerified && status !== "pending" && info?.has_applied) ? "left" : "center" }}>
              {isVerified ? (
                editingParticulars ? (
                  <>
                    <p style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>Update Your Details</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
                      Keep your professional details up to date — investors and admins see this information on your expert profile.
                    </p>
                    <UpdateParticularsPanel userId={currentUser.user_id} onClose={() => setEditingParticulars(false)} />
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={26} color={C.success} style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.success, margin: 0 }}>{approvedHeading}</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                      {approvedDesc}
                    </p>
                    <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: "16px 0 0" }}>
                      Keep your professional details up to date — investors and admins see this information on your expert profile.
                    </p>
                    <button onClick={() => setEditingParticulars(true)}
                      style={{ marginTop: 10, padding: "10px 22px", borderRadius: 12, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: mono, fontSize: 12, fontWeight: 700, background: "transparent", color: C.cyan }}>
                      Update Your Details
                    </button>
                  </>
                )
              ) : status === "pending" ? (
                editingParticulars ? (
                  <>
                    <p style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>Update Your Details</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
                      Keep your professional details up to date — investors and admins see this information on your expert profile.
                    </p>
                    <UpdateParticularsPanel userId={currentUser.user_id} onClose={() => setEditingParticulars(false)} />
                  </>
                ) : (
                  <>
                    <Clock size={26} color="#B45309" style={{ margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: "#B45309", margin: 0 }}>{pendingHeading}</p>
                    <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                      {pendingDesc}
                    </p>
                    <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: "16px 0 0" }}>
                      Keep your professional details up to date — investors and admins see this information on your expert profile.
                    </p>
                    <button onClick={() => setEditingParticulars(true)}
                      style={{ marginTop: 10, padding: "10px 22px", borderRadius: 12, border: `1px solid ${C.border}`, cursor: "pointer", fontFamily: mono, fontSize: 12, fontWeight: 700, background: "transparent", color: C.cyan }}>
                      Update Your Details
                    </button>
                  </>
                )
              ) : info?.has_applied ? (
                <>
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>{appliedHeading}</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "0 0 18px" }}>
                    First enter your details, then upload supporting documents (certificates, degrees, employment letters) for review.
                  </p>
                  <ApplicationForm userId={currentUser.user_id} onSubmitted={load} />
                </>
              ) : info?.eligible ? (
                <>
                  <p style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: 0 }}>
                    {eligibleHeading}
                  </p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    {eligibleDesc}
                  </p>
                  <button onClick={handleApply} disabled={applying}
                    style={{ marginTop: 14, padding: "12px 26px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)", opacity: applying ? 0.6 : 1 }}>
                    {applying ? "Applying…" : eligibleCta}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, color: C.heading, margin: 0 }}>{defaultHeading}</p>
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "6px 0 0" }}>
                    {fillTemplate(defaultDescTemplate, { stocks: info?.required_stocks ?? 30, margin: info?.required_profit_margin ?? 200 })}
                  </p>
                </>
              )}
              {error && <p style={{ fontFamily: sans, fontSize: 13, color: "#DC2626", marginTop: 12, textAlign: "center" }}>{error}</p>}
            </div>
          </>
        )}
      </main>
      <Footer />
    </motion.div>
  );
}
