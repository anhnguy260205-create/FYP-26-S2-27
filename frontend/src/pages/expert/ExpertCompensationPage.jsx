import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign, Wallet, Clock3, Landmark, Lock,
  Briefcase, GraduationCap, MessagesSquare, CheckCircle2, Hourglass,
} from "lucide-react";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertInformation } from "../../api/userApi.js";

function isVerifiedStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "verified" || s === "approved";
}

// No compensation backend exists yet — this page is a UI-complete mock
// (same approach as ExpertPortfolioPage's DEFAULT_PORTFOLIO) ready to be
// wired to a real payouts API once the revenue model is defined.
const SUMMARY = {
  pendingPayout: 842.50,
  totalEarned: 6180.25,
  nextPayoutDate: "2026-08-01",
  payoutMethod: "Bank Transfer •••• 4821",
};

const EARNINGS_BREAKDOWN = [
  { Icon: Briefcase, label: "Model Portfolio Subscribers", value: 3120.00, accent: "cyan" },
  { Icon: GraduationCap, label: "Knowledge Hub Articles", value: 1840.75, accent: "violet" },
  { Icon: MessagesSquare, label: "Investor Consultations", value: 1219.50, accent: "emerald" },
];

const PAYOUT_HISTORY = [
  { date: "2026-07-01", amount: 780.40, status: "Paid", method: "Bank Transfer" },
  { date: "2026-06-01", amount: 692.10, status: "Paid", method: "Bank Transfer" },
  { date: "2026-05-01", amount: 615.75, status: "Paid", method: "Bank Transfer" },
  { date: "2026-04-01", amount: 550.00, status: "Paid", method: "Bank Transfer" },
];

const ACCENTS = {
  cyan: "bg-cyan-50 text-cyan-700",
  violet: "bg-violet-50 text-violet-700",
  emerald: "bg-emerald-50 text-emerald-700",
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function StatCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ status }) {
  const paid = status === "Paid";
  const Icon = paid ? CheckCircle2 : Hourglass;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${paid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
      <Icon size={12} /> {status}
    </span>
  );
}

export default function ExpertCompensationPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(!!currentUser?.user_id);

  useEffect(() => {
    if (!currentUser?.user_id) return;
    getExpertInformation(currentUser.user_id)
      .then((data) => {
        if (data?.success) setVerification(data.expert_information?.verification_status ?? "pending");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalBreakdown = EARNINGS_BREAKDOWN.reduce((sum, e) => sum + e.value, 0);
  const verified = isVerifiedStatus(verification);

  if (!loading && !verified) {
    return (
      <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <ExpertHeader />
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Lock size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-950">Compensation is locked</h1>
            <p className="mt-2 text-sm text-slate-500">
              You need a verified expert profile before you can view earnings and payouts. Submit your credential documents to get verified.
            </p>
            <button
              onClick={() => navigate("/expert/documents")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
            >
              Submit Documents →
            </button>
          </div>
        </main>
        <Footer />
      </motion.div>
    );
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
      <ExpertHeader />
      <main className="flex flex-col gap-8" style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>
        <div>
          <h1 className="text-3xl font-bold text-white">Compensation</h1>
          <p className="mt-1 text-sm text-slate-300">Track your earnings, payout history, and how you get paid.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Wallet size={18} />} label="Pending Payout" value={formatCurrency(SUMMARY.pendingPayout)} />
          <StatCard icon={<DollarSign size={18} />} label="Total Earned (All Time)" value={formatCurrency(SUMMARY.totalEarned)} />
          <StatCard icon={<Clock3 size={18} />} label="Next Payout Date" value={formatDate(SUMMARY.nextPayoutDate)} />
          <StatCard icon={<Landmark size={18} />} label="Payout Method" value={SUMMARY.payoutMethod} />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-slate-950">Earnings Breakdown</h3>
            <p className="mt-1 text-sm text-slate-500">Where your compensation this period is coming from.</p>
          </div>
          <div className="flex flex-col gap-3">
            {EARNINGS_BREAKDOWN.map(({ Icon, label, value, accent }) => {
              const pct = totalBreakdown > 0 ? (value / totalBreakdown) * 100 : 0;
              return (
                <div key={label} className="flex items-center gap-4">
                  <div className={`rounded-xl p-2.5 shrink-0 ${ACCENTS[accent]}`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(value)}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${accent === "cyan" ? "bg-cyan-500" : accent === "violet" ? "bg-violet-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-slate-950">Payout History</h3>
            <p className="mt-1 text-sm text-slate-500">Your most recent payouts.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {PAYOUT_HISTORY.map((p) => (
                  <tr key={p.date} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">{formatDate(p.date)}</td>
                    <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-4 text-slate-600">{p.method}</td>
                    <td className="px-4 py-4"><StatusPill status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <Footer />
    </motion.div>
  );
}
