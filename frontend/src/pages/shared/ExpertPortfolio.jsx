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
    High: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", color: "#ef4444" },
    Moderate: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", color: "#f59e0b" },
    Low: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)", color: "#22c55e" },
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
                            fill={i < full ? "#f59e0b" : "rgba(255,255,255,0.15)"}
                        />
                    </svg>
                ))}
            </div>
            <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.6)" }}>
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

    const STATS = [
        { icon: Users, title: "Total Experts", value: publicStats ? publicStats.total_experts : "—", desc: "Active on platform" },
        { icon: Star, title: "Top Rated", value: publicStats?.top_rated?.name || "—", desc: publicStats?.top_rated ? `${publicStats.top_rated.rating.toFixed(1)} rating` : "No ratings yet" },
        { icon: PieChart, title: "Avg. Return", value: publicStats ? `${publicStats.avg_return >= 0 ? "+" : ""}${publicStats.avg_return.toFixed(2)}%` : "—", desc: "All time" },
        { icon: UserRound, title: "Total Followers", value: publicStats ? publicStats.total_followers.toLocaleString() : "—", desc: "Across all experts" },
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
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} >
            {isExpert ? <ExpertHeader /> : <GeneralHeader />}

            <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>
                {/* Header */}
                <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
                    <div>
                        <h1
                            style={{
                                fontSize: "28px",
                                fontWeight: 700,
                                color: "#f8fafc",
                            }}
                        >
                            Expert Portfolio
                        </h1>

                        <p
                            style={{
                                color: "rgba(255,255,255,0.45)",
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
                                background: "rgba(59,130,246,0.12)",
                                border: "1px solid rgba(59,130,246,0.3)",
                                color: "#60a5fa",
                                fontWeight: 600,
                                fontSize: 14,
                                whiteSpace: "nowrap",
                            }}
                        >
                            My Portfolio
                        </button>
                    )}
                </div>
                <hr style={{ marginTop: 16, marginBottom: 16, border: "none", borderTop: "1px solid rgba(255,255,255,0.1)" }} />

                {/* Search Bar */}
                <div className="flex gap-3 mb-6">
                    <div
                        className="flex items-center flex-1 px-4"
                        style={{
                            height: "46px",
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <Search
                            size={16}
                            color="rgba(255,255,255,0.4)"
                        />

                        <input
                            placeholder="Search expert by name or keyword..."
                            value={query}
                            onChange={(e) =>
                                setQuery(e.target.value)
                            }
                            className="flex-1 bg-transparent border-none outline-none ml-3"
                            style={{
                                color: "white",
                                fontSize: "14px",
                            }}
                        />
                    </div>

                    <button
                        style={{
                            width: "120px",
                            borderRadius: "10px",
                            background:
                                "linear-gradient(90deg,#0092b8,#155dfc)",
                            color: "white",
                            fontWeight: 600,
                        }}
                    >
                        Search
                    </button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    {STATS.map((item, index) => {
                        const Icon = item.icon;

                        return (
                            <div
                                key={index}
                                style={{
                                    padding: "20px",
                                    borderRadius: "16px",
                                    background:
                                        "rgba(255,255,255,0.04)",
                                    border:
                                        "1px solid rgba(255,255,255,0.08)",
                                }}
                            >
                                <Icon
                                    size={18}
                                    color="#60a5fa"
                                />

                                <div
                                    style={{
                                        marginTop: "12px",
                                        fontSize: "12px",
                                        color:
                                            "rgba(255,255,255,0.4)",
                                    }}
                                >
                                    {item.title}
                                </div>

                                <div
                                    style={{
                                        marginTop: "4px",
                                        fontSize: "20px",
                                        fontWeight: 700,
                                    }}
                                >
                                    {item.value}
                                </div>

                                <div
                                    style={{
                                        fontSize: "12px",
                                        color:
                                            "rgba(255,255,255,0.3)",
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
                        background:
                            "rgba(255,255,255,0.03)",
                        border:
                            "1px solid rgba(255,255,255,0.08)",
                    }}
                >
                    {/* Table Header */}
                    <div
                        className="grid px-5 py-3"
                        style={{
                            gridTemplateColumns:
                                "2.5fr 1fr 140px 110px 140px",
                            background:
                                "rgba(255,255,255,0.03)",
                            color:
                                "rgba(255,255,255,0.35)",
                            fontSize: "12px",
                            borderBottom:
                                "1px solid rgba(255,255,255,0.08)",
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
                                borderTop:
                                    "1px solid rgba(255,255,255,0.05)",
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
                                        }}
                                    >
                                        {expert.name}
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color:
                                                "rgba(255,255,255,0.4)",
                                        }}
                                    >
                                        {expert.role}
                                    </div>
                                </div>
                            </div>

                            <div>{expert.market}</div>

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

                            <div>{expert.followers.toLocaleString()}</div>

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
                            borderTop:
                                "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <span
                            style={{
                                color:
                                    "rgba(255,255,255,0.4)",
                                fontSize: "12px",
                            }}
                        >
                            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} experts
                        </span>

                        <div className="flex gap-2">
                            <button>◀</button>
                            <button
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background:
                                        "#155dfc",
                                }}
                            >
                                1
                            </button>
                            <button>2</button>
                            <button>3</button>
                            <button>▶</button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </motion.div>
    );
}
