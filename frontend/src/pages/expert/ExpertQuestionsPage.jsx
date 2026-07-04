import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { getExpertQuestions } from "../../api/expertApi.js";

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

function urgencyClass(u) {
    if (u === "High")   return "border-red-200 bg-red-50 text-red-700";
    if (u === "Medium") return "border-yellow-200 bg-yellow-50 text-yellow-700";
    return "border-green-200 bg-green-50 text-green-700";
}
function statusClass(s) {
    if (s === "Answered") return "border-green-200 bg-green-50 text-green-700";
    return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function ExpertQuestionsPage() {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const [questions, setQuestions]   = useState([]);
    const [loading,   setLoading]     = useState(true);
    const [query,     setQuery]       = useState("");
    const [filter,    setFilter]      = useState("All");

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

    const S = {
        bg:     "#0d1526",
        card:   "#161f38",
        card2:  "#1e2740",
        border: "rgba(255,255,255,0.08)",
        accent: "#378ADD",
        muted:  "#8b92a8",
        text:   "#e2e8f0",
        sub:    "rgba(255,255,255,0.55)",
    };

    return (
        <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", background: S.bg, color: S.text }}>
            <ConsultantHeader />
            <main style={{ flex:1, padding:"32px 40px", maxWidth:1200, margin:"0 auto", width:"100%", boxSizing:"border-box" }}>

                {/* Header */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16, marginBottom:28 }}>
                    <div>
                        <h1 style={{ fontSize:24, fontWeight:800, margin:0, color: S.text }}>Investor Questions</h1>
                        <p style={{ fontSize:13, color: S.muted, marginTop:4 }}>
                            {questions.length} question{questions.length !== 1 ? "s" : ""} assigned to you
                        </p>
                    </div>
                    <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search questions…"
                            style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${S.border}`, background: S.card, color: S.text, fontSize:13, outline:"none", width:200 }}
                        />
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ padding:"9px 14px", borderRadius:10, border:`1px solid ${S.border}`, background: S.card, color: S.text, fontSize:13, outline:"none", cursor:"pointer" }}
                        >
                            <option value="All">All</option>
                            <option value="Pending">Pending</option>
                            <option value="Answered">Answered</option>
                        </select>
                    </div>
                </div>

                {loading && questions.length === 0 ? (
                    <div style={{ textAlign:"center", padding:60, color: S.muted }}>Loading questions…</div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign:"center", padding:60, color: S.muted }}>
                        {questions.length === 0 ? "No questions assigned yet." : "No questions match your search."}
                    </div>
                ) : (
                    <div style={{ background: S.card, border:`1px solid ${S.border}`, borderRadius:18, overflow:"hidden" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                            <thead>
                                <tr style={{ background: S.card2, borderBottom:`1px solid ${S.border}` }}>
                                    {["Title", "Type", "Tickers", "Investor", "Urgency", "Status", "Submitted", ""].map((h) => (
                                        <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color: S.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((q, i) => (
                                    <tr key={q.id}
                                        style={{ borderTop: i === 0 ? "none" : `1px solid ${S.border}`, transition:"background 0.15s", cursor:"pointer" }}
                                        onMouseEnter={e => e.currentTarget.style.background = S.card2}
                                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                    >
                                        <td style={{ padding:"14px 16px", fontWeight:700, color: S.text, maxWidth:240 }}>
                                            <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{q.title}</div>
                                        </td>
                                        <td style={{ padding:"14px 16px", color: S.sub }}>{q.question_type}</td>
                                        <td style={{ padding:"14px 16px" }}>
                                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                                                {(q.tickers || []).map((t) => (
                                                    <span key={t} style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700, background:"rgba(55,138,221,0.15)", color: S.accent, border:"1px solid rgba(55,138,221,0.25)" }}>{t}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding:"14px 16px", color: S.sub }}>{q.investor_name}</td>
                                        <td style={{ padding:"14px 16px" }}>
                                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                                                background: q.urgency==="High" ? "rgba(248,113,113,0.12)" : q.urgency==="Medium" ? "rgba(251,191,36,0.12)" : "rgba(52,214,140,0.12)",
                                                color:      q.urgency==="High" ? "#f87171"              : q.urgency==="Medium" ? "#fbbf24"               : "#34d68c",
                                                border:     q.urgency==="High" ? "1px solid rgba(248,113,113,0.3)" : q.urgency==="Medium" ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(52,214,140,0.3)",
                                            }}>{q.urgency}</span>
                                        </td>
                                        <td style={{ padding:"14px 16px" }}>
                                            <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
                                                background: q.status==="Answered" ? "rgba(52,214,140,0.12)" : "rgba(255,255,255,0.06)",
                                                color:      q.status==="Answered" ? "#34d68c"               : S.muted,
                                                border:     q.status==="Answered" ? "1px solid rgba(52,214,140,0.3)" : `1px solid ${S.border}`,
                                            }}>{q.status}</span>
                                        </td>
                                        <td style={{ padding:"14px 16px", color: S.muted, fontSize:12 }}>{formatDate(q.submitted_at)}</td>
                                        <td style={{ padding:"14px 16px" }}>
                                            <button
                                                onClick={() => navigate(`/expert/question/${q.id}`)}
                                                style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:10, background:"rgba(55,138,221,0.15)", border:"1px solid rgba(55,138,221,0.3)", color: S.accent, fontSize:12, fontWeight:700, cursor:"pointer", transition:"background 0.15s" }}
                                                onMouseEnter={e => e.currentTarget.style.background="rgba(55,138,221,0.28)"}
                                                onMouseLeave={e => e.currentTarget.style.background="rgba(55,138,221,0.15)"}
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
        </div>
    );
}
