import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authFetch } from "../../api/apiClient.js";
import { getExpertPortfolio } from "../../api/expertApi.js";
import { openChatWith } from "../../components/chat/ChatDock.jsx";
import {
    Star, Briefcase, Shield, BadgeCheck, ArrowLeft, MessageSquare,
    Mail, Link2, MapPin, PieChart, Wallet, Layers, Clock3, TrendingUp, Target,
} from "lucide-react";

/*
 * Expert profile — core info from the expert's account.
 *
 * View limits (enforced by the backend /expert/public-profile endpoint):
 *   - basic investors: up to 3 DISTINCT expert profiles (lifetime);
 *     re-viewing an already-unlocked profile is free
 *   - premium investors / experts: unlimited
 * Premium users get an "Ask Question" button that jumps to the Messages
 * section (Forum > Messages) with this expert's conversation open.
 */

const CARD = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
};

function initials(name = "?") {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function StatCard({ icon: Icon, color, value, label }) {
    return (
        <div className="p-5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icon size={20} color={color} />
            <h3 className="mt-2 text-xl font-bold">{value ?? "—"}</h3>
            <p style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
        </div>
    );
}

function InfoCard({ icon: Icon, label, children }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Icon size={16} color="#60a5fa" />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</div>
                {children}
            </div>
        </div>
    );
}

// ── Expert portfolio (created by the expert, shown to investors) ──────────

function formatCurrency(value) {
    const n = Number(value || 0);
    return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const SEGMENT_COLORS = ["#06b6d4", "#3b82f6", "#6366f1", "#22c55e", "#a855f7", "#f59e0b"];

function AllocationBar({ holdings }) {
    const segments = holdings.filter(h => Number(h.allocation_percentage || 0) > 0);
    return (
        <div>
            <div className="flex overflow-hidden rounded-full h-3"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}>
                {segments.map((h, i) => (
                    <div key={`${h.ticker}-${i}`}
                        title={`${h.ticker} ${h.allocation_percentage}%`}
                        style={{
                            width: `${Number(h.allocation_percentage || 0)}%`,
                            background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                        }} />
                ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {segments.map((h, i) => (
                    <span key={`${h.ticker}-lg-${i}`} className="flex items-center gap-1.5 text-xs"
                        style={{ color: "rgba(255,255,255,0.55)" }}>
                        <span style={{
                            width: 8, height: 8, borderRadius: 2,
                            background: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                        }} />
                        {h.ticker} {Number(h.allocation_percentage || 0).toFixed(1)}%
                    </span>
                ))}
            </div>
        </div>
    );
}

function PortfolioSection({ portfolio, error }) {
    if (error) {
        return (
            <div style={{ ...CARD, padding: 24 }} className="mt-6 text-center">
                <p style={{ fontSize: 13, color: "#f87171" }}>
                    Could not load this expert's portfolio: {error}
                </p>
            </div>
        );
    }
    if (!portfolio) return null;
    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const totalInvested = holdings.reduce((s, h) => s + Number(h.total_invested || 0), 0);

    const TH = { padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.35)", textAlign: "left", whiteSpace: "nowrap" };
    const TD = { padding: "12px 14px", fontSize: 13, color: "rgba(255,255,255,0.75)", verticalAlign: "top" };

    return (
        <div style={{ ...CARD, padding: 30 }} className="mt-6">
            {/* Portfolio header */}
            <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center"
                        style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "rgba(0,211,243,0.1)", border: "1px solid rgba(0,211,243,0.25)",
                        }}>
                        <Briefcase size={20} color="#00D3F2" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{portfolio.portfolio_name || "Expert Portfolio"}</h2>
                        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                            Created {formatDate(portfolio.created_at)}
                            {portfolio.last_rebalanced ? ` · Rebalanced ${formatDate(portfolio.last_rebalanced)}` : ""}
                        </p>
                    </div>
                </div>
                <span style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e",
                }}>
                    ● {portfolio.status || "Active"}
                </span>
            </div>

            {portfolio.description && (
                <p className="mt-4" style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
                    {portfolio.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
                <StatCard icon={TrendingUp} color="#22c55e" value={formatCurrency(totalInvested)} label="Total Invested" />
                <StatCard icon={Layers} color="#60a5fa" value={holdings.length} label="Holdings" />
                <StatCard icon={Wallet} color="#f59e0b" value={formatCurrency(portfolio.cash_balance)} label="Cash Balance" />
                <StatCard icon={Clock3} color="#00D3F2" value={formatDate(portfolio.last_rebalanced)} label="Last Rebalanced" />
            </div>

            {/* Overview */}
            <div className="grid gap-3 md:grid-cols-2 mt-6">
                <InfoCard icon={Target} label="Investment Objective">
                    <div style={{ fontSize: 13 }}>{portfolio.investment_objective || "—"}</div>
                </InfoCard>
                <InfoCard icon={Clock3} label="Time Horizon">
                    <div style={{ fontSize: 13 }}>{portfolio.time_horizon || "—"}</div>
                </InfoCard>
                <InfoCard icon={Shield} label="Risk Level">
                    <div style={{ fontSize: 13 }}>{portfolio.risk_level || "—"}</div>
                </InfoCard>
                <InfoCard icon={PieChart} label="Target Audience">
                    <div style={{ fontSize: 13 }}>{portfolio.target_audience || "—"}</div>
                </InfoCard>
            </div>

            {/* Allocation */}
            {holdings.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Allocation
                    </h3>
                    <AllocationBar holdings={holdings} />
                </div>
            )}

            {/* Holdings table */}
            <div className="mt-6">
                <h3 className="text-lg font-bold mb-3">Holdings</h3>
                {holdings.length === 0 ? (
                    <div className="p-6 text-center rounded-xl"
                        style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                        This expert has not added any holdings yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl"
                        style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                                <tr>
                                    <th style={TH}>#</th>
                                    <th style={TH}>Ticker</th>
                                    <th style={TH}>Company</th>
                                    <th style={TH}>Sector</th>
                                    <th style={TH}>Units</th>
                                    <th style={TH}>Buy Price</th>
                                    <th style={TH}>Invested</th>
                                    <th style={TH}>Weight</th>
                                    <th style={TH}>Rationale</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h, i) => (
                                    <tr key={`${h.ticker}-${i}`}
                                        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                        <td style={{ ...TD, color: "rgba(255,255,255,0.4)" }}>{i + 1}</td>
                                        <td style={{ ...TD, fontWeight: 700, color: "#00D3F2" }}>{h.ticker}</td>
                                        <td style={{ ...TD, fontWeight: 500, color: "#f8fafc" }}>{h.company_name || "—"}</td>
                                        <td style={TD}>{h.sector || h.asset_class || "—"}</td>
                                        <td style={TD}>{Number(h.units || 0).toLocaleString()}</td>
                                        <td style={TD}>${Number(h.average_buy_price || 0).toFixed(2)}</td>
                                        <td style={{ ...TD, fontWeight: 600, color: "#f8fafc" }}>{formatCurrency(h.total_invested)}</td>
                                        <td style={TD}>
                                            <span style={{
                                                padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                                                background: "rgba(0,211,243,0.1)", color: "#00D3F2",
                                            }}>
                                                {Number(h.allocation_percentage || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td style={{ ...TD, maxWidth: 280, color: "rgba(255,255,255,0.5)" }}>
                                            {h.purchase_rationale || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function LimitLock({ viewsLimit, navigate }) {
    return (
        <div style={{ ...CARD, padding: "48px 30px", textAlign: "center" }}
            className="flex flex-col items-center gap-3">
            <div style={{
                width: 64, height: 64, borderRadius: "50%", fontSize: 28,
                background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
            }}>🔒</div>
            <h2 className="text-xl font-bold text-slate-100">
                You've used all {viewsLimit ?? 3} free profile views
            </h2>
            <p style={{ color: "#94a3b8", fontSize: 14, maxWidth: 420 }}>
                Basic accounts can view up to {viewsLimit ?? 3} expert profiles.
                Upgrade to Premium for unlimited access to every expert — plus
                one-on-one messaging in the Messages section.
            </p>
            <button onClick={() => navigate("/investor/subscription")}
                style={{
                    marginTop: 6, padding: "12px 26px", borderRadius: 14, border: "none",
                    cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 14,
                    background: "linear-gradient(90deg, #d4a017, #b8860b)",
                    boxShadow: "0 10px 22px rgba(212,160,23,0.3)",
                }}>
                Upgrade to Premium →
            </button>
        </div>
    );
}

function ExpertDetails() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("user_id");

    const me = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
    const isPremium = String(me?.subscription_status || "").toLowerCase() === "premium";

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [portfolio, setPortfolio] = useState(null);   // expert-created portfolio
    const [portfolioError, setPortfolioError] = useState("");
    const [quota, setQuota] = useState({});      // views_used / views_limit
    const [limitReached, setLimitReached] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!userId) { setError("No expert selected."); setLoading(false); return; }
        authFetch(`${import.meta.env.VITE_API_URL}/expert/public-profile/${userId}`)
            .then(r => r.json())
            .then(res => {
                if (res.limit_reached) {
                    setLimitReached(true);
                    setQuota({ views_used: res.views_used, views_limit: res.views_limit });
                } else if (res.success) {
                    setProfile(res.profile);
                    setQuota({ views_used: res.views_used, views_limit: res.views_limit });
                    // Load the expert-created portfolio only after the profile
                    // view is allowed (keeps the basic-plan limit meaningful).
                    getExpertPortfolio(userId)
                        .then(p => {
                            if (p?.success && p.portfolio) setPortfolio(p.portfolio);
                            else setPortfolioError(p?.message || "Portfolio not available.");
                        })
                        .catch(err => {
                            console.error("[ExpertDetail] portfolio load failed:", err);
                            setPortfolioError(err?.message || "Request failed.");
                        });
                } else {
                    setError(res.message || "Expert not found.");
                }
            })
            .catch(() => setError("Could not reach backend."))
            .finally(() => setLoading(false));
    }, [userId]);

    const askQuestion = () => {
        if (isPremium) {
            openChatWith({
                user_id: userId,
                full_name: profile?.full_name || profile?.username || "Expert",
                role: "expert",
            });
        } else {
            navigate("/investor/subscription");
        }
    };

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        >
            <GeneralHeader />

            <main className="flex-1 p-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate("/investor/expertportfolio")}
                    className="flex items-center gap-2 mb-6"
                    style={{
                        padding: "10px 18px", borderRadius: "10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                {/* Free-quota banner (basic users only) */}
                {!limitReached && quota.views_limit != null && (
                    <div className="mb-4 px-4 py-2.5 rounded-lg text-xs"
                        style={{ color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}>
                        Basic plan: {quota.views_used} of {quota.views_limit} free expert profile views used.
                        Re-viewing this profile is free.
                    </div>
                )}

                {loading ? (
                    <div style={{ ...CARD, padding: 30 }}>
                        <div className="h-6 w-52 bg-slate-700/40 rounded animate-pulse mb-4" />
                        <div className="h-24 bg-slate-800/40 rounded-xl animate-pulse" />
                    </div>
                ) : limitReached ? (
                    <LimitLock viewsLimit={quota.views_limit} navigate={navigate} />
                ) : error ? (
                    <div style={{ ...CARD, padding: 30 }} className="text-center text-slate-400 text-sm">{error}</div>
                ) : profile && (
                    <>
                    <div style={{ ...CARD, padding: 30 }}>
                        <div className="flex justify-between items-center flex-wrap gap-4">
                            <div className="flex items-center gap-5">
                                <div className="flex items-center justify-center"
                                    style={{
                                        width: 80, height: 80, borderRadius: "50%",
                                        background: "linear-gradient(135deg,#f59e0b,#b45309)",
                                        fontSize: 24, fontWeight: 700,
                                    }}>
                                    {initials(profile.full_name || profile.username)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-3xl font-bold">{profile.full_name || profile.username}</h1>
                                        {profile.verification_status === "approved" && (
                                            <BadgeCheck size={22} color="#22c55e" />
                                        )}
                                    </div>
                                    <p style={{ color: "rgba(255,255,255,0.5)" }}>
                                        Verified Investment Expert
                                        {profile.experience_years ? ` · ${profile.experience_years} years experience` : ""}
                                    </p>
                                </div>
                            </div>

                            {/* Ask Question — premium jumps into Messages */}
                            <button onClick={askQuestion}
                                className="flex items-center gap-2"
                                style={{
                                    padding: "12px 22px", borderRadius: 12, border: "none",
                                    cursor: "pointer", color: "#fff", fontWeight: 600, fontSize: 14,
                                    background: isPremium
                                        ? "linear-gradient(90deg, #0092b8, #155dfc)"
                                        : "linear-gradient(90deg, #d4a017, #b8860b)",
                                    boxShadow: isPremium
                                        ? "0 10px 20px rgba(0,184,219,0.25)"
                                        : "0 10px 20px rgba(212,160,23,0.25)",
                                }}>
                                <MessageSquare size={16} />
                                {isPremium ? "Ask Question" : "Upgrade to Ask Questions 🔒"}
                            </button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-8">
                            <StatCard icon={Star} color="#f59e0b"
                                value={profile.rating ? Number(profile.rating).toFixed(1) : "—"} label="Rating" />
                            <StatCard icon={Briefcase} color="#60a5fa"
                                value={profile.experience_years ? `${profile.experience_years} Years` : "—"} label="Experience" />
                            <StatCard icon={Shield} color="#22c55e"
                                value={profile.risk_tolerance || "—"} label="Risk Style" />
                            <StatCard icon={BadgeCheck} color="#00D3F2"
                                value={profile.verification_status || "—"} label="Verification" />
                        </div>

                        {/* Core info */}
                        <div className="mt-8">
                            <h2 className="text-lg font-bold mb-3">Core Information</h2>
                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoCard icon={Mail} label="Email">
                                    <div style={{ fontSize: 14 }}>{profile.email_address || "—"}</div>
                                </InfoCard>
                                <InfoCard icon={Link2} label="LinkedIn">
                                    {profile.linked_in_url ? (
                                        <a href={profile.linked_in_url.startsWith("http") ? profile.linked_in_url : `https://${profile.linked_in_url}`}
                                            target="_blank" rel="noreferrer"
                                            style={{ fontSize: 14, color: "#00D3F2", wordBreak: "break-all" }}>
                                            {profile.linked_in_url}
                                        </a>
                                    ) : <div style={{ fontSize: 14 }}>—</div>}
                                </InfoCard>
                                <InfoCard icon={MapPin} label="Location">
                                    <div style={{ fontSize: 14 }}>{profile.address || "—"}</div>
                                </InfoCard>
                                <InfoCard icon={Shield} label="Username">
                                    <div style={{ fontSize: 14 }}>@{profile.username || "—"}</div>
                                </InfoCard>
                            </div>
                        </div>
                    </div>

                    {/* Expert-created portfolio */}
                    <PortfolioSection portfolio={portfolio} error={portfolioError} />
                    </>
                )}
            </main>

            <Footer />
        </motion.div>
    );
}

export default ExpertDetails;
