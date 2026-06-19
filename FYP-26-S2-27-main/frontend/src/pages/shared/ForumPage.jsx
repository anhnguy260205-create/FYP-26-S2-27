import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Filter, Plus, MessageSquare, Eye, Heart, Bookmark, 
  MoreVertical, Send, X, ChevronDown, AlertCircle, CheckCircle,
  ArrowLeft, Edit, Trash2, Pin, Star, User, Clock, TrendingUp
} from "lucide-react";
import GeneralHeader from "../../layout/GeneralHeader.jsx";
import Footer from "../../layout/Footer.jsx";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

/* ─── Types & Constants ───────────────────────────────────── */
const CATEGORIES = [
  { id: "all", label: "All Posts", icon: "📋", color: "#00D3F2" },
  { id: "general", label: "General Discussion", icon: "💬", color: "#51A2FF" },
  { id: "technical", label: "Technical Analysis", icon: "📊", color: "#22c55e" },
  { id: "fundamental", label: "Fundamental Analysis", icon: "📈", color: "#f59e0b" },
  { id: "news", label: "Market News", icon: "📰", color: "#ef4444" },
  { id: "help", label: "Help & Support", icon: "❓", color: "#8b5cf6" },
];

const AUTHORS = {
  "user-001": { 
    id: "user-001", name: "Alex Chen", role: "investor", 
    title: "Premium Member", avatar: "AC", verified: true,
    posts: 47, joined: "Jan 2024", reputation: 1250 
  },
  "user-002": { 
    id: "user-002", name: "Sarah Wong", role: "expert", 
    title: "Market Analyst", avatar: "SW", verified: true,
    posts: 189, joined: "Aug 2023", reputation: 3420 
  },
  "user-003": { 
    id: "user-003", name: "Mike Tan", role: "investor", 
    title: "Active Trader", avatar: "MT", verified: false,
    posts: 23, joined: "Mar 2025", reputation: 180 
  },
  "admin": { 
    id: "admin", name: "DeskStock Team", role: "admin", 
    title: "Official Account", avatar: "DS", verified: true,
    posts: 312, joined: "Dec 2022", reputation: 9999 
  },
};

function getCurrentForumUser() {
  try {
    const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (storedUser?.user_id) {
      const fullName = storedUser.full_name || storedUser.username || "User";
      const avatar = fullName
        .split(" ")
        .filter(Boolean)
        .map(part => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "U";

      return {
        id: storedUser.user_id,
        name: fullName,
        role: storedUser.role || "investor",
        title: storedUser.subscription_status === "premium" ? "Premium Member" : "Member",
        avatar,
        verified: storedUser.role === "expert",
        posts: 0,
        joined: "Today",
        reputation: 0,
      };
    }
  } catch (error) {
    console.error("Unable to read current forum user:", error);
  }

  return {
    id: "guest",
    name: "Guest",
    role: "investor",
    title: "Member",
    avatar: "G",
    verified: false,
    posts: 0,
    joined: "Today",
    reputation: 0,
  };
}

function getBackToAppPath() {
  const currentUser = getCurrentForumUser();
  return currentUser.role === "expert" ? "/expert" : "/investor";
}


const FORUM_STORAGE_KEY = "deskstock_forum_posts_v3";

function safeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function normalizeAuthor(author) {
  if (author && typeof author === "object" && !Array.isArray(author)) {
    const name = safeText(author.name || author.full_name || author.username, "User");
    return {
      id: safeText(author.id || author.user_id, ""),
      name,
      role: safeText(author.role, "investor"),
      title: safeText(author.title, "Member"),
      avatar: safeText(author.avatar, name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U"),
      verified: Boolean(author.verified),
      posts: Number(author.posts || 0),
      joined: safeText(author.joined, "Today"),
      reputation: Number(author.reputation || 0),
    };
  }

  const name = typeof author === "string" ? author : "User";
  return {
    id: "",
    name,
    role: "investor",
    title: "Member",
    avatar: name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U",
    verified: false,
    posts: 0,
    joined: "Today",
    reputation: 0,
  };
}

function normalizeReply(reply) {
  if (!reply || typeof reply !== "object" || Array.isArray(reply)) return null;
  return {
    id: safeText(reply.id || reply.reply_id, `reply-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    author: normalizeAuthor(reply.author),
    content: safeText(reply.content),
    time: safeText(reply.time || reply.created_at, "just now"),
    likes: Number(reply.likes || 0),
    isNew: Boolean(reply.isNew),
  };
}

function normalizeReplies(replies) {
  if (!Array.isArray(replies)) return [];
  return replies.map(normalizeReply).filter(Boolean);
}

function getReplyCount(postOrReplies) {
  if (Array.isArray(postOrReplies)) return postOrReplies.length;
  if (typeof postOrReplies === "number") return postOrReplies;
  if (!postOrReplies || typeof postOrReplies !== "object") return 0;
  if (typeof postOrReplies.replyCount === "number") return postOrReplies.replyCount;
  if (typeof postOrReplies.reply_count === "number") return postOrReplies.reply_count;
  if (Array.isArray(postOrReplies.replies)) return postOrReplies.replies.length;
  if (typeof postOrReplies.replies === "number") return postOrReplies.replies;
  return 0;
}

function safePost(post) {
  const replyCount = getReplyCount(post);
  const replies = normalizeReplies(post?.replies);
  const author = normalizeAuthor(post?.author);
  return {
    ...post,
    id: safeText(post?.id, `post-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    title: safeText(post?.title, "Untitled post"),
    preview: safeText(post?.preview, safeText(post?.content).slice(0, 160)),
    content: safeText(post?.content),
    author,
    category: safeText(post?.category, "general"),
    tags: Array.isArray(post?.tags) ? post.tags.map(t => safeText(t)).filter(Boolean) : [],
    time: safeText(post?.time, "just now"),
    views: Number(post?.views || 0),
    likes: Number(post?.likes || 0),
    replies,
    replyCount: Math.max(replyCount, replies.length),
    saved: Boolean(post?.saved),
    liked: Boolean(post?.liked),
    image: post?.image || null,
    pinned: Boolean(post?.pinned),
    featured: Boolean(post?.featured),
    edited: Boolean(post?.edited),
  };
}

function loadStoredForumPosts() {
  try {
    const stored = JSON.parse(localStorage.getItem(FORUM_STORAGE_KEY) || "null");
    if (Array.isArray(stored)) return stored.map(safePost);
  } catch (error) {
    console.error("Unable to load saved forum posts", error);
  }
  return INITIAL_POSTS.map(safePost);
}

/* ─── Mock Data (Replace with API calls in production) ───── */
const INITIAL_POSTS = [
  {
    id: "post-001",
    title: "NVDA earnings beat expectations — What's next for semiconductor stocks?",
    preview: "NVIDIA just reported Q2 earnings that exceeded analyst estimates. Revenue grew 122% YoY driven by data center demand. Let's discuss the implications for the broader semiconductor sector and whether this rally has more room to run...",
    content: `NVIDIA just reported Q2 earnings that exceeded analyst estimates. Revenue grew 122% YoY driven by data center demand.

**Key Highlights:**
- Revenue: $30.04B vs $28.7B expected
- EPS: $0.68 vs $0.64 expected  
- Data center revenue: $26.3B (+154% YoY)
- Guidance: Q3 revenue ~$32.5B

**What this means for semiconductors:**

1. **AI demand remains robust** — The sustained growth in data center spending suggests enterprise AI adoption is still in early innings.

2. **Supply chain normalization** — Lead times have improved, though advanced packaging remains a bottleneck.

3. **Valuation concerns** — At current multiples, much of the growth may already be priced in.

**Technical perspective:**
NVDA is testing resistance at $135. A clean break above could target $150, while failure may see a pullback to $115-120 support.

What are your thoughts? Bullish continuation or time to take profits?`,
    author: AUTHORS["user-002"],
    category: "technical",
    tags: ["NVDA", "earnings", "semiconductors", "AI"],
    time: "2 hours ago",
    views: 1247,
    likes: 89,
    replies: 24,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    pinned: true,
    featured: true,
    edited: false,
  },
  {
    id: "post-002",
    title: "Beginner's guide: How to read a candlestick chart",
    preview: "New to technical analysis? This post breaks down the basics of candlestick patterns, what they tell us about market sentiment, and how to use them in your trading decisions...",
    content: `Welcome to candlestick basics! 🕯️

**What is a candlestick?**

A candlestick shows four key prices for a time period:
- Open: Price at period start
- Close: Price at period end  
- High: Highest price reached
- Low: Lowest price reached

**Reading the body:**
- 🟢 Green/White body: Close > Open (bullish)
- 🔴 Red/Black body: Close < Open (bearish)

**Common patterns to know:**

1. **Doji** — Open ≈ Close, indicates indecision
2. **Hammer** — Small body, long lower wick, potential reversal
3. **Engulfing** — Large candle completely covers prior candle
4. **Morning/Evening Star** — Three-candle reversal patterns

**Pro tips:**
- Always confirm patterns with volume
- Use multiple timeframes for context
- Never rely on candles alone — combine with support/resistance

Practice on historical charts before risking capital. What patterns have you found most useful?`,
    author: AUTHORS["admin"],
    category: "help",
    tags: ["beginner", "technical-analysis", "education", "candlesticks"],
    time: "5 hours ago",
    views: 2891,
    likes: 234,
    replies: 67,
    image: null,
    pinned: false,
    featured: true,
    edited: false,
  },
  {
    id: "post-003",
    title: "SGX dividend stocks worth watching in 2026",
    preview: "Looking for income? Here are 5 Singapore-listed stocks with strong dividend yields, sustainable payout ratios, and solid business fundamentals...",
    content: `Dividend investing in Singapore offers attractive yields with relative stability. Here are 5 SGX stocks I'm watching:

**1. DBS Group Holdings (D05)**
- Yield: ~5.2%
- Payout ratio: ~50%
- Thesis: Benefiting from higher interest rates, strong capital position

**2. Singtel (Z74)**  
- Yield: ~4.8%
- Payout ratio: ~75%
- Thesis: 5G rollout, regional expansion, stable cash flows

**3. CapitaLand Integrated Commercial Trust (C38U)**
- Yield: ~5.5%
- Payout ratio: ~95% (REIT requirement)
- Thesis: Prime retail/office assets, occupancy recovery

**4. ST Engineering (S63)**
- Yield: ~3.9%
- Payout ratio: ~60%
- Thesis: Defense/aerospace tailwinds, digital transformation

**5. Frasers Centrepoint Trust (J69U)**
- Yield: ~5.1%
- Payout ratio: ~95%
- Thesis: Suburban mall resilience, asset enhancement initiatives

**Key considerations:**
✓ Dividend sustainability (payout ratio, FCF)
✓ Business moat and growth prospects
✓ Interest rate sensitivity
✓ Currency exposure for SGD investors

*Disclaimer: Not financial advice. Do your own research.*

Which dividend stocks are in your portfolio?`,
    author: AUTHORS["user-001"],
    category: "fundamental",
    tags: ["SGX", "dividends", "income-investing", "REITs"],
    time: "1 day ago",
    views: 1856,
    likes: 156,
    replies: 43,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=800&q=80",
    pinned: false,
    featured: false,
    edited: true,
  },
  {
    id: "post-004",
    title: "Market volatility ahead of Fed decision — How are you positioning?",
    preview: "With the FOMC meeting this week, uncertainty is high. Are you hedging, staying cash-heavy, or seeing opportunities? Share your strategies...",
    content: `The Fed meets Wednesday, and markets are on edge.

**Current backdrop:**
- Inflation still above 2% target
- Labor market showing signs of cooling
- Markets pricing in ~60% chance of rate cut

**Possible scenarios:**

🟢 **Dovish cut** (25bps + dovish guidance)
→ Equities rally, bonds rally, USD weakens
→ Positioning: Add growth stocks, reduce cash

🟡 **Neutral** (25bps + data-dependent)  
→ Choppy price action, sector rotation
→ Positioning: Stay balanced, use options for protection

🔴 **Hawkish hold** (no cut + higher-for-longer)
→ Risk-off move, USD strengthens
→ Positioning: Increase cash, hedge with puts, focus on quality

**My approach:**
- 60% equities (tilted to quality/value)
- 25% bonds (short duration)
- 15% cash (dry powder for volatility)
- Protective puts on tech exposure

How are you navigating the uncertainty? What's your biggest concern about the Fed's decision?`,
    author: AUTHORS["user-003"],
    category: "general",
    tags: ["Fed", "macro", "strategy", "volatility"],
    time: "3 hours ago",
    views: 943,
    likes: 67,
    replies: 31,
    image: null,
    pinned: false,
    featured: false,
    edited: false,
  },
  {
    id: "post-005",
    title: "Crypto correlation with equities breaking down — Opportunity or trap?",
    preview: "Bitcoin and tech stocks have moved together for years, but recently the correlation has weakened. Is this a signal to rotate into crypto, or a warning sign?...",
    content: `Interesting development: The 90-day correlation between BTC and NASDAQ has dropped from ~0.85 to ~0.42.

**Why might correlation be breaking down?**

1. **Regulatory clarity** — ETF approvals, clearer frameworks reducing crypto's "risk asset" premium
2. **Institutional adoption** — Corporate treasuries, pension funds allocating independently
3. **Macro divergence** — Crypto responding to halving cycles while equities focus on rates
4. **Market maturation** — Crypto developing its own fundamentals (DeFi, L2s, RWA tokenization)

**Bull case for crypto allocation:**
- Asymmetric upside if adoption accelerates
- Portfolio diversification if correlation stays low
- Exposure to Web3 innovation theme

**Bear case / risks:**
- Correlation could re-emerge in risk-off event
- Regulatory setbacks remain possible
- Volatility still 3-4x equities

**My take:**
Small allocation (1-5%) makes sense for risk-tolerant investors as a diversifier, but size positions appropriately given the volatility.

What's your view on crypto's role in a traditional portfolio?`,
    author: AUTHORS["user-002"],
    category: "news",
    tags: ["crypto", "bitcoin", "correlation", "portfolio"],
    time: "6 hours ago",
    views: 1523,
    likes: 112,
    replies: 58,
    image: "https://images.unsplash.com/photo-1621416894569-0f39ed1d22aa?auto=format&fit=crop&w=800&q=80",
    pinned: false,
    featured: false,
    edited: false,
  },
];

/* ─── Helper Components ──────────────────────────────────── */
function Avatar({ author, size = 36 }) {
  const colors = {
    investor: "from-blue-500 to-cyan-500",
    expert: "from-purple-500 to-pink-500", 
    admin: "from-amber-500 to-orange-500",
  };
  const gradient = colors[author.role] || colors.investor;
  
  return (
    <div 
      className="flex items-center justify-center rounded-full text-xs font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
        color: "white",
        letterSpacing: "0.05em",
      }}
    >
      {author.avatar}
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    investor: { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", color: "#3b82f6" },
    expert: { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)", color: "#a855f7" },
    admin: { bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", color: "#f59e0b" },
  };
  const s = styles[role] || styles.investor;
  
  return (
    <span 
      style={{
        fontSize: "10px",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "100px",
        background: s.bg,
        border: `0.667px solid ${s.border}`,
        color: s.color,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
      }}
    >
      {role}
    </span>
  );
}

function VerifiedTick() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" fill="#00D3F2" />
      <path d="M7 12.5l3.5 3.5 6.5-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ContentRenderer({ content }) {
  // Simple markdown-like renderer (expand for production)
  const lines = content.split("\n");
  return (
    <div style={{ fontSize: "14px", lineHeight: "1.7", color: "rgba(255,255,255,0.85)" }}>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} style={{ fontSize: "18px", fontWeight: 700, color: "white", margin: "20px 0 8px" }}>{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} style={{ fontSize: "16px", fontWeight: 600, color: "white", margin: "16px 0 6px" }}>{line.slice(4)}</h4>;
        }
        if (line.startsWith("- ")) {
          return <div key={i} style={{ marginLeft: "16px", marginBottom: "4px" }}>• {line.slice(2)}</div>;
        }
        if (line.startsWith("✓ ")) {
          return <div key={i} style={{ marginLeft: "16px", marginBottom: "4px", color: "#22c55e" }}>✓ {line.slice(2)}</div>;
        }
        if (line.trim() === "") {
          return <br key={i} />;
        }
        // Handle **bold** and *italic*
        const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        return (
          <p key={i} style={{ margin: "8px 0" }}>
            {parts.map((part, j) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return <strong key={j} style={{ color: "white" }}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith("*") && part.endsWith("*")) {
                return <em key={j} style={{ color: "#00D3F2" }}>{part.slice(1, -1)}</em>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}

/* ─── Toast Notification System ──────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "12px" }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            style={{
              minWidth: "320px",
              padding: "14px 18px",
              borderRadius: "12px",
              background: toast.type === "success" ? "rgba(34,197,94,0.1)" : toast.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)",
              border: `0.667px solid ${toast.type === "success" ? "rgba(34,197,94,0.3)" : toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)"}`,
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={18} style={{ color: "#22c55e", flexShrink: 0 }} />
            ) : toast.type === "error" ? (
              <AlertCircle size={18} style={{ color: "#ef4444", flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ color: "#3b82f6", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", flex: 1 }}>{toast.message}</span>
            <button 
              onClick={() => onDismiss(toast.id)}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: "4px" }}
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Post Card Component ───────────────────────────────── */
function PostCard({ post, onClick }) {
  const cat = CATEGORIES.find(c => c.id === post.category);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      style={{
        padding: "24px",
        borderRadius: "16px",
        background: "rgba(255,255,255,0.03)",
        border: "0.667px solid rgba(255,255,255,0.08)",
        cursor: "pointer",
        transition: "border-color 0.2s, background 0.2s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,211,243,0.3)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar author={post.author} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{post.author.name}</span>
              <RoleBadge role={post.author.role} />
              {post.author.verified && <VerifiedTick />}
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>·</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{post.time}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: `${cat.color}15`, color: cat.color, border: `0.667px solid ${cat.color}30` }}>
                {cat.icon} {cat.label}
              </span>
              {post.pinned && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "100px", background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>📌 PINNED</span>}
              {post.featured && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "100px", background: "rgba(0,211,243,0.1)", color: "#00D3F2" }}>⭐ FEATURED</span>}
            </div>
          </div>
        </div>
        <button style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: "4px" }}>
          <MoreVertical size={18} />
        </button>
      </div>
      
      {/* Content */}
      <h3 style={{ fontSize: "18px", fontWeight: 700, color: "white", lineHeight: "1.4", marginBottom: "12px" }}>{post.title}</h3>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: "1.6", marginBottom: "16px" }}>{post.preview}</p>
      
      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map(tag => (
            <span key={tag} style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "6px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Image */}
      {post.image && (
        <div style={{ borderRadius: "12px", overflow: "hidden", marginBottom: "16px" }}>
          <ImageWithFallback 
            src={post.image} 
            alt={post.title} 
            style={{ width: "100%", height: "200px", objectFit: "cover" }} 
          />
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Eye size={14} />
            <span style={{ fontSize: "12px" }}>{post.views.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            <Heart size={14} />
            <span style={{ fontSize: "12px" }}>{post.likes}</span>
          </div>
          <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.45)" }}>
            <MessageSquare size={14} />
            <span style={{ fontSize: "12px" }}>{getReplyCount(post)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.edited && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>edited</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Create Post Modal ─────────────────────────────────── */
function CreatePostModal({ onClose, onPublish }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const newErrors = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (title.length > 100) newErrors.title = "Title must be under 100 characters";
    if (!content.trim()) newErrors.content = "Content cannot be empty";
    if (content.length < 50) newErrors.content = "Content must be at least 50 characters";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      onPublish({
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        image: image || null,
        author: getCurrentForumUser(),
      });
      setSubmitting(false);
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center"
      style={{ 
        background: "rgba(2,6,24,0.85)", 
        backdropFilter: "blur(8px)", 
        zIndex: 1000,
        padding: "24px"
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "linear-gradient(145deg, #0a1330 0%, #0d1a40 60%, #080f28 100%)",
          border: "0.667px solid rgba(255,255,255,0.1)",
          borderRadius: "24px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(0,211,243,0.07)",
          padding: "28px",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 700, color: "white" }}>Create New Post</h2>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>Share your insights with the community</p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              width: "32px", 
              height: "32px", 
              borderRadius: "8px", 
              background: "rgba(255,255,255,0.06)", 
              border: "0.667px solid rgba(255,255,255,0.1)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              color: "rgba(255,255,255,0.6)",
              cursor: "pointer"
            }}
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Title */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px", display: "block", marginBottom: "6px" }}>
              POST TITLE <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(err => ({ ...err, title: "" })); }}
              placeholder="What's on your mind?"
              maxLength={100}
              disabled={submitting}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: `0.667px solid ${errors.title ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: "white",
                fontSize: "15px",
                fontWeight: 600,
                outline: "none",
                transition: "border-color 0.2s",
                opacity: submitting ? 0.6 : 1,
              }}
              onFocus={e => { if (!submitting) { e.target.style.borderColor = "#00D3F2"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; } }}
              onBlur={e => { e.target.style.borderColor = errors.title ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
            {errors.title && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>⚠ {errors.title}</p>}
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "2px", textAlign: "right" }}>{title.length}/100</p>
          </div>
          
          {/* Category */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px", display: "block", marginBottom: "6px" }}>
              CATEGORY <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              disabled={submitting}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "0.667px solid rgba(255,255,255,0.12)",
                color: "white",
                fontSize: "14px",
                outline: "none",
                cursor: "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {CATEGORIES.filter(c => c.id !== "all").map(cat => (
                <option key={cat.id} value={cat.id} style={{ background: "#0a1330", color: "white" }}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Content */}
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px" }}>
                CONTENT <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <span style={{ fontSize: "11px", color: errors.content ? "#ef4444" : "rgba(255,255,255,0.25)" }}>
                {content.length}/2000
              </span>
            </div>
            <textarea
              value={content}
              onChange={e => { setContent(e.target.value.slice(0, 2000)); if (errors.content) setErrors(err => ({ ...err, content: "" })); }}
              placeholder="Share your analysis, questions, or insights... Use **bold** for emphasis, *italic* for highlights."
              rows={12}
              disabled={submitting}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: `0.667px solid ${errors.content ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`,
                color: "white",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                lineHeight: "1.7",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
                opacity: submitting ? 0.6 : 1,
              }}
              onFocus={e => { if (!submitting) { e.target.style.borderColor = "#00D3F2"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; } }}
              onBlur={e => { e.target.style.borderColor = errors.content ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
            {errors.content && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>⚠ {errors.content}</p>}
          </div>
          
          {/* Tags */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px", display: "block", marginBottom: "6px" }}>
              TAGS <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional, comma-separated)</span>
            </label>
            <input
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g., NVDA, earnings, technical-analysis"
              disabled={submitting}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "0.667px solid rgba(255,255,255,0.12)",
                color: "white",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
                opacity: submitting ? 0.6 : 1,
              }}
              onFocus={e => { if (!submitting) { e.target.style.borderColor = "#00D3F2"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; } }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          
          {/* Image URL */}
          <div>
            <label style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.3px", display: "block", marginBottom: "6px" }}>
              IMAGE URL <span style={{ color: "rgba(255,255,255,0.3)" }}>(optional)</span>
            </label>
            <input
              value={image}
              onChange={e => setImage(e.target.value)}
              placeholder="https://..."
              disabled={submitting}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 16px",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.05)",
                border: "0.667px solid rgba(255,255,255,0.12)",
                color: "white",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s",
                opacity: submitting ? 0.6 : 1,
              }}
              onFocus={e => { if (!submitting) { e.target.style.borderColor = "#00D3F2"; e.target.style.boxShadow = "0 0 0 3px rgba(0,211,243,0.1)"; } }}
              onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                height: "48px",
                flex: 1,
                borderRadius: "12px",
                background: "rgba(255,255,255,0.04)",
                border: "0.667px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)",
                fontSize: "14px",
                fontWeight: 600,
                cursor: submitting ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                height: "48px",
                flex: 2,
                borderRadius: "12px",
                background: submitting ? "rgba(255,255,255,0.06)" : "linear-gradient(90deg, #0092b8, #155dfc)",
                color: submitting ? "rgba(255,255,255,0.3)" : "white",
                fontSize: "14px",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                border: "none",
                boxShadow: submitting ? "none" : "0 4px 16px rgba(0,146,184,0.3)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {submitting ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite" }}>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
                    <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="#00D3F2" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Publishing...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Publish Post
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ─── Reply Card Component ──────────────────────────────── */
function ReplyCard({ reply, isNew }) {
  return (
    <motion.div
      initial={isNew ? { opacity: 0, y: 12 } : false}
      animate={isNew ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
      style={{
        padding: "16px 20px",
        borderRadius: "12px",
        background: isNew ? "rgba(0,211,243,0.05)" : "rgba(255,255,255,0.02)",
        border: `0.667px solid ${isNew ? "rgba(0,211,243,0.2)" : "rgba(255,255,255,0.06)"}`,
        marginLeft: "44px",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar author={reply.author} size={32} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{reply.author.name}</span>
            <RoleBadge role={reply.author.role} />
            {reply.author.verified && <VerifiedTick />}
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{reply.time}</span>
            {isNew && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "100px", background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>NEW</span>}
          </div>
          <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.72)", lineHeight: "1.7", marginTop: "8px" }}
            dangerouslySetInnerHTML={{ 
              __html: reply.content
                .replace(/\n/g, "<br/>")
                .replace(/\*\*(.*?)\*\*/g, '<strong style="color:white">$1</strong>')
                .replace(/\*(.*?)\*/g, '<em style="color:#00D3F2">$1</em>')
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-4" style={{ marginLeft: "44px" }}>
        <button className="flex items-center gap-1.5 hover:opacity-80 transition-opacity" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
          <Heart size={13} />
          <span>{reply.likes}</span>
        </button>
        <button className="hover:opacity-80 transition-opacity" style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
          Reply
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Post Detail Skeleton ─────────────────────────────── */
function PostDetailSkeleton() {
  return (
    <div style={{ padding: "28px 32px 48px" }}>
      {/* Back button skeleton */}
      <div style={{ height: "36px", width: "120px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", marginBottom: "24px", animation: "pulse 1.5s ease-in-out infinite" }} />
      
      {/* Header skeleton */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: "16px", width: "180px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", marginBottom: "8px", animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ height: "12px", width: "120px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>
      
      {/* Title skeleton */}
      <div style={{ height: "32px", width: "80%", borderRadius: "8px", background: "rgba(255,255,255,0.04)", marginBottom: "20px", animation: "pulse 1.5s ease-in-out infinite" }} />
      
      {/* Content skeleton */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ height: "16px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", marginBottom: "12px", animation: `pulse 1.5s ease-in-out infinite ${i * 0.1}s` }} />
      ))}
      
      {/* Image skeleton */}
      <div style={{ height: "280px", borderRadius: "16px", background: "rgba(255,255,255,0.04)", margin: "24px 0", animation: "pulse 1.5s ease-in-out infinite" }} />
      
      {/* Replies skeleton */}
      <div style={{ marginTop: "32px" }}>
        <div style={{ height: "20px", width: "140px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", marginBottom: "16px", animation: "pulse 1.5s ease-in-out infinite" }} />
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "16px", marginLeft: "44px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: "14px", width: "140px", borderRadius: "4px", background: "rgba(255,255,255,0.04)", marginBottom: "8px", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ height: "12px", width: "90%", borderRadius: "4px", background: "rgba(255,255,255,0.04)", animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          </div>
        ))}
      </div>
      
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
    </div>
  );
}

/* ─── Post Detail (View + Edit + Comment) ───────────────── */
function PostDetail({ post, onBack, onUpdatePost, onAddToast }) {
  const [liked, setLiked] = useState(Boolean(post.liked));
  const [likes, setLikes] = useState(Number(post.likes || 0));
  const [bookmarked, setBookmarked] = useState(Boolean(post.saved));
  const [replyText, setReplyText] = useState("");
  const [replyFocused, setReplyFocused] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [localReplies, setLocalReplies] = useState(() => normalizeReplies(post.replies));
  
  /* ── Edit mode state ── */
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editContent, setEditContent] = useState(post.content);
  const [editStep, setEditStep] = useState("idle");
  const [editErrors, setEditErrors] = useState({});
  
  const currentUser = getCurrentForumUser();
  const isOwn = post.author.id === currentUser.id;
  const cat = CATEGORIES.find(c => c.id === post.category);
  const repliesEndRef = useRef(null);

  useEffect(() => {
    setLiked(Boolean(post.liked));
    setLikes(Number(post.likes || 0));
    setBookmarked(Boolean(post.saved));
    setLocalReplies(normalizeReplies(post.replies));
    setReplyText("");
  }, [post.id]);

  function updateCurrentPost(extra = {}) {
    const nextReplies = normalizeReplies(extra.replies ?? localReplies);
    onUpdatePost({
      ...post,
      ...extra,
      replies: nextReplies,
      replyCount: Math.max(getReplyCount(post), nextReplies.length),
    });
  }

  function handleToggleLike() {
    const nextLiked = !liked;
    const nextLikes = Math.max(0, likes + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setLikes(nextLikes);
    updateCurrentPost({ liked: nextLiked, likes: nextLikes });
  }

  function handleToggleBookmark() {
    const nextSaved = !bookmarked;
    setBookmarked(nextSaved);
    updateCurrentPost({ saved: nextSaved });
  }
  
  /* ── Submit comment ── */
  function handleSubmitReply() {
    if (!replyText.trim()) {
      onAddToast("Comment cannot be empty.", "error"); 
      return;
    }
    setReplySubmitting(true);
    
    setTimeout(() => {
      const newReply = {
        id: `reply-${Date.now()}`,
        author: currentUser,
        content: replyText.trim(),
        time: "just now",
        likes: 0,
        isNew: true,
      };
      const updatedReplies = [...normalizeReplies(localReplies), newReply];
      setLocalReplies(updatedReplies);
      updateCurrentPost({ replies: updatedReplies });
      setReplyText("");
      setReplySubmitting(false);
      onAddToast("Comment posted successfully!", "success");
      setTimeout(() => repliesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, 900);
  }
  
  /* ── Edit post validation ── */
  function validateEdit() {
    const e = {};
    if (!editTitle.trim()) e.title = "Post title is required.";
    if (!editContent.trim()) e.content = "Post content cannot be empty.";
    else if (editContent.trim().length < 20) e.content = "Content must be at least 20 characters.";
    return e;
  }
  
  function handleSaveEdit() {
    const e = validateEdit();
    if (Object.keys(e).length) { setEditErrors(e); return; }
    
    setEditStep("validating");
    setTimeout(() => setEditStep("saving"), 800);
    
    setTimeout(() => {
      const updated = { 
        ...post, 
        title: editTitle.trim(), 
        content: editContent.trim(), 
        preview: editContent.trim().slice(0, 160) + "…",
        edited: true 
      };
      onUpdatePost(updated);
      setEditStep("done");
      onAddToast("Post updated successfully!", "success");
      setTimeout(() => { setIsEditing(false); setEditStep("idle"); }, 1200);
    }, 2000);
  }
  
  function handleCancelEdit() {
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditErrors({});
    setEditStep("idle");
    setIsEditing(false);
  }
  
  return (
    <div className="flex flex-col">
      {/* Back nav */}
      <div style={{ padding: "18px 32px", borderBottom: "0.667px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px", fontWeight: 600, cursor: "pointer", background: "none", border: "none" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
          </svg>
          Back to Forum
        </button>
        
        {/* Edit Post button — only visible to post owner */}
        {isOwn && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)} 
            className="flex items-center gap-2 font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ height: "36px", padding: "0 16px", borderRadius: "10px", background: "rgba(6,182,212,0.1)", border: "0.667px solid rgba(6,182,212,0.25)", color: "#06b6d4", fontSize: "13px", cursor: "pointer" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Post
          </button>
        )}
        
        {isEditing && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#06b6d4" }}>✏️ Editing Post</span>
          </div>
        )}
      </div>
      
      <div style={{ padding: "28px 32px 48px" }}>
        {/* ──────── EDIT MODE ──────── */}
        {isEditing ? (
          <div className="flex flex-col" style={{ gap: "20px" }}>
            {/* Edit header */}
            <div style={{ padding: "16px 20px", borderRadius: "14px", background: "rgba(6,182,212,0.05)", border: "0.667px solid rgba(6,182,212,0.2)" }}>
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#06b6d4" }}>You are editing this post</p>
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>Changes will be visible to all community members after saving.</p>
            </div>
            
            {/* Edit progress indicator */}
            {editStep !== "idle" && (
              <div className="flex items-center gap-3" style={{ padding: "14px 18px", borderRadius: "12px", background: editStep === "done" ? "rgba(34,197,94,0.07)" : "rgba(0,211,243,0.06)", border: `0.667px solid ${editStep === "done" ? "rgba(34,197,94,0.2)" : "rgba(0,211,243,0.15)"}` }}>
                {editStep !== "done" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }}>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                    <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(0,211,243,0.3)" strokeWidth="2.5"/>
                    <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#00D3F2" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: editStep === "done" ? "#22c55e" : "#00D3F2" }}>
                    {editStep === "validating" ? "Validating changes…" : editStep === "saving" ? "Saving post…" : "Post updated successfully!"}
                  </p>
                  {editStep !== "done" && (
                    <div style={{ width: "200px", height: "3px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", overflow: "hidden", marginTop: "6px" }}>
                      <div style={{ height: "100%", borderRadius: "100px", background: "linear-gradient(90deg,#00D3F2,#155dfc)", animation: "loadbar 1s ease forwards" }}/>
                      <style>{`@keyframes loadbar { from { width: 0; } to { width: 100%; } }`}</style>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Edit Title */}
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.8px", display: "block", marginBottom: "8px" }}>
                POST TITLE <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input 
                value={editTitle} 
                onChange={e => { setEditTitle(e.target.value); setEditErrors(err => ({ ...err, title: "" })); }} 
                disabled={editStep !== "idle"}
                style={{ 
                  width: "100%", 
                  height: "46px", 
                  padding: "0 14px", 
                  borderRadius: "10px", 
                  background: "rgba(255,255,255,0.04)", 
                  border: `0.667px solid ${editErrors.title ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`, 
                  color: "white", 
                  fontSize: "15px", 
                  fontWeight: 700, 
                  outline: "none",
                  opacity: editStep !== "idle" ? 0.6 : 1
                }}
              />
              {editErrors.title && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "5px" }}>⚠ {editErrors.title}</p>}
            </div>
            
            {/* Edit Content */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.8px" }}>
                  CONTENT <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <span style={{ fontSize: "10px", color: editContent.length > 2000 ? "#ef4444" : "rgba(255,255,255,0.25)" }}>
                  {editContent.length}/2000
                </span>
              </div>
              <textarea 
                value={editContent} 
                onChange={e => { setEditContent(e.target.value.slice(0, 2000)); setEditErrors(err => ({ ...err, content: "" })); }} 
                disabled={editStep !== "idle"}
                rows={14}
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  borderRadius: "12px", 
                  background: "rgba(255,255,255,0.04)", 
                  border: `0.667px solid ${editErrors.content ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.12)"}`, 
                  color: "white", 
                  fontSize: "14px", 
                  outline: "none", 
                  resize: "vertical", 
                  lineHeight: "1.7", 
                  fontFamily: "inherit",
                  opacity: editStep !== "idle" ? 0.6 : 1
                }}
              />
              {editErrors.content && <p style={{ fontSize: "11px", color: "#ef4444", marginTop: "5px" }}>⚠ {editErrors.content}</p>}
            </div>
            
            {/* Edit actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCancelEdit} 
                disabled={editStep !== "idle" && editStep !== "done"}
                style={{ 
                  height: "44px", 
                  flex: 1, 
                  borderRadius: "12px", 
                  background: "rgba(255,255,255,0.04)", 
                  border: "0.667px solid rgba(255,255,255,0.1)", 
                  color: "rgba(255,255,255,0.5)", 
                  fontSize: "14px", 
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSaveEdit} 
                disabled={editStep !== "idle"}
                style={{ 
                  height: "44px", 
                  flex: 2, 
                  borderRadius: "12px", 
                  background: editStep === "idle" ? "linear-gradient(90deg,#0092b8,#155dfc)" : "rgba(255,255,255,0.06)", 
                  color: editStep === "idle" ? "white" : "rgba(255,255,255,0.3)", 
                  fontSize: "14px", 
                  fontWeight: 700,
                  cursor: editStep === "idle" ? "pointer" : "not-allowed",
                  border: "none",
                  boxShadow: editStep === "idle" ? "0 4px 16px rgba(0,146,184,0.3)" : "none"
                }}
              >
                {editStep === "idle" ? "Save Changes" : editStep === "done" ? "Saved ✓" : "Saving…"}
              </button>
            </div>
          </div>
        ) : (
          /* ──────── VIEW MODE ──────── */
          <>
            {/* Category + tags */}
            <div className="flex items-center gap-2 flex-wrap" style={{ marginBottom: "16px" }}>
              {post.pinned && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "0.667px solid rgba(251,191,36,0.25)" }}>📌 PINNED</span>}
              {post.featured && <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "100px", background: "rgba(0,211,243,0.1)", color: "#00D3F2", border: "0.667px solid rgba(0,211,243,0.25)" }}>⭐ FEATURED</span>}
              {post.edited && <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "100px", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}>✏️ edited</span>}
              <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 12px", borderRadius: "100px", background: `${cat.color}15`, color: cat.color, border: `0.667px solid ${cat.color}30` }}>
                {cat.icon} {cat.label}
              </span>
              {post.tags.map(t => (
                <span key={t} style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "0.667px solid rgba(255,255,255,0.08)" }}>
                  #{t}
                </span>
              ))}
            </div>
            
            {/* Title */}
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "white", lineHeight: "1.35", marginBottom: "20px" }}>{post.title}</h1>
            
            {/* Author row */}
            <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: "24px", padding: "16px 18px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: "0.667px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-3">
                <Avatar author={post.author} size={44}/>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>{post.author.name}</span>
                    <RoleBadge role={post.author.role}/>
                    {post.author.verified && <VerifiedTick/>}
                  </div>
                  <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "3px" }}>
                    {post.author.title} · {post.author.posts} posts · Joined {post.author.joined}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: "13px" }}>👁</span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{post.views.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: "13px" }}>💬</span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>{localReplies.length}</span>
                </div>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>{post.time}</span>
              </div>
            </div>
            
            {/* Hero image */}
            {post.image && (
              <div style={{ borderRadius: "16px", overflow: "hidden", marginBottom: "28px" }}>
                <ImageWithFallback 
                  src={post.image} 
                  alt={post.title} 
                  style={{ width: "100%", height: "280px", objectFit: "cover" }} 
                />
              </div>
            )}
            
            {/* Content */}
            <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255,255,255,0.02)", border: "0.667px solid rgba(255,255,255,0.07)", marginBottom: "24px" }}>
              <ContentRenderer content={post.content}/>
            </div>
            
            {/* Reaction bar */}
            <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "32px", padding: "14px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.025)", border: "0.667px solid rgba(255,255,255,0.07)" }}>
              <button 
                onClick={handleToggleLike} 
                className="flex items-center gap-2 font-semibold hover:opacity-80 active:scale-[0.97] transition-all"
                style={{ 
                  height: "36px", 
                  padding: "0 14px", 
                  borderRadius: "10px", 
                  background: liked ? "rgba(0,211,243,0.1)" : "rgba(255,255,255,0.04)", 
                  border: `0.667px solid ${liked ? "rgba(0,211,243,0.3)" : "rgba(255,255,255,0.08)"}`, 
                  color: liked ? "#00D3F2" : "rgba(255,255,255,0.5)", 
                  fontSize: "13px", 
                  cursor: "pointer" 
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {liked ? "Liked" : "Like"} · {likes}
              </button>
              <button 
                onClick={handleToggleBookmark} 
                className="flex items-center gap-2 font-semibold hover:opacity-80 transition-all"
                style={{ 
                  height: "36px", 
                  padding: "0 14px", 
                  borderRadius: "10px", 
                  background: bookmarked ? "rgba(251,191,36,0.1)" : "rgba(255,255,255,0.04)", 
                  border: `0.667px solid ${bookmarked ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.08)"}`, 
                  color: bookmarked ? "#fbbf24" : "rgba(255,255,255,0.5)", 
                  fontSize: "13px", 
                  cursor: "pointer" 
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                {bookmarked ? "Saved" : "Save"}
              </button>
              <button 
                className="flex items-center gap-2 font-semibold hover:opacity-80 transition-all"
                style={{ 
                  height: "36px", 
                  padding: "0 14px", 
                  borderRadius: "10px", 
                  background: "rgba(255,255,255,0.04)", 
                  border: "0.667px solid rgba(255,255,255,0.08)", 
                  color: "rgba(255,255,255,0.5)", 
                  fontSize: "13px", 
                  cursor: "pointer" 
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                Share
              </button>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e" }}/>
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)" }}>Discussion open</span>
              </div>
            </div>
            
            {/* Replies */}
            <div style={{ marginBottom: "24px" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "16px" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00D3F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "white" }}>Comments</span>
                <span style={{ fontSize: "12px", padding: "2px 8px", borderRadius: "100px", background: "rgba(0,211,243,0.1)", color: "#00D3F2", fontWeight: 700 }}>
                  {localReplies.length}
                </span>
              </div>
              
              {localReplies.length === 0 ? (
                <div className="flex flex-col items-center" style={{ padding: "40px 0", gap: "10px" }}>
                  <span style={{ fontSize: "32px" }}>💬</span>
                  <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.35)" }}>No comments yet — be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {localReplies.map(r => <ReplyCard key={r.id} reply={r} isNew={r.isNew}/>)}
                </div>
              )}
              <div ref={repliesEndRef}/>
            </div>
            
            {/* Comment box */}
            <div style={{ padding: "20px", borderRadius: "16px", background: "rgba(255,255,255,0.025)", border: `0.667px solid ${replyFocused ? "rgba(0,211,243,0.25)" : "rgba(255,255,255,0.08)"}`, transition: "border-color 0.2s ease" }}>
              <div className="flex items-center gap-2" style={{ marginBottom: "12px" }}>
                <Avatar author={currentUser} size={28}/>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Comment as</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>{currentUser.name}</span>
                <RoleBadge role={currentUser.role}/>
              </div>
              <textarea 
                value={replyText} 
                onChange={e => setReplyText(e.target.value)} 
                onFocus={() => setReplyFocused(true)} 
                onBlur={() => setReplyFocused(false)} 
                placeholder="Share your thoughts, analysis, or questions… Use **bold** for emphasis." 
                rows={4}
                style={{ 
                  width: "100%", 
                  background: "rgba(255,255,255,0.04)", 
                  border: "0.667px solid rgba(255,255,255,0.08)", 
                  borderRadius: "10px", 
                  padding: "12px 14px", 
                  color: "white", 
                  fontSize: "14px", 
                  outline: "none", 
                  resize: "vertical", 
                  lineHeight: "1.6", 
                  fontFamily: "inherit" 
                }}
                disabled={replySubmitting}
              />
              <div className="flex items-center justify-between" style={{ marginTop: "10px" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>Be respectful · No financial advice · Follow community guidelines</span>
                <button 
                  onClick={handleSubmitReply} 
                  disabled={replySubmitting}
                  className="flex items-center gap-2 font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
                  style={{ 
                    height: "38px", 
                    padding: "0 20px", 
                    borderRadius: "10px", 
                    fontSize: "13px", 
                    cursor: replySubmitting ? "not-allowed" : "pointer", 
                    background: replySubmitting ? "rgba(255,255,255,0.06)" : "linear-gradient(90deg,#0092b8,#155dfc)", 
                    color: replySubmitting ? "rgba(255,255,255,0.35)" : "white", 
                    border: "none" 
                  }}
                >
                  {replySubmitting ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite" }}>
                        <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5"/>
                        <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#00D3F2" strokeWidth="2.5" strokeLinecap="round"/>
                      </svg>
                      Posting…
                    </>
                  ) : "Post Comment"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Loading View ─────────────────────────────────────── */
function LoadingView({ post }) {
  return (
    <div>
      <div className="flex items-center gap-3" style={{ padding: "14px 32px", background: "rgba(0,211,243,0.06)", borderBottom: "0.667px solid rgba(0,211,243,0.15)" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite", flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(0,211,243,0.3)" strokeWidth="2.5"/>
          <path d="M12 3a9 9 0 0 1 9 9" fill="none" stroke="#00D3F2" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "13px", fontWeight: 700, color: "#00D3F2" }}>Retrieving post content…</p>
          <p style={{ fontSize: "11px", color: "rgba(0,211,243,0.5)", marginTop: "2px" }}>{post.title}</p>
        </div>
        <div style={{ width: "160px", height: "4px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: "100px", background: "linear-gradient(90deg,#00D3F2,#51A2FF)", animation: "loadbar 1.3s ease-in-out forwards" }}/>
          <style>{`@keyframes loadbar { from { width: 0; } to { width: 100%; } }`}</style>
        </div>
      </div>
      <PostDetailSkeleton/>
    </div>
  );
}

/* ─── Main Forum Page ──────────────────────────────────── */
export default function ForumPage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(() => loadStoredForumPosts());

  useEffect(() => {
    try {
      localStorage.setItem(FORUM_STORAGE_KEY, JSON.stringify(posts.map(safePost)));
    } catch (error) {
      console.error("Unable to save forum posts", error);
    }
  }, [posts]);

  const [view, setView] = useState("list");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("latest");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const scrollRef = useRef(null);
  const toastCounterRef = useRef(0);
  
  const selectedPost = posts.find(p => p.id === selectedPostId) || null;
  
  function addToast(message, type = "success") {
    const id = ++toastCounterRef.current;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }
  
  function handleSelectPost(post) {
    setSelectedPostId(post.id);
    setView("loading");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setView("detail"), 1300);
  }
  
  function handleBack() {
    setView("list");
    setSelectedPostId(null);
  }
  
  function handleUpdatePost(updated) {
    setPosts(prev => prev.map(p => p.id === updated.id ? safePost(updated) : p));
  }
  
  function handlePublishPost(partial) {
    const newPost = safePost({
      ...partial,
      id: `post-${Date.now()}`,
      time: "just now",
      views: 1,
      replies: [],
      replyCount: 0,
      likes: 0,
      liked: false,
      saved: false,
    });
    setPosts(prev => [newPost, ...prev]);
    setShowCreateModal(false);
    addToast("Your post has been published!", "success");
    setTimeout(() => handleSelectPost(newPost), 400);
  }
  
  const filteredPosts = posts
    .map(safePost)
    .filter(p => activeCategory === "all" || p.category === activeCategory)
    .filter(p => sortBy !== "saved" || p.saved)
    .filter(p => {
      const q = searchQuery.toLowerCase();
      return !q || 
        p.title.toLowerCase().includes(q) || 
        p.preview.toLowerCase().includes(q) || 
        p.tags.some(t => t.toLowerCase().includes(q)) ||
        p.author.name.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (sortBy === "popular") return b.likes - a.likes;
      if (sortBy === "replies") return getReplyCount(b) - getReplyCount(a);
      return 0;
    });
  
  const catCounts = (id) => id === "all" ? posts.length : posts.map(safePost).filter(p => p.category === id).length;
  
  return (
    <div className="flex min-h-screen" style={{ backgroundImage: "linear-gradient(144.583deg, rgb(2,6,24) 0%, rgb(22,36,86) 50%, rgb(15,23,43) 100%)" }}>
      <ToastContainer toasts={toasts} onDismiss={id => setToasts(t => t.filter(x => x.id !== id))}/>
      
      {/* ── Create Post Modal ── */}
      {showCreateModal && <CreatePostModal onClose={() => setShowCreateModal(false)} onPublish={handlePublishPost}/>}
      
      {/* ── Left Sidebar ── */}
      <div className="flex flex-col" style={{ width: "236px", flexShrink: 0, height: "100vh", position: "sticky", top: 0, borderRight: "0.667px solid rgba(255,255,255,0.07)", overflowY: "auto" }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "0.667px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2" style={{ marginBottom: "14px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "linear-gradient(135deg,#00D3F2,#155dfc)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 800, backgroundImage: "linear-gradient(90deg,#00D3F2,#51A2FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Deskstock</p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.8px" }}>COMMUNITY</p>
            </div>
          </div>
          <button 
            onClick={() => navigate(getBackToAppPath())} 
            className="flex items-center gap-2 hover:opacity-70 transition-opacity w-full"
            style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
            </svg>
            Back to App
          </button>
        </div>
        
        {/* Current user chip */}
        <div style={{ padding: "14px 14px 0" }}>
          <div className="flex items-center gap-2" style={{ padding: "10px 12px", borderRadius: "10px", background: "rgba(6,182,212,0.06)", border: "0.667px solid rgba(6,182,212,0.15)" }}>
            <Avatar author={getCurrentForumUser()} size={28}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getCurrentForumUser().name}</p>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>Logged in</p>
            </div>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }}/>
          </div>
        </div>
        
        {/* Categories */}
        <div style={{ padding: "14px 10px", flex: 1 }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", padding: "0 6px", marginBottom: "6px" }}>CATEGORIES</p>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id} 
              onClick={() => { setActiveCategory(cat.id); if (view === "detail") handleBack(); }}
              className="w-full flex items-center gap-3 transition-all hover:opacity-90"
              style={{ 
                height: "37px", 
                padding: "0 10px", 
                borderRadius: "10px", 
                cursor: "pointer",
                background: activeCategory === cat.id ? `${cat.color}12` : "transparent",
                border: activeCategory === cat.id ? `0.667px solid ${cat.color}30` : "0.667px solid transparent",
                color: activeCategory === cat.id ? cat.color : "rgba(255,255,255,0.45)",
                fontSize: "12px",
                fontWeight: activeCategory === cat.id ? 700 : 500,
                textAlign: "left"
              }}
            >
              <span style={{ fontSize: "14px" }}>{cat.icon}</span>
              <span style={{ flex: 1 }}>{cat.label}</span>
              <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "100px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}>{catCounts(cat.id)}</span>
            </button>
          ))}
        </div>
        
        {/* Community stats + active members */}
        <div style={{ padding: "12px 14px", borderTop: "0.667px solid rgba(255,255,255,0.07)" }}>
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginBottom: "8px" }}>COMMUNITY</p>
          {[
            { label: "Total Posts", val: posts.length, color: "#00D3F2" },
            { label: "Members", val: "1,284", color: "#51A2FF" },
            { label: "Online Now", val: 47, color: "#22c55e" },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between" style={{ padding: "5px 0", borderBottom: "0.667px solid rgba(255,255,255,0.04)" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{label}</span>
              <span style={{ fontSize: "12px", fontWeight: 700, color }}>{val}</span>
            </div>
          ))}
          <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "1px", margin: "12px 0 8px" }}>ACTIVE NOW</p>
          <div className="flex" style={{ gap: "4px" }}>
            {Object.values(AUTHORS).slice(0, 6).map(a => (
              <div key={a.id} style={{ position: "relative" }}>
                <Avatar author={a} size={24}/>
                <div style={{ position: "absolute", bottom: 0, right: 0, width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e", border: "1px solid #080f28" }}/>
              </div>
            ))}
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>+41</div>
          </div>
        </div>
      </div>
      
      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div style={{ padding: "0 28px", height: "66px", borderBottom: "0.667px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexShrink: 0 }}>
          <div className="flex items-center gap-3">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00D3F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h1 style={{ fontSize: "17px", fontWeight: 800, color: "white" }}>Community Forum</h1>
            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "100px", background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 700, border: "0.667px solid rgba(34,197,94,0.2)" }}>● 47 online</span>
          </div>
          
          {view === "list" && (
            <div className="flex items-center gap-2" style={{ flex: 1, maxWidth: "340px" }}>
              <div className="flex items-center gap-2 flex-1" style={{ height: "37px", padding: "0 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "0.667px solid rgba(255,255,255,0.1)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  placeholder="Search posts…" 
                  style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: "13px", color: "white" }}
                />
              </div>
            </div>
          )}
          
          {/* New Post CTA */}
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="flex items-center gap-2 font-semibold hover:opacity-90 active:scale-[0.97] transition-all"
            style={{ 
              height: "38px", 
              padding: "0 18px", 
              borderRadius: "10px", 
              backgroundImage: "linear-gradient(90deg,#0092b8,#155dfc)", 
              color: "white", 
              fontSize: "13px", 
              cursor: "pointer", 
              border: "none", 
              flexShrink: 0,
              boxShadow: "0 4px 16px rgba(0,146,184,0.3)"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Post
          </button>
        </div>
        
        {/* Scrollable body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {/* ── List view ── */}
          {view === "list" && (
            <div style={{ padding: "22px 28px 48px" }}>
              <div className="flex items-center justify-between flex-wrap gap-3" style={{ marginBottom: "18px" }}>
                <div>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
                    {activeCategory === "all" ? "All Posts" : CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </span>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", marginLeft: "8px" }}>
                    {filteredPosts.length} posts
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>Sort:</span>
                  {["latest", "popular", "replies", "saved"].map(s => (
                    <button 
                      key={s} 
                      onClick={() => setSortBy(s)} 
                      className="capitalize transition-all"
                      style={{ 
                        height: "29px", 
                        padding: "0 12px", 
                        borderRadius: "100px", 
                        fontSize: "11px", 
                        fontWeight: 600, 
                        cursor: "pointer",
                        background: sortBy === s ? "rgba(0,211,243,0.12)" : "rgba(255,255,255,0.04)",
                        color: sortBy === s ? "#00D3F2" : "rgba(255,255,255,0.4)",
                        border: sortBy === s ? "0.667px solid rgba(0,211,243,0.25)" : "0.667px solid rgba(255,255,255,0.08)"
                      }}
                    >
                      {s === "saved" ? "Saved Posts" : s}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                {filteredPosts.length > 0 
                  ? filteredPosts.map(post => <PostCard key={post.id} post={post} onClick={() => handleSelectPost(post)}/>)
                  : <div className="flex flex-col items-center" style={{ padding: "64px 0", gap: "12px" }}>
                      <span style={{ fontSize: "40px" }}>🔍</span>
                      <p style={{ fontSize: "16px", fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>No posts found</p>
                      <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)" }}>Try a different search term or select a different category</p>
                    </div>
                }
              </div>
            </div>
          )}
          
          {/* ── Loading state ── */}
          {view === "loading" && selectedPost && <LoadingView post={selectedPost}/>}
          
          {/* ── Detail view ── */}
          {view === "detail" && selectedPost && (
            <PostDetail 
              post={selectedPost} 
              onBack={handleBack} 
              onUpdatePost={handleUpdatePost}
              onAddToast={addToast}
            />
          )}
        </div>
      </div>
    </div>
  );
}
