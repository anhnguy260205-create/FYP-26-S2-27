import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { updateRiskTolerance } from "../api/userApi.js";

const OPTIONS = [
  { value: "Conservative", desc: "Preserve capital, low risk" },
  { value: "Moderate", desc: "Balanced growth and safety" },
  { value: "Aggressive", desc: "High growth, higher risk" },
];

export function riskDismissedKey(userId) {
  return `riskAssessmentDismissed_${userId}`;
}

/**
 * Preferences / risk-assessment prompt. Shown on login when the user has not
 * set a risk tolerance and has not ticked "Don't show me again".
 *
 * Props:
 *   open     – visible
 *   userId   – current user id (for the dismissed flag + sessionStorage patch)
 *   onDone   – () => void  (called after save or dismiss so parent hides it)
 */
export default function RiskAssessmentModal({ open, userId, onDone }) {
  const [risk, setRisk] = useState("");
  const [dontShow, setDontShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const finish = () => {
    if (dontShow && userId) {
      localStorage.setItem(riskDismissedKey(userId), "1");
    }
    onDone?.();
  };

  const handleSave = async () => {
    if (!risk) {
      setError("Please choose a risk level, or skip for now.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateRiskTolerance(userId, risk);
      const stored = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
      sessionStorage.setItem(
        "currentUser",
        JSON.stringify({ ...stored, risk_tolerance: risk })
      );
      onDone?.();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center px-4"
          style={{ background: "rgba(15,23,42,0.55)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "30px 28px",
              width: "100%",
              maxWidth: 460,
              boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
            }}
          >
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0B1D4F", marginBottom: 6 }}>
              What's your investing style?
            </h2>
            <p style={{ fontSize: 13.5, color: "#5B6C88", marginBottom: 20 }}>
              Tell us your risk preference so we can tailor insights to you. You can change this anytime in your profile.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map(({ value, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setRisk(risk === value ? "" : value); setError(""); }}
                  className="flex flex-col items-center justify-center px-2 py-3 rounded-[12px] font-semibold transition-all text-center"
                  style={{
                    background: risk === value ? "rgba(0,146,184,0.12)" : "rgba(0,0,0,0.05)",
                    border: risk === value ? "1.5px solid #0092b8" : "1.5px solid transparent",
                    color: risk === value ? "#0092b8" : "#555",
                    minHeight: 68,
                    fontSize: 13,
                  }}
                >
                  <span>{risk === value ? "✓ " : ""}{value}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 400, color: risk === value ? "#0092b8" : "#999", marginTop: 3 }}>{desc}</span>
                </button>
              ))}
            </div>

            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, marginTop: 12 }}>{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: "100%",
                height: 50,
                marginTop: 20,
                borderRadius: 14,
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                background: "linear-gradient(90deg, #0092b8, #155dfc)",
                color: "#fff",
              }}
            >
              {saving ? "Saving…" : "Save preference"}
            </button>

            <button
              type="button"
              onClick={finish}
              disabled={saving}
              style={{
                width: "100%",
                marginTop: 10,
                background: "none",
                border: "none",
                color: "#5B6C88",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Skip for now
            </button>

            <label className="flex items-center justify-center gap-2 mt-3 select-none" style={{ fontSize: 12, color: "#94A3B8", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => setDontShow(e.target.checked)}
                style={{ accentColor: "#0092b8" }}
              />
              Don't show me again
            </label>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
