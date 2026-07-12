import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, MessageCircle, ListTodo } from "lucide-react";
import ExpertHeader from "../../layout/ExpertHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertQuestions } from "../../api/expertApi.js";
import ChatPanel from "../../components/chat/ChatPanel.jsx";

const STORAGE_KEY = "rocketTradeExpertQuestions_v2"; // new key to avoid stale old data

function normaliseQuestion(q) {
    const id = q?.question_id || q?.id;
    return {
        ...q,
        id,
        question_id: id,
        tickers: Array.isArray(q?.tickers)
            ? q.tickers
            : String(q?.tickers || "").split(",").map((t) => t.trim()).filter(Boolean),
    };
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function urgencyStyle(u) {
    if (u === "High")   return { background:"rgba(248,113,113,0.12)", color:"#f87171", border:"1px solid rgba(248,113,113,0.3)" };
    if (u === "Medium") return { background:"rgba(251,191,36,0.12)",  color:"#fbbf24", border:"1px solid rgba(251,191,36,0.3)" };
    return                     { background:"rgba(52,211,153,0.12)",  color:"#34d399", border:"1px solid rgba(52,211,153,0.3)" };
}
function statusStyle(s) {
    if (s === "Answered") return { background:"rgba(52,211,153,0.12)", color:"#34d399", border:"1px solid rgba(52,211,153,0.3)" };
    return                       { background:"rgba(255,255,255,0.06)", color:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.1)" };
}

export default function ExpertQuestionsPage() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const [questions, setQuestions]   = useState([]);
    const [loading,   setLoading]     = useState(true);
    const [query,     setQuery]       = useState("");
    const [filter,    setFilter]      = useState("All");
    const [tab,       setTab]         = useState("questions"); // "questions" | "messages"
    const [chatUnread, setChatUnread] = useState(0);

    useEffect(() => {
        setLoading(true);

        // Show cached version immediately while fetching
        try {
            const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
            if (cached.length > 0) setQuestions(cached.map(normaliseQuestion));
        } catch {}

        // Always fetch fresh from backend — this is the source of truth
        getExpertQuestions(currentUser?.user_id)
            .then((data) => {
                if (data?.success && Array.isArray(data.questions) && data.questions.length > 0) {
                    const fresh = data.questions.map(normaliseQuestion);
                    setQuestions(fresh);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [currentUser?.user_id]);

    const filtered = questions.filter((q) => {
        const matchFilter = filter === "All" || q.status === filter;
        const matchQuery  = !query || [q.title, q.investor_name, ...(q.tickers || [])].some(
            (v) => String(v || "").toLowerCase().includes(query.toLowerCase())
        );
        return matchFilter && matchQuery;
    });

    return (
        <motion.div
            className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <ExpertHeader />
            <main className="flex-1 p-4 md:p-7 max-w-6xl mx-auto w-full">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-4 mb-7">
                    <div>
                        <h1 style={{ fontFamily:"'DM Mono', monospace", fontSize:26, fontWeight:700, letterSpacing:"0.02em", color:"#e2e8f0", margin:0 }}>
                            {tab === "questions" ? "Investor Questions" : "Messages"}
                        </h1>
                        <p style={{ marginTop:6, fontSize:13, color:"rgba(255,255,255,0.45)" }}>
                            {tab === "questions"
                                ? `${questions.length} question${questions.length !== 1 ? "s" : ""} assigned to you`
                                : "Chat one-on-one with premium investors."}
                        </p>
                    </div>
                    {tab === "questions" && (
                        <div className="flex gap-2.5 flex-wrap">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search questions…"
                                className="w-52"
                                style={{ padding:"9px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none" }}
                            />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                style={{ padding:"9px 14px", borderRadius:10, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:13, outline:"none", cursor:"pointer" }}
                            >
                                <option value="All">All</option>
                                <option value="Pending">Pending</option>
                                <option value="Answered">Answered</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { id: "questions", label: "Questions", Icon: ListTodo },
                        { id: "messages",  label: "Messages",  Icon: MessageCircle },
                    ].map(({ id, label, Icon }) => {
                        const activeTab = tab === id;
                        return (
                            <button key={id} onClick={() => setTab(id)}
                                className="flex items-center gap-2"
                                style={{
                                    padding: "9px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                                    cursor: "pointer", position: "relative",
                                    background: activeTab ? "linear-gradient(90deg,#0092b8,#155dfc)" : "rgba(255,255,255,0.05)",
                                    border: activeTab ? "1px solid transparent" : "1px solid rgba(255,255,255,0.1)",
                                    color: activeTab ? "#fff" : "rgba(255,255,255,0.55)",
                                }}>
                                <Icon size={14} /> {label}
                                {id === "messages" && chatUnread > 0 && (
                                    <span style={{
                                        minWidth: 17, height: 17, borderRadius: 9, padding: "0 4px",
                                        background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>{chatUnread}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {tab === "messages" ? (
                    <ChatPanel height={560} onUnreadChange={setChatUnread} />
                ) : loading && questions.length === 0 ? (
                    <div className="text-center py-16" style={{ color:"rgba(255,255,255,0.4)" }}>Loading questions…</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16" style={{ color:"rgba(255,255,255,0.4)" }}>
                        {questions.length === 0 ? "No questions assigned yet." : "No questions match your search."}
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr style={{ background:"rgba(255,255,255,0.03)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                                    {["Title", "Type", "Tickers", "Investor", "Urgency", "Status", "Submitted", ""].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color:"rgba(255,255,255,0.45)" }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((q, i) => (
                                    <tr key={q.id}
                                        className="cursor-pointer transition-colors"
                                        style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.06)" }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <td className="px-4 py-3.5 font-semibold max-w-60" style={{ color:"#e2e8f0" }}>
                                            <div className="truncate">{q.title}</div>
                                        </td>
                                        <td className="px-4 py-3.5" style={{ color:"rgba(255,255,255,0.6)" }}>{q.question_type}</td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {(q.tickers || []).map((t) => (
                                                    <span key={t} className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background:"rgba(0,211,243,0.12)", color:"#22d3ee", border:"1px solid rgba(0,211,243,0.25)" }}>{t}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5" style={{ color:"rgba(255,255,255,0.6)" }}>{q.investor_name}</td>
                                        <td className="px-4 py-3.5">
                                            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={urgencyStyle(q.urgency)}>{q.urgency}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={statusStyle(q.status)}>{q.status}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs" style={{ color:"rgba(255,255,255,0.4)" }}>{formatDate(q.submitted_at)}</td>
                                        <td className="px-4 py-3.5">
                                            <button
                                                onClick={() => navigate(`/expert/question/${q.id}`)}
                                                className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors"
                                                style={{ background:"rgba(0,211,243,0.12)", border:"1px solid rgba(0,211,243,0.25)", color:"#22d3ee" }}
                                                onMouseEnter={e => e.currentTarget.style.background="rgba(0,211,243,0.22)"}
                                                onMouseLeave={e => e.currentTarget.style.background="rgba(0,211,243,0.12)"}
                                            >
                                                <Eye size={13} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
            <Footer />
        </motion.div>
    );
}
