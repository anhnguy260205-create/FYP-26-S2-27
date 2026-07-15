import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DollarSign, Wallet, Clock3, Users, Lock,
  CheckCircle2, Hourglass, Info,
} from "lucide-react";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertCompensationSummary } from "../../api/expertApi.js";

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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className="rounded-xl bg-cyan-50 p-2 text-cyan-700">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ eligible }) {
  const Icon = eligible ? CheckCircle2 : Hourglass;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${eligible ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
      <Icon size={12} /> {eligible ? "Earned" : "Not eligible"}
    </span>
  );
}

export default function ExpertCompensationPage() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(!!currentUser?.user_id);

  useEffect(() => {
    if (!currentUser?.user_id) return;
    getExpertCompensationSummary()
      .then((data) => {
        if (data?.success) setSummary(data);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verified = !!summary?.verified;
  const eligible = !!summary?.eligible;
  const followerCount = summary?.follower_count ?? 0;
  const followerThreshold = summary?.follower_threshold ?? 1000;
  const followerProgress = Math.min(100, (followerCount / Math.max(1, followerThreshold)) * 100);
  const history = summary?.history ?? [];

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
              Submit Documents
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
          <p className="mt-1 text-sm text-slate-300">Track your earnings, payout history, and follower eligibility.</p>
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
          <Info size={14} className="mt-0.5 shrink-0" />
          Compensation figures on this page are calculated for display purposes only — no funds are transferred.
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<Wallet size={18} />} label="Pending Payout" value={formatCurrency(summary?.pending_payout)} />
          <StatCard icon={<DollarSign size={18} />} label="Total Earned (All Time)" value={formatCurrency(summary?.total_earned)} />
          <StatCard icon={<Clock3 size={18} />} label="Next Payout Date" value={summary?.next_payout_date ? formatDate(summary.next_payout_date) : "—"} />
          <StatCard icon={<Users size={18} />} label="Followers" value={followerCount.toLocaleString()} />
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-xl font-bold text-slate-950">Follower Eligibility</h3>
              <p className="mt-1 text-sm text-slate-500">
                Reach {followerThreshold.toLocaleString()} followers to earn {formatCurrency(summary?.flat_monthly_amount)}/month.
              </p>
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${eligible ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {eligible ? "Eligible" : "Not yet eligible"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
            <span>{followerCount.toLocaleString()} followers</span>
            <span>{followerThreshold.toLocaleString()} needed</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${eligible ? "bg-emerald-500" : "bg-cyan-500"}`} style={{ width: `${followerProgress}%` }} />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h3 className="text-xl font-bold text-slate-950">Payout History</h3>
            <p className="mt-1 text-sm text-slate-500">Your compensation for each completed month.</p>
          </div>
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
              No completed months yet — history appears here once your first full calendar month has passed.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">Followers</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {history.map((p) => (
                    <tr key={p.period_start} className="hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium text-slate-900">{formatMonth(p.period_start)}</td>
                      <td className="px-4 py-4 text-slate-600">{Number(p.follower_count || 0).toLocaleString()}</td>
                      <td className="px-4 py-4 font-semibold text-slate-900">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-4"><StatusPill eligible={p.eligible} /></td>
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
