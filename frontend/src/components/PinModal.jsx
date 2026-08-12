import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";


export default function PinModal({
  open,
  title = "Enter Transaction PIN",
  subtitle = "Confirm this action with your 6-digit PIN.",
  confirmLabel = "Confirm",
  loading = false,
  error = "",
  onSubmit,
  onClose,
}) {
  const [pin, setPin] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPin("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const submit = (e) => {
    e?.preventDefault();
    if (pin.length === 6 && !loading) onSubmit(pin);
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
          onClick={onClose}
        >
          <motion.form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            style={{
              background: "#fff",
              borderRadius: 20,
              padding: "30px 28px",
              width: "100%",
              maxWidth: 380,
              boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0B1D4F", marginBottom: 6 }}>
              {title}
            </h2>
            <p style={{ fontSize: 13, color: "#5B6C88", marginBottom: 20 }}>{subtitle}</p>

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              disabled={loading}
              placeholder="••••••"
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full text-center font-mono"
              style={{
                height: 56,
                fontSize: 28,
                letterSpacing: "14px",
                borderRadius: 14,
                border: error ? "1.5px solid #ef4444" : "1px solid #d1d5db",
                background: "#F8FAFC",
                color: "#0F172A",
                outline: "none",
              }}
            />

            {error && (
              <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 500, marginTop: 8 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={pin.length !== 6 || loading}
              style={{
                width: "100%",
                height: 50,
                marginTop: 20,
                borderRadius: 14,
                border: "none",
                fontSize: 15,
                fontWeight: 600,
                cursor: pin.length !== 6 || loading ? "not-allowed" : "pointer",
                background: pin.length !== 6 || loading ? "#94A3B8" : "#00D3F2",
                color: "#004450",
              }}
            >
              {loading ? "Verifying…" : confirmLabel}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
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
              Cancel
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
