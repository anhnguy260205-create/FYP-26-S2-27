import { useState, useEffect } from "react";
import { Gift, X } from "lucide-react";
import { sendGift, getConversationGifts } from "../../api/walletApi.js";

import { stickerFor } from "./giftStickers.js";

const GRADIENT = "linear-gradient(135deg, #F59E0B 0%, #DC2626 100%)";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
    .format(Number(value ?? 0));

/**
 * Red-packet dialog for the expert chat.
 *
 * The split shown here (70 / 30) is display-only — the server recomputes it,
 * so a stale constant can misinform but can never mispay.
 */
export default function GiftDialog({ expert, onClose, onSent }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const expertName = expert.full_name || expert.username;

  useEffect(() => {
    getConversationGifts(expert.user_id).then((res) => {
      if (res.success) setConfig(res);
    });
  }, [expert.user_id]);

  const presets = config?.presets ?? [5, 10, 20, 50, 100, 200];
  const expertPercent = config?.expert_share_percent ?? 70;
  const platformPercent = config?.platform_share_percent ?? 30;
  const minAmount = Number(config?.min_amount ?? 1);
  const maxAmount = Number(config?.max_amount ?? 5000);

  const numeric = Number(amount) || 0;
  const expertGets = Math.round(numeric * (expertPercent / 100) * 100) / 100;
  const platformGets = Math.round((numeric - expertGets) * 100) / 100;

  const handleSend = async () => {
    setError(null);
    if (numeric < minAmount) {
      setError(`Minimum gift is ${formatCurrency(minAmount)}.`);
      return;
    }
    if (numeric > maxAmount) {
      setError(`Premium users can send a maximum of ${formatCurrency(maxAmount)} per gift.`);
      return;
    }

    setSending(true);
    try {
      const res = await sendGift({
        expertUserId: expert.user_id,
        amount: numeric,
        message,
      });
      if (!res.success) {
        setError(res.message || "Could not send gift.");
        return;
      }
      onSent?.(res);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Could not send gift. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(2,6,23,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 400, borderRadius: 18, overflow: "hidden",
          background: "#0F172A", border: "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* Header */}
        <div style={{
          background: GRADIENT, padding: "18px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Gift size={20} color="#fff" />
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>
                Send a Gift
              </div>
              <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11.5 }}>
                to {expertName}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", color: "#fff", padding: 4, lineHeight: 0,
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Stickers */}
          <label style={{
            display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 8,
          }}>
            Stickers
          </label>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8, marginBottom: 16,
          }}>
            {presets.map((preset) => {
              const sticker = stickerFor(preset);
              const active = Number(amount) === preset;
              return (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "10px 0", borderRadius: 10, cursor: "pointer",
                    color: active ? "#fff" : "#cbd5e1",
                    background: active ? GRADIENT : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{sticker.emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{sticker.name}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11.5, opacity: 0.85 }}>
                    ${preset}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <label style={{
            display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6,
          }}>
            Or enter a custom amount (USD, max {formatCurrency(maxAmount)})
          </label>
          <input
            type="number"
            min={minAmount}
            max={maxAmount}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            style={{
              width: "100%", height: 42, borderRadius: 10, padding: "0 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f1f5f9", fontSize: 15,
              fontFamily: "'DM Mono', monospace",
              outline: "none", boxSizing: "border-box", marginBottom: 14,
            }}
          />

          {/* Optional note */}
          <label style={{
            display: "block", color: "#94a3b8", fontSize: 12, marginBottom: 6,
          }}>
            Message <span style={{ color: "#64748b" }}>(optional)</span>
          </label>
          <input
            type="text"
            maxLength={200}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Thanks for the advice!"
            style={{
              width: "100%", height: 42, borderRadius: 10, padding: "0 14px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#f1f5f9", fontSize: 13.5,
              outline: "none", boxSizing: "border-box", marginBottom: 16,
            }}
          />

          {/* Split breakdown — shown so the cut is never a surprise */}
          {numeric > 0 && (
            <div style={{
              background: "rgba(255,255,255,0.04)", borderRadius: 10,
              padding: "12px 14px", marginBottom: 16, fontSize: 12.5,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                color: "#cbd5e1", marginBottom: 6,
              }}>
                <span>{expertName} receives ({expertPercent}%)</span>
                <span style={{ fontFamily: "'DM Mono', monospace", color: "#4ade80" }}>
                  {formatCurrency(expertGets)}
                </span>
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between", color: "#94a3b8",
              }}>
                <span>Platform fee ({platformPercent}%)</span>
                <span style={{ fontFamily: "'DM Mono', monospace" }}>
                  {formatCurrency(platformGets)}
                </span>
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)",
              color: "#fca5a5", borderRadius: 10, padding: "10px 12px",
              fontSize: 12.5, marginBottom: 14,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || numeric < minAmount || numeric > maxAmount}
            style={{
              width: "100%", height: 46, borderRadius: 12, border: "none",
              background: GRADIENT, color: "#fff", fontWeight: 700, fontSize: 14,
              cursor: sending || numeric < minAmount || numeric > maxAmount ? "default" : "pointer",
              opacity: sending || numeric < minAmount || numeric > maxAmount ? 0.5 : 1,
            }}
          >
            {sending ? "Sending…" : `Send ${formatCurrency(numeric)}`}
          </button>

          <p style={{
            color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 12,
          }}>
            Premium gift limit: {formatCurrency(maxAmount)} per gift. Deducted from your assets and shown in Transaction History.
          </p>
        </div>
      </div>
    </div>
  );
}
