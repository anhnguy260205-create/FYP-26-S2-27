import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";

/* Full-featured ForumPage (JSX) - adapted from reference implementation */

function getActiveUser() {
    try {
        const s = JSON.parse(localStorage.getItem("currentUser") || "null");
        if (!s) return { id: null, name: "Guest", avatar: null, avatarColor: "#06b6d4", role: "basic", verified: false, posts: 0, joined: "", title: "" };
        return {
            id: s.user_id || s.id || null,
            name: s.full_name || s.username || s.name || "User",
            avatar: s.avatar || null,
            avatarColor: s.avatarColor || "#06b6d4",
            role: s.role || "basic",
            verified: s.verified || false,
            posts: s.posts || 0,
            joined: s.joined || "",
            title: s.title || "",
        };
    } catch (e) {
        return { id: null, name: "Guest", avatar: null, avatarColor: "#06b6d4", role: "basic", verified: false, posts: 0, joined: "", title: "" };
    }
}

const AUTHORS = {
    drlee: { id: "a1", name: "Dr. Raymond Lee", avatar: "https://images.unsplash.com/photo-1649433658557-54cf58577c68?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#00D3F2", role: "consultant", verified: true, posts: 342, joined: "Oct 2024", title: "Senior Market Consultant" },
    sarahc: { id: "a2", name: "Sarah Chen", avatar: "https://images.unsplash.com/photo-1689600944138-da3b150d9cb8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#51A2FF", role: "premium", verified: true, posts: 128, joined: "Jan 2026", title: "Premium Member" },
    mikot: { id: "a3", name: "Miko Tanaka", avatar: "https://images.unsplash.com/photo-1558597828-184403884fa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#a78bfa", role: "expert", verified: true, posts: 510, joined: "Sep 2024", title: "Technical Analysis Expert" },
    davidp: { id: "a4", name: "David Park", avatar: "https://images.unsplash.com/photo-1543879739-ab87be3df369?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#22c55e", role: "premium", verified: false, posts: 67, joined: "Mar 2026", title: "Premium Member" },
    priyan: { id: "a5", name: "Priya Nair", avatar: null, avatarColor: "#f97316", role: "basic", verified: false, posts: 8, joined: "Apr 2026", title: "Basic Member" },
    jamesw: { id: "a6", name: "James Wong", avatar: "https://images.unsplash.com/photo-1640323240640-ee731d18dcb1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#ec4899", role: "consultant", verified: true, posts: 289, joined: "Nov 2024", title: "Portfolio Strategy Consultant" },
    weizhang: { id: "a7", name: "Wei Zhang", avatar: null, avatarColor: "#06b6d4", role: "premium", verified: true, posts: 94, joined: "Feb 2026", title: "Premium Member" },
    marcusr: { id: "a8", name: "Marcus Rivera", avatar: "https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=200", avatarColor: "#84cc16", role: "basic", verified: false, posts: 14, joined: "Feb 2026", title: "Basic Member" },
};

const CATEGORIES = [
    { id: "all", label: "All Posts", icon: "🗂️", color: "#00D3F2" },
    { id: "technical-analysis", label: "Technical Analysis", icon: "📈", color: "#00D3F2" },
    { id: "ai-predictions", label: "AI Predictions", icon: "🤖", color: "#51A2FF" },
    { id: "portfolio-strategy", label: "Portfolio Strategy", icon: "💼", color: "#a78bfa" },
    { id: "market-news", label: "Market News", icon: "📰", color: "#22c55e" },
    { id: "beginners-corner", label: "Beginners Corner", icon: "🔰", color: "#f97316" },
    { id: "trading-tips", label: "Trading Tips", icon: "💡", color: "#fbbf24" },
    { id: "global-markets", label: "Global Markets", icon: "🌏", color: "#ec4899" },
];

const CURRENT_USER = getActiveUser();

function genId() { return Math.random().toString(36).slice(2, 10); }

function RoleBadge({ role }) {
    const cfg = {
        expert: { label: "Expert", bg: "rgba(0,211,243,0.12)", color: "#00D3F2", border: "rgba(0,211,243,0.3)" },
        consultant: { label: "Consultant", bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
        premium: { label: "Premium", bg: "rgba(81,162,255,0.12)", color: "#51A2FF", border: "rgba(81,162,255,0.25)" },
        basic: { label: "Basic", bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "rgba(255,255,255,0.1)" },
    }[role];
    return (
        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: cfg.bg, color: cfg.color, border: `0.667px solid ${cfg.border}`, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{cfg.label}</span>
    );
}

function Avatar({ author, size = 36 }) {
    const initials = author.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
    const glow = author.role === "expert" ? "#00D3F2" : author.role === "consultant" ? "#fbbf24" : null;
    return (
        <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, boxShadow: glow ? `0 0 0 2px ${glow}44` : "none" }}>
            {author.avatar ? (
                <img src={author.avatar} alt={author.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e)=>{e.target.onerror=null; e.target.src="/images/avatar-fallback.png"}} />
            ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg,${author.avatarColor}33,${author.avatarColor}88)`, fontSize: size * 0.35, fontWeight: 700, color: author.avatarColor }}>{initials}</div>
            )}
        </div>
    );
}

function ToastContainer({ toasts, onDismiss }) {
    return (
        <div style={{ position: "fixed", top: 20, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
            {toasts.map(t => (
                <div key={t.id} onClick={() => onDismiss(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 12, background: t.type === "success" ? "rgba(34,197,94,0.12)" : t.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(0,211,243,0.12)", border: "0.667px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", pointerEvents: "auto", cursor: "pointer", minWidth: 280, maxWidth: 380 }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {t.type === "success" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> : t.type === "error" ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00D3F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "white", flex: 1 }}>{t.message}</p>
                </div>
            ))}
        </div>
    );
}

/* CreatePostModal, PostCard, PostDetail, ReplyCard, ContentRenderer are implemented below (adapted to JSX). */

function CreatePostModal({ onClose, onPublish }) {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("");
    const [tagsInput, setTagsInput] = useState("");
    const [errors, setErrors] = useState({});
    const [step, setStep] = useState("form");

    function validate() {
        const e = {};
        if (!title.trim()) e.title = "Post title is required.";
        if (!category) e.category = "Please select a category.";
        if (!content.trim()) e.content = "Post content cannot be empty.";
        else if (content.trim().length < 20) e.content = "Content must be at least 20 characters.";
        return e;
    }

    function handlePublish() {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        setStep("validating");
        setTimeout(() => setStep("publishing"), 600);
        setTimeout(() => {
            const tags = tagsInput.split(",").map(t=>t.trim()).filter(Boolean);
            onPublish({ title: title.trim(), preview: content.trim().slice(0,160) + "…", content: content.trim(), category: category, tags, author: CURRENT_USER, pinned: false, featured: false });
            setStep("success");
        }, 1400);
    }

    const CONTENT_CATS = CATEGORIES.filter(c=>c.id!=="all");

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <div onClick={step === "success" ? onClose : undefined} style={{ position: "absolute", inset: 0, background: "rgba(2,6,24,0.85)", backdropFilter: "blur(8px)" }} />
            <div style={{ position: "relative", width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", borderRadius: 20, background: "#071030", border: "0.667px solid rgba(255,255,255,0.06)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
                <div style={{ padding: "24px 28px 0" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#0092b8,#155dfc)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            </div>
                            <div>
                                <h2 style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Create New Post</h2>
                                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Share your trading insights with the community</p>
                            </div>
                        </div>
                        {step === "form" && (
                            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "18px 0 0" }} />
                <div style={{ padding: "24px 28px 28px" }}>
                    {step === "success" ? (
                        <div style={{ padding: "32px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 6 }}>Post Published Successfully!</h3>
                                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>Your post is now live and visible to all community members.</p>
                            </div>
                            <button onClick={onClose} style={{ height: 42, padding: "0 32px", borderRadius: 12, background: "linear-gradient(90deg,#0092b8,#155dfc)", color: "white", fontSize: 14, fontWeight: 700 }}>View My Post</button>
                        </div>
                    ) : ( 
                        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "0.667px solid rgba(255,255,255,0.07)" }}>
                                <Avatar author={CURRENT_USER} size={28} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Posting as</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{CURRENT_USER.name}</span>
                                <RoleBadge role={CURRENT_USER.role} />
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 8 }}>POST TITLE <span style={{ color: "#ef4444" }}>*</span></label>
                                <input value={title} onChange={e=>{ setTitle(e.target.value); setErrors(err=>({...err, title: ""})); }} placeholder="e.g. My analysis of NVDA ahead of earnings…" style={{ width: "100%", height: 44, padding: "0 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `0.667px solid ${errors.title ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, color: "white", fontSize: 14, outline: "none" }} />
                                {errors.title && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>⚠ {errors.title}</p>}
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 8 }}>CATEGORY <span style={{ color: "#ef4444" }}>*</span></label>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                    {CONTENT_CATS.map(cat => (
                                        <button key={cat.id} onClick={() => { setCategory(cat.id); setErrors(err=>({...err, category: ""})); }} style={{ padding: "7px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: "pointer", background: category === cat.id ? `${cat.color}18` : "rgba(255,255,255,0.04)", border: category === cat.id ? `0.667px solid ${cat.color}40` : "0.667px solid rgba(255,255,255,0.08)", color: category === cat.id ? cat.color : "rgba(255,255,255,0.45)" }}>{cat.icon} {cat.label}</button>
                                    ))}
                                </div>
                                {errors.category && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>⚠ {errors.category}</p>}
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 8 }}>TAGS <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>(comma-separated)</span></label>
                                <input value={tagsInput} onChange={e=>setTagsInput(e.target.value)} placeholder="e.g. AAPL, Breakout, Swing Trade" style={{ width: "100%", height: 40, padding: "0 14px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
                            </div>

                            <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                    <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>CONTENT <span style={{ color: "#ef4444" }}>*</span></label>
                                    <span style={{ fontSize: 10, color: content.length > 2000 ? "#ef4444" : "rgba(255,255,255,0.25)" }}>{content.length}/2000</span>
                                </div>
                                <textarea value={content} onChange={e=>{ setContent(e.target.value.slice(0,2000)); setErrors(err=>({...err, content: ""})); }} rows={9} placeholder={`Share your analysis, insights, or questions...`} style={{ width: "100%", padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `0.667px solid ${errors.content ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}`, color: "white", fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.7 }} />
                                {errors.content && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 5 }}>⚠ {errors.content}</p>}
                            </div>

                            <div style={{ display: "flex", gap: 12 }}>
                                <button onClick={onClose} style={{ height: 44, flex: 1, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 14, fontWeight: 600 }}>Cancel</button>
                                <button onClick={handlePublish} style={{ height: 44, flex: 2, borderRadius: 12, background: "linear-gradient(90deg,#0092b8,#155dfc)", color: "white", fontSize: 14, fontWeight: 700 }}>Publish Post</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PostCard({ post, onClick, onDelete }) {
    const [hover, setHover] = useState(false);
    const cat = CATEGORIES.find(c => c.id === post.category) || CATEGORIES[1];
    const isOwn = post.author.id === CURRENT_USER.id;
    return (
        <div onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{ padding: 22, borderRadius: 16, cursor: "pointer", background: hover ? "rgba(255,255,255,0.045)" : "rgba(255,255,255,0.025)", border: `0.667px solid ${hover ? "rgba(0,211,243,0.2)" : "rgba(255,255,255,0.08)"}`, transition: "all 0.2s ease", boxShadow: hover ? "0 4px 24px rgba(0,0,0,0.2)" : "none", position: "relative", overflow: "hidden" }}>
            {post.featured && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#00D3F2,#51A2FF)" }} />}
            <div style={{ display: "flex", gap: 16 }}>
                <div style={{ minWidth: 44, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", textAlign: "center" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.85)" }}>{post.likes}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>likes</div>
                    </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                        {post.pinned && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>📌 PINNED</span>}
                        {post.featured && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(0,211,243,0.1)", color: "#00D3F2" }}>⭐ FEATURED</span>}
                        {isOwn && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, background: "rgba(6,182,212,0.1)", color: "#06b6d4" }}>Your Post</span>}
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 100, background: `${cat.color}15`, color: cat.color }}>{cat.icon} {cat.label}</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: hover ? "white" : "rgba(255,255,255,0.9)", marginBottom: 8 }}>{post.title}</h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.preview}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                        {post.tags.map(t => <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)" }}>#{t}</span>)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar author={post.author} size={24} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>{post.author.name}</span>
                            <RoleBadge role={post.author.role} />
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{post.time}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span>👁</span><span style={{ color: "rgba(255,255,255,0.4)" }}>{post.views.toLocaleString()}</span></div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span>💬</span><span style={{ color: "rgba(255,255,255,0.4)" }}>{post.replies.length}</span></div>
                        </div>
                        {isOwn && (
                            <button onClick={(e)=>{ e.stopPropagation(); if(window.confirm('Delete this post?')) onDelete && onDelete(post.id); }} style={{ height:30, padding: '0 10px', borderRadius:8, background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>Delete</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ContentRenderer({ content }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {content.split("\n").map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 5 }} />;
                if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 8, display: "flex", gap: 8 }}><span style={{ color: "#00D3F2" }}>•</span><div dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>') }} /></div>;
                return <p key={i} style={{ color: "rgba(255,255,255,0.72)", lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>') }} />;
            })}
        </div>
    );
}

function ReplyCard({ reply, isNew }) {
    const [liked, setLiked] = useState(reply.liked || false);
    const [likes, setLikes] = useState(reply.likes || 0);
    return (
        <div style={{ padding: 18, borderRadius: 14, background: "rgba(255,255,255,0.025)", border: `0.667px solid ${isNew ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.07)"}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <Avatar author={reply.author} size={32} />
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{reply.author.name}</span>
                        <RoleBadge role={reply.author.role} />
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{reply.time}</span>
                    </div>
                </div>
                <button onClick={() => { setLiked(!liked); setLikes(l => l + (liked ? -1 : 1)); }} style={{ padding: "6px 10px", borderRadius: 8, background: liked ? "rgba(0,211,243,0.1)" : "rgba(255,255,255,0.04)", border: "none", cursor: "pointer", color: liked ? "#00D3F2" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {likes}
                </button>
            </div>
            <div style={{ paddingLeft: 44, color: "rgba(255,255,255,0.72)", lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: reply.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>') }} />
        </div>
    );
}

function PostDetail({ post, onBack, onUpdatePost, onAddToast, onDelete }) {
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(post.likes || 0);
    const [bookmarked, setBookmarked] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [replySubmitting, setReplySubmitting] = useState(false);
    const [localReplies, setLocalReplies] = useState(post.replies || []);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(post.title);
    const [editContent, setEditContent] = useState(post.content);
    const [editStep, setEditStep] = useState("idle");

    function handleSubmitReply() {
        if (!replyText.trim()) { onAddToast("Comment cannot be empty.", "error"); return; }
        setReplySubmitting(true);
        setTimeout(() => {
            const newReply = { id: genId(), author: CURRENT_USER, content: replyText.trim(), time: "just now", likes: 0 };
            const updated = [...localReplies, newReply];
            setLocalReplies(updated);
            onUpdatePost({ ...post, replies: updated });
            setReplyText(""); setReplySubmitting(false); onAddToast("Comment posted successfully!", "success");
        }, 800);
    }

    function validateEdit() {
        const e = {};
        if (!editTitle.trim()) e.title = "Post title is required.";
        if (!editContent.trim()) e.content = "Post content cannot be empty.";
        else if (editContent.trim().length < 20) e.content = "Content must be at least 20 characters.";
        return e;
    }

    function handleSaveEdit() {
        const e = validateEdit();
        if (Object.keys(e).length) return; // minimal
        setEditStep("validating");
        setTimeout(()=>setEditStep("saving"), 500);
        setTimeout(()=>{
            const updated = { ...post, title: editTitle.trim(), content: editContent.trim(), preview: editContent.trim().slice(0,160)+"…", edited: true };
            onUpdatePost(updated); setEditStep("done");
            setTimeout(()=>{ setIsEditing(false); setEditStep("idle"); }, 900);
        }, 1200);
    }

    return (
        <div>
            <div style={{ padding: "18px 32px", borderBottom: "0.667px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={onBack} style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}>← Back to Forum</button>
                {!isEditing && post.author.id === CURRENT_USER.id && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={()=>setIsEditing(true)} style={{ height:36, padding: "0 12px", borderRadius:10, background: "rgba(6,182,212,0.08)", border: "none", color: "#06b6d4", fontWeight:700 }}>Edit Post</button>
                        <button onClick={()=>{ if(window.confirm('Delete this post?')) { onDelete && onDelete(post.id); onBack(); } }} style={{ height:36, padding: "0 12px", borderRadius:10, background: "rgba(239,68,68,0.08)", border: "none", color: "#ef4444", fontWeight:700 }}>Delete</button>
                    </div>
                )}
            </div>
            <div style={{ padding: 28 }}>
                {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <input value={editTitle} onChange={e=>setEditTitle(e.target.value)} style={{ height:46, padding:12, borderRadius:10, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.12)", color: "white" }} />
                        <textarea value={editContent} onChange={e=>setEditContent(e.target.value)} rows={12} style={{ padding:14, borderRadius:12, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.12)", color: "white" }} />
                        <div style={{ display: "flex", gap: 12 }}>
                            <button onClick={()=>{ setIsEditing(false); setEditTitle(post.title); setEditContent(post.content); }} style={{ flex:1, height:44, borderRadius:12, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}>Discard</button>
                            <button onClick={handleSaveEdit} style={{ flex:2, height:44, borderRadius:12, background: "linear-gradient(90deg,#0092b8,#155dfc)", color: "white", fontWeight:700 }}>Save Changes</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                            <Avatar author={post.author} size={44} />
                            <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 16, fontWeight: 800 }}>{post.author.name}</span>
                                    <RoleBadge role={post.author.role} />
                                </div>
                                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{post.author.title} · {post.author.posts} posts · Joined {post.author.joined}</p>
                            </div>
                            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span>👁</span><span style={{ color: "rgba(255,255,255,0.4)" }}>{post.views.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 800, color: "white", marginBottom: 16 }}>{post.title}</h1>
                        {post.image && <div style={{ marginBottom: 20 }}><img src={post.image} alt="hero" style={{ width: "100%", height: 280, objectFit: "cover", borderRadius: 12 }} onError={(e)=>{e.target.onerror=null; e.target.src="/images/hero-fallback.jpg"}} /></div>}
                        <div style={{ padding: 24, borderRadius: 12, background: "rgba(255,255,255,0.02)", marginBottom: 20 }}><ContentRenderer content={post.content} /></div>
                        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                            <button onClick={()=>{ setLiked(!liked); setLikes(v=>v + (liked ? -1 : 1)); }} style={{ height:36, padding: "0 14px", borderRadius:10, background: liked ? "rgba(0,211,243,0.1)" : "rgba(255,255,255,0.04)", border: "none", color: liked ? "#00D3F2" : "rgba(255,255,255,0.6)" }}>{liked ? "Liked" : "Like"} · {likes}</button>
                            <button onClick={()=>setBookmarked(!bookmarked)} style={{ height:36, padding: "0 14px", borderRadius:10, background: bookmarked ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", color: bookmarked ? "#fbbf24" : "rgba(255,255,255,0.6)" }}>{bookmarked ? "Saved" : "Save"}</button>
                        </div>

                        <div style={{ marginBottom: 18 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 800, color: "white", marginBottom: 12 }}>Comments · {localReplies.length}</h3>
                            {localReplies.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No comments yet — be the first to comment.</div> : localReplies.map(r => <div key={r.id} style={{ marginBottom: 12 }}><ReplyCard reply={r} /></div>)}
                        </div>

                        <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.025)" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <Avatar author={CURRENT_USER} size={28} />
                                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{CURRENT_USER.name}</div>
                            </div>
                            <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} rows={4} placeholder="Share your thoughts..." style={{ width: "100%", padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.08)", color: "white" }} />
                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Be respectful · No financial advice</div>
                                <button onClick={handleSubmitReply} style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "linear-gradient(90deg,#0092b8,#155dfc)", color: "white", fontWeight: 700 }}>{replySubmitting ? "Posting…" : "Post Comment"}</button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ForumPage() {
    const navigate = useNavigate();
    const [posts, setPosts] = useState(() => {
        // minimal mock posts
        return [
            {
                id: "p1",
                title: "AAPL showing a textbook double-bottom — breakout incoming?",
                preview: "Apple's daily chart has been forming a classic double-bottom pattern since late April...",
                content: `Apple Inc. (AAPL) has been on my radar...`,
                category: "technical-analysis",
                tags: ["AAPL","Double Bottom","Breakout"],
                author: AUTHORS.mikot,
                time: "2h ago",
                views: 1842,
                replies: [ { id: "r1", author: AUTHORS.sarahc, content: "Excellent breakdown", time: "1h 45m ago", likes: 18 } ],
                likes: 94,
                pinned: true,
                featured: true,
                image: "https://images.unsplash.com/photo-1767424196045-030bbde122a4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
            },
        ];
    });

    const [view, setView] = useState("list");
    const [activeCategory, setActiveCategory] = useState("all");
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("latest");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toasts, setToasts] = useState([]);
    const toastCounterRef = useRef(0);

    const selectedPost = posts.find(p=>p.id===selectedPostId) || null;

    function addToast(message, type = "success") {
        const id = ++toastCounterRef.current;
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 4000);
    }

    function handleSelectPost(post) { setSelectedPostId(post.id); setView("detail"); window.scrollTo({ top:0, behavior: "smooth" }); }
    function handleBack() { setView("list"); setSelectedPostId(null); }
    function handleUpdatePost(updated) { setPosts(prev=>prev.map(p=>p.id===updated.id?updated:p)); }
    function handlePublishPost(partial) { const newPost = { ...partial, id: genId(), time: "just now", views: 1, replies: [], likes: 0 }; setPosts(prev=>[newPost, ...prev]); setShowCreateModal(false); addToast("Your post has been published!", "success"); setTimeout(()=>handleSelectPost(newPost), 400); }

    function handleDeletePost(postId) {
        if (!window.confirm || !window.confirm('Are you sure you want to delete this post?')) return;
        setPosts(prev=>prev.filter(p=>p.id!==postId));
        addToast('Post deleted', 'success');
        if (selectedPostId === postId) { handleBack(); }
    }

    const filteredPosts = posts.filter(p => activeCategory === "all" || p.category === activeCategory).filter(p => {
        const q = searchQuery.toLowerCase();
        return !q || p.title.toLowerCase().includes(q) || p.preview.toLowerCase().includes(q) || (p.tags||[]).some(t=>t.toLowerCase().includes(q)) || p.author.name.toLowerCase().includes(q);
    }).sort((a,b)=>{ if(a.pinned && !b.pinned) return -1; if(!a.pinned && b.pinned) return 1; if(sortBy === "popular") return b.likes - a.likes; if(sortBy==="replies") return b.replies.length - a.replies.length; return 0; });

    const catCounts = (id) => id === "all" ? posts.length : posts.filter(p=>p.category===id).length;

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
            <ToastContainer toasts={toasts} onDismiss={id=>setToasts(t=>t.filter(x=>x.id!==id))} />
            {showCreateModal && <CreatePostModal onClose={()=>setShowCreateModal(false)} onPublish={handlePublishPost} />}
            <GeneralHeader />
            <div style={{ display: "flex", flex: 1 }}>
                <div style={{ width: 236, flexShrink: 0, borderRight: "0.667px solid rgba(255,255,255,0.07)", height: "100vh", overflowY: "auto", position: "sticky", top: 0 }}>
                    <div style={{ padding: 20, borderBottom: "0.667px solid rgba(255,255,255,0.07)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#00D3F2,#155dfc)", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
                            <div><div style={{ fontWeight: 800, background: "linear-gradient(90deg,#00D3F2,#51A2FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Deskstock</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>COMMUNITY</div></div>
                        </div>
                    </div>
                    <div style={{ padding: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(6,182,212,0.06)", border: "0.667px solid rgba(6,182,212,0.15)" }}>
                            <Avatar author={CURRENT_USER} size={28} />
                            <div style={{ overflow: "hidden" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{CURRENT_USER.name}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Logged in</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ padding: "14px 10px", flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>CATEGORIES</div>
                        {CATEGORIES.map(cat => (
                            <button key={cat.id} onClick={() => { setActiveCategory(cat.id); setView("list"); }} style={{ display: "flex", alignItems: "center", gap: 8, height: 37, padding: "0 10px", borderRadius: 10, cursor: "pointer", background: activeCategory === cat.id ? `${cat.color}12` : "transparent", border: activeCategory === cat.id ? `0.667px solid ${cat.color}30` : "0.667px solid transparent", color: activeCategory === cat.id ? cat.color : "rgba(255,255,255,0.45)", fontWeight: activeCategory === cat.id ? 700 : 500, marginBottom: 6 }}>{cat.icon}<span style={{ flex: 1, textAlign: "left" }}>{cat.label}</span><span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 100, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>{catCounts(cat.id)}</span></button>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                    <div style={{ padding: "12px 20px", borderBottom: "0.667px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><h2 style={{ fontSize: 17, fontWeight: 800 }}>Community Forum</h2><span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 100, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700 }}>● 47 online</span></div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ height: 37, display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35" /></svg><input value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search posts…" style={{ background: "transparent", border: "none", outline: "none", color: "white" }} /></div>
                            <button onClick={()=>setShowCreateModal(true)} style={{ height: 38, padding: "0 18px", borderRadius: 10, background: "linear-gradient(90deg,#0092b8,#155dfc)", color: "white", fontWeight: 700 }}>New Post</button>
                        </div>
                    </div>

                    <div style={{ overflowY: "auto", padding: 22 }}>
                        {view === "list" && (
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                                    <div><span style={{ fontSize: 13, fontWeight: 700 }}>{activeCategory === "all" ? "All Posts" : (CATEGORIES.find(c=>c.id===activeCategory)||{}).label}</span><span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>{filteredPosts.length} posts</span></div>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        {["latest","popular","replies"].map(s=> (
                                            <button key={s} onClick={()=>setSortBy(s)} style={{ height: 29, padding: "0 12px", borderRadius: 100, background: sortBy===s ? "rgba(0,211,243,0.12)" : "rgba(255,255,255,0.04)", color: sortBy===s ? "#00D3F2" : "rgba(255,255,255,0.4)", fontWeight: 600 }}>{s}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                    {filteredPosts.length > 0 ? filteredPosts.map(p => <PostCard key={p.id} post={p} onClick={() => handleSelectPost(p)} onDelete={handleDeletePost} />) : <div style={{ padding: 64, textAlign: "center" }}>No posts found</div>}
                                </div>
                            </div>
                        )}

                        {view === "detail" && selectedPost && <div><PostDetail post={selectedPost} onBack={handleBack} onUpdatePost={handleUpdatePost} onAddToast={addToast} onDelete={handleDeletePost} /></div>}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
}