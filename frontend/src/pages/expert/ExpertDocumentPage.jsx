import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { authFetch } from "../../api/apiClient.js";
import { FileText, Plus, Trash2, Clock, CheckCircle2 } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL;
const DOC_TYPES = ["certification", "degree", "employment", "other"];

// Experts only ever see 3 verification states — Unverified / Pending /
// Approved. A "rejected" status (admin-side only) falls back to Unverified
// below since there's no entry for it here.
const STATUS_CONFIG = {
  not_submitted: { label: "Unverified", icon: FileText,     style: { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.3)" } },
  pending:       { label: "Pending Review", icon: Clock,       style: { color: "#eab308", bg: "rgba(234,179,8,0.12)",  border: "rgba(234,179,8,0.3)"  } },
  approved:      { label: "Approved",       icon: CheckCircle2, style: { color: "#22c55e", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.3)"  } },
};

const docTypeStyle = (type) => {
  if (type === "certification") return { color: "#a855f7", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" };
  if (type === "degree") return { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)" };
  if (type === "employment") return { color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" };
  return { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" };
};

function ExpertDocumentPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");

  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({ name: "", url: "", type: "certification" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("not_submitted");

  useEffect(() => {
    if (!currentUser.user_id) return;
    (async () => {
      try {
        const res = await authFetch(`${API_BASE}/user/expert-information/${currentUser.user_id}`);
        const data = await res.json();
        if (data.success) {
          const info = data.expert_information;
          setDocs(info.documents || []);
          setStatus(info.verification_status || "not_submitted");
        }
      } catch { /* prefill is best-effort — an empty form still works */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addDoc = () => {
    if (!form.name.trim() || !form.url.trim()) return;
    setDocs(prev => [...prev, { ...form }]);
    setForm({ name: "", url: "", type: "certification" });
  };

  const removeDoc = (i) => setDocs(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (docs.length === 0) { setError("Please add at least one document."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await authFetch(`${API_BASE}/expert/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: currentUser.user_id, documents: docs }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(docs.length > 0 ? "pending" : "not_submitted");
        navigate("/expert");
      } else setError(data.message || "Failed to save documents.");
    } catch {
      setError("Could not reach backend. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full rounded-[10px] px-3 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none transition";
  const inputStyle = { height: 42, background: "white", border: "1px solid #d1d5db" };

  return (
    <motion.div
      className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 px-4 py-10"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-[rgba(255,255,255,0.92)] w-full max-w-130 flex flex-col" style={{ borderRadius: "30px", padding: "36px 28px" }}>

        {/* Header */}
        <div className="text-center mb-8">
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(0,146,184,0.1)", border: "1px solid rgba(0,146,184,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <FileText size={22} color="#0092b8" />
          </div>
          <h1 className="font-bold text-black text-2xl leading-tight mb-2">Submit Your Documents</h1>
          <p className="text-gray-500 text-[14px]">
            Add links to your certificates, degrees, or employment letters for admin verification.
          </p>
          {(() => {
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted;
            const StatusIcon = cfg.icon;
            return (
              <span
                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-bold"
                style={{ color: cfg.style.color, background: cfg.style.bg, border: `1px solid ${cfg.style.border}` }}
              >
                <StatusIcon size={12} /> {cfg.label}
              </span>
            );
          })()}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Existing docs list */}
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
                        <p style={{ fontSize: 11, color: "#00D3F2", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.url.length > 45 ? doc.url.slice(0, 45) + "…" : doc.url}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: c.bg, border: `1px solid ${c.border}`, color: c.color, textTransform: "uppercase" }}>{doc.type}</span>
                      <button type="button" onClick={() => removeDoc(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(248,113,113,0.7)", padding: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add document form */}
          <div style={{ padding: "16px", borderRadius: 12, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Add Document</p>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Document name"
                className={inputCls} style={inputStyle} />
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full h-10.5 rounded-[10px] bg-white border border-gray-300 px-3 text-gray-800 text-sm">
                {DOC_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="Document URL (Google Drive, Dropbox…)"
                className={inputCls} style={{ ...inputStyle, flex: 1 }} />
              <button type="button" onClick={addDoc} disabled={!form.name.trim() || !form.url.trim()}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 14px", borderRadius: 10, background: "#0092b8", border: "none", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0, opacity: (!form.name.trim() || !form.url.trim()) ? 0.4 : 1 }}>
                <Plus size={13} /> Add
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-[13px] font-medium">{error}</p>}

          {/* Submit */}
          <button type="submit" disabled={saving}
            className="w-full text-white font-semibold text-[15px] rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-60"
            style={{ height: 52, background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)", marginTop: 4 }}>
            {saving ? "Submitting…" : "Submit Documents →"}
          </button>

          {/* Skip */}
          <button type="button" onClick={() => navigate("/expert")}
            className="w-full text-gray-400 text-[14px] hover:text-gray-600 transition-colors">
            Skip for now
          </button>
        </form>
      </div>
    </motion.div>
  );
}

export default ExpertDocumentPage;
