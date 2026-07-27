import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Flag, Eye, MessageCircle, Heart, Trash2, AlertTriangle, X } from "lucide-react";
import AdminLayout from "../../layout/AdminPage.jsx";
import { adminGetAllPosts, adminGetFlaggedPosts, adminDeleteForumPost, adminDeleteForumReply } from "../../api/expertApi.js";

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

const PRESET_REASONS = [
    "Violated community guidelines",
    "Contains spam or promotional content",
    "Offensive or inappropriate language",
    "Misinformation or misleading content",
    "Irrelevant to the platform",
    "Other",
];

function DeletePostModal({ item, onConfirm, onCancel, deleting }) {
    const isComment = item.type === "comment";
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
                            <h3 className="font-bold text-slate-900">Remove {isComment ? "Comment" : "Post"}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">by <span className="font-semibold">{item.author}</span></p>
                        </div>
                    </div>
                    <button onClick={onCancel}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-5 text-sm">
                    <p className="font-semibold text-slate-800 mb-1">{item.title || item.post_title || "Untitled Post"}</p>
                    <p className="text-slate-600 leading-relaxed line-clamp-3">{item.content}</p>
                </div>

                <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Reason for removal</label>
                    <div className="flex flex-col gap-2">
                        {PRESET_REASONS.map((item) => (
                            <label key={item} className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="post-removal-reason"
                                    value={item}
                                    checked={reason === item}
                                    onChange={() => setReason(item)}
                                    className="accent-red-600"
                                />
                                <span className={`text-sm ${reason === item ? "text-slate-900 font-semibold" : "text-slate-600"}`}>{item}</span>
                            </label>
                        ))}
                    </div>
                    {reason === "Other" && (
                        <textarea
                            value={custom}
                            onChange={(event) => setCustom(event.target.value)}
                            placeholder="Describe the reason…"
                            rows={3}
                            className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none resize-none"
                        />
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5 text-xs text-blue-700">
                    <strong>Note:</strong> The user will automatically receive an in-app notification explaining the removal reason.
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-slate-600 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(finalReason)}
                        disabled={deleting || (reason === "Other" && !custom.trim())}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-50 transition-colors"
                    >
                        <Trash2 size={14} /> {deleting ? "Removing…" : "Remove & Notify User"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CommunityPostsPage() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("all");
    const [posts, setPosts] = useState([]);
    const [flagged, setFlagged] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [toast, setToast] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        let cancelled = false;

        Promise.all([
            adminGetAllPosts().catch(() => null),
            adminGetFlaggedPosts().catch(() => null),
        ]).then(([allData, flaggedData]) => {
            if (cancelled) return;
            if (allData?.success) setPosts(allData.posts || []);
            if (flaggedData?.success) setFlagged(flaggedData.reports || flaggedData.posts || []);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    function showToast(text, type = "success") {
        setToast({ text, type });
        window.setTimeout(() => setToast(null), 4000);
    }

    const handleConfirmDelete = async (reason) => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            const isComment = toDelete.type === "comment";
            const data = isComment
                ? await adminDeleteForumReply(toDelete.post_id, toDelete.reply_id || toDelete.id, reason)
                : await adminDeleteForumPost(toDelete.post_id, reason);
            if (data?.success) {
                if (!isComment) {
                    setPosts((current) => current.filter((post) => post.post_id !== toDelete.post_id));
                }
                setFlagged((current) => current.filter((item) =>
                    isComment
                        ? (item.reply_id || item.id) !== (toDelete.reply_id || toDelete.id)
                        : !(item.type !== "comment" && item.post_id === toDelete.post_id)
                ));
                showToast(`${isComment ? "Comment" : "Post"} removed. ${toDelete.author || "The author"} has been notified.`);
                setToDelete(null);
            } else {
                showToast(data?.message || "Failed to remove post.", "error");
            }
        } catch (error) {
            showToast(error.message || "Failed to remove post.", "error");
        } finally {
            setDeleting(false);
        }
    };

    const availableCategories = [...new Set(posts.map((post) => post.category).filter(Boolean))].sort();

    const filtered = (tab === "flagged" ? flagged : posts).filter((item) => {
        const query = keyword.trim().toLowerCase();
        const matchesKeyword = !query || [item.author, item.title, item.post_title, item.content, item.category]
            .some((value) => String(value || "").toLowerCase().includes(query));
        const matchesRole = roleFilter === "all"
            || String(item.author_role || "member").toLowerCase() === roleFilter;
        const matchesCategory = tab === "flagged" || categoryFilter === "all" || item.category === categoryFilter;
        const matchesType = tab !== "flagged" || typeFilter === "all" || (item.type || "post") === typeFilter;
        return matchesKeyword && matchesRole && matchesCategory && matchesType;
    });

    return (
        <AdminLayout title="Community Management" subtitle="View, search and moderate community forum posts">
            {toast && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
                    toast.type === "success"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                    {toast.text}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                {[
                    { label: "Total Posts", value: posts.length },
                    { label: "Total Replies", value: posts.reduce((sum, post) => sum + (post.reply_count || 0), 0) },
                    { label: "Flagged Reports", value: flagged.length, highlight: flagged.length > 0 },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className={`bg-white rounded-lg shadow p-4 ${stat.highlight ? "border-l-4 border-red-500" : ""}`}
                    >
                        <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
                        <p className={`text-2xl font-bold ${stat.highlight && stat.value > 0 ? "text-red-600" : "text-slate-900"}`}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <div className="flex gap-2 mb-5">
                <button
                    onClick={() => setTab("all")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                        tab === "all"
                            ? "bg-blue-600 text-white"
                            : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"
                    }`}
                >
                    All Posts ({posts.length})
                </button>
                <button
                    onClick={() => setTab("flagged")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${
                        tab === "flagged"
                            ? "bg-red-600 text-white"
                            : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"
                    }`}
                >
                    <Flag size={13} />
                    Flagged ({flagged.length})
                    {flagged.length > 0 && tab !== "flagged" && (
                        <span className="ml-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                            {flagged.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-5 mb-5">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-56">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder={tab === "flagged" ? "Search reported posts or comments…" : "Search by author, title, category or content…"}
                            className="w-full h-10 pl-8 pr-4 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select
                        value={roleFilter}
                        onChange={(event) => setRoleFilter(event.target.value)}
                        className="h-10 min-w-36 border border-gray-200 rounded-lg px-3 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All roles</option>
                        <option value="investor">Investors</option>
                        <option value="premium">Premium investors</option>
                        <option value="expert">Experts</option>
                    </select>
                    {tab === "flagged" && (
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value)}
                            className="h-10 min-w-40 border border-gray-200 rounded-lg px-3 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All report types</option>
                            <option value="post">Posts</option>
                            <option value="comment">Comments</option>
                        </select>
                    )}
                    {tab !== "flagged" && (
                    <select
                        value={categoryFilter}
                        onChange={(event) => setCategoryFilter(event.target.value)}
                        className="h-10 min-w-44 border border-gray-200 rounded-lg px-3 text-sm text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="all">All categories</option>
                        {availableCategories.map((category) => (
                            <option key={category} value={category}>{category}</option>
                        ))}
                    </select>
                    )}
                    {(keyword || roleFilter !== "all" || categoryFilter !== "all" || typeFilter !== "all") && (
                        <button
                            onClick={() => { setKeyword(""); setRoleFilter("all"); setCategoryFilter("all"); setTypeFilter("all"); }}
                            className="h-10 px-4 border border-gray-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-gray-50"
                        >
                            Clear
                        </button>
                    )}
                    <span className="text-sm text-slate-500 whitespace-nowrap">
                        {loading ? "Loading…" : `${filtered.length} ${tab === "flagged" ? "report" : "post"}${filtered.length !== 1 ? "s" : ""}`}
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Author</th>
                            <th className="px-6 py-4">Role</th>
                            {tab !== "flagged" && <th className="px-6 py-4">Category</th>}
                            {tab === "flagged" && <th className="px-6 py-4">Type</th>}
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Content</th>
                            {tab === "flagged" && <th className="px-6 py-4">Reported For</th>}
                            <th className="px-6 py-4">{tab === "flagged" ? "Reports" : "Engagement"}</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                                    Loading posts…
                                </td>
                            </tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                                    {tab === "flagged" ? "No flagged posts or comments — all clear!" : "No posts match your search."}
                                </td>
                            </tr>
                        ) : (
                            filtered.map((post) => (
                                <tr
                                    key={post.post_id}
                                    className={`border-b border-gray-100 hover:bg-gray-50 ${tab === "flagged" ? "bg-red-50/30" : ""}`}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                                        {post.author || "—"}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${roleBadge(post.author_role)}`}>
                                            {post.author_role || "member"}
                                        </span>
                                    </td>
                                    {tab !== "flagged" && (
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                                                {post.category || "General"}
                                            </span>
                                        </td>
                                    )}
                                    {tab === "flagged" && (
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${post.type === "comment" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                                {post.type || "post"}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-slate-700 max-w-44">
                                        <div className="truncate font-medium">{post.title || post.post_title || "Untitled Post"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 max-w-72">
                                        <div className="line-clamp-2 text-xs leading-relaxed">{post.content || "—"}</div>
                                    </td>
                                    {tab === "flagged" && (
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-52">
                                            {(post.flags || []).length > 0 ? (
                                                post.flags.map((flag, index) => (
                                                    <div key={`${flag.user_id || "flag"}-${index}`} className="mb-1 text-red-600 font-medium">
                                                        {flag.reason || "No reason provided"}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-slate-400">No reason provided</span>
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-slate-500">
                                        {tab === "flagged" ? (
                                            <span className="text-red-600 font-semibold">
                                                {post.flag_count || 0}
                                            </span>
                                        ) : (
                                            <div className="flex flex-col gap-1 text-xs whitespace-nowrap">
                                                <span className="flex items-center gap-1"><MessageCircle size={13} /> {post.reply_count || 0} comments</span>
                                                <span className="flex items-center gap-1"><Heart size={13} /> {post.likes || 0} likes</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                        {formatDate(post.created_at)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <button
                                                onClick={() => navigate(`/adminpanel/posts/${post.post_id}${post.type === "comment" ? `?reply=${post.reply_id || post.id}` : ""}`)}
                                                className="flex items-center gap-1.5 border border-gray-200 hover:bg-gray-100 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={12} /> View
                                            </button>
                                            {tab === "flagged" && (
                                                <button
                                                    onClick={() => setToDelete(post)}
                                                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                                                >
                                                    <Trash2 size={12} /> Remove
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {toDelete && (
                <DeletePostModal
                    item={toDelete}
                    deleting={deleting}
                    onCancel={() => setToDelete(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </AdminLayout>
    );
}

export default CommunityPostsPage;
