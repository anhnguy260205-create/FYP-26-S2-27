import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Eye, Hash, Heart, MessageCircle, Search, Send, X, ArrowLeft, Trash2, Pencil, Check } from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import ConsultantHeader from "../../layout/ConsultantHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { createForumPost, deleteForumPost, deleteForumReply, updateForumReply, getForumPost, getForumPosts, replyForumPost, toggleForumLike, toggleForumSave } from "../../api/expertApi.js";
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

const STORAGE_KEY = "rocketTradeForumPosts";

const DEFAULT_POSTS = [
  { id: "post_demo_aapl", title: "AAPL double-bottom setup — breakout watch", content: "Apple has been forming a potential double-bottom near the recent support zone. I am watching for a confirmed close above neckline resistance with stronger volume before treating it as a valid bullish setup.", category: "Technical Analysis", tags: ["AAPL", "Breakout"], author: "Miko Tanaka", author_role: "expert", likes: 34, views: 820, saved_by_me: false, liked_by_me: false, created_at: "2026-05-06T09:00:00+08:00", replies: [{ id: "reply_aapl_1", author: "Sarah Chen", content: "Helpful breakdown, thanks for the clear levels.", time: "2026-05-06T09:35:00+08:00", likes: 5, isNew: false }] },
  { id: "post_demo_ai", title: "How should we use AI prediction signals responsibly?", content: "I have been comparing AI signals with my own technical analysis. My view is that the AI output is useful as a screening layer, but every trade still needs position sizing and risk controls.", category: "AI Predictions", tags: ["AI", "Signals", "Risk"], author: "Wei Zhang", author_role: "premium", likes: 58, views: 1240, saved_by_me: false, liked_by_me: false, created_at: "2026-05-05T18:20:00+08:00", replies: [] },
  { id: "post_demo_portfolio", title: "Building a balanced portfolio for volatile markets", content: "In uncertain markets, I prefer combining quality growth, defensive sectors and some cash flexibility. The key is to avoid overconcentration in one theme even when momentum looks attractive.", category: "Portfolio Strategy", tags: ["Portfolio", "Defensive"], author: "Dr. Raymond Lee", author_role: "expert", likes: 76, views: 1680, saved_by_me: false, liked_by_me: false, created_at: "2026-05-04T12:00:00+08:00", replies: [] },
  { id: "post_demo_ai_chips", title: "NVDA vs AMD — which AI chip play for 2026?", content: "NVIDIA dominates the data centre GPU market but AMD is closing the gap with MI300X. NVDA still commands a software moat via CUDA, but AMD's open ecosystem and aggressive pricing are worth watching. Which do you prefer for the next leg of the AI trade?", category: "Information Technology", tags: ["NVDA", "AMD", "AI", "Chips"], author: "David Kim", author_role: "expert", likes: 41, views: 930, saved_by_me: false, liked_by_me: false, created_at: "2026-05-03T10:00:00+08:00", replies: [] },
  { id: "post_demo_cloud", title: "MSFT Azure vs GOOGL Cloud — enterprise cloud picks", content: "Azure is winning enterprise deals on the back of Microsoft 365 integration and OpenAI exclusivity. Google Cloud is growing faster from a smaller base with strong AI tooling. Both are strong long-term holds — discuss your positioning.", category: "Information Technology", tags: ["MSFT", "GOOGL", "Cloud"], author: "Priya Nair", author_role: "premium", likes: 29, views: 640, saved_by_me: false, liked_by_me: false, created_at: "2026-05-02T14:30:00+08:00", replies: [] },
  { id: "post_demo_consumer", title: "AAPL iPhone supercycle thesis — still valid in 2026?", content: "Apple's installed base of 1.4 billion active devices and a growing services attach rate suggest a durable earnings floor. The question is whether a hardware supercycle driven by Apple Intelligence can re-accelerate revenue growth.", category: "Consumer Discretionary", tags: ["AAPL", "iPhone", "Services"], author: "Sarah Chen", author_role: "investor", likes: 53, views: 1100, saved_by_me: false, liked_by_me: false, created_at: "2026-05-01T09:15:00+08:00", replies: [] },
  { id: "post_demo_social", title: "META ad revenue resilience in a softening economy", content: "Meta's Advantage+ AI ad platform is delivering measurable ROI improvements for advertisers. Even in softer macro conditions, direct-response advertising on Instagram and Reels tends to be sticky. Anyone tracking Q2 guidance closely?", category: "Communication Services", tags: ["META", "Ads", "AI"], author: "Wei Zhang", author_role: "premium", likes: 37, views: 820, saved_by_me: false, liked_by_me: false, created_at: "2026-04-30T16:45:00+08:00", replies: [] },
  { id: "post_demo_ecommerce", title: "AMZN AWS margin expansion — the real story behind earnings", content: "Amazon's profit story in 2026 is really an AWS and advertising story. Retail margins remain thin but AWS operating income is expanding rapidly and advertising is a high-margin bolt-on. The sum-of-parts valuation case is compelling.", category: "Consumer Discretionary", tags: ["AMZN", "AWS", "Advertising"], author: "Marcus Rivera", author_role: "investor", likes: 62, views: 1350, saved_by_me: false, liked_by_me: false, created_at: "2026-04-29T11:00:00+08:00", replies: [] },
  { id: "post_demo_ev", title: "TSLA delivery numbers and margin recovery — where do we stand?", content: "Tesla's price cuts in 2025 compressed margins significantly but volume recovered. The key question for 2026 is whether FSD subscriptions and energy storage can offset ongoing ASP pressure in a more competitive EV market.", category: "Consumer Discretionary", tags: ["TSLA", "EV", "FSD"], author: "Miko Tanaka", author_role: "expert", likes: 48, views: 1090, saved_by_me: false, liked_by_me: false, created_at: "2026-04-28T08:00:00+08:00", replies: [] },
];

const CATEGORIES = [
  "All", "Technical Analysis", "AI Predictions", "Portfolio Strategy",
  "Market News", "Beginners Corner", "Trading Tips",
  "Information Technology", "Financials", "Consumer Discretionary",
  "Communication Services", "Energy", "Real Estate",
];

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

function displayRole(role) {
  const r = String(role || "").toLowerCase();
  if (r === "premium") return "investor";
  if (r === "consultant") return "expert";
  return r || "user";
}

function roleBadge(role) {
  const r = String(role || "user").toLowerCase();
  if (r.includes("expert")) return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
  return "bg-white/8 text-gray-400 border-white/15";
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
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem("currentUser") || "{}"));
  const role = String(currentUser?.role || "").toLowerCase();
  const isExpert = role === "expert";
  const [posts, setPosts] = useState(loadPosts);
  const [selectedPost, setSelectedPost] = useState(null);
  const [activeRoom, setActiveRoom] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("latest");
  const [showCreate, setShowCreate] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [roomImageUrls, setRoomImageUrls] = useState({});

  const userInterests = useMemo(() => {
    const raw = currentUser?.interests || "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [currentUser]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/content/landing`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.content) {
          const urls = {};
          data.content
            .filter((c) => c.section === "forum_room" && c.description)
            .forEach((c) => { urls[c.title] = c.description; });
          setRoomImageUrls(urls);
        }
      })
      .catch(() => { });
  }, []);

  const getRoomImage = (roomName) => roomImageUrls[roomName] || ROOM_IMAGES[roomName];

  useEffect(() => {
    getForumPosts(currentUser?.user_id).then((data) => {
      if (data?.success && Array.isArray(data.posts)) {
        const merged = dedupePosts(data.posts);
        setPosts(merged);
        savePosts(merged);
      }
    }).catch(() => { });
  }, [currentUser?.user_id]);

  const filteredPosts = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = posts.filter((post) => {
      const matchesRoom = !activeRoom || post.category === activeRoom;
      const matchesSearch = !q || [post.title, post.content, post.category, post.author, ...(post.tags || [])].some((v) => safeText(v).toLowerCase().includes(q));
      const matchesSaved = sort !== "saved" || post.saved_by_me;
      return matchesRoom && matchesSearch && matchesSaved;
    });
    if (sort === "popular") list = [...list].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0));
    else if (sort === "replies") list = [...list].sort((a, b) => getReplyCount(b) - getReplyCount(a));
    else list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return list;
  }, [posts, query, activeRoom, sort]);

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
    }).catch(() => { });
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
    if (currentUser?.user_id) toggleForumLike(post.id, currentUser.user_id).then((data) => data?.post && updatePost(data.post)).catch(() => { });
  }

  function handleSave(post, e) {
    e?.stopPropagation?.();
    const next = normalisePost({ ...post, saved_by_me: !post.saved_by_me });
    updatePost(next);
    if (currentUser?.user_id) toggleForumSave(post.id, currentUser.user_id).then((data) => data?.post && updatePost(data.post)).catch(() => { });
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
    <motion.div className="min-h-screen flex flex-col bg-linear-to-br from-slate-950 via-blue-950 to-slate-900 text-white" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      {isExpert ? <ConsultantHeader /> : <GeneralHeader />}
      <main className="flex-1 p-4 md:p-7">
        <div>
          {selectedPost ? (
            <PostDetail post={selectedPost} currentUser={currentUser} onBack={() => setSelectedPost(null)} onLike={(e) => handleLike(selectedPost, e)} onSave={(e) => handleSave(selectedPost, e)} onDelete={(e) => handleDelete(selectedPost, e)} onDeleteReply={(reply, e) => handleDeleteReply(selectedPost, reply, e)} onEditReply={(reply, content) => handleEditReply(selectedPost, reply, content)} canDelete={canDeletePost(selectedPost, currentUser)} replyText={replyText} setReplyText={setReplyText} onReply={handleReply} />
          ) : activeRoom ? (
            <>
              {/* Room banner image */}
              {getRoomImage(activeRoom) && (
                <div className="mb-5 w-full overflow-hidden rounded-2xl" style={{ height: 400, position: "relative" }}>
                  <img
                    src={getRoomImage(activeRoom)}
                    alt={activeRoom}
                    className="w-full h-full object-cover"
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(3,7,18,0.75) 30%, transparent 100%)" }} />
                  <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Forum Room</p>
                    <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, fontWeight: 700, letterSpacing: "0.03em", color: "#fff", margin: 0, lineHeight: 1 }}>
                      {activeRoom}
                    </h1>

                  </div>
                </div>
              )}

              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <button onClick={() => { setActiveRoom(null); setQuery(""); }} className="mb-2 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 hover:text-cyan-200">
                    <ArrowLeft size={15} /> Back to Rooms
                  </button>
                  {!getRoomImage(activeRoom) && (
                    <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
                      {activeRoom}
                    </h1>
                  )}
                  <p style={{ marginTop: 4, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{filteredPosts.length} post{filteredPosts.length !== 1 ? "s" : ""} in this room</p>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  className="self-start px-6 h-10 text-white font-semibold text-sm rounded-[14px] hover:opacity-90 active:scale-[0.99] transition-all whitespace-nowrap lg:self-auto"
                  style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}
                >
                  + New Post
                </button>
              </div>

              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search in this room..." className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-gray-400 focus:border-cyan-400" /></div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-cyan-400">
                  <option value="latest">Latest</option>
                  <option value="popular">Popular</option>
                  <option value="replies">Most Replies</option>
                  <option value="saved">Saved Posts</option>
                </select>
              </div>

              <div className="grid gap-3">
                {filteredPosts.map((post) => <PostCard key={post.id} post={post} userInterests={userInterests} onOpen={() => openPost(post)} onLike={(e) => handleLike(post, e)} onSave={(e) => handleSave(post, e)} onDelete={(e) => handleDelete(post, e)} canDelete={canDeletePost(post, currentUser)} />)}
                {filteredPosts.length === 0 && <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-slate-400 text-sm">No posts in this room yet. Be the first to post!</div>}
              </div>
            </>
          ) : (
            <RoomLobby posts={posts} userInterests={userInterests} onEnter={setActiveRoom} getImage={getRoomImage} />
          )}
        </div>
      </main>
      <Footer />
      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} onCreate={handleCreate} creating={creatingPost} defaultCategory={activeRoom} />}
    </motion.div>
  );
}

function RoomLobby({ posts, userInterests, onEnter, getImage }) {
  const rooms = CATEGORIES.filter((c) => c !== "All").map((c) => ({
    name: c,
    count: posts.filter((p) => p.category === c).length,
    isInterest: userInterests.includes(c),
  }));

  return (
    <>
      <div className="mb-5">
        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 30, fontWeight: 700, letterSpacing: "0.04em", color: "#e2e8f0", margin: 0, lineHeight: 1 }}>
          Forum Rooms
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Choose a topic room to browse and join the discussion.</p>
        <hr style={{ marginTop: 16, border: "none", borderTop: "1px solid rgba(255,255,255,0.1)" }} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {rooms.map((room) => (
          <button
            key={room.name}
            onClick={() => onEnter(room.name)}
            className="group flex flex-col items-start rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02]"
            style={{ border: room.isInterest ? "1.5px solid rgba(0,211,243,0.5)" : "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Cover image */}
            <div className="w-full overflow-hidden" style={{ height: 160 }}>
              {getImage(room.name) ? (
                <img
                  src={getImage(room.name)}
                  alt={room.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Hash size={24} className="text-gray-500" />
                </div>
              )}
            </div>
            {/* Card body */}
            <div className="w-full flex flex-col gap-1 p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-white text-sm leading-tight">{room.name}</p>
                {room.isInterest && (
                  <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 20, color: "#00D3F2", background: "rgba(0,211,243,0.12)", border: "1px solid rgba(0,211,243,0.3)" }}>
                    For You
                  </span>
                )}
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{room.count} post{room.count !== 1 ? "s" : ""}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

function PostCard({ post, userInterests = [], onOpen, onLike, onSave, onDelete, canDelete }) {
  const matchesInterest = userInterests.length > 0 && userInterests.includes(post.category);
  return (
    <article onClick={onOpen} className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:bg-gray-50" style={{ borderLeft: matchesInterest ? "3px solid #0891b2" : "3px solid transparent" }}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0" }}>{post.category}</span>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${roleBadge(post.author_role)}`}>{displayRole(post.author_role)}</span>
        {matchesInterest && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 20, color: "#0891b2", background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.3)" }}>For You</span>}
      </div>
      <h2 className="text-base font-semibold text-slate-900">{post.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{post.preview || post.content}</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400">By <b className="text-slate-600">{post.author}</b> · {formatDate(post.created_at)}</div>
        <div className="flex items-center gap-3 text-sm text-slate-400"><button onClick={onLike} className={`inline-flex items-center gap-1 hover:text-red-500 ${post.liked_by_me ? "text-red-500" : ""}`}><Heart size={14} fill={post.liked_by_me ? "currentColor" : "none"} /> {post.likes}</button><span className="inline-flex items-center gap-1"><MessageCircle size={14} /> {getReplyCount(post)}</span><span className="inline-flex items-center gap-1"><Eye size={14} /> {post.views}</span><button onClick={onSave} className={`inline-flex items-center gap-1 hover:text-cyan-600 ${post.saved_by_me ? "text-cyan-600" : ""}`}><Bookmark size={14} fill={post.saved_by_me ? "currentColor" : "none"} /></button>{canDelete && <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-red-500 hover:bg-red-50"><Trash2 size={14} /> Delete</button>}</div>
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
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-cyan-300 hover:text-cyan-200"><ArrowLeft size={15} /> Back to Forum</button>
      <article className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-3 flex flex-wrap gap-2"><span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, color: "#475569", background: "#f1f5f9", border: "1px solid #e2e8f0" }}>{post.category}</span>{(post.tags || []).map((t) => <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", padding: "2px 7px", borderRadius: 20, color: "#0891b2", background: "rgba(8,145,178,0.1)", border: "1px solid rgba(8,145,178,0.25)" }}>#{t}</span>)}</div>
        <h1 style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, letterSpacing: "0.03em", color: "#0f172a", margin: "8px 0 0" }}>{post.title}</h1>
        <p className="mt-2 text-xs text-slate-400">By <b className="text-slate-600">{post.author}</b> · {formatDate(post.created_at)}</p>
        <p className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">{post.content}</p>
        <div className="mt-5 flex flex-wrap gap-3"><button onClick={onLike} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${post.liked_by_me ? "bg-red-50 text-red-500" : "bg-gray-100 text-slate-600 hover:bg-gray-200"}`}><Heart size={15} fill={post.liked_by_me ? "currentColor" : "none"} /> Like {post.likes}</button><button onClick={onSave} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${post.saved_by_me ? "bg-cyan-50 text-cyan-600" : "bg-gray-100 text-slate-600 hover:bg-gray-200"}`}><Bookmark size={15} fill={post.saved_by_me ? "currentColor" : "none"} /> Save</button>{canDelete && <button onClick={onDelete} className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-100"><Trash2 size={15} /> Delete Post</button>}</div>
      </article>
      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-6"><h2 className="text-base font-semibold text-slate-900">Replies ({replies.length})</h2><div className="mt-4 space-y-3">{replies.map((reply) => {
        const allowEdit = canEditReply(reply, currentUser);
        const allowDelete = canDeleteReply(reply, currentUser);
        const isEditing = editingReplyId === reply.id;
        return (
          <div key={reply.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <b className="text-slate-800">{reply.author}</b>
                <span className="ml-2 text-xs text-slate-400">{formatDate(reply.time)}</span>
                {reply.isEdited && <span className="ml-2 text-xs font-bold text-cyan-600">edited</span>}
              </div>
              {(allowEdit || allowDelete) && (
                <div className="flex items-center gap-2">
                  {allowEdit && !isEditing && (
                    <button onClick={() => { setEditingReplyId(reply.id); setEditingReplyText(reply.content); }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-cyan-600 hover:bg-cyan-50">
                      <Pencil size={14} /> Edit
                    </button>
                  )}
                  {allowDelete && (
                    <button onClick={(e) => onDeleteReply(reply, e)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50">
                      <Trash2 size={14} /> Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-3">
                <textarea value={editingReplyText} onChange={(e) => setEditingReplyText(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" />
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setEditingReplyId(null); setEditingReplyText(""); }} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-gray-200">Cancel</button>
                  <button onClick={() => saveEditedReply(reply)} className="inline-flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-600"><Check size={14} /> Save Reply</button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-line text-sm leading-6 text-slate-600">{reply.content}</p>
            )}
          </div>
        );
      })}{replies.length === 0 && <p className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-slate-400">No replies yet. Start the discussion.</p>}</div><div className="mt-5 flex gap-3"><textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Write a reply..." className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /><button onClick={onReply} className="self-end px-5 h-10 text-white font-semibold text-sm rounded-[14px] hover:opacity-90 transition-all inline-flex items-center gap-2" style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}><Send size={14} /> Post</button></div></section>
    </div>
  );
}

function CreatePostModal({ onClose, onCreate, creating = false, defaultCategory = null }) {
  const [form, setForm] = useState({ title: "", content: "", category: defaultCategory || "Technical Analysis", tags: "" });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  function submit() {
    if (submitted || creating) return;
    if (!form.title.trim() || !form.content.trim()) { setError("Title and content are required."); return; }
    setSubmitted(true);
    onCreate({ title: form.title.trim(), content: form.content.trim(), category: form.category, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) });
  }
  return <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/80 p-4"><div className="w-full max-w-2xl rounded-xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, letterSpacing: "0.03em", color: "#e2e8f0" }}>Create New Post</h2><button onClick={onClose} className="rounded-lg bg-white/10 p-2 hover:bg-white/15"><X size={18} /></button></div><div className="space-y-3"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Post title" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-cyan-400" /><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400">{CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags: AAPL, RSI, ..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-cyan-400" /><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} placeholder="Write your post content..." className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-cyan-400" /></div>{error && <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>}<div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/15">Cancel</button><button onClick={submit} disabled={submitted || creating} className="px-5 h-10 text-white font-semibold text-sm rounded-[14px] hover:opacity-90 transition-all disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(90deg, #0092b8, #155dfc)", boxShadow: "0px 10px 20px rgba(0,184,219,0.25)" }}>{submitted || creating ? "Publishing..." : "Publish Post"}</button></div></div></div>;
}
