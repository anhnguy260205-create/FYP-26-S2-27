import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, AlertTriangle, X, Flag } from "lucide-react";
import AdminPage from "../../layout/AdminPage.jsx";
import { getForumPost, deleteForumReply, adminDeleteForumPost, adminGetFlaggedPosts } from "../../api/expertApi.js";

function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const PRESET_REASONS = [
    "Violated community guidelines",
    "Contains spam or promotional content",
    "Offensive or inappropriate language",
    "Misinformation or misleading content",
    "Irrelevant to the platform",
    "Other",
];

function DeletePostModal({ post, onConfirm, onCancel, deleting }) {
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

function CommunityPostDetailsPage() {
    const { postId } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [flagInfo, setFlagInfo] = useState(null);
    const [toDeletePost, setToDeletePost] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deletingReplyId, setDeletingReplyId] = useState(null);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const data = await getForumPost(postId);
            if (data?.success && data.post) setPost(data.post);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPost(); }, [postId]);

    useEffect(() => {
        adminGetFlaggedPosts().then((data) => {
            if (data?.success) {
                const match = (data.posts || []).find((p) => p.post_id === postId);
                if (match) setFlagInfo(match);
            }
        }).catch(() => {});
    }, [postId]);

    const handleDeleteReply = async (replyId) => {
        if (!window.confirm("Delete this comment?")) return;
        setDeletingReplyId(replyId);
        try {
            const data = await deleteForumReply(postId, replyId);
            if (data?.success && data.post) setPost(data.post);
            else alert(data?.message || "Failed to delete comment");
        } finally {
            setDeletingReplyId(null);
        }
    };

    const handleConfirmDeletePost = async (reason) => {
        setDeleting(true);
        try {
            const data = await adminDeleteForumPost(postId, reason);
            if (data?.success) {
                navigate("/adminpanel/posts");
            } else {
                alert(data?.message || "Failed to delete post");
            }
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <AdminPage title="Post Details" subtitle="Review post content and comments">
                <div className="bg-white rounded-lg p-10 text-center text-gray-400">Loading post…</div>
            </AdminPage>
        );
    }

    if (!post) {
        return (
            <AdminPage title="Post Details" subtitle="Review post content and comments">
                <button
                    onClick={() => navigate("/adminpanel/posts")}
                    className="mb-4 bg-white text-slate-700 px-4 py-2 rounded text-sm font-medium"
                >
                    ← Back to Community Posts
                </button>
                <div className="bg-white rounded-lg p-10 text-center text-gray-400">Post not found.</div>
            </AdminPage>
        );
    }

    const replies = Array.isArray(post.replies) ? post.replies : [];

    return (
        <AdminPage title="Post Details" subtitle="Review post content and comments">
            <button
                onClick={() => navigate("/adminpanel/posts")}
                className="mb-4 bg-white text-slate-700 px-4 py-2 rounded text-sm font-medium"
            >
                ← Back to Community Posts
            </button>

            <div className="max-w-3xl mx-auto space-y-6">
                {flagInfo && (flagInfo.flags || []).length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-5">
                        <div className="flex items-center gap-2 mb-2 text-red-700 font-bold text-sm">
                            <Flag size={14} /> Flagged {flagInfo.flag_count || flagInfo.flags.length} time{(flagInfo.flag_count || flagInfo.flags.length) !== 1 ? "s" : ""}
                        </div>
                        <div className="space-y-1">
                            {flagInfo.flags.map((f, i) => (
                                <p key={i} className="text-xs text-red-600 font-medium">{f.reason}</p>
                            ))}
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-lg p-6">
                    <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xl font-bold text-slate-900">{post.title}</h3>
                        <button
                            onClick={() => setToDeletePost(true)}
                            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors shrink-0"
                        >
                            <Trash2 size={13} /> Remove Post
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-3 flex-wrap">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                            {(post.author || "?")[0]}
                        </span>
                        <span>{post.author}</span>
                        <span>•</span>
                        <span>{formatDate(post.created_at)}</span>
                        <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded font-semibold">
                            {post.category}
                        </span>
                    </div>

                    <p className="text-sm text-slate-700 mt-5 leading-6 whitespace-pre-line">{post.content}</p>
                </div>

                <div className="bg-white rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-5">Comments ({replies.length})</h3>

                    {replies.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">No comments on this post.</p>
                    ) : (
                        <div className="space-y-5">
                            {replies.map((reply) => (
                                <div key={reply.reply_id || reply.id} className="border-b last:border-b-0 pb-4">
                                    <div className="flex justify-between">
                                        <div className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center text-xs shrink-0">
                                                {(reply.author || "?")
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .slice(0, 2)}
                                            </div>

                                            <div>
                                                <p className="font-semibold text-sm">{reply.author}</p>
                                                <p className="text-xs text-slate-500">{formatDate(reply.created_at)}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteReply(reply.reply_id || reply.id)}
                                            disabled={deletingReplyId === (reply.reply_id || reply.id)}
                                            className="flex items-center gap-1 text-red-600 text-sm disabled:opacity-50"
                                        >
                                            <Trash2 size={14} /> {deletingReplyId === (reply.reply_id || reply.id) ? "Deleting…" : "Delete"}
                                        </button>
                                    </div>

                                    <p className="text-sm text-slate-700 mt-3 ml-11">{reply.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {toDeletePost && (
                <DeletePostModal
                    post={post}
                    deleting={deleting}
                    onCancel={() => setToDeletePost(false)}
                    onConfirm={handleConfirmDeletePost}
                />
            )}
        </AdminPage>
    );
}

export default CommunityPostDetailsPage;
