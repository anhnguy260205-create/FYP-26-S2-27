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


# ── Forum categories ──────────────────────────────────────────────────────────
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


# ── Models ────────────────────────────────────────────────────────────────────

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

    # lazy="select" — replies are only queried when a post is actually opened,
    # not on every list_posts() call (huge performance win for the forum feed).
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


class ForumPostRemoval(Base):
    """
    Records an admin-removed post so the original author can still see why
    their post was taken down, even after the ForumPost row itself is deleted.
    Kept separate from ForumPost (no FK to it) since the post no longer exists
    by the time this is queried.
    """
    __tablename__ = "forum_post_removal"

    id           = Column(String(50), primary_key=True, default=lambda: f"pr_{uuid4()}")
    user_id      = Column(String(50), nullable=False)  # original post author
    post_title   = Column(String(200), nullable=True)
    reason       = Column(String(300), nullable=False)
    removed_at   = Column(DateTime, default=_now)
    acknowledged = Column(Boolean, default=False)  # user has seen/dismissed the notice


# ── Helpers ───────────────────────────────────────────────────────────────────

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
        "is_edited":   bool(reply.is_edited),
        "created_at":  _safe_dt(reply.created_at),
        "time":        _safe_dt(reply.created_at),
    }


def _serialise_post(session, post, user_id=None, include_replies=True):
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
    return {
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
    }



# ── Seed data ─────────────────────────────────────────────────────────────────

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


# ── Repository ────────────────────────────────────────────────────────────────

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
            q = session.query(ForumPost)
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
    def get_post(post_id, user_id=None):
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
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

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
    def add_reply(post_id, user_id, content):
        if not content or not str(content).strip():
            return None
        # Step 1: write the reply in its own session so it fully commits to DB
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            if post.is_closed:
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
    def toggle_like(post_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
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
    def toggle_save(post_id, user_id):
        if not user_id:
            return None
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
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

    # ── Admin moderation ────────────────────────────────────────────────────

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
        """Return the user's most recent un-dismissed removal notice, if any."""
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
        """All posts, newest first — for the admin moderation queue."""
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
