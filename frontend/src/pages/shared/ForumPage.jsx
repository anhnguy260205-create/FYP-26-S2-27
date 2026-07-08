import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    Bookmark, Eye, Hash, Heart, MessageCircle,
    Search, Send, X, ArrowLeft, Trash2, Pencil,
    Check, Plus, MoreHorizontal, ChevronDown,
} from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import {
    createForumPost, updateForumPost, deleteForumPost, deleteForumReply,
    updateForumReply, getForumPost, getForumPosts,
    replyForumPost, toggleForumLike, toggleForumSave,
} from "../../api/expertApi.js";

// ── Category images ────────────────────────────────────────────────────────────
import imgTechnical from "../../images/techinical analysis.jpg";
import imgAI from "../../images/aiprediction.jpg";
import imgStrategy from "../../images/strategy.jpg";
import imgNews from "../../images/news.jpg";
import imgBeginner from "../../images/beginner.jpg";
import imgTrading from "../../images/trading tip.jpg";
import imgIT from "../../images/information technology.jpg";
import imgFinancials from "../../images/financials.jpg";
import imgConsumer from "../../images/consumer discretionary.jpg";
import imgComm from "../../images/communication services.jpg";
import imgEnergy from "../../images/energy.jpeg";
import imgRealEstate from "../../images/real estate.jpg";

const ROOM_IMAGES = {
    "Technical Analysis": imgTechnical,
    "AI Predictions": imgAI,
    "Portfolio Strategy": imgStrategy,
    "Market News": imgNews,
    "Beginners Corner": imgBeginner,
    "Trading Tips": imgTrading,
    "Information Technology": imgIT,
    "Financials": imgFinancials,
    "Consumer Discretionary": imgConsumer,
    "Communication Services": imgComm,
    "Energy": imgEnergy,
    "Real Estate": imgRealEstate,
};

const CATEGORIES = [
    "All", "Technical Analysis", "AI Predictions", "Portfolio Strategy",
    "Market News", "Beginners Corner", "Trading Tips",
    "Information Technology", "Financials", "Consumer Discretionary",
    "Communication Services", "Energy", "Real Estate",
];

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    bg: "#0d1526",
    card: "#161f38",
    card2: "#1e2740",
    border: "rgba(255,255,255,0.08)",
    accent: "#378ADD",
    cyan: "#00d3f2",
    success: "#4dd68c",
    danger: "#f87171",
    muted: "#8b92a8",
    text: "#e2e8f0",
    sub: "rgba(255,255,255,0.45)",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeText(v, fallback = "") {
    if (v === null || v === undefined) return fallback;
    if (["string", "number", "boolean"].includes(typeof v)) return String(v);
    if (typeof v === "object") return v.name || v.full_name || v.username || v.title || v.content || fallback;
    return fallback;
}

function getReplyCount(post) {
    if (Number.isFinite(Number(post?.reply_count))) return Number(post.reply_count);
    if (Array.isArray(post?.replies)) return post.replies.length;
    return 0;
}

function normaliseReply(reply) {
    const id = safeText(reply?.id || reply?.reply_id || `reply_${Date.now()}`);
    return {
        ...reply,
        id,
        reply_id: id,
        user_id: safeText(reply?.user_id, ""),
        author: safeText(reply?.author || reply?.author_name, "RocketTrade User"),
        author_name: safeText(reply?.author_name || reply?.author, "RocketTrade User"),
        author_role: safeText(reply?.author_role, "user"),
        content: safeText(reply?.content, ""),
        likes: Number(reply?.likes || reply?.likes_count || 0),
        liked_by_me: Boolean(reply?.liked_by_me),
        is_edited: Boolean(reply?.is_edited || reply?.isEdited),
        time: reply?.time || reply?.created_at || new Date().toISOString(),
        created_at: reply?.created_at || reply?.time || new Date().toISOString(),
    };
}

function normalisePost(post) {
    const replies = Array.isArray(post?.replies)
        ? post.replies.map(normaliseReply)
        : [];
    return {
        ...post,
        id: safeText(post?.id || post?.post_id, `post_${Date.now()}`),
        post_id: safeText(post?.post_id || post?.id, ""),
        user_id: safeText(post?.user_id, ""),
        title: safeText(post?.title, "Untitled"),
        content: safeText(post?.content, ""),
        preview: safeText(post?.preview || post?.content, "").slice(0, 200),
        category: safeText(post?.category, "General"),
        tags: Array.isArray(post?.tags)
            ? post.tags.map(t => safeText(t)).filter(Boolean)
            : String(post?.tags || "").split(",").map(t => t.trim()).filter(Boolean),
        author: safeText(post?.author || post?.author_name, "RocketTrade User"),
        author_role: safeText(post?.author_role, "user"),
        likes: Number(post?.likes || post?.likes_count || 0),
        views: Number(post?.views || post?.views_count || 0),
        replies,
        reply_count: Number.isFinite(Number(post?.reply_count)) ? Number(post.reply_count) : replies.length,
        liked_by_me: Boolean(post?.liked_by_me),
        saved_by_me: Boolean(post?.saved_by_me),
        is_pinned: Boolean(post?.is_pinned),
        created_at: post?.created_at || post?.time || new Date().toISOString(),
    };
}

function dedupePosts(posts) {
    const seenIds = new Set();
    return (posts || []).map(normalisePost).filter(p => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
    });
}

function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Just now";
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function roleColour(role) {
    const r = String(role || "").toLowerCase();
    if (r.includes("expert") || r.includes("consultant")) return { bg: "rgba(0,211,242,0.12)", text: "#00d3f2", border: "rgba(0,211,242,0.3)" };
    return { bg: "rgba(255,255,255,0.08)", text: C.muted, border: "rgba(255,255,255,0.15)" };
}

function displayRole(role) {
    const r = String(role || "").toLowerCase();
    if (r === "premium") return "investor";
    if (r === "consultant") return "expert";
    return r || "user";
}

function getInitials(name) {
    return String(name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function avatarColour(name) {
    const colours = ["#155dfc", "#0092b8", "#7c3aed", "#059669", "#d97706", "#dc2626"];
    let hash = 0;
    for (const c of String(name || "")) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colours[hash % colours.length];
}

function canDeletePost(post, user) {
    if (!user) return false;
    const uid = safeText(user.user_id || user.id);
    const name = safeText(user.full_name || user.name || user.username);
    if (uid && uid === safeText(post.user_id)) return true;
    if (name && name === safeText(post.author)) return true;
    const id = String(post.id || "");
    return id.startsWith("post_") && !id.startsWith("post_demo") && !id.startsWith("post_seed");
}

function canModifyReply(reply, user) {
    if (!user) return false;
    const r = normaliseReply(reply);
    const uid = safeText(user.user_id || user.id);
    const name = safeText(user.full_name || user.name || user.username);
    if (uid && uid === r.user_id) return true;
    if (name && name === r.author) return true;
    return Boolean(r.isNew);
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36, role }) {
    const rc = roleColour(role);
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", flexShrink: 0,
            background: avatarColour(name),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: size * 0.38, fontWeight: 700, color: "white",
            border: `2px solid ${rc.border}`,
        }}>
            {getInitials(name)}
        </div>
    );
}

// ── RoleBadge ─────────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
    const rc = roleColour(role);
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
            textTransform: "uppercase", padding: "2px 8px", borderRadius: 20,
            color: rc.text, background: rc.bg, border: `1px solid ${rc.border}`,
        }}>
            {displayRole(role)}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function ForumPage() {
    const navigate = useNavigate();
    const [currentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser") || "{}"));
    const role = String(currentUser?.role || "").toLowerCase();
    const isExpert = role === "expert";
    const userId = currentUser?.user_id || currentUser?.id || "";
    const userName = currentUser?.full_name || currentUser?.name || currentUser?.username || "RocketTrade User";

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPost, setSelectedPost] = useState(null);
    const [activeRoom, setActiveRoom] = useState(null);
    const [query, setQuery] = useState("");
    const [sort, setSort] = useState("");
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [loadingReplies, setLoadingReplies] = useState(false);

    // Clear stale localStorage forum data from old versions on first load
    useEffect(() => {
        try {
            const oldKeys = Object.keys(localStorage).filter(k =>
                k === "rocketTradeForumPosts" || k.startsWith("forum")
            );
            oldKeys.forEach(k => localStorage.removeItem(k));
        } catch { }
    }, []);

    // Load posts from backend on mount — source of truth is always the backend
    useEffect(() => {
        setLoading(true);
        getForumPosts(userId)
            .then(data => {
                if (data?.success && Array.isArray(data.posts)) {
                    setPosts(dedupePosts(data.posts));
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [userId]);

    const filteredPosts = useMemo(() => {
        const q = query.toLowerCase().trim();
        let list = posts.filter(p => {
            const matchRoom = !activeRoom || p.category === activeRoom;
            const matchSearch = !q || [p.title, p.content, p.category, p.author, ...(p.tags || [])].some(v => safeText(v).toLowerCase().includes(q));
            const matchSaved = sort !== "saved" || p.saved_by_me;
            const matchLiked = sort !== "liked" || p.liked_by_me;
            const matchMine = sort !== "mine" || p.user_id === userId;
            const matchCommented = sort !== "commented" || p.commented_by_me;
            return matchRoom && matchSearch && matchSaved && matchLiked && matchMine && matchCommented;
        });
        if (sort === "popular") list = [...list].sort((a, b) => (b.likes - a.likes) || (b.views - a.views));
        else if (sort === "replies") list = [...list].sort((a, b) => getReplyCount(b) - getReplyCount(a));
        else if (sort === "saved" || sort === "liked" || sort === "mine" || sort === "commented") list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        else list = [...list].sort((a, b) => {
            // "latest" or "" both sort by newest first
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return new Date(b.created_at) - new Date(a.created_at);
        });
        return list;
    }, [posts, query, activeRoom, sort]);

    function mutatePost(updated) {
        const safe = normalisePost(updated);
        setPosts(prev => {
            const next = prev.map(p => p.id === safe.id ? safe : p);
            return next.some(p => p.id === safe.id) ? next : [safe, ...next];
        });
        setSelectedPost(prev => prev?.id === safe.id ? safe : prev);
    }

    function openPost(post) {
        // Show post content immediately (no replies yet)
        setSelectedPost(normalisePost({ ...post, replies: [] }));
        setLoadingReplies(true);
        // Always fetch fresh from backend — ensures replies are current
        getForumPost(post.id, userId)
            .then(data => {
                if (data?.success && data.post) {
                    const fresh = normalisePost(data.post);
                    mutatePost(fresh);
                    setSelectedPost(fresh);
                } else if (data?.post) {
                    const fresh = normalisePost(data.post);
                    mutatePost(fresh);
                    setSelectedPost(fresh);
                }
            })
            .catch(() => { })
            .finally(() => setLoadingReplies(false));
    }

    function handleLike(post, e) {
        e?.stopPropagation?.();
        const optimistic = normalisePost({ ...post, liked_by_me: !post.liked_by_me, likes: post.likes + (post.liked_by_me ? -1 : 1) });
        mutatePost(optimistic);
        if (userId) toggleForumLike(post.id, userId).then(d => d?.post && mutatePost(d.post)).catch(() => { });
    }

    function handleSave(post, e) {
        e?.stopPropagation?.();
        const optimistic = normalisePost({ ...post, saved_by_me: !post.saved_by_me });
        mutatePost(optimistic);
        if (userId) toggleForumSave(post.id, userId).then(d => d?.post && mutatePost(d.post)).catch(() => { });
    }

    async function handleDelete(post, e) {
        e?.stopPropagation?.();
        if (!window.confirm(`Delete "${post.title}"?`)) return;
        setPosts(prev => prev.filter(p => p.id !== post.id));
        setSelectedPost(prev => prev?.id === post.id ? null : prev);
        try { await deleteForumPost(post.id, userId); } catch { }
    }

    const [editingPost, setEditingPost] = useState(null);

    async function handleEditPost(post, updatedData) {
        const optimistic = normalisePost({ ...post, ...updatedData });
        mutatePost(optimistic);
        setEditingPost(null);
        try {
            const d = await updateForumPost(post.id, updatedData);
            if (d?.post) mutatePost(d.post);
        } catch { }
    }

    async function handleDeleteReply(post, reply) {
        const r = normaliseReply(reply);
        if (!canModifyReply(r, currentUser)) { window.alert("You can only delete your own comments."); return; }
        if (!window.confirm("Delete this comment?")) return;
        const next = normalisePost({ ...post, replies: (post.replies || []).filter(x => normaliseReply(x).id !== r.id) });
        mutatePost(next);
        try { const d = await deleteForumReply(post.id, r.id, userId); if (d?.post) mutatePost(d.post); } catch { }
    }

    async function handleEditReply(post, reply, content) {
        const r = normaliseReply(reply);
        const text = safeText(content).trim();
        if (!text) { window.alert("Reply cannot be empty."); return false; }
        if (!canModifyReply(r, currentUser)) { window.alert("You can only edit your own comments."); return false; }
        const next = normalisePost({
            ...post,
            replies: (post.replies || []).map(x => {
                const sr = normaliseReply(x);
                return sr.id === r.id ? { ...sr, content: text, is_edited: true } : sr;
            }),
        });
        mutatePost(next);
        try { const d = await updateForumReply(post.id, r.id, content, userId); if (d?.post) mutatePost(d.post); } catch { }
        return true;
    }

    async function handleCreate(payload) {
        if (creating) return;
        setCreating(true);
        const tempId = `post_${Date.now()}`;
        const tempPost = normalisePost({ ...payload, id: tempId, user_id: userId, author: userName, author_role: currentUser?.role || "investor", likes: 0, views: 0, replies: [], created_at: new Date().toISOString() });
        setPosts(prev => [tempPost, ...prev]);
        setShowCreate(false);
        try {
            const d = await createForumPost({ user_id: userId, ...payload });
            if (d?.post) {
                const real = normalisePost(d.post);
                setPosts(prev => [real, ...prev.filter(p => p.id !== tempId)]);
            }
        } catch { } finally { setCreating(false); }
    }

    async function handleReply() {
        if (!replyText.trim() || !selectedPost) return;
        const content = replyText.trim();
        // Optimistic update — show reply immediately
        const tempReply = normaliseReply({
            id: `reply_${Date.now()}`,
            user_id: userId,
            author: userName,
            author_role: currentUser?.role || "investor",
            content,
            time: new Date().toISOString(),
            likes: 0,
            isNew: true,
        });
        const optimistic = normalisePost({
            ...selectedPost,
            replies: [...(selectedPost.replies || []), tempReply],
            reply_count: getReplyCount(selectedPost) + 1,
        });
        mutatePost(optimistic);
        setReplyText("");
        try {
            // Send only content — user_id comes from the auth token on the backend
            const d = await replyForumPost(selectedPost.id, { content });
            if (d?.post) {
                // Backend returned the updated post with the persisted reply
                mutatePost(d.post);
                setSelectedPost(normalisePost(d.post));
            } else if (d?.success === false) {
                console.error("Reply failed:", d?.message);
            }
        } catch (err) {
            console.error("Reply error:", err);
        }
    }

    return (
        <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {isExpert ? <ConsultantHeader /> : <GeneralHeader />}

            <main style={{ flex: 1, maxWidth: 1100, margin: "0 auto", width: "100%", padding: "24px 24px 48px" }}>

                {selectedPost ? (
                    <PostDetail
                        post={selectedPost}
                        currentUser={currentUser}
                        onBack={() => setSelectedPost(null)}
                        onLike={e => handleLike(selectedPost, e)}
                        onSave={e => handleSave(selectedPost, e)}
                        onDelete={e => handleDelete(selectedPost, e)}
                        onDeleteReply={(reply) => handleDeleteReply(selectedPost, reply)}
                        onEditReply={(reply, content) => handleEditReply(selectedPost, reply, content)}
                        onEditPost={(data) => handleEditPost(selectedPost, data)}
                        canDelete={canDeletePost(selectedPost, currentUser)}
                        canEdit={canDeletePost(selectedPost, currentUser)}
                        replyText={replyText}
                        setReplyText={setReplyText}
                        onReply={handleReply}
                        loadingReplies={loadingReplies}
                    />
                ) : (
                    <ForumHome
                        posts={posts}
                        loading={loading}
                        activeRoom={activeRoom}
                        setActiveRoom={setActiveRoom}
                        query={query}
                        setQuery={setQuery}
                        sort={sort}
                        setSort={setSort}
                        filteredPosts={filteredPosts}
                        currentUser={currentUser}
                        userId={userId}
                        isExpert={isExpert}
                        navigate={navigate}
                        onShowCreate={() => setShowCreate(true)}
                        onOpenPost={openPost}
                        onLike={handleLike}
                        onSave={handleSave}
                        onDelete={handleDelete}
                        canDelete={canDeletePost}
                    />
                )}
            </main>

            <Footer />

            {showCreate && (
                <CreatePostModal
                    onClose={() => setShowCreate(false)}
                    onCreate={handleCreate}
                    creating={creating}
                    defaultCategory={activeRoom}
                />
            )}
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ForumHome — structured home view
// ─────────────────────────────────────────────────────────────────────────────
function ForumHome({
    posts, loading, activeRoom, setActiveRoom, query, setQuery,
    sort, setSort, filteredPosts, currentUser, userId, isExpert, navigate, onShowCreate,
    onOpenPost, onLike, onSave, onDelete, canDelete,
}) {
    const recentPosts = [...posts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
    const savedPosts = posts.filter(p => p.saved_by_me);
    const myPosts = posts.filter(p => p.user_id && p.user_id === userId);
    const commentedPosts = posts.filter(p => p.commented_by_me);
    const likedPosts = posts.filter(p => p.liked_by_me);
    const trendingPosts = [...posts].sort((a, b) => (b.likes + b.views) - (a.likes + a.views)).slice(0, 3);
    const showHome = !activeRoom && !query && sort === "";

    return (
        <>
            {/* ── Top bar ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                    {/* Back to community forum home — only shows when viewing a filtered/sorted view */}
                    {(sort !== "" || activeRoom || query) && (
                        <button onClick={() => { setSort(""); setActiveRoom(null); setQuery(""); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.muted, background: "none", border: "none", cursor: "pointer", marginBottom: 10, padding: 0 }}>
                            <ArrowLeft size={13} /> Back to Community Forum
                        </button>
                    )}
                    {activeRoom && (
                        <button onClick={() => { setActiveRoom(null); setQuery(""); setSort(""); }}
                            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.cyan, background: "none", border: "none", cursor: "pointer", marginBottom: 6, padding: 0 }}>
                            <ArrowLeft size={15} /> All Topics
                        </button>
                    )}
                    <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: C.text, margin: 0, lineHeight: 1 }}>
                        {activeRoom || "Community Forum"}
                    </h1>
                    {activeRoom && (
                        <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                            {filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} in this topic
                        </p>
                    )}
                    {!activeRoom && !query && (
                        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
                            Share ideas, discuss markets, and learn from the community
                        </p>
                    )}
                </div>
                <button onClick={onShowCreate} style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "10px 20px",
                    borderRadius: 50, background: "linear-gradient(135deg,#155dfc,#0092b8)",
                    border: "none", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(21,93,252,0.35)", whiteSpace: "nowrap",
                }}>
                    <Plus size={15} /> New Post
                </button>
            </div>

            {/* ── Category pill strip ── */}
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6, marginBottom: 20, scrollbarWidth: "none" }}>
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => { setActiveRoom(cat === "All" ? null : cat); }} style={{
                        padding: "7px 15px", borderRadius: 50, fontSize: 12, fontWeight: 600,
                        whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
                        border: (cat === "All" ? !activeRoom : activeRoom === cat) ? "none" : `1px solid ${C.border}`,
                        background: (cat === "All" ? !activeRoom : activeRoom === cat) ? C.accent : "transparent",
                        color: (cat === "All" ? !activeRoom : activeRoom === cat) ? "white" : C.muted,
                        transition: "all 0.15s",
                    }}>{cat}</button>
                ))}
            </div>

            {/* ── Search + sort ── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
                <div style={{ flex: 1, position: "relative" }}>
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.muted, pointerEvents: "none" }} />
                    <input value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="Search posts, topics, authors…"
                        style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <select value={sort} onChange={e => { setSort(e.target.value); }} style={{
                    padding: "10px 14px", borderRadius: 12, border: `1px solid ${C.border}`,
                    background: C.card, color: C.text, fontSize: 13, outline: "none", cursor: "pointer",
                }}>
                    <option value="">Home</option>
                    <option value="latest">Latest</option>
                    <option value="popular">Most Popular</option>
                    <option value="replies">Most Replies</option>
                    <option value="saved">My Saved</option>
                    <option value="liked">My Liked</option>
                    <option value="mine">My Posts</option>
                    <option value="commented">Commented</option>
                </select>
            </div>

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* HOME VIEW — shown when no filter/search active                 */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {showHome && !loading && (
                <>
                    {/* ── Trending right now ── */}
                    {trendingPosts.length > 0 && (
                        <section style={{ marginBottom: 32 }}>
                            <SectionHeader icon="🔥" label="Trending Right Now" />
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
                                {trendingPosts.map(post => (
                                    <TrendingCard
                                        key={post.id}
                                        post={post}
                                        onClick={() => onOpenPost(post)}
                                        onLike={e => onLike(post, e)}
                                        onSave={e => onSave(post, e)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── My Activity — always shown, even with 0 counts ── */}
                    <section style={{ marginBottom: 32 }}>
                        <SectionHeader icon="👤" label="My Activity" />
                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={() => setSort("saved")} style={{
                                flex: 1, padding: "14px 18px", borderRadius: 14,
                                background: C.card, border: `1px solid ${C.border}`,
                                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = C.cyan}
                                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>⭐</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{savedPosts.length}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Saved Posts</div>
                            </button>
                            <button onClick={() => setSort("liked")} style={{
                                flex: 1, padding: "14px 18px", borderRadius: 14,
                                background: C.card, border: `1px solid ${C.border}`,
                                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = C.danger}
                                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>❤️</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{likedPosts.length}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Liked Posts</div>
                            </button>
                            <button onClick={() => setSort("mine")} style={{
                                flex: 1, padding: "14px 18px", borderRadius: 14,
                                background: C.card, border: `1px solid ${C.border}`,
                                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "#a78bfa"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>📝</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{myPosts.length}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>My Posts</div>
                            </button>
                            <button onClick={() => setSort("commented")} style={{
                                flex: 1, padding: "14px 18px", borderRadius: 14,
                                background: C.card, border: `1px solid ${C.border}`,
                                cursor: "pointer", textAlign: "left", transition: "border-color 0.15s",
                            }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = "#34d399"}
                                onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
                                <div style={{ fontSize: 22, marginBottom: 6 }}>💬</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{commentedPosts.length}</div>
                                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Commented</div>
                            </button>
                        </div>
                    </section>

                    {/* ── Topic rooms grid ── */}
                    <section style={{ marginBottom: 32 }}>
                        <SectionHeader icon="📚" label="Browse by Topic" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 10 }}>
                            {CATEGORIES.filter(c => c !== "All").map(cat => {
                                const count = posts.filter(p => p.category === cat).length;
                                const img = ROOM_IMAGES[cat];
                                const latest = posts.filter(p => p.category === cat).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                                return (
                                    <button key={cat} onClick={() => setActiveRoom(cat)} style={{
                                        borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`,
                                        cursor: "pointer", textAlign: "left", background: C.card,
                                        transition: "all 0.15s", display: "flex", flexDirection: "column",
                                    }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = "translateY(-2px)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
                                        <div style={{ height: 80, overflow: "hidden", background: C.card2, position: "relative" }}>
                                            {img
                                                ? <img src={img} alt={cat} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Hash size={20} color={C.muted} /></div>
                                            }
                                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(13,21,38,0.7) 0%,transparent 60%)" }} />
                                        </div>
                                        <div style={{ padding: "10px 12px", flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 3, lineHeight: 1.3 }}>{cat}</div>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                                <span style={{ fontSize: 11, color: C.muted }}>{count} post{count !== 1 ? "s" : ""}</span>
                                                {latest && <span style={{ fontSize: 10, color: C.accent }}>Active</span>}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* ── Latest posts ── */}
                    <section style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16 }}>🕐</span>
                                <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Latest Posts</span>
                            </div>
                            <button onClick={() => setSort("latest")} style={{ fontSize: 12, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>See all →</button>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {recentPosts.map(post => (
                                <PostRow
                                    key={post.id}
                                    post={post}
                                    onClick={() => onOpenPost(post)}
                                    onLike={e => onLike(post, e)}
                                    onSave={e => onSave(post, e)}
                                    onDelete={e => onDelete(post, e)}
                                    canDelete={canDelete(post, currentUser)}
                                />
                            ))}
                        </div>
                    </section>
                </>
            )}

            {/* ════════════════════════════════════════════════════════════════ */}
            {/* FILTERED VIEW — room / sort / search active                    */}
            {/* ════════════════════════════════════════════════════════════════ */}
            {(!showHome || loading) && (
                loading ? (
                    <div style={{ textAlign: "center", color: C.muted, padding: 60 }}>Loading posts…</div>
                ) : (
                    <>
                        {/* Section label for special sort modes */}
                        {(sort === "saved" || sort === "liked" || sort === "popular" || sort === "replies" || sort === "mine" || sort === "commented" || sort === "latest") && !activeRoom && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
                                <span style={{ fontSize: 18 }}>
                                    {sort === "saved" ? "⭐" : sort === "liked" ? "❤️" : sort === "mine" ? "📝" : sort === "commented" ? "💬" : sort === "popular" ? "🔥" : sort === "latest" ? "🕐" : "💬"}
                                </span>
                                <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>
                                    {sort === "saved" ? "My Saved Posts"
                                        : sort === "liked" ? "Posts I Liked"
                                            : sort === "mine" ? "My Posts"
                                                : sort === "commented" ? "Posts I Commented On"
                                                    : sort === "popular" ? "Most Popular"
                                                        : sort === "latest" ? "Latest Posts"
                                                            : "Most Replies"}
                                </span>
                                <span style={{ fontSize: 12, color: C.muted }}>({filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""})</span>
                            </div>
                        )}

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {filteredPosts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUser={currentUser}
                                    onOpen={() => onOpenPost(post)}
                                    onLike={e => onLike(post, e)}
                                    onSave={e => onSave(post, e)}
                                    onDelete={e => onDelete(post, e)}
                                    canDelete={canDelete(post, currentUser)}
                                />
                            ))}
                            {filteredPosts.length === 0 && (
                                <div style={{ textAlign: "center", padding: 60 }}>
                                    <div style={{ fontSize: 40, marginBottom: 12 }}>
                                        {sort === "saved" ? "⭐" : sort === "liked" ? "❤️" : sort === "mine" ? "📝" : sort === "commented" ? "💬" : "📭"}
                                    </div>
                                    <div style={{ color: C.muted, fontSize: 14, marginBottom: 8 }}>
                                        {sort === "saved" ? "You haven't saved any posts yet."
                                            : sort === "liked" ? "You haven't liked any posts yet."
                                                : sort === "mine" ? "You haven't posted anything yet."
                                                    : sort === "commented" ? "You haven't commented on any posts yet."
                                                        : "No posts found."}
                                    </div>
                                    {sort !== "saved" && sort !== "liked" && (
                                        <button onClick={onShowCreate} style={{ color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                                            Be the first to post →
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )
            )}
        </>
    );
}

// ── SectionHeader ─────────────────────────────────────────────────────────────
function SectionHeader({ icon, label }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{label}</span>
            <div style={{ flex: 1, height: 1, background: C.border, marginLeft: 6 }} />
        </div>
    );
}

// ── TrendingCard — compact horizontal card for trending section ───────────────
function TrendingCard({ post, onClick, onLike, onSave }) {
    return (
        <div onClick={onClick} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 14, cursor: "pointer", transition: "border-color 0.15s",
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, background: "rgba(55,138,221,0.12)", color: C.accent, border: `1px solid rgba(55,138,221,0.2)` }}>
                    {post.category}
                </span>
                {post.is_pinned && <span style={{ fontSize: 10 }}>📌</span>}
            </div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 6px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {post.title}
            </h3>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                by {post.author} · {formatDate(post.created_at)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: post.liked_by_me ? C.danger : C.muted }}>
                    <Heart size={13} fill={post.liked_by_me ? "currentColor" : "none"} /> {post.likes}
                </button>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted }}>
                    <MessageCircle size={13} /> {getReplyCount(post)}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.muted }}>
                    <Eye size={13} /> {post.views}
                </span>
                <button onClick={onSave} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: post.saved_by_me ? C.cyan : C.muted }}>
                    <Bookmark size={13} fill={post.saved_by_me ? "currentColor" : "none"} />
                </button>
            </div>
        </div>
    );
}

// ── PostRow — compact list row for "Latest Posts" section ─────────────────────
function PostRow({ post, onClick, onLike, onSave, onDelete, canDelete }) {
    return (
        <div onClick={onClick} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 14px", cursor: "pointer",
            transition: "border-color 0.15s",
        }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
            {/* Category colour stripe */}
            <div style={{ width: 3, borderRadius: 4, background: C.accent, alignSelf: "stretch", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>{post.category}</span>
                    {post.is_pinned && <span style={{ fontSize: 10 }}>📌</span>}
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: "0 0 4px", lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {post.title}
                </h3>
                <div style={{ fontSize: 12, color: C.muted }}>
                    by <span style={{ color: C.sub }}>{post.author}</span> · {formatDate(post.created_at)}
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 10, fontSize: 12, color: C.muted }}>
                    <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: post.liked_by_me ? C.danger : C.muted }}>
                        <Heart size={12} fill={post.liked_by_me ? "currentColor" : "none"} />{post.likes}
                    </button>
                    <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <MessageCircle size={12} />{getReplyCount(post)}
                    </span>
                </div>
                <button onClick={onSave} style={{ background: "none", border: "none", cursor: "pointer", color: post.saved_by_me ? C.cyan : C.muted }}>
                    <Bookmark size={13} fill={post.saved_by_me ? "currentColor" : "none"} />
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PostCard — Instagram-style
// ─────────────────────────────────────────────────────────────────────────────
function PostCard({ post, currentUser, onOpen, onLike, onSave, onDelete, canDelete }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <article style={{
            background: C.card,
            borderRadius: 20,
            marginBottom: 16,
            border: `1px solid ${C.border}`,
            overflow: "hidden",
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
                <Avatar name={post.author} size={40} role={post.author_role} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{post.author}</span>
                        <RoleBadge role={post.author_role} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>{formatDate(post.created_at)}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>·</span>
                        <span style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>{post.category}</span>
                        {post.is_pinned && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(55,138,221,0.15)", color: C.accent, fontWeight: 700 }}>📌 PINNED</span>}
                    </div>
                </div>
                {/* More menu */}
                {canDelete && (
                    <div ref={menuRef} style={{ position: "relative" }}>
                        <button onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}>
                            <MoreHorizontal size={18} />
                        </button>
                        {menuOpen && (
                            <div style={{ position: "absolute", right: 0, top: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "6px 0", minWidth: 130, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                                <button onClick={e => { setMenuOpen(false); onDelete(e); }} style={{ width: "100%", padding: "8px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                    <Trash2 size={14} /> Delete post
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content — clickable */}
            <div onClick={onOpen} style={{ padding: "0 16px 12px", cursor: "pointer" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "0 0 8px", lineHeight: 1.4 }}>{post.title}</h2>
                <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.7, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.preview || post.content}
                </p>
                {/* Tags */}
                {post.tags?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                        {post.tags.slice(0, 4).map(t => (
                            <span key={t} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, background: "rgba(55,138,221,0.12)", color: C.accent, fontWeight: 600 }}>#{t}</span>
                        ))}
                    </div>
                )}
            </div>

            {/* Action bar */}
            <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderTop: `1px solid ${C.border}`, gap: 4 }}>
                <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: post.liked_by_me ? C.danger : C.muted, transition: "color 0.15s" }}>
                    <Heart size={18} fill={post.liked_by_me ? "currentColor" : "none"} strokeWidth={1.8} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{post.likes || ""}</span>
                </button>
                <button onClick={onOpen} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                    <MessageCircle size={18} strokeWidth={1.8} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{getReplyCount(post) || ""}</span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", color: C.muted }}>
                    <Eye size={16} strokeWidth={1.8} />
                    <span style={{ fontSize: 12 }}>{post.views || ""}</span>
                </div>
                <div style={{ marginLeft: "auto" }}>
                    <button onClick={onSave} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: post.saved_by_me ? C.cyan : C.muted, transition: "color 0.15s" }}>
                        <Bookmark size={18} fill={post.saved_by_me ? "currentColor" : "none"} strokeWidth={1.8} />
                    </button>
                </div>
            </div>
        </article>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PostDetail
// ─────────────────────────────────────────────────────────────────────────────
function PostDetail({ post, currentUser, onBack, onLike, onSave, onDelete, onDeleteReply, onEditReply, onEditPost, canDelete, canEdit, replyText, setReplyText, onReply, loadingReplies }) {
    const replies = Array.isArray(post.replies) ? post.replies.map(normaliseReply) : [];
    const [editingId, setEditingId] = useState(null);
    const [editingText, setEditingText] = useState("");
    const [editingPost, setEditingPost] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title || "");
    const [editContent, setEditContent] = useState(post.content || "");

    async function saveEdit(reply) {
        const ok = await onEditReply(reply, editingText);
        if (ok) { setEditingId(null); setEditingText(""); }
    }

    return (
        <div>
            <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: C.cyan, background: "none", border: "none", cursor: "pointer", marginBottom: 16, padding: 0 }}>
                <ArrowLeft size={15} /> Back
            </button>

            {/* Post article */}
            <article style={{ background: C.card, borderRadius: 20, overflow: "hidden", border: `1px solid ${C.border}`, marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px" }}>
                    <Avatar name={post.author} size={44} role={post.author_role} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{post.author}</span>
                            <RoleBadge role={post.author_role} />
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{formatDate(post.created_at)} · {post.category}</div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        {canEdit && !editingPost && (
                            <button onClick={() => { setEditTitle(post.title); setEditContent(post.content); setEditingPost(true); }}
                                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(55,138,221,0.1)", border: `1px solid rgba(55,138,221,0.25)`, color: C.accent, cursor: "pointer", fontSize: 12 }}>
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        {canDelete && !editingPost && (
                            <button onClick={onDelete} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: `1px solid rgba(248,113,113,0.2)`, color: C.danger, cursor: "pointer", fontSize: 12 }}>
                                <Trash2 size={13} /> Delete
                            </button>
                        )}
                    </div>
                </div>

                <div style={{ padding: "0 16px 16px" }}>
                    {editingPost ? (
                        <div>
                            <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="Post title"
                                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.accent}`, background: C.card2, color: C.text, fontSize: 16, fontWeight: 700, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
                            />
                            <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                rows={8}
                                placeholder="Post content"
                                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.7 }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                                <button onClick={() => setEditingPost(false)}
                                    style={{ padding: "8px 16px", borderRadius: 10, background: C.card2, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 13 }}>
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (editTitle.trim() && editContent.trim()) {
                                            onEditPost({ title: editTitle.trim(), content: editContent.trim() });
                                            setEditingPost(false);
                                        }
                                    }}
                                    style={{ padding: "8px 20px", borderRadius: 10, background: C.accent, border: "none", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                                    <Check size={13} /> Save Changes
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 12px", lineHeight: 1.3 }}>{post.title}</h1>
                            <p style={{ fontSize: 14, color: C.sub, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{post.content}</p>
                            {post.tags?.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 14 }}>
                                    {post.tags.map(t => (
                                        <span key={t} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, background: "rgba(55,138,221,0.12)", color: C.accent, fontWeight: 600 }}>#{t}</span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Action bar */}
                <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderTop: `1px solid ${C.border}`, gap: 4 }}>
                    <button onClick={onLike} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 50, background: post.liked_by_me ? "rgba(248,113,113,0.12)" : "none", border: `1px solid ${post.liked_by_me ? "rgba(248,113,113,0.3)" : C.border}`, cursor: "pointer", color: post.liked_by_me ? C.danger : C.muted, fontWeight: 600, fontSize: 13 }}>
                        <Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} /> {post.likes} Like{post.likes !== 1 ? "s" : ""}
                    </button>
                    <button onClick={onSave} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 50, background: post.saved_by_me ? "rgba(0,211,242,0.12)" : "none", border: `1px solid ${post.saved_by_me ? "rgba(0,211,242,0.3)" : C.border}`, cursor: "pointer", color: post.saved_by_me ? C.cyan : C.muted, fontWeight: 600, fontSize: 13 }}>
                        <Bookmark size={16} fill={post.saved_by_me ? "currentColor" : "none"} /> {post.saved_by_me ? "Saved" : "Save"}
                    </button>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: C.muted, fontSize: 12 }}>
                        <Eye size={14} /> {post.views} views
                    </div>
                </div>
            </article>

            {/* Comments section */}
            <div style={{ background: C.card, borderRadius: 20, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ padding: "16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: C.text, margin: 0 }}>
                        {loadingReplies ? "Comments" : `Comments (${replies.length})`}
                    </h2>
                    {loadingReplies && (
                        <span style={{ fontSize: 12, color: C.muted }}>Loading…</span>
                    )}
                </div>

                {loadingReplies ? (
                    <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13 }}>
                        Loading comments…
                    </div>
                ) : replies.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: C.muted, fontSize: 13 }}>
                        No comments yet. Be the first to reply!
                    </div>
                ) : (
                    <div style={{ padding: "8px 0" }}>
                        {replies.map(reply => {
                            const canEdit = canModifyReply(reply, currentUser);
                            const isEditing = editingId === reply.id;
                            return (
                                <div key={reply.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ display: "flex", gap: 10 }}>
                                        <Avatar name={reply.author} size={32} role={reply.author_role} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{reply.author}</span>
                                                    <RoleBadge role={reply.author_role} />
                                                    {reply.is_edited && <span style={{ fontSize: 10, color: C.muted }}>(edited)</span>}
                                                    <span style={{ fontSize: 11, color: C.muted }}>{formatDate(reply.time)}</span>
                                                </div>
                                                {canEdit && !isEditing && (
                                                    <div style={{ display: "flex", gap: 4 }}>
                                                        <button onClick={() => { setEditingId(reply.id); setEditingText(reply.content); }} style={{ padding: "3px 8px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                                            <Pencil size={11} /> Edit
                                                        </button>
                                                        <button onClick={() => onDeleteReply(reply)} style={{ padding: "3px 8px", borderRadius: 6, background: "none", border: "none", cursor: "pointer", color: C.danger, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                                            <Trash2 size={11} /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            {isEditing ? (
                                                <div>
                                                    <textarea value={editingText} onChange={e => setEditingText(e.target.value)} rows={3}
                                                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                                                    <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                                                        <button onClick={() => setEditingId(null)} style={{ padding: "6px 14px", borderRadius: 8, background: C.card2, border: `1px solid ${C.border}`, color: C.muted, cursor: "pointer", fontSize: 12 }}>Cancel</button>
                                                        <button onClick={() => saveEdit(reply)} style={{ padding: "6px 14px", borderRadius: 8, background: C.accent, border: "none", color: "white", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                                            <Check size={12} /> Save
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: 14, color: C.sub, margin: 0, lineHeight: 1.7, whiteSpace: "pre-line" }}>{reply.content}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Reply input */}
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <Avatar name={currentUser?.full_name || currentUser?.username || "You"} size={32} role={currentUser?.role} />
                    <div style={{ flex: 1, position: "relative" }}>
                        <textarea
                            value={replyText}
                            onChange={e => setReplyText(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onReply(); } }}
                            rows={2}
                            placeholder="Add a comment… (Enter to post)"
                            style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }}
                        />
                    </div>
                    <button onClick={onReply} disabled={!replyText.trim()} style={{ padding: "10px 16px", borderRadius: 12, background: replyText.trim() ? C.accent : "rgba(255,255,255,0.08)", border: "none", color: replyText.trim() ? "white" : C.muted, cursor: replyText.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 6, fontWeight: 600, fontSize: 13, transition: "background 0.15s" }}>
                        <Send size={14} /> Post
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
//  CreatePostModal
// ─────────────────────────────────────────────────────────────────────────────
function CreatePostModal({ onClose, onCreate, creating, defaultCategory }) {
    const [form, setForm] = useState({ title: "", content: "", category: defaultCategory || "Technical Analysis", tags: "" });
    const [error, setError] = useState("");
    const [submitted, setSub] = useState(false);

    function submit() {
        if (submitted || creating) return;
        if (!form.title.trim() || !form.content.trim()) { setError("Title and content are required."); return; }
        setSub(true);
        onCreate({ title: form.title.trim(), content: form.content.trim(), category: form.category, tags: form.tags.split(",").map(t => t.trim()).filter(Boolean) });
    }

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ width: "100%", maxWidth: 600, background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${C.border}` }}>
                    <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: 0 }}>Create Post</h2>
                    <button onClick={onClose} style={{ background: `rgba(255,255,255,0.08)`, border: "none", cursor: "pointer", borderRadius: 8, padding: 6, color: C.muted }}>
                        <X size={16} />
                    </button>
                </div>
                <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                    <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="Post title"
                        style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: "none" }} />
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                        style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: "none" }}>
                        {CATEGORIES.filter(c => c !== "All").map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                        placeholder="Tags: AAPL, RSI, Breakout…"
                        style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: "none" }} />
                    <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                        rows={7} placeholder="What's on your mind?"
                        style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontSize: 14, outline: "none", resize: "vertical" }} />
                    {error && <p style={{ fontSize: 12, color: C.danger, margin: 0 }}>{error}</p>}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "0 20px 20px" }}>
                    <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 12, background: `rgba(255,255,255,0.06)`, border: "none", color: C.muted, cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                    <button onClick={submit} disabled={submitted || creating} style={{ padding: "10px 24px", borderRadius: 12, background: `linear-gradient(135deg,#155dfc,#0092b8)`, border: "none", color: "white", cursor: "pointer", fontWeight: 700, fontSize: 14, opacity: (submitted || creating) ? 0.6 : 1 }}>
                        {submitted || creating ? "Publishing…" : "Publish"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
