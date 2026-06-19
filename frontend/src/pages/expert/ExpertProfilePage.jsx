import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Save, User, Mail, Phone, MapPin, Briefcase } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertInformation, updateUserInformation } from "../../api/userApi.js";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "null");
  } catch {
    return null;
  }
}

export default function ExpertProfilePage() {
  const currentUser = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ username: "", full_name: "", email_address: "", phone_number: "", address: "" });

  useEffect(() => {
    async function loadProfile() {
      if (!currentUser?.user_id) {
        setLoading(false);
        setMessage("Please log in again.");
        return;
      }
      try {
        const data = await getExpertInformation(currentUser.user_id);
        const info = data.expert || data.user || data;
        setForm({
          username: info.username || currentUser.username || "",
          full_name: info.full_name || currentUser.full_name || "",
          email_address: info.email_address || info.email || currentUser.email_address || "",
          phone_number: info.phone_number || "",
          address: info.address || "",
        });
      } catch (error) {
        setMessage(error.message || "Unable to load profile.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [currentUser?.user_id]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!currentUser?.user_id) return;
    if (!form.username.trim() || !form.full_name.trim() || !form.email_address.trim()) {
      setMessage("Username, full name, and email are required.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const result = await updateUserInformation(
        currentUser.user_id,
        form.username.trim(),
        form.full_name.trim(),
        form.email_address.trim(),
        form.phone_number.trim(),
        form.address.trim()
      );
      if (result.success === false) throw new Error(result.message || "Update failed.");
      const updatedUser = { ...currentUser, username: form.username.trim(), full_name: form.full_name.trim(), email_address: form.email_address.trim() };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setMessage("Profile updated successfully.");
    } catch (error) {
      setMessage(error.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <ConsultantHeader />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Edit Consultant Profile</h1>
            <p className="text-gray-400">Update your account details used across the expert dashboard and forum.</p>
          </div>

          {message && <div className={`mb-6 rounded-xl border p-4 ${message.includes("successfully") ? "bg-green-500/10 border-green-500/30 text-green-300" : "bg-red-500/10 border-red-500/30 text-red-300"}`}>{message}</div>}

          <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-3xl p-8">
            {loading ? (
              <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" /></div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold">
                    {(form.full_name || form.username || "EX").split(" ").map((x) => x[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{form.full_name || "Consultant"}</h2>
                    <p className="text-gray-400 flex items-center gap-2"><Briefcase size={15} /> Consultant / Expert</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ProfileField icon={<User size={18} />} label="Username *" value={form.username} onChange={(v) => update("username", v)} />
                  <ProfileField icon={<User size={18} />} label="Full Name *" value={form.full_name} onChange={(v) => update("full_name", v)} />
                  <ProfileField icon={<Mail size={18} />} label="Email Address *" type="email" value={form.email_address} onChange={(v) => update("email_address", v)} />
                  <ProfileField icon={<Phone size={18} />} label="Phone Number" value={form.phone_number} onChange={(v) => update("phone_number", v)} />
                  <div className="md:col-span-2"><ProfileField icon={<MapPin size={18} />} label="Address" value={form.address} onChange={(v) => update("address", v)} /></div>
                </div>

                <div className="flex justify-end mt-8">
                  <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 font-semibold hover:opacity-90 disabled:opacity-50"><Save size={18} /> {saving ? "Saving..." : "Save Profile"}</button>
                </div>
              </>
            )}
          </form>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}
function DeleteAccountButton() {
    const navigate = useNavigate();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        const currentUser = JSON.parse(localStorage.getItem("currentUser"));
        setLoading(true);
        try {
            const result = await deleteInvestor(currentUser?.user_id);
            if (result.success) {
                localStorage.removeItem("currentUser");
                navigate("/");
            } else {
                alert(result.message || "Failed to delete account");
            }
        } catch (error) {
            console.error(error);
            alert("Failed to delete account");
        } finally {
            setLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            <div className="flex flex-col items-start gap-4 p-6">
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Danger Zone</p>
                <div style={{ width: "85%", height: "0.667px", background: "rgba(255,255,255,0.07)" }} />
                <button
                    onClick={() => setShowConfirm(true)}
                    style={{ padding: "8px 16px", borderRadius: "6px", background: "rgba(255,0,0,0.1)", border: "1px solid rgba(255,0,0,0.3)", color: "#FF6347", fontSize: "12px", fontWeight: 600, transition: "all 0.2s ease", cursor: "pointer" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "red"; e.currentTarget.style.border = "1px solid red"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#FF6347"; e.currentTarget.style.border = "1px solid rgba(255,0,0,0.3)"; }}
                >
                    Delete Account
                </button>
            </div>

            {showConfirm && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#0f1b2d", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "32px", maxWidth: "400px", width: "90%" }}>
                        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "white", marginBottom: "12px" }}>Delete Account</h2>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", marginBottom: "24px", lineHeight: 1.6 }}>
                            This will permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", fontSize: "14px", cursor: "pointer" }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                style={{ width: "100px", padding: "8px 20px", borderRadius: "8px", background: "rgba(220,38,38,0.2)", border: "1px solid rgba(220,38,38,0.5)", color: "#f87171", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
                            >
                                {loading ? "Deleting…" : "Yes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function VerifiedCard({ expertInfo }) {
    const status = expertInfo?.verification_status?.toLowerCase();

    const [linkedIn, setLinkedIn] = useState(expertInfo?.linked_in_url || "");
    const [experience, setExperience] = useState(expertInfo?.experience_years != null ? String(expertInfo.experience_years) : "");
    const [specialization, setSpecialization] = useState("");
    const [bio, setBio] = useState("");
    const [docName, setDocName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) setDocName(file.name);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        await new Promise(r => setTimeout(r, 1200));
        setSubmitting(false);
        setSubmitted(true);
    };

    /* ── Verified / Active state ───────────────────────────── */
    if (status === "active") {
        return (
            <GlassCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Expert Verification</h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                            Your professional credentials
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "999px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", fontSize: "13px", fontWeight: 700 }}>
                        <BadgeCheck size={15} />
                        Verified Expert
                    </div>
                </div>

                <div style={{ marginTop: "32px", padding: "28px", borderRadius: "16px", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.4)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <BadgeCheck size={32} color="#22c55e" />
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "#22c55e", marginBottom: "8px" }}>Account Verified</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: "360px", margin: "0 auto" }}>
                        Your expert credentials have been reviewed and approved. You now appear as a verified expert on the platform.
                    </p>
                </div>

                <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "28px 0" }} />

                <div className="grid grid-cols-2" style={{ gap: "24px 32px" }}>
                    <InfoRow label="LinkedIn" value={expertInfo?.linked_in_url || "—"} />
                    <InfoRow label="Experience" value={expertInfo?.experience_years != null ? `${expertInfo.experience_years} year${expertInfo.experience_years !== 1 ? "s" : ""}` : "—"} />
                </div>
            </GlassCard>
        );
    }

    /* ── Pending state ─────────────────────────────────────── */
    if (status === "pending" || submitted) {
        return (
            <GlassCard>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold">Expert Verification</h1>
                        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                            Verification in progress
                        </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "999px", background: "rgba(255,165,0,0.12)", border: "1px solid rgba(255,165,0,0.4)", color: "#FFA500", fontSize: "13px", fontWeight: 700 }}>
                        <Shield size={14} />
                        Under Review
                    </div>
                </div>

                <div style={{ marginTop: "32px", padding: "28px", borderRadius: "16px", background: "rgba(255,165,0,0.05)", border: "1px solid rgba(255,165,0,0.2)", textAlign: "center" }}>
                    <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,165,0,0.12)", border: "2px solid rgba(255,165,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <Shield size={28} color="#FFA500" />
                    </div>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "#FFA500", marginBottom: "8px" }}>Application Submitted</p>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", maxWidth: "380px", margin: "0 auto 24px" }}>
                        Our team is reviewing your credentials. This typically takes 2–5 business days. You'll be notified once a decision is made.
                    </p>
                </div>

                <div style={{ marginTop: "28px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "16px" }}>Review Steps</p>
                    {[
                        { label: "Application received", done: true },
                        { label: "Document review", done: false },
                        { label: "Background check", done: false },
                        { label: "Final approval", done: false },
                    ].map((step, i) => (
                        <div key={i} className="flex items-center gap-3" style={{ marginBottom: "12px" }}>
                            <div style={{ width: "22px", height: "22px", borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: step.done ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)", border: step.done ? "1px solid rgba(34,197,94,0.4)" : "1px solid rgba(255,255,255,0.12)" }}>
                                {step.done
                                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                    : <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "rgba(255,255,255,0.2)" }} />}
                            </div>
                            <span style={{ fontSize: "13px", color: step.done ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>{step.label}</span>
                        </div>
                    ))}
                </div>
            </GlassCard>
        );
    }

    /* ── Unsubmitted form state ────────────────────────────── */
    return (
        <GlassCard>
            <div>
                <h1 className="text-xl font-bold">Expert Verification</h1>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", marginTop: "4px" }}>
                    Submit your credentials for review to become a verified expert.
                </p>
            </div>

            {/* Info banner */}
            <div style={{ marginTop: "20px", padding: "14px 18px", borderRadius: "12px", background: "rgba(0,211,243,0.06)", border: "1px solid rgba(0,211,243,0.2)", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <BadgeCheck size={16} color="#00D3F2" style={{ flexShrink: 0, marginTop: "1px" }} />
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                    Verified experts gain a trust badge, appear higher in search results, and can accept premium consultations. Fill in the form below and our team will review your application.
                </p>
            </div>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "24px 0" }} />

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col" style={{ gap: "20px" }}>

                    <div className="grid grid-cols-2" style={{ gap: "16px" }}>
                        <FormField label="LinkedIn Profile URL" htmlFor="v-linkedin">
                            <TextInput id="v-linkedin" value={linkedIn} onChange={setLinkedIn} placeholder="linkedin.com/in/yourprofile" />
                        </FormField>
                        <FormField label="Years of Experience" htmlFor="v-experience">
                            <TextInput id="v-experience" value={experience} onChange={setExperience} placeholder="e.g. 8" type="number" />
                        </FormField>
                    </div>

                    <FormField label="Area of Specialization" htmlFor="v-spec">
                        <TextInput id="v-spec" value={specialization} onChange={setSpecialization} placeholder="e.g. Equity Research, Portfolio Management, Risk Analysis" />
                    </FormField>

                    <FormField label="Professional Bio" htmlFor="v-bio">
                        <textarea
                            id="v-bio"
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Briefly describe your professional background, achievements, and areas of expertise…"
                            rows={4}
                            style={{
                                borderRadius: "10px",
                                border: "0.667px solid rgba(255,255,255,0.15)",
                                padding: "12px 14px",
                                fontSize: "14px",
                                color: "rgba(255,255,255,0.9)",
                                background: "rgba(255,255,255,0.08)",
                                width: "100%",
                                outline: "none",
                                resize: "vertical",
                                lineHeight: 1.6,
                            }}
                            onFocus={e => { e.target.style.border = "0.667px solid rgba(0,211,243,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; }}
                            onBlur={e => { e.target.style.border = "0.667px solid rgba(255,255,255,0.15)"; e.target.style.boxShadow = "none"; }}
                        />
                    </FormField>

                    {/* Document upload */}
                    <FormField label="Supporting Document (Certificate / CV)" hint="PDF, JPG, or PNG — max 10 MB">
                        <label
                            htmlFor="v-doc"
                            style={{
                                display: "flex", alignItems: "center", gap: "12px",
                                height: "44px", borderRadius: "10px",
                                border: "0.667px dashed rgba(255,255,255,0.2)",
                                padding: "0 14px", fontSize: "14px",
                                color: docName ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                                background: "rgba(255,255,255,0.05)",
                                cursor: "pointer", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.border = "0.667px dashed rgba(0,211,243,0.4)"; e.currentTarget.style.background = "rgba(0,211,243,0.05)"; }}
                            onMouseLeave={e => { e.currentTarget.style.border = "0.667px dashed rgba(255,255,255,0.2)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={docName ? "#00D3F2" : "rgba(255,255,255,0.3)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            {docName || "Click to upload document"}
                            <input id="v-doc" type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFileChange} />
                        </label>
                    </FormField>

                    {/* Submit */}
                    <div className="flex items-center justify-between" style={{ marginTop: "8px" }}>
                        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>
                            By submitting you agree to our verification terms.
                        </p>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2 font-semibold text-white hover:opacity-90 active:scale-[0.98] transition-all"
                            style={{
                                height: "42px", padding: "0 28px", borderRadius: "10px",
                                backgroundImage: submitting ? "none" : "linear-gradient(90deg,#0092b8,#155dfc)",
                                background: submitting ? "rgba(255,255,255,0.08)" : undefined,
                                border: "none", fontSize: "14px",
                                boxShadow: submitting ? "none" : "0 8px 18px rgba(0,184,219,0.2)",
                                cursor: submitting ? "not-allowed" : "pointer",
                                color: submitting ? "rgba(255,255,255,0.4)" : "white",
                            }}
                        >
                            {submitting ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                    </svg>
                                    Submitting…
                                </>
                            ) : (
                                <>
                                    <BadgeCheck size={15} />
                                    Submit for Verification
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </form>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </GlassCard>
    );
}

function ProfileField({ icon, label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-gray-300">{label}</label>
      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500">
        <span className="text-cyan-400">{icon}</span>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent focus:outline-none text-white placeholder-gray-500" />
      </div>
    </div>
  );
}
