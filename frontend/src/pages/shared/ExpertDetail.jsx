import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import RoleHeader from "../../layout/RoleHeader.jsx";
import { isExpertUser, getPageBackground } from "../../utils/userRole.js";
import Footer from "../../layout/Footer.jsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authFetch } from "../../api/apiClient.js";
import {
    getExpertPortfolio, followExpert, unfollowExpert,
    getPortfolioReviews, submitPortfolioReview, deletePortfolioReview,
} from "../../api/expertApi.js";
import { openChatWith } from "../../components/chat/ChatDock.jsx";
import {
    Star, Briefcase, Shield, BadgeCheck, ArrowLeft, MessageSquare,
    Mail, Link2, MapPin, PieChart, Wallet, Layers, Clock3, TrendingUp, Target,
    Users, UserPlus, UserCheck, X, Trash2,
} from "lucide-react";

/*
 * Expert profile — core info from the expert's account.
 *
 * View limits (enforced by the backend /expert/public-profile endpoint):
 *   - basic investors: up to 3 DISTINCT expert profiles (lifetime);
 *     re-viewing an already-unlocked profile is free
 *   - premium investors / experts: unlimited
 * Premium users get an "Ask Question" button that jumps to the Messages
 * section (Forum > Messages) with this expert's conversation open. Expert
 * viewers never see this button — subscription plans are an investor concept.
 */

const CARD = {
    background: "#FFFFFF",
    border: "1px solid rgba(11,29,79,0.25)",
    borderRadius: "20px",
};

function initials(name = "?") {
    return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function StatCard({ icon: Icon, color, bg, value, label }) {
    return (
        <div className="p-5 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid rgba(11,29,79,0.12)" }}>
            <span style={{
                width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                background: bg || "rgba(0,146,184,0.12)", color,
            }}>
                <Icon size={17} strokeWidth={2.25} />
            </span>
            <h3 className="mt-3 text-xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#0B1D4F" }}>{value ?? "—"}</h3>
            <p style={{ color: "#5B6C88", fontSize: 12 }}>{label}</p>
        </div>
    );
}

function InfoCard({ icon: Icon, label, children }) {
    return (
        <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#F8FAFC", border: "1px solid rgba(11,29,79,0.12)" }}>
            <Icon size={16} color="#0092b8" />
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "#5B6C88" }}>{label}</div>
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

// Validated categorical palette (dark-mode steps, see dataviz skill's
// palette.md) — only the first 4 slots clear the CVD floor once any two
// segments can end up adjacent, so allocation folds past the top 4 holdings
// into a neutral "Other" slice rather than adding a 5th hue.
const ALLOCATION_COLORS = ["#3987e5", "#008300", "#d55181", "#c98500"];
const ALLOCATION_OTHER_COLOR = "#64748b";

function AllocationPie({ holdings }) {
    const [hovered, setHovered] = useState(null);

    const sorted = [...holdings]
        .filter(h => Number(h.allocation_percentage || 0) > 0)
        .sort((a, b) => Number(b.allocation_percentage || 0) - Number(a.allocation_percentage || 0));

    const top = sorted.slice(0, 4);
    const otherPct = sorted.slice(4)
        .reduce((s, h) => s + Number(h.allocation_percentage || 0), 0);

    const segments = [
        ...top.map((h, i) => ({
            label: h.ticker,
            pct: Number(h.allocation_percentage || 0),
            color: ALLOCATION_COLORS[i],
        })),
        ...(otherPct > 0 ? [{ label: "Other", pct: otherPct, color: ALLOCATION_OTHER_COLOR }] : []),
    ];
    const total = segments.reduce((s, seg) => s + seg.pct, 0) || 1;

    const size = 260;
    const strokeWidth = 32;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const gap = 5;

    let offset = 0;
    const arcs = segments.map(seg => {
        const rawLen = (seg.pct / total) * circumference;
        const arc = {
            ...seg,
            dasharray: `${Math.max(rawLen - gap, 0)} ${circumference}`,
            dashoffset: -offset,
        };
        offset += rawLen;
        return arc;
    });

    const hoveredArc = hovered != null ? arcs[hovered] : null;

    return (
        <div className="flex flex-col items-center gap-6">
            <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
                    style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
                    <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
                        stroke="rgba(11,29,79,0.08)" strokeWidth={strokeWidth} />
                    {arcs.map((arc, i) => (
                        <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none"
                            stroke={arc.color}
                            strokeWidth={hovered === i ? strokeWidth + 6 : strokeWidth}
                            strokeLinecap="round"
                            strokeDasharray={arc.dasharray} strokeDashoffset={arc.dashoffset}
                            style={{
                                opacity: hovered == null || hovered === i ? 1 : 0.35,
                                cursor: "pointer",
                                transition: "opacity 150ms ease, stroke-width 150ms ease",
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label={`${arc.label}: ${arc.pct.toFixed(1)}%`}
                            onMouseEnter={() => setHovered(i)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(i)}
                            onBlur={() => setHovered(null)}>
                            <title>{`${arc.label}: ${arc.pct.toFixed(1)}%`}</title>
                        </circle>
                    ))}
                </svg>
                <div style={{
                    position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center", pointerEvents: "none",
                }}>
                    {hoveredArc ? (
                        <>
                            <div className="text-3xl font-bold" style={{ color: "#0B1D4F" }}>{hoveredArc.pct.toFixed(1)}%</div>
                            <div style={{ fontSize: 13, color: "#5B6C88" }}>
                                {hoveredArc.label}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-3xl font-bold" style={{ color: "#0B1D4F" }}>{sorted.length}</div>
                            <div style={{ fontSize: 13, color: "#5B6C88" }}>
                                {sorted.length === 1 ? "Holding" : "Holdings"}
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
                {arcs.map((arc, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs"
                        style={{
                            padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                            opacity: hovered == null || hovered === i ? 1 : 0.45,
                            background: hovered === i ? "rgba(11,29,79,0.06)" : "transparent",
                            transition: "opacity 150ms ease, background 150ms ease",
                        }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}>
                        <span style={{
                            width: 10, height: 10, borderRadius: 3,
                            background: arc.color, flexShrink: 0,
                        }} />
                        <span style={{ fontWeight: 600, color: "#0F172A" }}>{arc.label}</span>
                        <span style={{ color: "#5B6C88" }}>{arc.pct.toFixed(1)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function PortfolioSection({ portfolio, error, notPublished }) {
    if (notPublished) {
        return (
            <div style={{ ...CARD, padding: 28 }} className="mt-6 text-center">
                <p style={{ fontSize: 14, fontWeight: 600, color: "#0B1D4F", margin: 0 }}>
                    Portfolio not published
                </p>
                <p style={{ fontSize: 13, color: "#5B6C88", margin: "6px 0 0" }}>
                    This expert hasn't published their trading portfolio yet — check back later.
                </p>
            </div>
        );
    }
    if (error) {
        return (
            <div style={{ ...CARD, padding: 24 }} className="mt-6 text-center">
                <p style={{ fontSize: 13, color: "#DC2626" }}>
                    Could not load this expert's portfolio: {error}
                </p>
            </div>
        );
    }
    if (!portfolio) return null;
    const holdings = Array.isArray(portfolio.holdings) ? portfolio.holdings : [];
    const totalInvested = holdings.reduce((s, h) => s + Number(h.total_invested || 0), 0);

    const TH = { padding: "10px 14px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#5B6C88", textAlign: "left", whiteSpace: "nowrap" };
    const TD = { padding: "12px 14px", fontSize: 13, color: "#0F172A", verticalAlign: "top" };

    return (
        <div style={{ ...CARD, padding: 30 }}>
            {/* Portfolio header */}
            <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center"
                        style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "rgba(0,146,184,0.12)", border: "1px solid rgba(0,146,184,0.3)",
                        }}>
                        <Briefcase size={20} color="#0092b8" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: "#0B1D4F" }}>{portfolio.portfolio_name || "Expert Portfolio"}</h2>
                        <p style={{ fontSize: 13, color: "#5B6C88" }}>
                            Created {formatDate(portfolio.created_at)}
                            {portfolio.last_rebalanced ? ` · Rebalanced ${formatDate(portfolio.last_rebalanced)}` : ""}
                        </p>
                    </div>
                </div>
                <span style={{
                    padding: "5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                    background: "rgba(15,157,88,0.12)", border: "1px solid rgba(15,157,88,0.3)", color: "#0F9D58",
                }}>
                    ● {portfolio.status || "Active"}
                </span>
            </div>

            {portfolio.description && (
                <p className="mt-4" style={{ fontSize: 14, lineHeight: 1.6, color: "#33477A" }}>
                    {portfolio.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
                <StatCard icon={TrendingUp} color="#0F9D58" bg="rgba(15,157,88,0.12)" value={formatCurrency(totalInvested)} label="Total Invested" />
                <StatCard icon={Layers} color="#1D4ED8" bg="rgba(29,78,216,0.12)" value={holdings.length} label="Holdings" />
                <StatCard icon={Wallet} color="#B45309" bg="rgba(180,83,9,0.12)" value={formatCurrency(portfolio.cash_balance)} label="Cash Balance" />
                <StatCard icon={Clock3} color="#0092b8" bg="rgba(0,146,184,0.12)" value={formatDate(portfolio.last_rebalanced)} label="Last Rebalanced" />
            </div>

            {/* Overview */}
            <div className="grid gap-3 md:grid-cols-2 mt-6">
                <InfoCard icon={Target} label="Investment Objective">
                    <div style={{ fontSize: 13, color: "#0F172A" }}>{portfolio.investment_objective || "—"}</div>
                </InfoCard>
                <InfoCard icon={Clock3} label="Time Horizon">
                    <div style={{ fontSize: 13, color: "#0F172A" }}>{portfolio.time_horizon || "—"}</div>
                </InfoCard>
                <InfoCard icon={Shield} label="Risk Level">
                    <div style={{ fontSize: 13, color: "#0F172A" }}>{portfolio.risk_level || "—"}</div>
                </InfoCard>
                <InfoCard icon={PieChart} label="Target Audience">
                    <div style={{ fontSize: 13, color: "#0F172A" }}>{portfolio.target_audience || "—"}</div>
                </InfoCard>
            </div>

            {/* Allocation */}
            {holdings.length > 0 && (
                <div className="mt-6">
                    <h3 className="text-sm font-bold mb-2" style={{ color: "#0B1D4F" }}>
                        Allocation
                    </h3>
                    <AllocationPie holdings={holdings} />
                </div>
            )}

            {/* Holdings table */}
            <div className="mt-6">
                <h3 className="text-lg font-bold mb-3" style={{ color: "#0B1D4F" }}>Holdings</h3>
                {holdings.length === 0 ? (
                    <div className="p-6 text-center rounded-xl"
                        style={{ background: "#F8FAFC", color: "#5B6C88", fontSize: 13 }}>
                        This expert has not added any holdings yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl"
                        style={{ border: "1px solid rgba(11,29,79,0.15)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead style={{ background: "#F1F5F9" }}>
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
                                        style={{ borderTop: "1px solid rgba(15,23,42,0.08)" }}>
                                        <td style={{ ...TD, color: "#5B6C88" }}>{i + 1}</td>
                                        <td style={{ ...TD, fontWeight: 700, color: "#0092b8" }}>{h.ticker}</td>
                                        <td style={{ ...TD, fontWeight: 500, color: "#0F172A" }}>{h.company_name || "—"}</td>
                                        <td style={TD}>{h.sector || h.asset_class || "—"}</td>
                                        <td style={TD}>{Number(h.units || 0).toLocaleString()}</td>
                                        <td style={TD}>${Number(h.average_buy_price || 0).toFixed(2)}</td>
                                        <td style={{ ...TD, fontWeight: 600, color: "#0F172A" }}>{formatCurrency(h.total_invested)}</td>
                                        <td style={TD}>
                                            <span style={{
                                                padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                                                background: "rgba(0,146,184,0.1)", color: "#0092b8",
                                            }}>
                                                {Number(h.allocation_percentage || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td style={{ ...TD, maxWidth: 280, color: "#5B6C88" }}>
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

function PortfolioReviewsSection({ stats, reviews, loading, isSelf, myReview, onRate }) {
    return (
        <div style={{ ...CARD, padding: 30 }}>
            <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: "#0B1D4F" }}>Portfolio Reviews</h2>
                    <p style={{ fontSize: 13, color: "#5B6C88" }}>
                        What other investors and experts think of this portfolio
                    </p>
                </div>
                {!isSelf && (
                    <button onClick={onRate}
                        className="flex items-center gap-2"
                        style={{
                            padding: "10px 18px", borderRadius: 12,
                            cursor: "pointer", fontWeight: 600, fontSize: 14,
                            color: "#0B1D4F", background: "rgba(0,146,184,0.1)",
                            border: "1px solid rgba(0,146,184,0.3)",
                        }}>
                        <Star size={16} />
                        {myReview ? "Edit Your Review" : "Write a Review"}
                    </button>
                )}
            </div>

            <div className="flex items-center gap-4 mt-5">
                <div className="text-4xl font-bold" style={{ fontFamily: "'DM Mono', monospace", color: "#0B1D4F" }}>{stats.total ? stats.average.toFixed(1) : "—"}</div>
                <div>
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={16}
                                fill={stats.average >= n ? "#B45309" : "none"}
                                color={stats.average >= n ? "#B45309" : "rgba(11,29,79,0.2)"} />
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: "#5B6C88" }}>
                        {stats.total} review{stats.total === 1 ? "" : "s"}
                    </p>
                </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
                {loading ? (
                    <>
                        <div className="h-16 bg-slate-200 rounded-xl animate-pulse" />
                        <div className="h-16 bg-slate-200 rounded-xl animate-pulse" />
                    </>
                ) : reviews.length === 0 ? (
                    <div className="p-6 text-center rounded-xl"
                        style={{ background: "#F8FAFC", color: "#5B6C88", fontSize: 13 }}>
                        No reviews yet — be the first to rate this portfolio.
                    </div>
                ) : (
                    reviews.map(r => (
                        <div key={r.review_id} className="p-4 rounded-xl"
                            style={{ background: "#F8FAFC", border: "1px solid rgba(11,29,79,0.1)" }}>
                            <div className="flex justify-between items-center mb-1">
                                <span style={{ fontWeight: 600, fontSize: 14, color: "#0F172A" }}>{r.reviewer_name}</span>
                                <span style={{ fontSize: 12, color: "#5B6C88" }}>
                                    {formatDate(r.updated_at || r.created_at)}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 mb-2">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} size={13}
                                        fill={r.rating >= n ? "#B45309" : "none"}
                                        color={r.rating >= n ? "#B45309" : "rgba(11,29,79,0.2)"} />
                                ))}
                            </div>
                            {r.comment && (
                                <p style={{ fontSize: 13, color: "#33477A", lineHeight: 1.5 }}>
                                    {r.comment}
                                </p>
                            )}
                        </div>
                    ))
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
            <h2 className="text-xl font-bold" style={{ color: "#0B1D4F" }}>
                You've used all {viewsLimit ?? 3} free profile views
            </h2>
            <p style={{ color: "#5B6C88", fontSize: 14, maxWidth: 420 }}>
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
                Upgrade to Premium
            </button>
        </div>
    );
}

function ExpertDetails() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("user_id");

    const me = JSON.parse(sessionStorage.getItem("currentUser") || localStorage.getItem("currentUser") || "{}");
    const isExpert = isExpertUser(me);
    const isPremium = String(me?.subscription_status || "").toLowerCase() === "premium";

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [portfolio, setPortfolio] = useState(null);   // expert-created portfolio
    const [portfolioError, setPortfolioError] = useState("");
    const [portfolioNotPublished, setPortfolioNotPublished] = useState(false);
    const [quota, setQuota] = useState({});      // views_used / views_limit
    const [limitReached, setLimitReached] = useState(false);
    const [error, setError] = useState("");
    const [following, setFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followBusy, setFollowBusy] = useState(false);
    const [isSelf, setIsSelf] = useState(false);

    const [portfolioRating, setPortfolioRating] = useState({ average: 0, total: 0 });
    const [showRateModal, setShowRateModal] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [myReview, setMyReview] = useState(null);
    const [rateValue, setRateValue] = useState(5);
    const [rateHover, setRateHover] = useState(0);
    const [rateComment, setRateComment] = useState("");
    const [rateBusy, setRateBusy] = useState(false);

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
                    setFollowing(!!res.profile?.is_following);
                    setFollowerCount(res.profile?.follower_count ?? 0);
                    setIsSelf(!!res.profile?.is_self);
                    setPortfolioRating(res.profile?.portfolio_rating || { average: 0, total: 0 });
                    // Load the expert-created portfolio only after the profile
                    // view is allowed (keeps the basic-plan limit meaningful).
                    getExpertPortfolio(userId)
                        .then(p => {
                            if (p?.success && p.portfolio) setPortfolio(p.portfolio);
                            else if (p?.not_published) setPortfolioNotPublished(true);
                            else setPortfolioError(p?.message || "Portfolio not available.");
                        })
                        .catch(err => {
                            console.error("[ExpertDetail] portfolio load failed:", err);
                            setPortfolioError(err?.message || "Request failed.");
                        });
                    loadReviews();
                } else {
                    setError(res.message || "Expert not found.");
                }
            })
            .catch(() => setError("Could not reach backend."))
            .finally(() => setLoading(false));
    }, [userId]);

    const handleFollowToggle = async () => {
        if (followBusy || !userId) return;
        setFollowBusy(true);
        try {
            const res = following ? await unfollowExpert(userId) : await followExpert(userId);
            if (res.success) {
                setFollowing(res.following);
                setFollowerCount(res.follower_count);
            } else {
                alert(res.message || "Could not update follow status.");
            }
        } catch (err) {
            console.error("[ExpertDetail] follow toggle failed:", err);
            alert("Could not update follow status. Check your connection and try again.");
        } finally {
            setFollowBusy(false);
        }
    };

    const loadReviews = async () => {
        if (!userId) return;
        setReviewsLoading(true);
        try {
            const res = await getPortfolioReviews(userId);
            if (res.success) {
                setReviews(res.reviews || []);
                setPortfolioRating(res.stats || { average: 0, total: 0 });
                setMyReview(res.my_review || null);
                setRateValue(res.my_review?.rating || 5);
                setRateComment(res.my_review?.comment || "");
            }
        } catch (err) {
            console.error("[ExpertDetail] load reviews failed:", err);
        } finally {
            setReviewsLoading(false);
        }
    };

    const openRateModal = () => setShowRateModal(true);

    const handleSubmitReview = async () => {
        if (rateBusy || !userId) return;
        setRateBusy(true);
        try {
            const res = await submitPortfolioReview(userId, { rating: rateValue, comment: rateComment });
            if (res.success) {
                setMyReview(res.review);
                setPortfolioRating(res.stats);
                setReviews(prev => {
                    const rest = prev.filter(r => r.review_id !== res.review.review_id);
                    return [res.review, ...rest];
                });
            } else {
                alert(res.message || "Could not submit review.");
            }
        } catch (err) {
            console.error("[ExpertDetail] submit review failed:", err);
            alert("Could not submit review. Check your connection and try again.");
        } finally {
            setRateBusy(false);
        }
    };

    const handleDeleteReview = async () => {
        if (rateBusy || !userId || !myReview) return;
        setRateBusy(true);
        try {
            const res = await deletePortfolioReview(userId);
            if (res.success) {
                setReviews(prev => prev.filter(r => r.review_id !== myReview.review_id));
                setMyReview(null);
                setPortfolioRating(res.stats);
                setRateValue(5);
                setRateComment("");
            } else {
                alert(res.message || "Could not delete review.");
            }
        } catch (err) {
            console.error("[ExpertDetail] delete review failed:", err);
            alert("Could not delete review. Check your connection and try again.");
        } finally {
            setRateBusy(false);
        }
    };

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

    // Profile header (avatar, follow/rate, stats) stays fixed above the tabs;
    // only the panel below switches.
    const [tab, setTab] = useState("overview");
    const TABS = [
        { key: "overview", label: "Overview" },
        { key: "portfolio", label: "Portfolio" },
        { key: "reviews", label: "Reviews" },
    ];

    return (
        <motion.div
            className="min-h-screen flex flex-col"
            style={{ background: getPageBackground() }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        >
            <RoleHeader />

            <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>

                {/* Back Button */}
                <button
                    onClick={() => navigate("/investor/expertportfolio")}
                    className="flex items-center gap-2 mb-6"
                    style={{
                        padding: "10px 18px", borderRadius: "10px",
                        background: "#FFFFFF", color: "#0B1D4F",
                        border: "1px solid rgba(11,29,79,0.25)",
                    }}
                >
                    <ArrowLeft size={16} />
                    Back
                </button>

                {/* Free-quota banner (basic investors only — experts/premium get unlimited views) */}
                {!limitReached && quota.views_limit != null && (
                    <div className="mb-4 px-4 py-2.5 rounded-lg text-xs"
                        style={{ color: "#B45309", background: "rgba(180,83,9,0.08)", border: "1px solid rgba(180,83,9,0.25)" }}>
                        Basic plan: {quota.views_used} of {quota.views_limit} free expert profile views used.
                        Re-viewing this profile is free.
                    </div>
                )}

                {loading ? (
                    <div style={{ ...CARD, padding: 30 }}>
                        <div className="h-6 w-52 bg-slate-200 rounded animate-pulse mb-4" />
                        <div className="h-24 bg-slate-200 rounded-xl animate-pulse" />
                    </div>
                ) : limitReached ? (
                    <LimitLock viewsLimit={quota.views_limit} navigate={navigate} />
                ) : error ? (
                    <div style={{ ...CARD, padding: 30 }} className="text-center text-slate-600 text-sm">{error}</div>
                ) : profile && (
                    <>
                        <div style={{ ...CARD, padding: 30 }}>
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div className="flex items-center gap-5">
                                    <div className="flex items-center justify-center"
                                        style={{
                                            width: 80, height: 80, borderRadius: "50%",
                                            background: "linear-gradient(135deg,#f59e0b,#b45309)",
                                            fontSize: 24, fontWeight: 700, color: "#fff",
                                        }}>
                                        {initials(profile.full_name || profile.username)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-3xl font-bold" style={{ fontFamily: "'DM Mono', monospace", fontWeight: 800, letterSpacing: "0.01em", color: "#0B1D4F" }}>{profile.full_name || profile.username}</h1>
                                            {profile.verification_status === "approved" && (
                                                <BadgeCheck size={22} color="#0F9D58" />
                                            )}
                                        </div>
                                        <p style={{ color: "#5B6C88" }}>
                                            Verified Investment Expert
                                            {profile.experience_years ? ` · ${profile.experience_years} years experience` : ""}
                                        </p>
                                    </div>
                                </div>

                                {/* Ask Question — premium jumps into Messages. Subscription plans
                                    are an investor concept, so experts never see this. */}
                                {!isExpert && (
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
                                )}
                            </div>

                            {/* Follow / Rate — any signed-in user may follow or rate another
                                expert's portfolio, except themselves. */}
                            {!isSelf && (
                                <div className="flex items-center gap-3 mt-4">
                                    <button onClick={handleFollowToggle} disabled={followBusy}
                                        className="flex items-center gap-2"
                                        style={{
                                            padding: "10px 18px", borderRadius: 12,
                                            cursor: followBusy ? "not-allowed" : "pointer",
                                            fontWeight: 600, fontSize: 14,
                                            opacity: followBusy ? 0.7 : 1,
                                            color: following ? "#0B1D4F" : "#004450",
                                            background: following ? "#F1F5F9" : "#00D3F2",
                                            border: following ? "1px solid rgba(11,29,79,0.2)" : "none",
                                        }}>
                                        {following ? <UserCheck size={16} /> : <UserPlus size={16} />}
                                        {following ? "Following" : "Follow"}
                                    </button>
                                    <button onClick={openRateModal}
                                        className="flex items-center gap-2"
                                        style={{
                                            padding: "10px 18px", borderRadius: 12,
                                            cursor: "pointer",
                                            fontWeight: 600, fontSize: 14,
                                            color: "#0B1D4F",
                                            background: "#F1F5F9",
                                            border: "1px solid rgba(11,29,79,0.2)",
                                        }}>
                                        <Star size={16} />
                                        {myReview ? "Edit Rating" : "Rate"}
                                    </button>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-5 mt-8">
                                <StatCard icon={Users} color="#7C3AED" bg="rgba(124,58,237,0.12)"
                                    value={followerCount.toLocaleString()} label="Followers" />
                                <StatCard icon={Star} color="#B45309" bg="rgba(180,83,9,0.12)"
                                    value={portfolioRating.total ? `${portfolioRating.average.toFixed(1)} (${portfolioRating.total})` : "—"}
                                    label="Portfolio Rating" />
                                <StatCard icon={Briefcase} color="#1D4ED8" bg="rgba(29,78,216,0.12)"
                                    value={profile.experience_years ? `${profile.experience_years} Years` : "—"} label="Experience" />
                                <StatCard icon={Shield} color="#0F9D58" bg="rgba(15,157,88,0.12)"
                                    value={profile.risk_tolerance || "—"} label="Risk Style" />
                                <StatCard icon={BadgeCheck} color="#0092b8" bg="rgba(0,146,184,0.12)"
                                    value={profile.verification_status || "—"} label="Verification" />
                            </div>
                        </div>

                        {/* Tab bar — header above stays put; only the panel below switches */}
                        <div style={{
                            display: "flex", gap: "4px", marginTop: "20px", marginBottom: "20px",
                            borderBottom: "1px solid rgba(11,29,79,0.25)",
                        }}>
                            {TABS.map((t) => (
                                <button key={t.key} onClick={() => setTab(t.key)}
                                    style={{
                                        padding: "10px 18px", fontSize: "14px", fontWeight: 600, background: "transparent",
                                        cursor: "pointer", color: tab === t.key ? "#0B1D4F" : "#5B6C88",
                                        borderBottom: tab === t.key ? "2px solid #0092b8" : "2px solid transparent",
                                    }}>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {tab === "overview" && (
                            <div style={{ ...CARD, padding: 30 }}>
                                <h2 className="text-lg font-bold mb-3" style={{ color: "#0B1D4F" }}>Core Information</h2>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <InfoCard icon={Mail} label="Email">
                                        <div style={{ fontSize: 14, color: "#0F172A" }}>{profile.email_address || "—"}</div>
                                    </InfoCard>
                                    <InfoCard icon={Link2} label="LinkedIn">
                                        {profile.linked_in_url ? (
                                            <a href={profile.linked_in_url.startsWith("http") ? profile.linked_in_url : `https://${profile.linked_in_url}`}
                                                target="_blank" rel="noreferrer"
                                                style={{ fontSize: 14, color: "#0092b8", wordBreak: "break-all" }}>
                                                {profile.linked_in_url}
                                            </a>
                                        ) : <div style={{ fontSize: 14, color: "#0F172A" }}>—</div>}
                                    </InfoCard>
                                    <InfoCard icon={MapPin} label="Location">
                                        <div style={{ fontSize: 14, color: "#0F172A" }}>{profile.address || "—"}</div>
                                    </InfoCard>
                                    <InfoCard icon={Shield} label="Username">
                                        <div style={{ fontSize: 14, color: "#0F172A" }}>@{profile.username || "—"}</div>
                                    </InfoCard>
                                </div>
                            </div>
                        )}

                        {tab === "portfolio" && (
                            <PortfolioSection portfolio={portfolio} error={portfolioError} notPublished={portfolioNotPublished} />
                        )}

                        {tab === "reviews" && (
                            <PortfolioReviewsSection
                                stats={portfolioRating}
                                reviews={reviews}
                                loading={reviewsLoading}
                                isSelf={isSelf}
                                myReview={myReview}
                                onRate={openRateModal}
                            />
                        )}
                    </>
                )}
            </main>

            <Footer />

            {/* Rate this expert's portfolio — modal */}
            {showRateModal && (
                <div className="fixed inset-0 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.6)", zIndex: 50 }}
                    onClick={() => setShowRateModal(false)}>
                    <div style={{
                        ...CARD, padding: 26, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto",
                        background: "#FFFFFF", border: "1px solid rgba(11,29,79,0.25)",
                        boxShadow: "0 25px 60px -15px rgba(15,23,42,0.35)",
                    }}
                        onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold" style={{ color: "#0B1D4F" }}>Rate this portfolio</h2>
                            <button onClick={() => setShowRateModal(false)}
                                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5B6C88" }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex items-center gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} size={28}
                                    onClick={() => setRateValue(n)}
                                    onMouseEnter={() => setRateHover(n)}
                                    onMouseLeave={() => setRateHover(0)}
                                    style={{ cursor: "pointer" }}
                                    fill={(rateHover || rateValue) >= n ? "#B45309" : "none"}
                                    color={(rateHover || rateValue) >= n ? "#B45309" : "rgba(11,29,79,0.2)"}
                                />
                            ))}
                        </div>

                        <textarea
                            value={rateComment}
                            onChange={e => setRateComment(e.target.value)}
                            placeholder="Share your thoughts on this portfolio's holdings, strategy or performance…"
                            rows={4}
                            className="w-full mb-4"
                            style={{
                                padding: 12, borderRadius: 10, resize: "vertical",
                                background: "#F1F5F9", border: "1px solid rgba(11,29,79,0.2)",
                                color: "#0F172A", fontSize: 14,
                            }}
                        />

                        <div className="flex items-center gap-3">
                            <button onClick={handleSubmitReview} disabled={rateBusy}
                                className="flex-1"
                                style={{
                                    padding: "10px 18px", borderRadius: 10, border: "none",
                                    cursor: rateBusy ? "not-allowed" : "pointer", opacity: rateBusy ? 0.7 : 1,
                                    fontWeight: 600, fontSize: 14, color: "#004450", background: "#00D3F2",
                                }}>
                                {myReview ? "Update Review" : "Submit Review"}
                            </button>
                            {myReview && (
                                <button onClick={handleDeleteReview} disabled={rateBusy}
                                    title="Delete your review"
                                    style={{
                                        padding: "10px 14px", borderRadius: 10,
                                        cursor: rateBusy ? "not-allowed" : "pointer",
                                        background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)",
                                        color: "#DC2626",
                                    }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default ExpertDetails;
