import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
  getWalletOverview,
  cashIn,
  cashOut,
} from "../../api/walletApi.js";
import PinModal from "../../components/PinModal.jsx";

/* ─── Helpers ─────────────────────────────────────────────── */
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-SG", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

// Wallet rows only — stock buys/sells live in Transaction History.
const TXN_LABELS = {
  cash_in: { label: "Deposit", color: "#0F9D58" },
  cash_out: { label: "Withdrawal", color: "#DC2626" },
  platform_fee: { label: "Platform fee", color: "#DC2626" },
  gift_sent: { label: "Gift sent", color: "#DC2626" },
  gift_received: { label: "Gift received", color: "#0F9D58" },
  compensation: { label: "Expert compensation", color: "#0F9D58" },
};

const BANKS = [
  "DBS Bank", "OCBC Bank", "United Overseas Bank (UOB)",
  "Standard Chartered", "Citibank", "Maybank", "HSBC",
];

export default function CashPortalPage() {
  const [mode, setMode] = useState("cash_in");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState(BANKS[0]);
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinError, setPinError] = useState("");

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const isDeposit = mode === "cash_in";

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getWalletOverview();
    if (res.success) setOverview(res);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const balance = overview?.assets ?? null;
  const limits = overview?.limits ?? {};
  const minAmount = isDeposit ? limits.min_cash_in : limits.min_cash_out;
  const maxAmount = isDeposit ? limits.max_cash_in : limits.max_cash_out;

  const numericAmount = Number(amount) || 0;
  const exceedsBalance =
    !isDeposit && balance != null && numericAmount > balance;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (numericAmount <= 0) {
      setFeedback({ ok: false, message: "Enter an amount greater than zero." });
      return;
    }
    if (exceedsBalance) {
      setFeedback({
        ok: false,
        message: `You only have ${formatCurrency(balance)} available.`,
      });
      return;
    }

    // Deposits go through directly; withdrawals require the transaction PIN.
    if (isDeposit) {
      await runTransfer();
    } else {
      setPinError("");
      setPinOpen(true);
    }
  };

  const runTransfer = async (pin = null) => {
    setSubmitting(true);
    setPinError("");
    try {
      const payload = { amount: numericAmount, bankName, accountNumber, pin };
      const res = isDeposit ? await cashIn(payload) : await cashOut(payload);

      if (!res.success && !isDeposit && /pin/i.test(res.message || "")) {
        setPinError(res.message || "Incorrect transaction PIN");
        return;
      }

      setPinOpen(false);
      setFeedback({ ok: !!res.success, message: res.message });
      if (res.success) {
        setAmount("");
        setAccountNumber("");
        await load();
      }
    } catch (error) {
      console.error(error);
      setPinOpen(false);
      setFeedback({ ok: false, message: "Request failed. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const cardStyle = {
    background: "#FFFFFF",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: "14px",
    padding: "24px",
  };

  const labelStyle = {
    display: "block",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    color: "#5B6C88",
    marginBottom: "6px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "8px",
    border: "1px solid rgba(15,23,42,0.15)",
    background: "#F8FAFC",
    fontFamily: "'DM Mono', monospace",
    fontSize: "14px",
    color: "#0F172A",
    boxSizing: "border-box",
  };

  return (
    <>
      <GeneralHeader />
      <main style={{ background: "#F1F5F9", minHeight: "100vh", padding: "40px 20px" }}>
        <div style={{ maxWidth: "1080px", margin: "0 auto" }}>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
              fontSize: "28px", color: "#0B1D4F", marginBottom: "6px",
            }}>
              Cash Portal
            </h1>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: "14px",
              color: "#5B6C88", marginBottom: "28px",
            }}>
              Add funds to or withdraw funds from your trading account.
            </p>
          </motion.div>

          {/* Sandbox notice — this must never be mistaken for real banking. */}
          <div style={{
            background: "#FEF3C7", border: "1px solid #FCD34D",
            borderRadius: "10px", padding: "14px 16px", marginBottom: "24px",
            fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#92400E",
          }}>
            <strong>Sandbox mode.</strong> No real money moves and no real bank
            account is contacted. Transfers settle instantly against your assets
            balance. Account numbers are stored masked (last 4 digits only).
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 420px) minmax(0, 1fr)",
            gap: "24px", alignItems: "start",
          }}>

            {/* ── Form ─────────────────────────────────────── */}
            <div style={cardStyle}>
              {/* Mode toggle */}
              <div style={{
                display: "flex", gap: "8px", marginBottom: "22px",
                background: "#F1F5F9", padding: "4px", borderRadius: "10px",
              }}>
                {[
                  { key: "cash_in", label: "Cash In" },
                  { key: "cash_out", label: "Cash Out" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => { setMode(option.key); setFeedback(null); }}
                    style={{
                      flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                      cursor: "pointer",
                      background: mode === option.key ? "#0B1D4F" : "transparent",
                      color: mode === option.key ? "#FFFFFF" : "#5B6C88",
                      fontFamily: "'DM Mono', monospace", fontWeight: 600,
                      fontSize: "12px", letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div style={{
                background: "#F8FAFC", borderRadius: "10px", padding: "14px",
                marginBottom: "20px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#5B6C88",
                }}>
                  Available Balance
                </span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontWeight: 700,
                  fontSize: "18px", color: "#0F172A",
                }}>
                  {loading ? "…" : formatCurrency(balance)}
                </span>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle} htmlFor="bank-name">Bank Name</label>
                  <select
                    id="bank-name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    style={{ ...inputStyle, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {BANKS.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle} htmlFor="account-number">
                    Account Number
                  </label>
                  <input
                    id="account-number"
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 0123456789"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    style={inputStyle}
                    required
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={labelStyle} htmlFor="amount">
                    Amount (USD)
                    {minAmount != null && (
                      <span style={{ color: "#94A3B8", marginLeft: "6px" }}>
                        {formatCurrency(minAmount)} – {formatCurrency(maxAmount)}
                      </span>
                    )}
                  </label>
                  <input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  {exceedsBalance && (
                    <p style={{
                      color: "#DC2626", fontSize: "12px", marginTop: "6px",
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      Amount exceeds your available balance.
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || exceedsBalance}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "8px", border: "none",
                    background: submitting || exceedsBalance ? "#94A3B8"
                      : (isDeposit ? "#0F9D58" : "#0B1D4F"),
                    color: "#FFFFFF", fontFamily: "'DM Mono', monospace",
                    fontWeight: 600, fontSize: "13px", letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    cursor: submitting || exceedsBalance ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting
                    ? "Processing…"
                    : isDeposit ? "Deposit Funds" : "Withdraw Funds"}
                </button>
              </form>

              {feedback && (
                <div style={{
                  marginTop: "16px", padding: "12px 14px", borderRadius: "8px",
                  background: feedback.ok ? "#DCFCE7" : "#FEE2E2",
                  color: feedback.ok ? "#166534" : "#991B1B",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                }}>
                  {feedback.message}
                </div>
              )}
            </div>

            {/* ── Ledger ───────────────────────────────────── */}
            <div style={cardStyle}>
              <h2 style={{
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                fontSize: "18px", color: "#0B1D4F", marginBottom: "4px",
              }}>
                Wallet Activity
              </h2>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                color: "#5B6C88", marginBottom: "18px",
              }}>
                Deposits, withdrawals, fees, gifts and compensation.
              </p>

              {/* Summary tiles */}
              {overview?.totals && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px", marginBottom: "20px",
                }}>
                  {[
                    { key: "cash_in", label: "Deposited" },
                    { key: "cash_out", label: "Withdrawn" },
                    { key: "fees_paid", label: "Fees paid" },
                    { key: "gifts_received", label: "Gifts received" },
                    { key: "compensation", label: "Compensation" },
                  ].map((tile) => (
                    <div key={tile.key} style={{
                      background: "#F8FAFC", borderRadius: "10px", padding: "12px",
                    }}>
                      <div style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
                        color: "#5B6C88", marginBottom: "4px",
                      }}>
                        {tile.label}
                      </div>
                      <div style={{
                        fontFamily: "'DM Mono', monospace", fontWeight: 700,
                        fontSize: "15px", color: "#0F172A",
                      }}>
                        {formatCurrency(overview.totals[tile.key])}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading ? (
                <p style={{ color: "#5B6C88", fontFamily: "'DM Sans', sans-serif" }}>
                  Loading…
                </p>
              ) : !overview?.transactions?.length ? (
                <p style={{
                  color: "#5B6C88", fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px", padding: "20px 0", textAlign: "center",
                }}>
                  No wallet activity yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: "11px",
                        color: "#5B6C88", textAlign: "left",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>
                        <th style={{ padding: "8px 6px" }}>Type</th>
                        <th style={{ padding: "8px 6px" }}>Details</th>
                        <th style={{ padding: "8px 6px", textAlign: "right" }}>Amount</th>
                        <th style={{ padding: "8px 6px", textAlign: "right" }}>Balance</th>
                        <th style={{ padding: "8px 6px" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.transactions.map((txn) => {
                        const meta = TXN_LABELS[txn.txn_type] ?? {
                          label: txn.txn_type, color: "#0F172A",
                        };
                        return (
                          <tr key={txn.wallet_txn_id} style={{
                            borderTop: "1px solid rgba(15,23,42,0.06)",
                            fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                            color: "#0F172A",
                          }}>
                            <td style={{ padding: "10px 6px", whiteSpace: "nowrap" }}>
                              <span style={{
                                display: "inline-block", padding: "3px 8px",
                                borderRadius: "999px", fontSize: "11px",
                                background: "rgba(15,23,42,0.05)", color: meta.color,
                                fontWeight: 600,
                              }}>
                                {meta.label}
                              </span>
                            </td>
                            <td style={{ padding: "10px 6px", color: "#5B6C88" }}>
                              {txn.description || "—"}
                            </td>
                            <td style={{
                              padding: "10px 6px", textAlign: "right",
                              fontFamily: "'DM Mono', monospace", fontWeight: 600,
                              color: txn.amount >= 0 ? "#0F9D58" : "#DC2626",
                            }}>
                              {txn.amount >= 0 ? "+" : "−"}
                              {formatCurrency(Math.abs(txn.amount))}
                            </td>
                            <td style={{
                              padding: "10px 6px", textAlign: "right",
                              fontFamily: "'DM Mono', monospace", color: "#5B6C88",
                            }}>
                              {txn.balance_after != null
                                ? formatCurrency(txn.balance_after) : "—"}
                            </td>
                            <td style={{
                              padding: "10px 6px", color: "#5B6C88",
                              whiteSpace: "nowrap", fontSize: "12px",
                            }}>
                              {formatDate(txn.created_at)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <PinModal
        open={pinOpen}
        title="Confirm Withdrawal"
        subtitle={`Enter your 6-digit PIN to withdraw ${formatCurrency(numericAmount)}.`}
        confirmLabel="Confirm Withdrawal"
        loading={submitting}
        error={pinError}
        onSubmit={(pin) => runTransfer(pin)}
        onClose={() => { if (!submitting) { setPinOpen(false); setPinError(""); } }}
      />
    </>
  );
}
