from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.entity.database.base import Base
from app.entity.database.session import get_session
from app.entity.models.useraccount import UserAccount

try:
    from zoneinfo import ZoneInfo
    def _now():
        return datetime.now(ZoneInfo("Asia/Singapore"))
except Exception:
    def _now():
        return datetime.now()


#  Forum categories 
FORUM_CATEGORIES = [
    "Technical Analysis",
    "Fundamental Analysis",
    "AI Predictions",
    "Portfolio Strategy",
    "Market News",
    "Trading Tips",
    "Beginners Corner",
    "Global Markets",
    "Crypto & Digital Assets",
    "Risk Management",
]

# Category used for per-stock expert comments (StockComments panel). Deliberately kept OUT of
# FORUM_CATEGORIES so _validate_category() can never accept it on the general create/update post
# routes -- it's only ever set directly by create_stock_comment().
STOCK_COMMENT_CATEGORY = "Stock Discussion"



class ForumPost(Base):
    __tablename__ = "forum_post"

    post_id      = Column(String(50), primary_key=True, default=lambda: f"post_{uuid4()}")
    user_id      = Column(String(50), nullable=True)
    author_name  = Column(String(100), default="RocketTrade User")
    author_role  = Column(String(30), default="investor")
    title        = Column(String(180), nullable=False)
    content      = Column(Text, nullable=False)
    category     = Column(String(80), default="Technical Analysis")
    tags         = Column(String(255), default="")
    ticker_tags  = Column(String(255), default="")
    likes_count  = Column(Integer, default=0)
    views_count  = Column(Integer, default=0)
    is_pinned    = Column(Integer, default=0)
    is_featured  = Column(Integer, default=0)
    is_closed    = Column(Integer, default=0)
    created_at   = Column(DateTime, default=_now)
    updated_at   = Column(DateTime, default=_now)

    # lazy="select" — replies are only queried when a post is actually opened, not on every list_posts() call (huge performance win for the forum feed).
    replies = relationship("ForumReply", cascade="all, delete-orphan", back_populates="post", lazy="select")


class ForumReply(Base):
    __tablename__ = "forum_reply"

    reply_id    = Column(String(50), primary_key=True, default=lambda: f"reply_{uuid4()}")
    post_id     = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id     = Column(String(50), nullable=True)
    author_name = Column(String(100), default="RocketTrade User")
    author_role = Column(String(30), default="investor")
    content     = Column(Text, nullable=False)
    likes_count = Column(Integer, default=0)
    is_edited   = Column(Integer, default=0)
    created_at  = Column(DateTime, default=_now)
    updated_at  = Column(DateTime, default=_now)

    post        = relationship("ForumPost", back_populates="replies")
    reply_likes = relationship("ForumReplyLike", cascade="all, delete-orphan", lazy="dynamic")


class ForumPostLike(Base):
    __tablename__ = "forum_post_like"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_like"),)

    like_id    = Column(String(50), primary_key=True, default=lambda: f"like_{uuid4()}")
    post_id    = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumPostSave(Base):
    __tablename__ = "forum_post_save"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_save"),)

    save_id    = Column(String(50), primary_key=True, default=lambda: f"save_{uuid4()}")
    post_id    = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumReplyLike(Base):
    """Per-comment likes."""
    __tablename__ = "forum_reply_like"
    __table_args__ = (UniqueConstraint("reply_id", "user_id", name="uq_forum_reply_like"),)

    like_id    = Column(String(50), primary_key=True, default=lambda: f"rlike_{uuid4()}")
    reply_id   = Column(String(50), ForeignKey("forum_reply.reply_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumPostView(Base):
    """Tracks unique views per user so view count never double-counts."""
    __tablename__ = "forum_post_view"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_view"),)

    view_id    = Column(String(50), primary_key=True, default=lambda: f"view_{uuid4()}")
    post_id    = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumPostFlag(Base):
    """Tracks user reports on forum posts — one flag per user per post."""
    __tablename__ = "forum_post_flag"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_flag"),)

    id         = Column(String(50), primary_key=True, default=lambda: f"pf_{uuid4()}")
    post_id    = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    reason     = Column(String(200), default="Inappropriate content")
    created_at = Column(DateTime, default=_now)


class ForumReplyFlag(Base):
    """Tracks user reports on forum comments — one flag per user per comment."""
    __tablename__ = "forum_reply_flag"
    __table_args__ = (UniqueConstraint("reply_id", "user_id", name="uq_forum_reply_flag"),)

    id         = Column(String(50), primary_key=True, default=lambda: f"rf_{uuid4()}")
    reply_id   = Column(String(50), ForeignKey("forum_reply.reply_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    reason     = Column(String(200), default="Inappropriate content")
    created_at = Column(DateTime, default=_now)


class ForumPostRemoval(Base):

    __tablename__ = "forum_post_removal"

    id           = Column(String(50), primary_key=True, default=lambda: f"pr_{uuid4()}")
    user_id      = Column(String(50), nullable=False)  # original post author
    post_title   = Column(String(200), nullable=True)
    reason       = Column(String(300), nullable=False)
    removed_at   = Column(DateTime, default=_now)
    acknowledged = Column(Boolean, default=False)  # user has seen/dismissed the notice



def _resolve_user_name(session, user_id):
    if not user_id:
        return "RocketTrade User", "investor"
    user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not user:
        return "RocketTrade User", "investor"
    role = user.profile.profile_name if getattr(user, "profile", None) else "user"
    return user.full_name or user.username, role or "user"


def _safe_dt(value):
    return value.isoformat() if value else None


def _can_modify_reply(session, reply, user_id):
    if not reply or not user_id:
        return False
    if reply.user_id and str(reply.user_id) == str(user_id):
        return True
    author_name, _role = _resolve_user_name(session, user_id)
    if author_name and reply.author_name and str(author_name).strip().lower() == str(reply.author_name).strip().lower():
        return True
    return False


def _forum_action_allowed(post, actor_is_privileged):
    """Gate mutating actions (reply/like/save) that echo full post content back
    in their response, for Stock Discussion posts only. No-op for every other
    category -- without this, a non-privileged user with a valid login could
    read gated content by replying/liking directly instead of listing posts."""
    return post.category != STOCK_COMMENT_CATEGORY or actor_is_privileged


def _validate_category(category):
    if category and category in FORUM_CATEGORIES:
        return category
    return "Technical Analysis"


def _serialise_reply(reply, user_id=None, session=None):
    liked_by_me = False
    if session and user_id:
        liked_by_me = session.query(ForumReplyLike).filter(
            ForumReplyLike.reply_id == reply.reply_id,
            ForumReplyLike.user_id == user_id,
        ).first() is not None
    flagged_by_me = False
    flag_count = 0
    if session:
        flag_count = session.query(ForumReplyFlag).filter(
            ForumReplyFlag.reply_id == reply.reply_id
        ).count()
        if user_id:
            flagged_by_me = session.query(ForumReplyFlag).filter(
                ForumReplyFlag.reply_id == reply.reply_id,
                ForumReplyFlag.user_id == str(user_id),
            ).first() is not None
    return {
        "id":          reply.reply_id,
        "reply_id":    reply.reply_id,
        "user_id":     reply.user_id,
        "author":      reply.author_name,
        "author_name": reply.author_name,
        "author_role": reply.author_role,
        "content":     reply.content,
        "likes":       reply.likes_count,
        "liked_by_me": liked_by_me,
        "flagged_by_me": flagged_by_me,
        "flag_count": flag_count,
        "is_edited":   bool(reply.is_edited),
        "created_at":  _safe_dt(reply.created_at),
        "time":        _safe_dt(reply.created_at),
    }


def _serialise_post(session, post, user_id=None, include_replies=True, viewer_is_privileged=True):
    liked = saved = commented = flagged_by_me = False
    if user_id:
        liked = session.query(ForumPostLike).filter(
            ForumPostLike.post_id == post.post_id, ForumPostLike.user_id == user_id
        ).first() is not None
        saved = session.query(ForumPostSave).filter(
            ForumPostSave.post_id == post.post_id, ForumPostSave.user_id == user_id
        ).first() is not None
        flagged_by_me = session.query(ForumPostFlag).filter(
            ForumPostFlag.post_id == post.post_id, ForumPostFlag.user_id == str(user_id)
        ).first() is not None
        commented = session.query(ForumReply).filter(
            ForumReply.post_id == post.post_id, ForumReply.user_id == user_id
        ).first() is not None
    flag_count = session.query(ForumPostFlag).filter(
        ForumPostFlag.post_id == post.post_id
    ).count()
    replies = list(post.replies or [])
    sorted_replies = sorted(replies, key=lambda r: r.created_at or datetime.min)
    ticker_list = [t.strip().upper() for t in (post.ticker_tags or "").split(",") if t.strip()]
    gated = post.category == STOCK_COMMENT_CATEGORY and not viewer_is_privileged
    data = {
        "id":              post.post_id,
        "post_id":         post.post_id,
        "user_id":         post.user_id,
        "title":           post.title,
        "content":         post.content,
        "preview":         post.content[:180] + ("..." if len(post.content) > 180 else ""),
        "category":        post.category,
        "tags":            [t.strip() for t in (post.tags or "").split(",") if t.strip()],
        "ticker_tags":     ticker_list,
        "author":          post.author_name,
        "author_name":     post.author_name,
        "author_role":     post.author_role,
        "likes":           post.likes_count,
        "views":           post.views_count,
        "reply_count":     len(replies),
        "is_pinned":       bool(post.is_pinned),
        "is_featured":     bool(post.is_featured),
        "is_closed":       bool(post.is_closed),
        "liked_by_me":     liked,
        "saved_by_me":     saved,
        "commented_by_me": commented,
        "flagged_by_me":   flagged_by_me,
        "flag_count":      flag_count,
        "created_at":      _safe_dt(post.created_at),
        "updated_at":      _safe_dt(post.updated_at),
        "time":            _safe_dt(post.created_at),
        "replies":         [_serialise_reply(r, user_id=user_id, session=session) for r in sorted_replies] if include_replies else [],
        "is_gated":        gated,
    }
    if gated:
        data["content"] = None
        data["preview"] = None
        data["replies"] = []
    return data




def seed_forum_posts():
    """Seed topic-specific posts on first run. Safe to call every startup."""
    # Check and insert in a SINGLE session to avoid race conditions
    with get_session() as session:
        if session.query(ForumPost).count() > 0:
            return
        if session.query(ForumPost).filter(ForumPost.post_id == "post_seed_ta_001").first():
            return

    seed_data = [
        {
            "post_id": "post_seed_ta_001", "category": "Technical Analysis",
            "title": "AAPL double-bottom setup — breakout watch",
            "content": "Apple has been forming a potential double-bottom near the recent support zone. I am watching for a confirmed close above neckline resistance with stronger volume before treating it as a valid bullish setup. RSI at 54 — not overbought, plenty of room to run. Educational only, not financial advice.",
            "tags": "AAPL,double-bottom,breakout", "ticker_tags": "AAPL",
            "likes_count": 34, "views_count": 820, "is_pinned": 1,
            "replies": [{"reply_id": "reply_ta_001a", "author_name": "Sarah Chen", "author_role": "investor", "content": "Good breakdown. Volume on the second bottom was noticeably lighter — classic confirmation signal.", "likes_count": 12}],
        },
        {
            "post_id": "post_seed_fa_001", "category": "Fundamental Analysis",
            "title": "NVDA earnings deep dive — is the valuation still justified?",
            "content": "With NVDA trading at a forward P/E of around 35x, a lot of investors are asking whether the valuation is stretched. Data Center segment grew 427% YoY — the AI infrastructure buildout is real. Gross margins expanded to 78.4%. Bear case: customer concentration risk. Bull case: Blackwell GPU backlog extends into 2026. Educational only, not financial advice.",
            "tags": "NVDA,earnings,valuation,AI", "ticker_tags": "NVDA",
            "likes_count": 57, "views_count": 3210, "is_featured": 1,
            "replies": [{"reply_id": "reply_fa_001a", "author_name": "Marcus Rivera", "author_role": "investor", "content": "The Blackwell backlog point is massive. Hard to be bearish when your product is oversubscribed 18 months out.", "likes_count": 24}],
        },
        {
            "post_id": "post_seed_ai_001", "category": "AI Predictions",
            "title": "How accurate are the RocketTrade AI predictions? My 30-day review",
            "content": "I tracked every AI prediction signal for 30 days across 8 tickers. Results: 22 out of 31 directional predictions were correct (71% hit rate). Best: MSFT, NVDA, AAPL. Worst: TSLA (high volatility). The AI works best as a secondary confirmation signal, not a standalone trigger.",
            "tags": "AI,predictions,backtesting", "ticker_tags": "MSFT,NVDA,AAPL,TSLA",
            "likes_count": 42, "views_count": 2156,
            "replies": [{"reply_id": "reply_ai_001a", "author_name": "Jordan Expert", "author_role": "expert", "content": "XGBoost models tend to struggle with high-volatility names like TSLA. Your 71% on calmer tickers is actually quite strong.", "likes_count": 31}],
        },
        {
            "post_id": "post_seed_ps_001", "category": "Portfolio Strategy",
            "title": "Core-satellite strategy for long-term investors",
            "content": "The framework that has worked best for me is the core-satellite approach. Core (70%): broad market ETFs — S&P 500, MSCI World, Singapore dividend ETF. Satellite (30%): high-conviction individual stocks capped at 8% each. The core provides a psychological anchor during corrections. Educational only, not financial advice.",
            "tags": "portfolio,ETF,core-satellite,diversification", "ticker_tags": "MSFT,NVDA",
            "likes_count": 38, "views_count": 1670,
            "replies": [{"reply_id": "reply_ps_001a", "author_name": "Wei Zhang", "author_role": "investor", "content": "I use a similar approach but 60/40 equities/bonds given my risk tolerance.", "likes_count": 9}],
        },
        {
            "post_id": "post_seed_mn_001", "category": "Market News",
            "title": "Fed holds rates — what does this mean for tech stocks?",
            "content": "The Fed just held rates steady for the third consecutive meeting. Short-term impact: rate-sensitive growth stocks benefit from a dovish pause. Medium-term risk: higher-for-longer signals mean easy multiple expansion is less likely to repeat. Semiconductors remain less rate-sensitive due to AI demand.",
            "tags": "Fed,rates,macro,tech", "ticker_tags": "MSFT,GOOGL,NVDA",
            "likes_count": 29, "views_count": 1340, "replies": [],
        },
        {
            "post_id": "post_seed_tt_001", "category": "Trading Tips",
            "title": "Stop-loss strategies that actually work",
            "content": "Three approaches that work: (1) ATR-based stops — set at 2x Average True Range below entry. (2) Structure-based stops — just below nearest support. (3) Time stops — exit if trade hasn't moved in 10 days. Golden rule: decide your stop before you enter, not after. Educational only, not financial advice.",
            "tags": "stop-loss,risk,ATR,trading", "ticker_tags": "",
            "likes_count": 51, "views_count": 2890, "is_pinned": 1,
            "replies": [{"reply_id": "reply_tt_001a", "author_name": "Sarah Chen", "author_role": "investor", "content": "The time stop concept is underrated. Dead money positions are opportunity cost.", "likes_count": 22}],
        },
        {
            "post_id": "post_seed_bc_001", "category": "Beginners Corner",
            "title": "New to investing — what are the most important concepts to learn first?",
            "content": "Hi everyone, I just joined RocketTrade and I am completely new to investing. I can invest about $500 a month with a 20+ year horizon. What are the 5 most important concepts a beginner should understand before starting?",
            "tags": "beginner,learning,basics", "ticker_tags": "",
            "likes_count": 15, "views_count": 890,
            "replies": [
                {"reply_id": "reply_bc_001a", "author_name": "Marcus Rivera", "author_role": "investor", "content": "Start with: (1) compounding, (2) diversification, (3) P/E ratio, (4) dollar-cost averaging, (5) risk tolerance. With 20+ years, time is your biggest advantage.", "likes_count": 33},
                {"reply_id": "reply_bc_001b", "author_name": "Jordan Expert", "author_role": "expert", "content": "At your age and time horizon, low-cost index funds are your best friend. Add individual stocks later once you understand fundamentals.", "likes_count": 27},
            ],
        },
        {
            "post_id": "post_seed_gm_001", "category": "Global Markets",
            "title": "Singapore banks — DBS and UOB dividend play",
            "content": "DBS: trailing dividend yield ~5.8%, NIM has expanded with higher rates. UOB: yield ~5.2% but strong ASEAN expansion via Citibank retail acquisition. Key risk: if the Fed cuts aggressively, Singapore banks will see NIM compression within 2-3 quarters due to SIBOR linkage. Educational only, not financial advice.",
            "tags": "Singapore,banks,dividend,STI", "ticker_tags": "DBS.SI,UOB.SI",
            "likes_count": 23, "views_count": 1120, "replies": [],
        },
        {
            "post_id": "post_seed_cr_001", "category": "Crypto & Digital Assets",
            "title": "Bitcoin halving cycles and what history tells us",
            "content": "Historical post-halving returns: 2012 (+9000%), 2016 (+2980%), 2020 (+712%). Returns diminish each cycle as market cap grows. What matters is the structural supply reduction — miners now receive 3.125 BTC per block. BTC correlation with Nasdaq has increased significantly versus earlier cycles. Educational only, not financial advice.",
            "tags": "bitcoin,halving,crypto,cycles", "ticker_tags": "BTC",
            "likes_count": 36, "views_count": 1980,
            "replies": [{"reply_id": "reply_cr_001a", "author_name": "Wei Zhang", "author_role": "investor", "content": "The Nasdaq correlation is the most important structural change. BTC is no longer uncorrelated from risk assets.", "likes_count": 14}],
        },
        {
            "post_id": "post_seed_rm_001", "category": "Risk Management",
            "title": "How I size my positions — the 2% rule",
            "content": "Never risk more than 2% of your total portfolio on any single trade. With a $10,000 portfolio and a 10% stop-loss, only invest $2,000 in that position. Why it works: you can withstand 50 consecutive losing trades before losing your account. Removes emotion from sizing decisions. Educational only, not financial advice.",
            "tags": "position-sizing,risk,2-percent-rule", "ticker_tags": "",
            "likes_count": 44, "views_count": 2340,
            "replies": [{"reply_id": "reply_rm_001a", "author_name": "Priya Nair", "author_role": "investor", "content": "The 2% rule changed how I trade. Before this I was putting 20-30% into single positions.", "likes_count": 19}],
        },
    ]

    with get_session() as session:
        for data in seed_data:
            replies_data = data.pop("replies", [])
            post = ForumPost(
                post_id=data["post_id"],
                author_name="RocketTrade Community",
                author_role="investor",
                title=data["title"],
                content=data["content"],
                category=data["category"],
                tags=data.get("tags", ""),
                ticker_tags=data.get("ticker_tags", ""),
                likes_count=data.get("likes_count", 0),
                views_count=data.get("views_count", 0),
                is_pinned=data.get("is_pinned", 0),
                is_featured=data.get("is_featured", 0),
                is_closed=data.get("is_closed", 0),
            )
            session.add(post)
            session.flush()
            for r in replies_data:
                if not session.query(ForumReply).filter(
                    ForumReply.reply_id == r["reply_id"]
                ).first():
                    session.add(ForumReply(
                        reply_id=r["reply_id"],
                        post_id=post.post_id,
                        author_name=r["author_name"],
                        author_role=r["author_role"],
                        content=r["content"],
                        likes_count=r.get("likes_count", 0),
                    ))
        session.flush()
        print(f"[FORUM] Seeded {len(seed_data)} posts across {len(FORUM_CATEGORIES)} categories.")


def seed_expert_forum_posts():
    """Seed 2 forum posts each (with comments) for the additional verified
    expert roster (see SEED_EXPERTS in app.entity.models.expert). Unlike the
    older seed_forum_posts() batch, these are wired to the experts' real
    user_id so they show up as genuine posts from verified accounts, not
    decorative author_name strings. Idempotent via fixed post_id/reply_id;
    safe to call every startup."""
    from app.entity.models.expert import get_seed_expert_ids

    experts = get_seed_expert_ids()
    if not experts:
        print("[FORUM] Skipping expert forum seed — no seed experts found yet")
        return

    def eid(username):
        info = experts.get(username)
        return info["user_id"] if info else None

    POSTS_BY_EXPERT = {
        "elena_vasquez": [
            {
                "post_id": "post_seed_elena_01", "category": "Fundamental Analysis",
                "title": "Screening for quality: the three ratios I check before anything else",
                "content": "Before I even look at price, I run three checks: current ratio for short-term solvency, debt-to-equity for how much of the business is financed by borrowing, and goodwill as a share of total assets to see if growth has come mostly from acquisitions. None of these tell you whether a stock is cheap — they just tell you whether the business is standing on solid ground. Educational only, not financial advice.",
                "tags": "fundamentals,screening,ratios", "ticker_tags": "",
                "likes_count": 18, "views_count": 640,
                "replies": [
                    {"reply_id": "reply_elena_01a", "user": "marcus_chen", "content": "I check these too before ever pulling up a chart. A great setup on a balance sheet that's falling apart is still a trap.", "likes_count": 9},
                    {"reply_id": "reply_elena_01b", "author_name": "Hannah Wu", "author_role": "investor", "content": "The goodwill check is the one I always skip. Adding it to my process now.", "likes_count": 5},
                ],
            },
            {
                "post_id": "post_seed_elena_02", "category": "Fundamental Analysis",
                "title": "Why I don't chase 52-week lows without a fundamentals check first",
                "content": "A stock near its 52-week low can be a bargain or a business genuinely deteriorating — the chart alone can't tell you which. Before I get interested, I want to see whether the decline was driven by a single overreacted event or by actual, worsening fundamentals: shrinking margins, rising debt, falling revenue over multiple quarters. Cheap and broken are not the same as cheap and temporarily out of favor. Educational only, not financial advice.",
                "tags": "value-investing,fundamentals,mean-reversion", "ticker_tags": "",
                "likes_count": 22, "views_count": 910,
                "replies": [
                    {"reply_id": "reply_elena_02a", "author_name": "Tom Bakker", "author_role": "investor", "content": "This is exactly why I got burned twice buying 'cheap' stocks that just kept getting cheaper.", "likes_count": 11},
                ],
            },
        ],
        "marcus_chen": [
            {
                "post_id": "post_seed_marcus_01", "category": "Technical Analysis",
                "title": "Volume-confirmed breakouts: the filter that cuts my false signals in half",
                "content": "A breakout above resistance on below-average volume fails far more often than it follows through. My rule: I only treat a breakout as valid if volume on the breakout candle is at least 1.5x the 20-day average. It won't catch every real move, but it filters out a huge share of the traps that reverse within a day or two. Educational only, not financial advice.",
                "tags": "breakout,volume,technical", "ticker_tags": "",
                "likes_count": 27, "views_count": 1180, "is_pinned": 1,
                "replies": [
                    {"reply_id": "reply_marcus_01a", "author_name": "Wei Zhang", "author_role": "investor", "content": "1.5x is a good threshold. I've been using 2x and missing some valid setups.", "likes_count": 8},
                    {"reply_id": "reply_marcus_01b", "user": "priya_sharma", "content": "Pairs well with checking IV too — low volume breakouts often coincide with compressed volatility right before an expansion.", "likes_count": 6},
                ],
            },
            {
                "post_id": "post_seed_marcus_02", "category": "Technical Analysis",
                "title": "Reading a weekly chart before you ever open a daily chart",
                "content": "I see a lot of beginners jump straight into a 5-minute or daily chart and lose the plot on where price actually sits in the bigger picture. My process: always start on the weekly chart to identify the dominant trend and major support/resistance zones, then zoom into daily and intraday only to time entries within that context. A great daily setup against the weekly trend is a much weaker trade than the same setup with the weekly trend.",
                "tags": "timeframes,trend,technical", "ticker_tags": "",
                "likes_count": 31, "views_count": 1450,
                "replies": [
                    {"reply_id": "reply_marcus_02a", "author_name": "Sarah Chen", "author_role": "investor", "content": "This changed how I trade. I was fighting the weekly trend constantly without realizing it.", "likes_count": 14},
                ],
            },
        ],
        "priya_sharma": [
            {
                "post_id": "post_seed_priya_01", "category": "Risk Management",
                "title": "The options mistake I see beginners make most: selling naked calls too early",
                "content": "Selling a call without owning the underlying stock (a 'naked' call) has theoretically unlimited risk, since there's no ceiling on how high a stock can rise. I regularly see newer traders sell naked calls for a small premium without appreciating that a single bad move can wipe out weeks of gains from smaller, safer trades. If you want to sell calls for income, start covered — own the shares first. Educational only, not financial advice.",
                "tags": "options,risk,naked-calls", "ticker_tags": "",
                "likes_count": 24, "views_count": 990,
                "replies": [
                    {"reply_id": "reply_priya_01a", "author_name": "Marcus Rivera", "author_role": "investor", "content": "Learned this one the hard way on a small position. Not a mistake I'll repeat.", "likes_count": 10},
                ],
            },
            {
                "post_id": "post_seed_priya_02", "category": "Risk Management",
                "title": "How I size hedges relative to portfolio delta",
                "content": "Instead of hedging a fixed dollar amount, I size protective puts based on my portfolio's total delta exposure — effectively, how much my whole book moves for a 1% move in the market. This keeps the hedge proportional as the portfolio grows or shrinks, rather than under- or over-hedging after a big rally or drawdown changes my actual exposure. Educational only, not financial advice.",
                "tags": "hedging,options,delta,risk-management", "ticker_tags": "",
                "likes_count": 19, "views_count": 760,
                "replies": [
                    {"reply_id": "reply_priya_02a", "user": "david_okafor", "content": "Worth layering in a macro view here too — I widen hedges heading into major central bank decisions regardless of what delta says.", "likes_count": 7},
                ],
            },
        ],
        "david_okafor": [
            {
                "post_id": "post_seed_david_01", "category": "Global Markets",
                "title": "Why I'm watching real yields, not headline rates, right now",
                "content": "Headline interest rates get all the attention, but real yields — rates minus inflation expectations — are what actually drive capital flows and asset valuations. A high headline rate with even higher inflation is still an accommodative real rate. Right now the gap between the two is telling a more interesting story than either number on its own. Educational only, not financial advice.",
                "tags": "macro,real-yields,rates", "ticker_tags": "",
                "likes_count": 21, "views_count": 880,
                "replies": [
                    {"reply_id": "reply_david_01a", "author_name": "Priya Nair", "author_role": "investor", "content": "Never thought to separate these two. Makes the recent rally in gold make a lot more sense.", "likes_count": 9},
                ],
            },
            {
                "post_id": "post_seed_david_02", "category": "Global Markets",
                "title": "A framework for currency-hedging international ETF exposure",
                "content": "Unhedged international ETFs carry a hidden second bet on currency that most investors never actively decide to make. My rule of thumb: hedge currency exposure when I'm investing in international bonds (where currency swings can dwarf the yield), and leave equity exposure unhedged for long holding periods, since currency effects tend to average out over many years while hedging costs compound. Educational only, not financial advice.",
                "tags": "currency,hedging,international,macro", "ticker_tags": "",
                "likes_count": 16, "views_count": 610,
                "replies": [],
            },
        ],
        "sofia_martins": [
            {
                "post_id": "post_seed_sofia_01", "category": "Crypto & Digital Assets",
                "title": "Stablecoin de-pegs: what actually happened in past cases and what to watch",
                "content": "Most stablecoin de-peg events share a common pattern: a loss of confidence triggers redemptions faster than reserves can be verified or liquidated, and the peg breaks under the panic rather than because the backing itself was instantly worthless. Before holding a large stablecoin position, I check three things: reserve composition and audit frequency, redemption mechanism speed, and how the peg has historically behaved during broad market stress, not just calm periods. Educational only, not financial advice.",
                "tags": "stablecoins,crypto,risk", "ticker_tags": "",
                "likes_count": 20, "views_count": 870,
                "replies": [
                    {"reply_id": "reply_sofia_01a", "author_name": "Wei Zhang", "author_role": "investor", "content": "The redemption mechanism speed point is underrated. That's usually where the actual panic starts.", "likes_count": 8},
                ],
            },
            {
                "post_id": "post_seed_sofia_02", "category": "Crypto & Digital Assets",
                "title": "Why I treat on-chain data as confirmation, not a signal on its own",
                "content": "Active addresses, exchange flows, and holder concentration are genuinely useful, but I've learned not to trade off them directly — they're noisy and can be skewed by a handful of large wallets moving funds between their own addresses. I use on-chain data to confirm or question what price and volume are already telling me, not as a standalone entry trigger. Educational only, not financial advice.",
                "tags": "crypto,on-chain,strategy", "ticker_tags": "",
                "likes_count": 17, "views_count": 720,
                "replies": [
                    {"reply_id": "reply_sofia_02a", "user": "elena_vasquez", "content": "Same principle I apply to fundamentals versus price — data confirms a thesis, it rarely creates one on its own.", "likes_count": 6},
                ],
            },
        ],
    }

    added_posts = 0
    added_replies = 0
    with get_session() as session:
        for username, posts in POSTS_BY_EXPERT.items():
            info = experts.get(username)
            if not info:
                continue
            for data in posts:
                if session.query(ForumPost).filter(
                    ForumPost.post_id == data["post_id"]
                ).first():
                    continue
                post = ForumPost(
                    post_id=data["post_id"],
                    user_id=info["user_id"],
                    author_name=info["full_name"],
                    author_role="expert",
                    title=data["title"],
                    content=data["content"],
                    category=data["category"],
                    tags=data.get("tags", ""),
                    ticker_tags=data.get("ticker_tags", ""),
                    likes_count=data.get("likes_count", 0),
                    views_count=data.get("views_count", 0),
                    is_pinned=data.get("is_pinned", 0),
                    is_featured=data.get("is_featured", 0),
                    is_closed=data.get("is_closed", 0),
                )
                session.add(post)
                session.flush()
                added_posts += 1
                for r in data.get("replies", []):
                    if session.query(ForumReply).filter(
                        ForumReply.reply_id == r["reply_id"]
                    ).first():
                        continue
                    reply_user = r.get("user")
                    if reply_user:
                        reply_info = experts.get(reply_user)
                        reply_user_id = reply_info["user_id"] if reply_info else None
                        reply_author_name = reply_info["full_name"] if reply_info else "Expert"
                        reply_author_role = "expert"
                    else:
                        reply_user_id = None
                        reply_author_name = r["author_name"]
                        reply_author_role = r.get("author_role", "investor")
                    session.add(ForumReply(
                        reply_id=r["reply_id"],
                        post_id=post.post_id,
                        user_id=reply_user_id,
                        author_name=reply_author_name,
                        author_role=reply_author_role,
                        content=r["content"],
                        likes_count=r.get("likes_count", 0),
                    ))
                    added_replies += 1
        session.flush()

    print(f"[FORUM] Added {added_posts} expert forum posts with {added_replies} comments")


def ensure_forum_schema(engine):
    """
    Safely add new forum columns to existing tables without dropping data.
    Uses information_schema — compatible with ALL MySQL versions.
    """
    from sqlalchemy import text

    def col_exists(conn, table, col):
        r = conn.execute(text(
            "SELECT COUNT(*) FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :t AND COLUMN_NAME = :c"
        ), {"t": table, "c": col})
        return r.scalar() > 0

    with engine.connect() as conn:
        patches = [
            ("forum_post",  "is_featured", "ALTER TABLE forum_post ADD COLUMN is_featured INTEGER DEFAULT 0"),
            ("forum_post",  "is_closed",   "ALTER TABLE forum_post ADD COLUMN is_closed INTEGER DEFAULT 0"),
            ("forum_post",  "ticker_tags", "ALTER TABLE forum_post ADD COLUMN ticker_tags VARCHAR(255) DEFAULT ''"),
            ("forum_reply", "is_edited",   "ALTER TABLE forum_reply ADD COLUMN is_edited INTEGER DEFAULT 0"),
            ("forum_reply", "updated_at",  "ALTER TABLE forum_reply ADD COLUMN updated_at DATETIME NULL"),
        ]
        for table, col, stmt in patches:
            try:
                if not col_exists(conn, table, col):
                    conn.execute(text(stmt))
                    print(f"[FORUM SCHEMA] Added {table}.{col}")
            except Exception as e:
                print(f"[FORUM SCHEMA] Skipped {table}.{col}: {e}")
        conn.commit()
        print("[FORUM SCHEMA] Schema check complete.")



class ForumRepository:

    @staticmethod
    def seed_posts():
        """Legacy alias — calls seed_forum_posts()."""
        seed_forum_posts()
        return True

    @staticmethod
    def list_posts(user_id=None, category=None, search=None, sort="latest",
                   ticker=None, page=1, page_size=20):
        with get_session() as session:
            q = session.query(ForumPost).filter(ForumPost.category != STOCK_COMMENT_CATEGORY)
            if category and category.lower() not in ("all", ""):
                q = q.filter(ForumPost.category == category)
            if ticker:
                q = q.filter(ForumPost.ticker_tags.ilike(f"%{ticker.upper()}%"))
            if search:
                like = f"%{search}%"
                q = q.filter(
                    (ForumPost.title.ilike(like)) |
                    (ForumPost.content.ilike(like)) |
                    (ForumPost.author_name.ilike(like)) |
                    (ForumPost.ticker_tags.ilike(like))
                )
            if sort == "popular":
                q = q.order_by(ForumPost.likes_count.desc(), ForumPost.views_count.desc())
            elif sort == "most_viewed":
                q = q.order_by(ForumPost.views_count.desc())
            else:
                q = q.order_by(ForumPost.is_pinned.desc(), ForumPost.updated_at.desc())

            total = q.count()
            posts = q.offset((page - 1) * page_size).limit(page_size).all()
            return {
                "posts":       [_serialise_post(session, p, user_id=user_id, include_replies=False) for p in posts],
                "total":       total,
                "page":        page,
                "page_size":   page_size,
                "total_pages": max(1, -(-total // page_size)),
            }

    @staticmethod
    def list_stock_comments(symbol, user_id=None, viewer_is_privileged=False, page=1, page_size=50):
        with get_session() as session:
            q = session.query(ForumPost).filter(
                ForumPost.category == STOCK_COMMENT_CATEGORY,
                ForumPost.ticker_tags.ilike(f"%{symbol.upper()}%"),
            ).order_by(ForumPost.is_pinned.desc(), ForumPost.updated_at.desc())
            total = q.count()
            posts = q.offset((page - 1) * page_size).limit(page_size).all()
            return {
                "posts": [
                    _serialise_post(session, p, user_id=user_id, include_replies=True,
                                     viewer_is_privileged=viewer_is_privileged)
                    for p in posts
                ],
                "total":       total,
                "page":        page,
                "page_size":   page_size,
                "total_pages": max(1, -(-total // page_size)),
                "gated":       not viewer_is_privileged,
            }

    @staticmethod
    def get_post(post_id, user_id=None, viewer_is_privileged=True):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            if user_id:
                existing_view = session.query(ForumPostView).filter(
                    ForumPostView.post_id == post_id,
                    ForumPostView.user_id == user_id,
                ).first()
                if not existing_view:
                    session.add(ForumPostView(post_id=post_id, user_id=user_id))
                    post.views_count = int(post.views_count or 0) + 1
                    session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True,
                                    viewer_is_privileged=viewer_is_privileged)

    @staticmethod
    def create_post(user_id, title, content, category=None, tags=None, ticker_tags=None):
        with get_session() as session:
            author_name, author_role = _resolve_user_name(session, user_id)
            post = ForumPost(
                post_id=f"post_{uuid4()}",
                user_id=user_id,
                author_name=author_name,
                author_role=author_role,
                title=title,
                content=content,
                category=_validate_category(category),
                tags=",".join(tags or []),
                ticker_tags=",".join([t.upper() for t in (ticker_tags or [])]),
            )
            session.add(post)
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def create_stock_comment(user_id, symbol, content):
        """Create an expert comment scoped to a single stock symbol. Bypasses
        _validate_category on purpose -- STOCK_COMMENT_CATEGORY is never in
        FORUM_CATEGORIES so it can only be set through this path."""
        content = str(content or "").strip()
        symbol = str(symbol or "").strip().upper()
        if not content or not symbol:
            return None
        with get_session() as session:
            author_name, author_role = _resolve_user_name(session, user_id)
            title = content[:70] or f"{symbol} discussion"
            post = ForumPost(
                post_id=f"post_{uuid4()}",
                user_id=user_id,
                author_name=author_name,
                author_role=author_role,
                title=title,
                content=content,
                category=STOCK_COMMENT_CATEGORY,
                tags="",
                ticker_tags=symbol,
            )
            session.add(post)
            session.flush()
            # Author always sees their own freshly-posted comment in full.
            return _serialise_post(session, post, user_id=user_id, include_replies=True,
                                    viewer_is_privileged=True)

    @staticmethod
    def update_post(post_id, user_id, title=None, content=None,
                    category=None, tags=None, ticker_tags=None):
        """Edit a post — only the original author can do this."""
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            uid = str(user_id or "").strip()
            if uid and post.user_id and str(post.user_id).strip() != uid:
                return None
            if not post.user_id:
                return None
            if title and str(title).strip():
                post.title = str(title).strip()
            if content and str(content).strip():
                post.content = str(content).strip()
            if category and category in FORUM_CATEGORIES:
                post.category = category
            if tags is not None:
                post.tags = ",".join([str(t).strip() for t in tags if str(t).strip()])
            if ticker_tags is not None:
                post.ticker_tags = ",".join([str(t).strip().upper() for t in ticker_tags if str(t).strip()])
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def add_reply(post_id, user_id, content, actor_is_privileged=True):
        if not content or not str(content).strip():
            return None
        # Step 1: write the reply in its own session so it fully commits to DB
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            if post.is_closed:
                return None
            if not _forum_action_allowed(post, actor_is_privileged):
                return None
            author_name, author_role = _resolve_user_name(session, user_id)
            reply = ForumReply(
                reply_id=f"reply_{uuid4()}",
                post_id=post_id,
                user_id=user_id,
                author_name=author_name,
                author_role=author_role,
                content=str(content).strip(),
            )
            post.updated_at = _now()
            session.add(reply)
            # session.commit() runs automatically via get_session() on exit
        # Step 2: fresh session to read fully committed data including the new reply
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def toggle_like(post_id, user_id, actor_is_privileged=True):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            if not _forum_action_allowed(post, actor_is_privileged):
                return None
            existing = session.query(ForumPostLike).filter(
                ForumPostLike.post_id == post_id, ForumPostLike.user_id == user_id
            ).first()
            if existing:
                session.delete(existing)
                post.likes_count = max(0, int(post.likes_count or 0) - 1)
            else:
                session.add(ForumPostLike(like_id=f"like_{uuid4()}", post_id=post_id, user_id=user_id))
                post.likes_count = int(post.likes_count or 0) + 1
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def toggle_reply_like(reply_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            reply = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            existing = session.query(ForumReplyLike).filter(
                ForumReplyLike.reply_id == reply_id, ForumReplyLike.user_id == user_id
            ).first()
            if existing:
                session.delete(existing)
                reply.likes_count = max(0, int(reply.likes_count or 0) - 1)
            else:
                session.add(ForumReplyLike(reply_id=reply_id, user_id=user_id))
                reply.likes_count = int(reply.likes_count or 0) + 1
            session.flush()
            post = session.query(ForumPost).filter(ForumPost.post_id == reply.post_id).first()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def toggle_save(post_id, user_id, actor_is_privileged=True):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            if not _forum_action_allowed(post, actor_is_privileged):
                return None
            existing = session.query(ForumPostSave).filter(
                ForumPostSave.post_id == post_id, ForumPostSave.user_id == user_id
            ).first()
            if existing:
                session.delete(existing)
            else:
                session.add(ForumPostSave(save_id=f"save_{uuid4()}", post_id=post_id, user_id=user_id))
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def delete_post(post_id, user_id=None, is_admin=False):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return False
            uid = str(user_id or "").strip()
            if not is_admin and (not uid or not post.user_id or str(post.user_id).strip() != uid):
                return False
            reply_ids = [r.reply_id for r in session.query(ForumReply).filter(ForumReply.post_id == post_id).all()]
            if reply_ids:
                session.query(ForumReplyLike).filter(ForumReplyLike.reply_id.in_(reply_ids)).delete(synchronize_session=False)
                session.query(ForumReplyFlag).filter(ForumReplyFlag.reply_id.in_(reply_ids)).delete(synchronize_session=False)
            session.query(ForumReply).filter(ForumReply.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostLike).filter(ForumPostLike.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostSave).filter(ForumPostSave.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostView).filter(ForumPostView.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostFlag).filter(ForumPostFlag.post_id == post_id).delete(synchronize_session=False)
            session.delete(post)
            session.flush()
            return True

    @staticmethod
    def update_reply(post_id, reply_id, user_id=None, content=""):
        if not content or not str(content).strip():
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            reply = session.query(ForumReply).filter(
                ForumReply.post_id == post_id, ForumReply.reply_id == reply_id
            ).first()
            if not reply or not _can_modify_reply(session, reply, user_id):
                return None
            reply.content = str(content).strip()
            reply.is_edited = 1
            if not reply.user_id and user_id:
                reply.user_id = user_id
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def delete_reply(post_id, reply_id, user_id=None, is_admin=False):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            reply = session.query(ForumReply).filter(
                ForumReply.post_id == post_id, ForumReply.reply_id == reply_id
            ).first()
            if not reply or (not is_admin and not _can_modify_reply(session, reply, user_id)):
                return None
            session.query(ForumReplyLike).filter(
                ForumReplyLike.reply_id == reply_id
            ).delete(synchronize_session=False)
            session.query(ForumReplyFlag).filter(
                ForumReplyFlag.reply_id == reply_id
            ).delete(synchronize_session=False)
            session.delete(reply)
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def pin_post(post_id, pin=True):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            post.is_pinned = 1 if pin else 0
            session.flush()
            return _serialise_post(session, post, include_replies=False)

    @staticmethod
    def feature_post(post_id, feature=True):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            post.is_featured = 1 if feature else 0
            session.flush()
            return _serialise_post(session, post, include_replies=False)

    @staticmethod
    def close_post(post_id, close=True):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            post.is_closed = 1 if close else 0
            session.flush()
            return _serialise_post(session, post, include_replies=False)

    @staticmethod
    def get_saved_posts(user_id):
        with get_session() as session:
            saves = session.query(ForumPostSave).filter(ForumPostSave.user_id == user_id).all()
            post_ids = [s.post_id for s in saves]
            posts = session.query(ForumPost).filter(ForumPost.post_id.in_(post_ids)).all()
            return [_serialise_post(session, p, user_id=user_id, include_replies=False) for p in posts]

    @staticmethod
    def get_trending_posts(limit=5):
        cutoff = _now() - timedelta(days=7)
        with get_session() as session:
            posts = session.query(ForumPost).filter(
                ForumPost.created_at >= cutoff
            ).order_by(
                (ForumPost.likes_count + ForumPost.views_count).desc()
            ).limit(limit).all()
            if not posts:
                posts = session.query(ForumPost).order_by(
                    (ForumPost.likes_count + ForumPost.views_count).desc()
                ).limit(limit).all()
            return [_serialise_post(session, p, include_replies=False) for p in posts]

    @staticmethod
    def get_posts_by_ticker(ticker, user_id=None, limit=10):
        with get_session() as session:
            posts = session.query(ForumPost).filter(
                ForumPost.ticker_tags.ilike(f"%{ticker.upper()}%")
            ).order_by(ForumPost.updated_at.desc()).limit(limit).all()
            return [_serialise_post(session, p, user_id=user_id, include_replies=False) for p in posts]

    @staticmethod
    def get_category_stats():
        with get_session() as session:
            return {cat: session.query(ForumPost).filter(ForumPost.category == cat).count() for cat in FORUM_CATEGORIES}

    @staticmethod
    def get_forum_stats():
        with get_session() as session:
            return {
                "total_posts":   session.query(ForumPost).count(),
                "total_replies": session.query(ForumReply).count(),
                "total_likes":   session.query(ForumPostLike).count(),
                "total_saves":   session.query(ForumPostSave).count(),
            }

    # ── Flagging ─────────────────────────────────────────────────────────────

    @staticmethod
    def flag_post(post_id, user_id, reason):
        """Toggle flag — if already flagged by this user, remove it."""
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            existing = session.query(ForumPostFlag).filter(
                ForumPostFlag.post_id == post_id,
                ForumPostFlag.user_id == user_id,
            ).first()
            if existing:
                session.delete(existing)
                session.flush()
                return {"unflagged": True, "post_id": post_id}
            session.add(ForumPostFlag(
                post_id=post_id,
                user_id=user_id,
                reason=reason or "Inappropriate content",
            ))
            session.flush()
            return {"flagged": True, "post_id": post_id, "reason": reason}

    @staticmethod
    def flag_reply(reply_id, user_id, reason):
        """Toggle a report on a forum comment."""
        if not user_id:
            return None
        with get_session() as session:
            reply = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            existing = session.query(ForumReplyFlag).filter(
                ForumReplyFlag.reply_id == reply_id,
                ForumReplyFlag.user_id == str(user_id),
            ).first()
            if existing:
                session.delete(existing)
                session.flush()
                return {"unflagged": True, "reply_id": reply_id}
            session.add(ForumReplyFlag(
                reply_id=reply_id, user_id=str(user_id),
                reason=reason or "Inappropriate content",
            ))
            session.flush()
            return {"flagged": True, "reply_id": reply_id, "reason": reason}


    @staticmethod
    def create_removal_record(user_id, post_title, reason):
        """Log a post removal so the author can see why their post was taken down."""
        with get_session() as session:
            record = ForumPostRemoval(
                user_id=user_id,
                post_title=post_title,
                reason=reason,
            )
            session.add(record)
            session.flush()
            return record.id

    @staticmethod
    def get_unacknowledged_removal(user_id):
        with get_session() as session:
            record = session.query(ForumPostRemoval).filter(
                ForumPostRemoval.user_id == user_id,
                ForumPostRemoval.acknowledged == False,
            ).order_by(ForumPostRemoval.removed_at.desc()).first()
            if not record:
                return None
            return {
                "id": record.id,
                "post_title": record.post_title,
                "reason": record.reason,
                "removed_at": _safe_dt(record.removed_at),
            }

    @staticmethod
    def acknowledge_removal(removal_id, user_id):
        """Mark a removal notice as seen/dismissed by the user."""
        with get_session() as session:
            record = session.query(ForumPostRemoval).filter(
                ForumPostRemoval.id == removal_id,
                ForumPostRemoval.user_id == user_id,
            ).first()
            if not record:
                return False
            record.acknowledged = True
            return True

    @staticmethod
    def get_post_owner_info(post_id):
        """Return {user_id, title} before deletion — used to notify the author."""
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            return {"user_id": post.user_id, "title": post.title}

    @staticmethod
    def admin_list_posts():
        with get_session() as session:
            posts = session.query(ForumPost).order_by(ForumPost.created_at.desc()).all()
            return [_serialise_post(session, p, include_replies=False) for p in posts]

    @staticmethod
    def admin_flagged_posts():
        """Posts that have been flagged by at least one user, with flag details."""
        with get_session() as session:
            flags = session.query(ForumPostFlag).order_by(ForumPostFlag.created_at.desc()).all()
            by_post = {}
            for flag in flags:
                if flag.post_id not in by_post:
                    by_post[flag.post_id] = []
                by_post[flag.post_id].append({
                    "user_id": flag.user_id,
                    "reason":  flag.reason,
                    "flagged_at": _safe_dt(flag.created_at),
                })
            result = []
            for post_id, flag_list in by_post.items():
                post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
                if post:
                    data = _serialise_post(session, post, include_replies=False)
                    data["flags"] = flag_list
                    data["flag_count"] = len(flag_list)
                    result.append(data)
            result.sort(key=lambda p: p["flag_count"], reverse=True)
            return result

    @staticmethod
    def admin_flagged_replies():
        with get_session() as session:
            flags = session.query(ForumReplyFlag).order_by(ForumReplyFlag.created_at.desc()).all()
            by_reply = {}
            for flag in flags:
                by_reply.setdefault(flag.reply_id, []).append({
                    "user_id": flag.user_id, "reason": flag.reason,
                    "flagged_at": _safe_dt(flag.created_at),
                })
            result = []
            for reply_id, flag_list in by_reply.items():
                reply = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first()
                if not reply:
                    continue
                post = session.query(ForumPost).filter(ForumPost.post_id == reply.post_id).first()
                data = _serialise_reply(reply, session=session)
                data.update({
                    "type": "comment",
                    "post_id": reply.post_id,
                    "post_title": post.title if post else "Deleted post",
                    "title": post.title if post else "Deleted post",
                    "flags": flag_list,
                    "flag_count": len(flag_list),
                })
                result.append(data)
            result.sort(key=lambda item: item["flag_count"], reverse=True)
            return result

    @staticmethod
    def clear_reply_flags(reply_id):
        with get_session() as session:
            exists = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first() is not None
            if not exists:
                return None
            cleared = session.query(ForumReplyFlag).filter(
                ForumReplyFlag.reply_id == reply_id
            ).delete(synchronize_session=False)
            return int(cleared or 0)

    @staticmethod
    def get_reply_owner_info(reply_id):
        with get_session() as session:
            reply = session.query(ForumReply).filter(ForumReply.reply_id == reply_id).first()
            if not reply:
                return None
            post = session.query(ForumPost).filter(ForumPost.post_id == reply.post_id).first()
            return {
                "user_id": reply.user_id, "content": reply.content,
                "post_id": reply.post_id, "post_title": post.title if post else "",
            }

    @staticmethod
    def clear_post_flags(post_id):
        """Dismiss every report for a post without deleting the post itself."""
        with get_session() as session:
            post_exists = session.query(ForumPost).filter(
                ForumPost.post_id == post_id
            ).first() is not None
            if not post_exists:
                return None
            cleared = session.query(ForumPostFlag).filter(
                ForumPostFlag.post_id == post_id
            ).delete(synchronize_session=False)
            return int(cleared or 0)
