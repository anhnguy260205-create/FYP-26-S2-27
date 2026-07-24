import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flag, Eye, MessageCircle, Heart } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { adminGetAllPosts, adminGetFlaggedPosts } from "../../api/expertApi.js";

function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function roleBadge(role) {
    const r = String(role || "").toLowerCase();
    if (r === "expert") return "bg-cyan-100 text-cyan-700";
    if (r === "premium") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
}

// ── Main page ──────────────────────────────────────────────────────────────────
function CommunityPostsPage() {
    const navigate = useNavigate();
    const [tab,      setTab]      = useState("all");      // "all" | "flagged"
    const [posts,    setPosts]    = useState([]);
    const [flagged,  setFlagged]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [keyword,  setKeyword]  = useState("");

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [allData, flaggedData] = await Promise.all([
                adminGetAllPosts().catch(() => null),
                adminGetFlaggedPosts().catch(() => null),
            ]);
            if (allData?.success)     setPosts(allData.posts || []);
            if (flaggedData?.success) setFlagged(flaggedData.posts || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const filtered = (tab === "flagged" ? flagged : posts).filter((p) => {
        const matchKeyword = !keyword || [p.author, p.title, p.content, p.category].some(
            v => String(v || "").toLowerCase().includes(keyword.toLowerCase())
        );
        return matchKeyword;
    });

    return (
        <AdminLayout title="Community Management" subtitle="Monitor, search and moderate community posts">

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Posts",   value: posts.length },
                    { label: "Total Replies", value: posts.reduce((sum, p) => sum + (p.reply_count || 0), 0) },
                    { label: "Flagged Posts", value: flagged.length, highlight: flagged.length > 0 },
                ].map((stat) => (
                    <div key={stat.label} className={`bg-white rounded-lg shadow p-4 ${stat.highlight ? "border-l-4 border-red-500" : ""}`}>
                        <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.highlight && stat.value > 0 ? "text-red-600" : "text-slate-900"}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Tab bar */}
            <div className="flex gap-2 mb-5">
                <button onClick={() => setTab("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === "all" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"}`}>
                    All Posts ({posts.length})
                </button>
                <button onClick={() => setTab("flagged")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${tab === "flagged" ? "bg-red-600 text-white" : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"}`}>
                    <Flag size={13} />
                    Flagged ({flagged.length})
                    {flagged.length > 0 && tab !== "flagged" && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{flagged.length}</span>
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-5 mb-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-48">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={keyword} onChange={e => setKeyword(e.target.value)}
                            placeholder="Search by author, title or content…"
                            className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none" />
                    </div>
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                        {loading ? "Loading…" : `${filtered.length} post${filtered.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400">Loading posts…</div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-10 text-center text-gray-400">
                        {tab === "flagged" ? "No flagged posts — all clear!" : "No posts match your search."}
                    </div>
                ) : (
                    filtered.map((post) => (
                        <div key={post.post_id} className={`bg-white rounded-lg shadow p-5 ${tab === "flagged" ? "border-l-4 border-red-500" : ""}`}>
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="min-w-0">
                                    <h3 className="text-lg font-bold text-slate-900">{post.title}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 flex-wrap">
                                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0">
                                            {(post.author || "?")[0]}
                                        </span>
                                        <span className="font-medium text-slate-700">{post.author}</span>
                                        <span className={`px-2 py-0.5 rounded-full font-semibold capitalize ${roleBadge(post.author_role)}`}>
                                            {post.author_role || "member"}
                                        </span>
                                        <span>•</span>
                                        <span>{formatDate(post.created_at)}</span>
                                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded font-semibold">
                                            {post.category}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-slate-700 mt-4 leading-6 line-clamp-3">{post.content}</p>

                            {tab === "flagged" && (post.flags || []).length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mt-4 text-xs text-red-700 space-y-1">
                                    {(post.flags || []).map((f, i) => (
                                        <div key={i} className="font-medium">{f.reason}</div>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-between items-center mt-4 flex-wrap gap-3">
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1"><MessageCircle size={14} /> {post.reply_count || 0} comments</span>
                                    <span className="flex items-center gap-1"><Heart size={14} /> {post.likes || 0} likes</span>
                                    {tab === "flagged" && (
                                        <span className="flex items-center gap-1 text-red-600 font-semibold"><Flag size={14} /> {post.flag_count || 0} reports</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/adminpanel/posts/${post.post_id}`)}
                                        className="flex items-center gap-1 border px-3 py-1.5 rounded text-xs"
                                    >
                                        <Eye size={13} /> View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </AdminLayout>
    );
}

export default CommunityPostsPage;
