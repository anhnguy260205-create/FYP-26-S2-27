import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign, Wallet, Clock3, Users, Star, Lock,
  CheckCircle2, Hourglass, Info,
} from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertCompensationSummary } from "../../api/expertApi.js";

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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatMonth(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: 0 }}>{label}</p>
        <div style={{ borderRadius: 10, background: "rgba(0,211,242,0.1)", color: C.cyan, padding: 8 }}>{icon}</div>
      </div>
      <p style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: C.heading, margin: "10px 0 0" }}>{value}</p>
    </div>
  );
}

function StatusPill({ eligible }) {
  const Icon = eligible ? CheckCircle2 : Hourglass;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 999, padding: "4px 12px",
      fontSize: 11, fontWeight: 700, fontFamily: mono,
      color: eligible ? C.success : C.muted,
      background: eligible ? "rgba(15,157,88,0.1)" : "rgba(91,108,136,0.1)",
    }}>
      <Icon size={12} /> {eligible ? "Paid" : "Not eligible"}
    </span>
  );
}

function LockedView({ reason, verified }) {
  const navigate = useNavigate();
  return (
    <motion.div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #B273FF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ maxWidth: 460, width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "40px 32px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(91,108,136,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: C.muted }}>
            <Lock size={24} />
          </div>
          <h1 style={{ fontFamily: mono, fontSize: 19, fontWeight: 700, color: C.heading, margin: 0 }}>Compensation is locked</h1>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "10px 0 0", lineHeight: 1.7 }}>
            {verified
              ? reason
              : "Only accessible for qualified, verified experts. Apply and get approved to unlock this page."}
          </p>
          <button onClick={() => navigate("/investor/become-expert")}
            style={{ marginTop: 22, padding: "12px 26px", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: mono, fontSize: 13, fontWeight: 700, background: C.accent, color: C.accentText, boxShadow: "0 6px 16px rgba(0,211,242,0.35)" }}>
            {verified ? "View Expert Application" : "Become an Expert →"}
          </button>
        </div>
      </main>
      <Footer />
    </motion.div>
  );
}

export default function ExpertCompensationPage() {
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(!!currentUser?.user_id);

  useEffect(() => {
    if (!currentUser?.user_id) { setLoading(false); return; }
    getExpertCompensationSummary()
      .then((data) => { if (data?.success) setSummary(data); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #B273FF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}>
        <GeneralHeader />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontFamily: mono, fontSize: 13, color: C.muted }}>Loading…</p>
        </main>
        <Footer />
      </div>
    );
  }

  const verified = !!summary?.verified;
  const eligible = !!summary?.eligible;

  // Not verified, or verified but not (yet) meeting the follower/rating bar —
  // either way, no compensation dashboard for them.
  if (!verified || !eligible) {
    return <LockedView verified={verified} reason={summary?.ineligible_reason} />;
  }

  const followerCount = summary?.follower_count ?? 0;
  const followerThreshold = summary?.follower_count_threshold ?? 100;
  const ratingAverage = summary?.rating_average ?? 0;
  const ratingThreshold = summary?.rating_threshold ?? 4.5;
  const history = summary?.history ?? [];

  return (
    <motion.div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom, #B273FF 0px, #FFFFFF 130px, #FFFFFF 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <GeneralHeader />
      <main style={{ flex: 1, maxWidth: 1000, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontFamily: mono, fontSize: 26, fontWeight: 700, color: C.heading, margin: 0, letterSpacing: "0.04em" }}>Compensation</h1>
          <p style={{ fontFamily: sans, fontSize: 13, color: C.muted, margin: "4px 0 0" }}>Your earnings, payout history, and eligibility.</p>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 12, border: "1px solid rgba(180,131,9,0.25)", background: "rgba(180,131,9,0.08)", padding: "12px 16px", marginBottom: 20 }}>
          <Info size={14} color="#B45309" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontFamily: sans, fontSize: 12, color: "#8a5a08", margin: 0 }}>
            Paid monthly for the month that just closed — ${summary?.rate_per_premium_follower?.toFixed(2) ?? "0.10"} per premium follower.
            Payouts are credited straight to your assets and show up in Transaction History.
          </p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" style={{ marginBottom: 20 }}>
          <StatCard icon={<Wallet size={18} />} label="Projected This Month" value={formatCurrency(summary?.projected_payout)} />
          <StatCard icon={<DollarSign size={18} />} label="Total Earned (All Time)" value={formatCurrency(summary?.total_earned)} />
          <StatCard icon={<Clock3 size={18} />} label="Next Payout Date" value={summary?.next_payout_date ? formatDate(summary.next_payout_date) : "—"} />
          <StatCard icon={<Users size={18} />} label="Followers" value={followerCount.toLocaleString()} />
        </div>

        <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px", marginBottom: 20 }}>
          <h3 style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: "0 0 16px" }}>Eligibility</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Users size={13} color={C.cyan} /> Followers</span>
                <span>{followerCount.toLocaleString()} / {followerThreshold.toLocaleString()}</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "rgba(11,29,79,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (followerCount / Math.max(1, followerThreshold)) * 100)}%`, height: "100%", background: C.success, borderRadius: 6 }} />
              </div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Star size={13} color={C.cyan} /> Rating</span>
                <span>{ratingAverage.toFixed(2)}★ / {ratingThreshold}★</span>
              </div>
              <div style={{ height: 8, borderRadius: 6, background: "rgba(11,29,79,0.08)", overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, (ratingAverage / Math.max(1, ratingThreshold)) * 100)}%`, height: "100%", background: C.success, borderRadius: 6 }} />
              </div>
            </div>
          </div>
        </section>

        <section style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px 24px" }}>
          <h3 style={{ fontFamily: mono, fontSize: 15, fontWeight: 700, color: C.heading, margin: "0 0 4px" }}>Payout History</h3>
          <p style={{ fontFamily: sans, fontSize: 12, color: C.muted, margin: "0 0 16px" }}>Your compensation for each completed month.</p>
          {history.length === 0 ? (
            <div style={{ border: "1px dashed rgba(11,29,79,0.2)", borderRadius: 12, padding: "36px 0", textAlign: "center", fontSize: 13, color: C.muted }}>
              No completed months yet — history appears here once your first full calendar month has passed.
            </div>
          ) : (
            <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${C.border}` }}>
              <table className="w-full text-left text-sm">
                <thead style={{ background: "#f8fafc" }}>
                  <tr>
                    <th className="px-4 py-3" style={{ fontFamily: mono, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Month</th>
                    <th className="px-4 py-3" style={{ fontFamily: mono, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Followers</th>
                    <th className="px-4 py-3" style={{ fontFamily: mono, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Amount</th>
                    <th className="px-4 py-3" style={{ fontFamily: mono, fontSize: 10, color: C.muted, textTransform: "uppercase" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((p) => (
                    <tr key={p.period_start} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td className="px-4 py-3" style={{ fontWeight: 600, color: C.heading }}>{formatMonth(p.period_start)}</td>
                      <td className="px-4 py-3" style={{ color: C.muted }}>{Number(p.follower_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-3" style={{ fontWeight: 700, color: C.heading }}>{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3"><StatusPill eligible={p.eligible} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </motion.div>
  );
}
