import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../../api/apiClient.js";
import { getPublicExpertStats } from "../../api/expertApi.js";
import { openChatWith } from "../../components/chat/ChatDock.jsx";
import {
    Search,
    Users,
    Star,
    PieChart,
    UserRound,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";

// ── Design tokens (light theme) ─────────────────────────────────────────
const C = {
    card: "#FFFFFF",
    card2: "#F1F5F9",
    border: "rgba(11,29,79,0.25)",
    divider: "rgba(15,23,42,0.1)",
    rowBorder: "rgba(15,23,42,0.08)",
    accent: "#00D3F2",
    accentBorder: "rgba(0,211,242,0.3)",
    accentText: "#004450",
    accentRgb: "0,211,242",
    cyan: "#0E7490",
    success: "#0F9D58",
    danger: "#DC2626",
    amber: "#B45309",
    muted: "#5B6C88",
    mutedLight: "rgba(15,23,42,0.5)",
    text: "#0F172A",
};

const PAGE = {
    heading: "#0B1D4F",
    sub: "#33477A",
};

// Experts are loaded from the backend (/expert/public-list) and mapped to
// this display shape. The risk badge reflects the expert's risk_tolerance.
const RISK_MAP = { Aggressive: "High", Moderate: "Moderate", Conservative: "Low" };

function toDisplayExpert(e) {
    const name = e.full_name || "Expert";
    const portfolioRating = e.portfolio_rating || { average: 0, total: 0 };
    return {
        user_id: e.user_id,
        name,
        role: e.experience_years ? `${e.experience_years} yrs experience` : "Verified Expert",
        market: "Global Markets",
        risk: RISK_MAP[e.risk_tolerance] || "Moderate",
        followers: e.follower_count ?? 0,
        // Prefer the real portfolio-review average; fall back to the static
        // Expert.rating field until an expert has any reviews.
        rating: portfolioRating.total > 0 ? portfolioRating.average : Number(e.rating || 0),
        avatar: name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(),
    };
}

const PAGE_SIZE = 6;

const RISK_STYLE = {
    High: { bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.25)", color: "#DC2626" },
    Moderate: { bg: "rgba(180,83,9,0.1)", border: "rgba(180,83,9,0.25)", color: "#B45309" },
    Low: { bg: "rgba(15,157,88,0.1)", border: "rgba(15,157,88,0.25)", color: "#0F9D58" },
};

function Avatar({ initials }) {
    return (
        <div
            className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
            style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg, #155dfc 0%, #0092b8 100%)",
                color: "white",
                letterSpacing: "0.05em",
            }}
        >
            {initials}
        </div>
    );
}

function StarRating({ value }) {
    const full = Math.floor(value);
    return (
        <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                            d="M6 1l1.236 2.505L10 3.882l-2 1.95.472 2.75L6 7.25 3.528 8.582 4 5.832l-2-1.95 2.764-.377z"
                            fill={i < full ? "#B45309" : "rgba(15,23,42,0.15)"}
                        />
                    </svg>
                ))}
            </div>
            <span className="text-xs font-mono" style={{ color: C.muted }}>
                {value.toFixed(1)}
            </span>
        </div>
    );
}

export default function ExpertPortfolio() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const role = String(currentUser?.role || "").toLowerCase();
    const isExpert = role === "expert";
    const canManage = isExpert && currentUser?.verification_status === "approved";

    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [experts, setExperts] = useState([]);
    const [publicStats, setPublicStats] = useState(null);

    useEffect(() => {
        authFetch(`${import.meta.env.VITE_API_URL}/expert/public-list`)
            .then(r => r.json())
            .then(res => {
                if (res.success) setExperts((res.experts || []).map(toDisplayExpert));
            })
            .catch(() => { });

        getPublicExpertStats()
            .then(res => { if (res.success) setPublicStats(res); })
            .catch(() => { });
    }, []);

    const returnPositive = (publicStats?.avg_return ?? 0) >= 0;
    const STATS = [
        { icon: Users, title: "Total Experts", value: publicStats ? publicStats.total_experts : "—", desc: "Active on platform", color: C.cyan, bg: "rgba(14,116,144,0.12)" },
        { icon: Star, title: "Top Rated", value: publicStats?.top_rated?.name || "—", desc: publicStats?.top_rated ? `${publicStats.top_rated.rating.toFixed(1)} rating` : "No ratings yet", color: C.amber, bg: "rgba(180,83,9,0.12)" },
        { icon: PieChart, title: "Avg. Return", value: publicStats ? `${publicStats.avg_return >= 0 ? "+" : ""}${publicStats.avg_return.toFixed(2)}%` : "—", desc: "All time", color: returnPositive ? C.success : C.danger, bg: returnPositive ? "rgba(15,157,88,0.12)" : "rgba(220,38,38,0.12)" },
        { icon: UserRound, title: "Total Followers", value: publicStats ? publicStats.total_followers.toLocaleString() : "—", desc: "Across all experts", color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
    ];

    const filtered = experts.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.market.toLowerCase().includes(query.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSearch = () => setPage(1);

    const COLS = "48px 1fr 1fr 100px 80px 130px 120px";

    return (
        <motion.div className="min-h-screen flex flex-col"
            style={{ background: "linear-gradient(to bottom, #73ADFF 0px, #FFFFFF 130px, #FFFFFF 100%)", color: C.text }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} >
            {isExpert ? <ExpertHeader /> : <GeneralHeader />}

            <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "88px 24px 48px" }}>
                {/* Header */}
                <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1
                            style={{
                                fontFamily: "'DM Mono', monospace",
                                fontSize: "clamp(26px, 6vw, 40px)",
                                fontWeight: 800,
                                color: PAGE.heading,
                                letterSpacing: "0.02em",
                                lineHeight: 1,
                            }}
                        >
                            Expert Portfolio
                        </h1>

                        <p
                            style={{
                                color: PAGE.sub,
                                marginTop: "4px",
                                fontSize: "14px",
                            }}
                        >
                            Explore and invest in portfolios managed by our expert consultants.
                        </p>
                    </div>

                    {canManage && (
                        <button
                            onClick={() => navigate("/expert/portfolio")}
                            style={{
                                padding: "10px 20px",
                                borderRadius: "10px",
                                cursor: "pointer",
                                background: "rgba(0,211,242,0.12)",
                                border: "1px solid rgba(0,211,242,0.3)",
                                color: C.cyan,
                                fontWeight: 600,
                                fontSize: 14,
                                whiteSpace: "nowrap",
                            }}
                        >
                            My Portfolio
                        </button>
                    )}
                </div>
                <hr style={{ marginTop: 16, marginBottom: 16, border: "none", borderTop: `1px solid ${C.divider}` }} />

                {/* Search Bar */}
                <div className="flex gap-3 mb-6">
                    <div
                        className="flex items-center flex-1 px-4"
                        style={{
                            height: "46px",
                            borderRadius: "10px",
                            background: C.card,
                            border: `1px solid ${C.border}`,
                        }}
                    >
                        <Search
                            size={16}
                            color={C.muted}
                        />

                        <input
                            placeholder="Search expert by name or keyword..."
                            value={query}
                            onChange={(e) =>
                                setQuery(e.target.value)
                            }
                            className="flex-1 bg-transparent border-none outline-none ml-3"
                            style={{
                                color: C.text,
                                fontSize: "14px",
                            }}
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        style={{
                            width: "120px",
                            borderRadius: "10px",
                            background: C.accent,
                            border: "none",
                            color: C.accentText,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Search
                    </button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {STATS.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={index}
                                style={{
                                    padding: "18px 20px",
                                    borderRadius: "16px",
                                    background: C.card,
                                    border: `1px solid ${C.border}`,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                    <span style={{
                                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        background: item.bg, color: item.color,
                                    }}>
                                        <Icon size={16} strokeWidth={2.25} />
                                    </span>
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
                                        textTransform: "uppercase", color: C.muted,
                                    }}>
                                        {item.title}
                                    </span>
                                </div>

                                <div
                                    style={{
                                        fontFamily: "'DM Mono', monospace",
                                        fontSize: "20px",
                                        fontWeight: 800,
                                        color: item.color,
                                        lineHeight: 1.15,
                                    }}
                                >
                                    {item.value}
                                </div>

                                <div
                                    style={{
                                        fontSize: "12px",
                                        color: C.mutedLight,
                                        marginTop: "2px",
                                    }}
                                >
                                    {item.desc}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Table Container */}
                <div
                    style={{
                        borderRadius: "20px",
                        overflow: "hidden",
                        background: C.card,
                        border: `1px solid ${C.border}`,
                    }}
                >
                    {/* Table Header */}
                    <div
                        className="grid px-5 py-3"
                        style={{
                            gridTemplateColumns:
                                "2.5fr 1fr 140px 110px 140px",
                            background: C.card2,
                            color: C.muted,
                            fontSize: "12px",
                            borderBottom: `1px solid ${C.border}`,
                        }}
                    >

                        <div>Expert</div>
                        <div>Target Market</div>
                        <div>Risk Level</div>
                        <div>Followers</div>
                        <div>Rating</div>
                    </div>

                    {/* Rows */}
                    {visible.map((expert, index) => (
                        <div
                            onClick={() => navigate(`/investor/expertdetails?user_id=${expert.user_id}`)}
                            key={index}
                            className="grid items-center px-5 py-4"
                            style={{
                                gridTemplateColumns:
                                    "2.5fr 1fr 140px 110px 140px",
                                borderTop: `1px solid ${C.rowBorder}`,
                                cursor: "pointer",
                            }}
                        >


                            <div className="flex items-center gap-3">
                                <Avatar
                                    initials={expert.avatar}
                                />

                                <div>
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            color: C.text,
                                        }}
                                    >
                                        {expert.name}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: C.muted,
                                        }}
                                    >
                                        {expert.role}
                                    </div>
                                </div>
                            </div>

                            <div style={{ color: C.text }}>{expert.market}</div>

                            <div>
                                <span
                                    style={{
                                        padding:
                                            "4px 10px",
                                        borderRadius:
                                            "999px",
                                        background:
                                            RISK_STYLE[
                                                expert.risk
                                            ].bg,
                                        border: `1px solid ${RISK_STYLE[expert.risk].border}`,
                                        color:
                                            RISK_STYLE[
                                                expert.risk
                                            ].color,
                                        fontSize: "12px",
                                    }}
                                >
                                    {expert.risk}
                                </span>
                            </div>

                            <div style={{ color: C.text }}>{expert.followers.toLocaleString()}</div>

                            <div>
                                <StarRating
                                    value={expert.rating}
                                />
                            </div>


                        </div>
                    ))}

                    {/* Footer */}
                    <div
                        className="flex justify-between items-center px-5 py-4"
                        style={{
                            borderTop: `1px solid ${C.border}`,
                        }}
                    >
                        <span
                            style={{
                                color: C.muted,
                                fontSize: "12px",
                            }}
                        >
                            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} experts
                        </span>

                        <div className="flex gap-2">
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: "transparent",
                                    border: `1px solid ${C.border}`,
                                    color: C.text,
                                    cursor: "pointer",
                                }}
                            >
                                ◀
                            </button>
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: C.accent,
                                    border: "none",
                                    color: C.accentText,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                1
                            </button>
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: "transparent",
                                    border: `1px solid ${C.border}`,
                                    color: C.text,
                                    cursor: "pointer",
                                }}
                            >
                                2
                            </button>
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: "transparent",
                                    border: `1px solid ${C.border}`,
                                    color: C.text,
                                    cursor: "pointer",
                                }}
                            >
                                3
                            </button>
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: "transparent",
                                    border: `1px solid ${C.border}`,
                                    color: C.text,
                                    cursor: "pointer",
                                }}
                            >
                                ▶
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </motion.div>
    );
}
