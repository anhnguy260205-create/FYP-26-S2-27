
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Eye, Heart, MessageCircle, Search, Send, X, ArrowLeft, Trash2, Pencil, Check } from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { createForumPost, deleteForumPost, deleteForumReply, updateForumReply, getForumPost, getForumPosts, replyForumPost, toggleForumLike, toggleForumSave } from "../../api/expertApi.js";

const STORAGE_KEY = "rocketTradeForumPosts";

const DEFAULT_POSTS = [
  { id: "post_demo_aapl", title: "AAPL double-bottom setup — breakout watch", content: "Apple has been forming a potential double-bottom near the recent support zone. I am watching for a confirmed close above neckline resistance with stronger volume before treating it as a valid bullish setup.", category: "Technical Analysis", tags: ["AAPL", "Breakout"], author: "Miko Tanaka", author_role: "expert", likes: 34, views: 820, saved_by_me: false, liked_by_me: false, created_at: "2026-05-06T09:00:00+08:00", replies: [{ id: "reply_aapl_1", author: "Sarah Chen", content: "Helpful breakdown, thanks for the clear levels.", time: "2026-05-06T09:35:00+08:00", likes: 5, isNew: false }] },
  { id: "post_demo_ai", title: "How should we use AI prediction signals responsibly?", content: "I have been comparing AI signals with my own technical analysis. My view is that the AI output is useful as a screening layer, but every trade still needs position sizing and risk controls.", category: "AI Predictions", tags: ["AI", "Signals", "Risk"], author: "Wei Zhang", author_role: "premium", likes: 58, views: 1240, saved_by_me: false, liked_by_me: false, created_at: "2026-05-05T18:20:00+08:00", replies: [] },
  { id: "post_demo_portfolio", title: "Building a balanced portfolio for volatile markets", content: "In uncertain markets, I prefer combining quality growth, defensive sectors and some cash flexibility. The key is to avoid overconcentration in one theme even when momentum looks attractive.", category: "Portfolio Strategy", tags: ["Portfolio", "Defensive"], author: "Dr. Raymond Lee", author_role: "consultant", likes: 76, views: 1680, saved_by_me: false, liked_by_me: false, created_at: "2026-05-04T12:00:00+08:00", replies: [] },
];

const CATEGORIES = ["All", "Technical Analysis", "AI Predictions", "Portfolio Strategy", "Market News", "Beginners Corner", "Trading Tips"];

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  if (Array.isArray(value)) return String(value.length);
  if (typeof value === "object") return value.name || value.full_name || value.username || value.title || value.content || fallback;
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
    time: reply?.time || reply?.created_at || new Date().toISOString(),
    likes: Number(reply?.likes || reply?.likes_count || 0),
    isNew: Boolean(reply?.isNew),
  };
}

function normalisePost(post) {
  const replies = Array.isArray(post?.replies) ? post.replies.map(normaliseReply) : [];
  const id = safeText(post?.id || post?.post_id || `post_${Date.now()}`);
  return {
    ...post,
    id,
    post_id: id,
    user_id: safeText(post?.user_id, ""),
    title: safeText(post?.title, "Untitled post"),
    content: safeText(post?.content || post?.preview, ""),
    preview: safeText(post?.preview || post?.content, "").slice(0, 180),
    category: safeText(post?.category, "General"),
    tags: Array.isArray(post?.tags) ? post.tags.map((t) => safeText(t)).filter(Boolean) : String(post?.tags || "").split(",").map((t) => t.trim()).filter(Boolean),
    author: safeText(post?.author || post?.author_name, "RocketTrade User"),
    author_role: safeText(post?.author_role, "user"),
    likes: Number(post?.likes || post?.likes_count || 0),
    views: Number(post?.views || post?.views_count || 0),
    replies,
    reply_count: Number.isFinite(Number(post?.reply_count)) ? Number(post.reply_count) : replies.length,
    liked_by_me: Boolean(post?.liked_by_me),
    saved_by_me: Boolean(post?.saved_by_me),
    created_at: post?.created_at || post?.time || new Date().toISOString(),
  };
}

function dedupePosts(posts) {
  const seenIds = new Set();
  const seenContent = new Set();
  const cleaned = [];
  for (const raw of posts || []) {
    const post = normalisePost(raw);
    const idKey = String(post.id || "");
    const contentKey = [post.title, post.content, post.author, post.category].map((v) => safeText(v).trim().toLowerCase()).join("|");
    if (idKey && seenIds.has(idKey)) continue;
    if (contentKey && seenContent.has(contentKey)) continue;
    seenIds.add(idKey);
    seenContent.add(contentKey);
    cleaned.push(post);
  }
  return cleaned;
}

function loadPosts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return dedupePosts(JSON.parse(saved)); } catch { /* ignore */ }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupePosts(DEFAULT_POSTS)));
  return dedupePosts(DEFAULT_POSTS);
}

function savePosts(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dedupePosts(posts)));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function roleBadge(role) {
  const r = String(role || "user").toLowerCase();
  if (r.includes("expert") || r.includes("consultant")) return "bg-cyan-50 text-cyan-700 border-cyan-200";
  if (r.includes("premium")) return "bg-purple-50 text-purple-700 border-purple-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function getCurrentUserId(currentUser) {
  return safeText(currentUser?.user_id || currentUser?.id, "");
}

function getCurrentUserName(currentUser) {
  return safeText(currentUser?.full_name || currentUser?.name || currentUser?.username || currentUser?.email, "");
}

function canDeletePost(post, currentUser) {
  const userId = getCurrentUserId(currentUser);
  const userName = getCurrentUserName(currentUser);
  const postUserId = safeText(post?.user_id, "");
  const postAuthor = safeText(post?.author || post?.author_name, "");
  if (userId && postUserId && userId === postUserId) return true;
  if (userName && postAuthor && userName === postAuthor) return true;
  return String(post?.id || "").startsWith("post_") && !String(post?.id || "").startsWith("post_demo");
}

function canDeleteReply(reply, currentUser) {
  const safeReply = normaliseReply(reply);
  const userId = getCurrentUserId(currentUser);
  const userName = getCurrentUserName(currentUser);
  const replyUserId = safeText(safeReply.user_id, "");
  const replyAuthor = safeText(safeReply.author || safeReply.author_name, "");
  if (userId && replyUserId && userId === replyUserId) return true;
  if (userName && replyAuthor && userName === replyAuthor) return true;
  return String(safeReply.id || "").startsWith("reply_") && Boolean(safeReply.isNew);
}

function canEditReply(reply, currentUser) {
  return canDeleteReply(reply, currentUser);
}

export default function ForumPage() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
  const role = String(currentUser?.role || "").toLowerCase();
  const isExpert = role === "expert" || role === "consultant";
  const [posts, setPosts] = useState(loadPosts);
  const [selectedPost, setSelectedPost] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("latest");
  const [showCreate, setShowCreate] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    getForumPosts(currentUser?.user_id).then((data) => {
      if (data?.success && Array.isArray(data.posts)) {
        const merged = dedupePosts(data.posts);
        setPosts(merged);
        savePosts(merged);
      }
    }).catch(() => {});
  }, [currentUser?.user_id]);

  const filteredPosts = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = posts.filter((post) => {
      const matchesCategory = category === "All" || post.category === category;
      const matchesSearch = !q || [post.title, post.content, post.category, post.author, ...(post.tags || [])].some((v) => safeText(v).toLowerCase().includes(q));
      const matchesSaved = sort !== "saved" || post.saved_by_me;
      return matchesCategory && matchesSearch && matchesSaved;
    });
    if (sort === "popular") list = [...list].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    else if (sort === "replies") list = [...list].sort((a, b) => getReplyCount(b) - getReplyCount(a));
    else list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [posts, query, category, sort]);

  function openPost(post) {
    const local = normalisePost(posts.find((p) => p.id === post.id) || post);
    setSelectedPost(local);
    getForumPost(local.id, currentUser?.user_id).then((data) => {
      if (data?.success && data.post) {
        const detailed = normalisePost(data.post);
        setSelectedPost(detailed);
        setPosts((prev) => {
          const next = prev.map((p) => p.id === detailed.id ? { ...detailed, reply_count: getReplyCount(detailed) } : p);
          savePosts(next);
          return next;
        });
      }
    }).catch(() => {});
  }

  function updatePost(nextPost, options = {}) {
    const safe = normalisePost(nextPost);
    const replaceId = options.replaceId ? String(options.replaceId) : "";
    setSelectedPost((prev) => (prev?.id === safe.id || (replaceId && prev?.id === replaceId)) ? safe : prev);
    setPosts((prev) => {
      let inserted = false;
      const next = [];
      for (const existing of prev) {
        const existingId = String(existing?.id || existing?.post_id || "");
        const shouldReplace = existingId === safe.id || (replaceId && existingId === replaceId);
        if (shouldReplace) {
          if (!inserted) {
            next.push(safe);
            inserted = true;
          }
        } else {
          next.push(existing);
        }
      }
      if (!inserted) next.unshift(safe);
      const cleaned = dedupePosts(next);
      savePosts(cleaned);
      return cleaned;
    });
  }

  function handleLike(post, e) {
    e?.stopPropagation?.();
    const next = normalisePost({ ...post, liked_by_me: !post.liked_by_me, likes: Number(post.likes || 0) + (post.liked_by_me ? -1 : 1) });
    updatePost(next);
    if (currentUser?.user_id) toggleForumLike(post.id, currentUser.user_id).then((data) => data?.post && updatePost(data.post)).catch(() => {});
  }

  function handleSave(post, e) {
    e?.stopPropagation?.();
    const next = normalisePost({ ...post, saved_by_me: !post.saved_by_me });
    updatePost(next);
    if (currentUser?.user_id) toggleForumSave(post.id, currentUser.user_id).then((data) => data?.post && updatePost(data.post)).catch(() => {});
  }

  async function handleDelete(post, e) {
    e?.stopPropagation?.();
    const target = normalisePost(post);
    const confirmed = window.confirm(`Delete post "${target.title}"? This will remove the post and its replies.`);
    if (!confirmed) return;

    setPosts((prev) => {
      const next = prev.filter((p) => p.id !== target.id);
      savePosts(next);
      return next;
    });
    setSelectedPost((prev) => (prev?.id === target.id ? null : prev));

    try {
      await deleteForumPost(target.id, currentUser?.user_id || currentUser?.id);
    } catch {
      // Local deletion is kept so users can still delete their own draft/test posts when backend is offline.
    }
  }

  async function handleDeleteReply(post, reply, e) {
    e?.stopPropagation?.();
    const targetPost = normalisePost(post);
    const targetReply = normaliseReply(reply);
    if (!canDeleteReply(targetReply, currentUser)) {
      window.alert("You can only delete comments that you posted.");
      return;
    }
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    const nextPost = normalisePost({
      ...targetPost,
      replies: (targetPost.replies || []).filter((r) => normaliseReply(r).id !== targetReply.id),
    });
    nextPost.reply_count = getReplyCount(nextPost);
    updatePost(nextPost);

    try {
      const data = await deleteForumReply(targetPost.id, targetReply.id, currentUser?.user_id || currentUser?.id);
      if (data?.post) updatePost(data.post);
    } catch {
      // Local deletion is kept so users can still remove their own test comments when backend is offline.
    }
  }

  async function handleEditReply(post, reply, content) {
    const targetPost = normalisePost(post);
    const targetReply = normaliseReply(reply);
    const nextContent = safeText(content, "").trim();
    if (!nextContent) {
      window.alert("Reply cannot be empty.");
      return false;
    }
    if (!canEditReply(targetReply, currentUser)) {
      window.alert("You can only edit comments that you posted.");
      return false;
    }

    const nextPost = normalisePost({
      ...targetPost,
      replies: (targetPost.replies || []).map((r) => {
        const safeReply = normaliseReply(r);
        return safeReply.id === targetReply.id ? normaliseReply({ ...safeReply, content: nextContent, isEdited: true }) : safeReply;
      }),
    });
    nextPost.reply_count = getReplyCount(nextPost);
    updatePost(nextPost);

    try {
      const data = await updateForumReply(targetPost.id, targetReply.id, currentUser?.user_id || currentUser?.id, nextContent);
      if (data?.post) updatePost(data.post);
    } catch {
      // Local update is kept so users can still edit their own test comments when backend is offline.
    }
    return true;
  }

  async function handleCreate(payload) {
    if (creatingPost) return;
    setCreatingPost(true);
    const tempId = `post_${Date.now()}`;
    const newPost = normalisePost({
      ...payload,
      id: tempId,
      user_id: currentUser?.user_id || currentUser?.id || "",
      author: currentUser?.full_name || currentUser?.name || currentUser?.username || "RocketTrade User",
      author_role: currentUser?.role || "user",
      likes: 0,
      views: 0,
      replies: [],
      reply_count: 0,
      created_at: new Date().toISOString(),
    });
    updatePost(newPost);
    setShowCreate(false);
    try {
      const data = await createForumPost({ user_id: currentUser?.user_id || currentUser?.id || "", ...payload });
      if (data?.post) updatePost(data.post, { replaceId: tempId });
    } catch {
      /* local fallback already saved */
    } finally {
      setCreatingPost(false);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || !selectedPost) return;
    const reply = normaliseReply({ id: `reply_${Date.now()}`, user_id: currentUser?.user_id || currentUser?.id || "", author: currentUser?.full_name || currentUser?.name || currentUser?.username || "RocketTrade User", author_role: currentUser?.role || "user", content: replyText.trim(), time: new Date().toISOString(), likes: 0, isNew: true });
    const next = normalisePost({ ...selectedPost, replies: [...(selectedPost.replies || []), reply], reply_count: getReplyCount(selectedPost) + 1 });
    updatePost(next);
    setReplyText("");
    try {
      const data = await replyForumPost(selectedPost.id, { user_id: currentUser?.user_id, content: reply.content });
      if (data?.post) updatePost(data.post);
    } catch { /* local fallback already saved */ }
  }

  return (
    <motion.div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {isExpert ? <ConsultantHeader /> : <GeneralHeader />}
      <main className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          {!selectedPost ? (
            <>
              <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="text-sm font-semibold text-cyan-300">RocketTrade Community</p><h1 className="text-3xl font-bold">Forum Community</h1><p className="mt-1 text-sm text-slate-300">Discuss strategies, AI predictions, market news and portfolio ideas.</p></div>
              </div>

              <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts, ticker, author or category" className="h-11 w-full rounded-xl border border-white/10 bg-white/10 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-400" /></div>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[{ id: "latest", label: "Latest" }, { id: "popular", label: "Popular" }, { id: "replies", label: "Replies" }, { id: "saved", label: "Saved Posts" }].map((item) => <button key={item.id} onClick={() => setSort(item.id)} className={`rounded-xl px-4 py-2 text-sm font-bold ${sort === item.id ? "bg-cyan-500 text-slate-950" : "bg-white/10 text-slate-300 hover:bg-white/15"}`}>{item.label}</button>)}
                </div>
              </div>

              <div className="grid gap-4">
                {filteredPosts.map((post) => <PostCard key={post.id} post={post} onOpen={() => openPost(post)} onLike={(e) => handleLike(post, e)} onSave={(e) => handleSave(post, e)} onDelete={(e) => handleDelete(post, e)} canDelete={canDeletePost(post, currentUser)} />)}
                {filteredPosts.length === 0 && <div className="rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-slate-300">No posts found.</div>}
              </div>
            </>
          ) : (
            <PostDetail post={selectedPost} currentUser={currentUser} onBack={() => setSelectedPost(null)} onLike={(e) => handleLike(selectedPost, e)} onSave={(e) => handleSave(selectedPost, e)} onDelete={(e) => handleDelete(selectedPost, e)} onDeleteReply={(reply, e) => handleDeleteReply(selectedPost, reply, e)} onEditReply={(reply, content) => handleEditReply(selectedPost, reply, content)} canDelete={canDeletePost(selectedPost, currentUser)} replyText={replyText} setReplyText={setReplyText} onReply={handleReply} />
          )}
        </div>
      </main>
      <Footer />
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreate={handleCreate} creating={creatingPost} />}
    </motion.div>
  );
}

function PostCard({ post, onOpen, onLike, onSave, onDelete, canDelete }) {
  return (
    <article onClick={onOpen} className="cursor-pointer rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-cyan-400/40 hover:bg-white/10">
      <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{post.category}</span><span className={`rounded-full border px-3 py-1 text-xs font-bold ${roleBadge(post.author_role)}`}>{post.author_role}</span></div>
      <h2 className="text-xl font-bold text-white">{post.title}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{post.preview || post.content}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-400">By <b className="text-slate-200">{post.author}</b> · {formatDate(post.created_at)}</div>
        <div className="flex items-center gap-3 text-sm text-slate-300"><button onClick={onLike} className={`inline-flex items-center gap-1 hover:text-red-300 ${post.liked_by_me ? "text-red-300" : ""}`}><Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} /> {post.likes}</button><span className="inline-flex items-center gap-1"><MessageCircle size={16} /> {getReplyCount(post)}</span><span className="inline-flex items-center gap-1"><Eye size={16} /> {post.views}</span><button onClick={onSave} className={`inline-flex items-center gap-1 hover:text-cyan-300 ${post.saved_by_me ? "text-cyan-300" : ""}`}><Bookmark size={16} fill={post.saved_by_me ? "currentColor" : "none"} /></button>{canDelete && <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-300 hover:bg-red-400/10"><Trash2 size={16} /> Delete</button>}</div>
      </div>
    </article>
  );
}

function PostDetail({ post, currentUser, onBack, onLike, onSave, onDelete, onDeleteReply, onEditReply, canDelete, replyText, setReplyText, onReply }) {
  const replies = Array.isArray(post.replies) ? post.replies.map(normaliseReply) : [];
  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState("");

  async function saveEditedReply(reply) {
    const ok = await onEditReply(reply, editingReplyText);
    if (ok) {
      setEditingReplyId(null);
      setEditingReplyText("");
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 hover:text-cyan-200"><ArrowLeft size={16} /> Back to Forum</button>
      <article className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
        <div className="mb-3 flex flex-wrap gap-2"><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">{post.category}</span>{(post.tags || []).map((t) => <span key={t} className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">#{t}</span>)}</div>
        <h1 className="text-3xl font-bold text-white">{post.title}</h1>
        <p className="mt-2 text-sm text-slate-400">By <b className="text-slate-200">{post.author}</b> · {formatDate(post.created_at)}</p>
        <p className="mt-6 whitespace-pre-line text-sm leading-7 text-slate-200">{post.content}</p>
        <div className="mt-6 flex flex-wrap gap-3"><button onClick={onLike} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${post.liked_by_me ? "bg-red-400/15 text-red-300" : "bg-white/10 text-slate-300"}`}><Heart size={16} fill={post.liked_by_me ? "currentColor" : "none"} /> Like {post.likes}</button><button onClick={onSave} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${post.saved_by_me ? "bg-cyan-400/15 text-cyan-300" : "bg-white/10 text-slate-300"}`}><Bookmark size={16} fill={post.saved_by_me ? "currentColor" : "none"} /> Save</button>{canDelete && <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl bg-red-400/15 px-4 py-2 text-sm font-bold text-red-300 hover:bg-red-400/20"><Trash2 size={16} /> Delete Post</button>}</div>
      </article>
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur"><h2 className="text-xl font-bold">Replies ({replies.length})</h2><div className="mt-4 space-y-3">{replies.map((reply) => {
  const allowEdit = canEditReply(reply, currentUser);
  const allowDelete = canDeleteReply(reply, currentUser);
  const isEditing = editingReplyId === reply.id;
  return (
    <div key={reply.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <b className="text-slate-100">{reply.author}</b>
          <span className="ml-2 text-xs text-slate-500">{formatDate(reply.time)}</span>
          {reply.isEdited && <span className="ml-2 text-xs font-bold text-cyan-300">edited</span>}
        </div>
        {(allowEdit || allowDelete) && (
          <div className="flex items-center gap-2">
            {allowEdit && !isEditing && (
              <button onClick={() => { setEditingReplyId(reply.id); setEditingReplyText(reply.content); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-cyan-300 hover:bg-cyan-400/10">
                <Pencil size={14} /> Edit
              </button>
            )}
            {allowDelete && (
              <button onClick={(e) => onDeleteReply(reply, e)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-300 hover:bg-red-400/10">
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-3">
          <textarea value={editingReplyText} onChange={(e) => setEditingReplyText(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setEditingReplyId(null); setEditingReplyText(""); }} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/15">Cancel</button>
            <button onClick={() => saveEditedReply(reply)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"><Check size={14} /> Save Reply</button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-line text-sm leading-6 text-slate-300">{reply.content}</p>
      )}
    </div>
  );
})}{replies.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">No replies yet. Start the discussion.</p>}</div><div className="mt-5 flex gap-3"><textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Write a reply..." className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><button onClick={onReply} className="inline-flex items-center gap-2 self-end rounded-xl bg-cyan-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-400"><Send size={16} /> Post</button></div></section>
    </div>
  );
}

function CreatePostModal({ onClose, onCreate, creating = false }) {
  const [form, setForm] = useState({ title: "", content: "", category: "Technical Analysis", tags: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function submit() {
    if (submitted || creating) return;
    if (!form.title.trim() || !form.content.trim()) { setError("Title and content are required."); return; }
    setSubmitted(true);
    onCreate({ title: form.title.trim(), content: form.content.trim(), category: form.category, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) });
  }
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur"><div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">Create New Post</h2><button onClick={onClose} className="rounded-lg bg-white/10 p-2 hover:bg-white/15"><X size={18} /></button></div><div className="space-y-4"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-cyan-400" /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-cyan-400">{CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags separated by commas, e.g. AAPL, RSI" className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-cyan-400" /><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Write your post content..." className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 outline-none focus:border-cyan-400" /></div>{error && <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl bg-white/10 px-5 py-3 font-bold text-slate-200 hover:bg-white/15">Cancel</button><button onClick={submit} disabled={submitted || creating} className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60">{submitted || creating ? "Publishing..." : "Publish Post"}</button></div></div></div>;
}
