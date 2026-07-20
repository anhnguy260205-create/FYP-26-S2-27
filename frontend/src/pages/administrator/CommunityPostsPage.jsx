import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Search, X, AlertTriangle, Flag, Eye, MessageCircle, Heart } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { adminGetAllPosts, adminDeleteForumPost, adminGetFlaggedPosts } from "../../api/expertApi.js";

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

// ── Delete confirmation modal ──────────────────────────────────────────────────
const PRESET_REASONS = [
    "Violated community guidelines",
    "Contains spam or promotional content",
    "Offensive or inappropriate language",
    "Misinformation or misleading content",
    "Irrelevant to the platform",
    "Other",
];

function DeleteModal({ post, onConfirm, onCancel, deleting }) {
    const [reason, setReason] = useState(PRESET_REASONS[0]);
    const [custom, setCustom] = useState("");
    const finalReason = reason === "Other" ? custom.trim() : reason;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900">Remove Post</h3>
                            <p className="text-xs text-slate-500 mt-0.5">by <span className="font-semibold">{post.author}</span></p>
                        </div>
                    </div>
                    <button onClick={onCancel}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                        {post.title && <span className="font-semibold text-slate-800">{post.title}</span>}
                    </div>
                    <p className="text-slate-600 leading-relaxed line-clamp-3">{post.content}</p>
                </div>
                <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Reason for removal</label>
                    <div className="flex flex-col gap-2">
                        {PRESET_REASONS.map((r) => (
                            <label key={r} className="flex items-center gap-2.5 cursor-pointer">
                                <input type="radio" name="reason" value={r}
                                    checked={reason === r} onChange={() => setReason(r)} className="accent-red-600" />
                                <span className={`text-sm ${reason === r ? "text-slate-900 font-semibold" : "text-slate-600"}`}>{r}</span>
                            </label>
                        ))}
                    </div>
                    {reason === "Other" && (
                        <textarea value={custom} onChange={e => setCustom(e.target.value)}
                            placeholder="Describe the reason…" rows={3}
                            className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                    )}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-700">
                    <strong>Note:</strong> The user will automatically receive an in-app notification explaining the removal reason.
                </div>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} disabled={deleting}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-slate-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={() => onConfirm(finalReason)}
                        disabled={deleting || (reason === "Other" && !custom.trim())}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 transition-colors">
                        <Trash2 size={14} /> {deleting ? "Removing…" : "Remove & Notify User"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
function CommunityPostsPage() {
    const navigate = useNavigate();
    const [tab,      setTab]      = useState("all");      // "all" | "flagged"
    const [posts,    setPosts]    = useState([]);
    const [flagged,  setFlagged]  = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [keyword,  setKeyword]  = useState("");
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [toast,    setToast]    = useState(null);

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

    function showToast(text, type = "success") {
        setToast({ text, type });
        setTimeout(() => setToast(null), 4000);
    }

    const handleConfirmDelete = async (reason) => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            const data = await adminDeleteForumPost(toDelete.post_id, reason);
            if (data?.success) {
                setPosts(prev => prev.filter(p => p.post_id !== toDelete.post_id));
                setFlagged(prev => prev.filter(p => p.post_id !== toDelete.post_id));
                setToDelete(null);
                showToast(`Post removed. ${toDelete.author} has been notified.`);
            } else {
                showToast(data?.message || "Failed to delete post.", "error");
            }
        } catch (err) {
            showToast(err.message || "Failed to delete post.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const filtered = (tab === "flagged" ? flagged : posts).filter((p) => {
        const matchKeyword = !keyword || [p.author, p.title, p.content, p.category].some(
            v => String(v || "").toLowerCase().includes(keyword.toLowerCase())
        );
        return matchKeyword;
    });

    return (
        <AdminLayout title="Community Management" subtitle="Monitor, search and moderate community posts">

            {/* Toast */}
            {toast && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
                    toast.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                }`}>{toast.text}</div>
            )}

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

                                    <button onClick={() => setToDelete(post)}
                                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors">
                                        <Trash2 size={13} /> Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {toDelete && (
                <DeleteModal post={toDelete} deleting={deleting}
                    onCancel={() => setToDelete(null)}
                    onConfirm={handleConfirmDelete} />
            )}
        </AdminLayout>
    );
}

export default CommunityPostsPage;
