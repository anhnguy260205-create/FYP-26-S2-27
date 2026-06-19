import { motion } from "framer-motion";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const EXPERTS = [
    { name: "Dr. Raymond", role: "Portfolio Strategist", market: "Global Markets", risk: "High", followers: "3.2K", rating: 4.8, avatar: "DR" },
    { name: "James Wong", role: "Portfolio Strategist", market: "US Markets", risk: "Moderate", followers: "2.9K", rating: 4.6, avatar: "JW" },
    { name: "Elena V", role: "Portfolio Strategist", market: "Income & Dividend", risk: "Low", followers: "1.8K", rating: 4.5, avatar: "EV" },
    { name: "Michael Roberts", role: "Portfolio Strategist", market: "Multi Asset", risk: "Moderate", followers: "2.7K", rating: 4.7, avatar: "MR" },
    { name: "Sarah Patel", role: "Portfolio Strategist", market: "Growth & Mid Cap", risk: "High", followers: "1.6K", rating: 4.6, avatar: "SP" },
    { name: "David Lee", role: "Portfolio Strategist", market: "Global Sector", risk: "Moderate", followers: "1.3K", rating: 4.4, avatar: "DL" },
];

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

const STATS = [
    { icon: Users, title: "Total Experts", value: "18", desc: "Active on platform" },
    { icon: Star, title: "Top Rated", value: "Dr. Raymond", desc: "Based on user ratings" },
    { icon: PieChart, title: "Avg. Return", value: "+12.45%", desc: "All time" },
    { icon: UserRound, title: "Total Followers", value: "12.4K", desc: "Across all experts" },
];

export default function ExpertPortfolio() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);

    const filtered = EXPERTS.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.market.toLowerCase().includes(query.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSearch = () => setPage(1);

    const COLS = "48px 1fr 1fr 100px 80px 130px 120px";

    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} >
            <GeneralHeader />

            <main className="flex-1 p-7">
                {/* Header */}
                <div className="mb-6">
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
                                "60px 2fr 1.5fr 120px 120px 140px 250px",
                            background:
                                "rgba(255,255,255,0.03)",
                            color:
                                "rgba(255,255,255,0.35)",
                            fontSize: "12px",
                            borderBottom:
                                "1px solid rgba(255,255,255,0.08)",
                        }}
                    >
                        <div>#</div>
                        <div>Expert</div>
                        <div>Target Market</div>
                        <div>Risk Level</div>
                        <div>Followers</div>
                        <div>Rating</div>
                    </div>

                    {/* Rows */}
                    {visible.map((expert, index) => (
                        <div
                            key={index}
                            className="grid items-center px-5 py-4"
                            style={{
                                gridTemplateColumns:
                                    "60px 2fr 1.5fr 120px 120px 140px 250px",
                                borderTop:
                                    "1px solid rgba(255,255,255,0.05)",
                            }}
                        >
                            <div>{index + 1}</div>

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

                            <div>{expert.followers}</div>

                            <div>
                                <StarRating
                                    value={expert.rating}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigate("/investor/expertdetails")}
                                    style={{
                                        padding:
                                            "8px 14px",
                                        borderRadius:
                                            "8px",
                                        background:
                                            "rgba(59,130,246,0.12)",
                                        border:
                                            "1px solid rgba(59,130,246,0.3)",
                                        color:
                                            "#60a5fa",
                                        fontSize:
                                            "12px",
                                        cursor: "pointer"
                                    }}
                                >
                                    View Profile
                                </button>

                                <button
                                    onClick={() => navigate("/investor/expertadvice")}
                                    style={{
                                        padding:
                                            "8px 14px",
                                        borderRadius:
                                            "8px",
                                        background:
                                            "rgba(0,211,243,0.12)",
                                        border:
                                            "1px solid rgba(0,211,243,0.3)",
                                        color:
                                            "#00D3F2",
                                        fontSize:
                                            "12px",
                                        cursor: "pointer"

                                    }}
                                >
                                    Ask Question
                                </button>
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
                            Showing 1 to 6 of 18 experts
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