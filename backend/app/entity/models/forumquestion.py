from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, inspect, text
from sqlalchemy.orm import relationship

from app.entity.database.base import Base
from app.entity.database.session import get_session
from app.entity.models.expert import Expert
from app.entity.models.useraccount import UserAccount

try:
    from zoneinfo import ZoneInfo
    def _now():
        return datetime.now(ZoneInfo("Asia/Singapore"))
except Exception:
    def _now():
        return datetime.now()


# ── Forum categories — no "General" ──────────────────────────────────────────
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

DEFAULT_CATEGORY = "Technical Analysis"


# ── Models ────────────────────────────────────────────────────────────────────

class ForumPost(Base):
    __tablename__ = "forum_post"

    post_id      = Column(String(50), primary_key=True, default=lambda: f"post_{uuid4()}")
    user_id      = Column(String(50), nullable=True)
    author_name  = Column(String(100), default="RocketTrade User")
    author_role  = Column(String(30), default="investor")
    title        = Column(String(180), nullable=False)
    content      = Column(Text, nullable=False)
    category     = Column(String(80), default=DEFAULT_CATEGORY)
    tags         = Column(String(255), default="")
    ticker_tags  = Column(String(255), default="")
    likes_count  = Column(Integer, default=0)
    views_count  = Column(Integer, default=0)
    is_pinned    = Column(Integer, default=0)
    is_featured  = Column(Integer, default=0)
    is_closed    = Column(Integer, default=0)
    created_at   = Column(DateTime, default=_now)
    updated_at   = Column(DateTime, default=_now, onupdate=_now)

    replies      = relationship("ForumReply", cascade="all, delete-orphan", back_populates="post", lazy="joined")


class ForumReply(Base):
    __tablename__ = "forum_reply"

    reply_id     = Column(String(50), primary_key=True, default=lambda: f"reply_{uuid4()}")
    post_id      = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id      = Column(String(50), nullable=True)
    author_name  = Column(String(100), default="RocketTrade User")
    author_role  = Column(String(30), default="investor")
    content      = Column(Text, nullable=False)
    likes_count  = Column(Integer, default=0)
    is_edited    = Column(Integer, default=0)
    created_at   = Column(DateTime, default=_now)
    updated_at   = Column(DateTime, default=_now, onupdate=_now)

    post         = relationship("ForumPost", back_populates="replies")
    reply_likes  = relationship("ForumReplyLike", cascade="all, delete-orphan", lazy="dynamic")


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
    __tablename__ = "forum_reply_like"
    __table_args__ = (UniqueConstraint("reply_id", "user_id", name="uq_forum_reply_like"),)

    like_id    = Column(String(50), primary_key=True, default=lambda: f"rlike_{uuid4()}")
    reply_id   = Column(String(50), ForeignKey("forum_reply.reply_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ForumPostView(Base):
    __tablename__ = "forum_post_view"
    __table_args__ = (UniqueConstraint("post_id", "user_id", name="uq_forum_post_view"),)

    view_id    = Column(String(50), primary_key=True, default=lambda: f"view_{uuid4()}")
    post_id    = Column(String(50), ForeignKey("forum_post.post_id"), nullable=False)
    user_id    = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=_now)


class ExpertQuestion(Base):
    __tablename__ = "expert_question"

    question_id      = Column(String(50), primary_key=True, default=lambda: f"question_{uuid4()}")
    expert_id        = Column(String(50), ForeignKey("expert.expert_id"), nullable=True)
    investor_name    = Column(String(100), default="Premium Investor")
    investor_email   = Column(String(140), nullable=True)
    title            = Column(String(180), nullable=False)
    question_type    = Column(String(80), default="Portfolio Review")
    tickers          = Column(String(180), default="")
    urgency          = Column(String(30), default="Medium")
    status           = Column(String(30), default="Pending")
    investment_goal  = Column(String(180), default="Long-term growth")
    risk_profile     = Column(String(80), default="Moderate")
    portfolio_value  = Column(Float, default=0.0)
    content          = Column(Text, nullable=False)
    reply_text       = Column(Text, nullable=True)
    submitted_at     = Column(DateTime, default=_now)
    answered_at      = Column(DateTime, nullable=True)


# ── Lightweight schema compatibility for existing local MySQL DBs ─────────────
def ensure_forum_schema(engine):
    """
    SQLAlchemy create_all() creates missing tables, but it does not add new columns
    to tables that already exist. This keeps the local dev database compatible when
    forum features add columns such as ticker_tags, is_featured, is_closed, etc.
    """
    inspector = inspect(engine)
    table_names = set(inspector.get_table_names())
    statements = []

    def existing_columns(table_name):
        if table_name not in table_names:
            return set()
        return {col["name"] for col in inspector.get_columns(table_name)}

    def add_missing_columns(table_name, column_sql_map):
        current = existing_columns(table_name)
        if not current:
            return
        for column_name, sql_definition in column_sql_map.items():
            if column_name not in current:
                statements.append(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {sql_definition}")

    add_missing_columns("forum_post", {
        "user_id": "VARCHAR(50) NULL",
        "author_name": "VARCHAR(100) DEFAULT 'RocketTrade User'",
        "author_role": "VARCHAR(30) DEFAULT 'investor'",
        "title": "VARCHAR(180) NULL",
        "content": "TEXT NULL",
        "category": "VARCHAR(80) DEFAULT 'Technical Analysis'",
        "tags": "VARCHAR(255) DEFAULT ''",
        "ticker_tags": "VARCHAR(255) DEFAULT ''",
        "likes_count": "INT DEFAULT 0",
        "views_count": "INT DEFAULT 0",
        "is_pinned": "INT DEFAULT 0",
        "is_featured": "INT DEFAULT 0",
        "is_closed": "INT DEFAULT 0",
        "created_at": "DATETIME NULL",
        "updated_at": "DATETIME NULL",
    })

    add_missing_columns("forum_reply", {
        "post_id": "VARCHAR(50) NULL",
        "user_id": "VARCHAR(50) NULL",
        "author_name": "VARCHAR(100) DEFAULT 'RocketTrade User'",
        "author_role": "VARCHAR(30) DEFAULT 'investor'",
        "content": "TEXT NULL",
        "likes_count": "INT DEFAULT 0",
        "is_edited": "INT DEFAULT 0",
        "created_at": "DATETIME NULL",
        "updated_at": "DATETIME NULL",
    })

    add_missing_columns("expert_question", {
        "expert_id": "VARCHAR(50) NULL",
        "investor_name": "VARCHAR(100) DEFAULT 'Premium Investor'",
        "investor_email": "VARCHAR(140) NULL",
        "title": "VARCHAR(180) NULL",
        "question_type": "VARCHAR(80) DEFAULT 'Portfolio Review'",
        "tickers": "VARCHAR(180) DEFAULT ''",
        "urgency": "VARCHAR(30) DEFAULT 'Medium'",
        "status": "VARCHAR(30) DEFAULT 'Pending'",
        "investment_goal": "VARCHAR(180) DEFAULT 'Long-term growth'",
        "risk_profile": "VARCHAR(80) DEFAULT 'Moderate'",
        "portfolio_value": "FLOAT DEFAULT 0",
        "content": "TEXT NULL",
        "reply_text": "TEXT NULL",
        "submitted_at": "DATETIME NULL",
        "answered_at": "DATETIME NULL",
    })

    if statements:
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        print(f"[FORUM] Applied {len(statements)} schema compatibility update(s).")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _resolve_user_name(session, user_id):
    if not user_id:
        return "RocketTrade User", "investor"
    user = session.query(UserAccount).filter(UserAccount.user_id == user_id).first()
    if not user:
        return "RocketTrade User", "investor"
    role = user.profile.profile_name if getattr(user, "profile", None) else "user"
    return user.full_name or user.username, role or "user"


def _resolve_expert_id(session, user_id=None):
    expert = None
    if user_id:
        expert = session.query(Expert).filter(Expert.user_id == user_id).first()
    if not expert:
        expert = session.query(Expert).first()
    return expert.expert_id if expert else None


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
    """Reject 'General' and any unknown category, fall back to default."""
    if not category:
        return DEFAULT_CATEGORY
    if category in FORUM_CATEGORIES:
        return category
    return DEFAULT_CATEGORY


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
        "updated_at":  _safe_dt(reply.updated_at),
        "time":        _safe_dt(reply.created_at),
    }


def _serialise_post(session, post, user_id=None, include_replies=True):
    liked = saved = False
    if user_id:
        liked = session.query(ForumPostLike).filter(
            ForumPostLike.post_id == post.post_id,
            ForumPostLike.user_id == user_id,
        ).first() is not None
        saved = session.query(ForumPostSave).filter(
            ForumPostSave.post_id == post.post_id,
            ForumPostSave.user_id == user_id,
        ).first() is not None

    replies = list(post.replies or [])
    sorted_replies = sorted(replies, key=lambda r: r.created_at or datetime.min)
    ticker_list = [t.strip().upper() for t in (post.ticker_tags or "").split(",") if t.strip()]

    return {
        "id":           post.post_id,
        "post_id":      post.post_id,
        "user_id":      post.user_id,
        "title":        post.title,
        "content":      post.content,
        "preview":      post.content[:180] + ("..." if len(post.content) > 180 else ""),
        "category":     post.category,
        "tags":         [t.strip() for t in (post.tags or "").split(",") if t.strip()],
        "ticker_tags":  ticker_list,
        "author":       post.author_name,
        "author_name":  post.author_name,
        "author_role":  post.author_role,
        "likes":        post.likes_count,
        "views":        post.views_count,
        "reply_count":  len(replies),
        "is_pinned":    bool(post.is_pinned),
        "is_featured":  bool(post.is_featured),
        "is_closed":    bool(post.is_closed),
        "liked_by_me":  liked,
        "saved_by_me":  saved,
        "created_at":   _safe_dt(post.created_at),
        "updated_at":   _safe_dt(post.updated_at),
        "replies":      [_serialise_reply(r, user_id=user_id, session=session) for r in sorted_replies] if include_replies else [],
    }


def _serialise_question(q):
    if not q:
        return None
    return {
        "id":              q.question_id,
        "question_id":     q.question_id,
        "expert_id":       q.expert_id,
        "investor_name":   q.investor_name,
        "investor_email":  q.investor_email,
        "title":           q.title,
        "question_type":   q.question_type,
        "tickers":         q.tickers,
        "urgency":         q.urgency,
        "status":          q.status,
        "investment_goal": q.investment_goal,
        "risk_profile":    q.risk_profile,
        "portfolio_value": q.portfolio_value,
        "content":         q.content,
        "reply_text":      q.reply_text,
        "submitted_at":    _safe_dt(q.submitted_at),
        "answered_at":     _safe_dt(q.answered_at),
    }


# ── Seed data ─────────────────────────────────────────────────────────────────

SEED_POSTS = [
    {
        "post_id": "post_seed_001",
        "category": "Technical Analysis",
        "title": "AAPL showing a textbook double-bottom — breakout incoming?",
        "content": (
            "Apple (AAPL) has been on my radar for the past three weeks. "
            "What I'm seeing on the daily chart is a textbook double-bottom reversal "
            "pattern forming between the $171–$174 support zone.\n\n"
            "Pattern details:\n"
            "• First bottom: April 19 — $172.40 (high volume selloff)\n"
            "• Neckline resistance: $183.20\n"
            "• Second bottom: May 1 — $173.80 (lower volume, classic confirmation)\n"
            "• Current price: $181.60 — approaching neckline\n\n"
            "RSI at 54 — not overbought, plenty of room to run. "
            "MACD histogram is turning positive on the daily — bullish crossover forming. "
            "The measured move gives a target of approximately $193–$195. "
            "Disclaimer: this is purely technical analysis and should not be taken as financial advice."
        ),
        "tags": "double-bottom,RSI,MACD,breakout",
        "ticker_tags": "AAPL",
        "likes_count": 34,
        "views_count": 1842,
        "is_pinned": 1,
        "is_featured": 1,
        "replies": [
            {
                "reply_id": "reply_seed_001a",
                "author_name": "Sarah Chen",
                "author_role": "investor",
                "content": "Excellent breakdown! I've been watching the same pattern. Volume confirmation on the breakout is key — did you notice elevated call interest at the $185 strike?",
                "likes_count": 18,
            },
            {
                "reply_id": "reply_seed_001b",
                "author_name": "David Park",
                "author_role": "investor",
                "content": "Great analysis. I'd add that the broader market environment matters here too. If SPY stays above its 50-day MA, AAPL has a better chance of following through.",
                "likes_count": 11,
            },
        ],
    },
    {
        "post_id": "post_seed_002",
        "category": "Fundamental Analysis",
        "title": "NVDA earnings deep dive — is the valuation still justified?",
        "content": (
            "With NVDA trading at a forward P/E of around 35x, a lot of investors are asking "
            "whether the valuation is stretched. I went through the latest 10-Q and here is what stood out.\n\n"
            "Revenue growth: Data Center segment grew 427% YoY — the AI infrastructure buildout is real. "
            "Gross margins expanded to 78.4%, which is exceptional for a hardware company. "
            "Free cash flow came in at $14.9B for the quarter.\n\n"
            "Bear case: Customer concentration risk is high — hyperscalers account for over 40% of revenue. "
            "If capex spending slows, NVDA will feel it first.\n\n"
            "Bull case: Blackwell GPU backlog extends into 2026. Sovereign AI spend is a new demand driver "
            "that was not in anyone's model 12 months ago.\n\n"
            "Educational only, not financial advice."
        ),
        "tags": "earnings,valuation,AI,datacenter",
        "ticker_tags": "NVDA",
        "likes_count": 57,
        "views_count": 3210,
        "is_featured": 1,
        "replies": [
            {
                "reply_id": "reply_seed_002a",
                "author_name": "Marcus Rivera",
                "author_role": "investor",
                "content": "The Blackwell backlog point is massive. Jensen said orders are 'insane' — hard to be bearish when your product is oversubscribed 18 months out.",
                "likes_count": 24,
            },
        ],
    },
    {
        "post_id": "post_seed_003",
        "category": "AI Predictions",
        "title": "How accurate are the RocketTrade AI predictions? My 30-day review",
        "content": (
            "I have been tracking every AI prediction signal from RocketTrade for the past 30 days "
            "across 8 tickers and wanted to share my findings with the community.\n\n"
            "Results summary:\n"
            "• 22 out of 31 directional predictions were correct (71% hit rate)\n"
            "• Best performing: MSFT, NVDA, AAPL\n"
            "• Worst performing: TSLA (high volatility, harder to predict)\n"
            "• Average prediction window accuracy improved significantly at the 5-day horizon vs 1-day\n\n"
            "My takeaway: the AI model works best when used as a secondary confirmation signal, "
            "not as a standalone buy/sell trigger. Pairing it with the RSI indicator and the "
            "volume trend gave the best results in my testing.\n\n"
            "Would love to hear how others are using the prediction feature!"
        ),
        "tags": "AI,predictions,backtesting,signals",
        "ticker_tags": "MSFT,NVDA,AAPL,TSLA",
        "likes_count": 42,
        "views_count": 2156,
        "replies": [
            {
                "reply_id": "reply_seed_003a",
                "author_name": "Priya Nair",
                "author_role": "investor",
                "content": "This matches my experience! The 5-day window is much more reliable. I also found that combining it with the MACD crossover filtered out a lot of false positives.",
                "likes_count": 15,
            },
            {
                "reply_id": "reply_seed_003b",
                "author_name": "Jordan Expert",
                "author_role": "expert",
                "content": "Good empirical data. XGBoost models like the one powering the predictions here tend to struggle with high-volatility names like TSLA due to mean-reversion dynamics. Your 71% on calmer tickers is actually quite strong.",
                "likes_count": 31,
            },
        ],
    },
    {
        "post_id": "post_seed_004",
        "category": "Portfolio Strategy",
        "title": "Core-satellite strategy for long-term investors — how I structure my portfolio",
        "content": (
            "Been investing for 6 years now and the framework that has worked best for me is the "
            "core-satellite approach. Here is how I set it up.\n\n"
            "Core (70% of portfolio): broad market ETFs — S&P 500 index, MSCI World, and a Singapore "
            "dividend ETF for income. These I never touch and rebalance quarterly.\n\n"
            "Satellite (30%): individual stock picks where I have high conviction based on research. "
            "Currently: NVDA, MSFT, and two Singapore blue chips.\n\n"
            "Why this works for me:\n"
            "• Core locks in market returns and reduces emotional decision-making\n"
            "• Satellite gives upside without betting the whole portfolio\n"
            "• Clear rule: satellite positions are capped at 8% each to prevent overconcentration\n\n"
            "The biggest mistake I see beginners make is going 100% individual stocks and then panic "
            "selling during corrections. The core provides a psychological anchor.\n\n"
            "Educational only, not financial advice."
        ),
        "tags": "portfolio,ETF,core-satellite,diversification",
        "ticker_tags": "MSFT,NVDA",
        "likes_count": 38,
        "views_count": 1670,
        "replies": [
            {
                "reply_id": "reply_seed_004a",
                "author_name": "Wei Zhang",
                "author_role": "investor",
                "content": "Solid framework. I use a similar approach but my core is 60/40 equities/bonds given my risk tolerance. What Singapore ETF are you using for the dividend component?",
                "likes_count": 9,
            },
        ],
    },
    {
        "post_id": "post_seed_005",
        "category": "Market News",
        "title": "Fed holds rates — what does this mean for tech stocks?",
        "content": (
            "The Fed just held rates steady at 5.25%–5.5% for the third consecutive meeting. "
            "Markets initially rallied but then gave back gains. Here is my read on what this means "
            "for growth and tech stocks specifically.\n\n"
            "Short-term impact: rate-sensitive growth stocks like high-multiple tech names typically "
            "benefit from a dovish Fed pause. Lower discount rates = higher DCF valuations.\n\n"
            "Medium-term risk: the Fed signalled 'higher for longer' in their statement, which means "
            "the easy multiple expansion we saw in 2023 is less likely to repeat.\n\n"
            "Sectors to watch:\n"
            "• Semiconductors: AI demand drives earnings, less sensitive to rates\n"
            "• Cloud SaaS: high-multiple names still vulnerable if 10-year yield stays elevated\n"
            "• Financials: banks benefit from higher-for-longer net interest margins\n\n"
            "The market reaction in the next 48 hours will be telling."
        ),
        "tags": "Fed,rates,macro,tech",
        "ticker_tags": "MSFT,GOOGL,AMZN,NVDA",
        "likes_count": 29,
        "views_count": 1340,
        "replies": [],
    },
    {
        "post_id": "post_seed_006",
        "category": "Trading Tips",
        "title": "Stop-loss strategies that actually work — lessons from 3 years of active trading",
        "content": (
            "I lost a significant amount in my first year because I did not use stop-losses properly. "
            "Here are the three approaches that finally clicked for me.\n\n"
            "1. ATR-based stops: set your stop at 2x the Average True Range below entry. "
            "This accounts for normal volatility and stops you from getting shaken out by noise.\n\n"
            "2. Structure-based stops: place your stop just below the nearest support level "
            "identified on the chart. If that level breaks, your thesis is likely wrong.\n\n"
            "3. Time stops: if a trade is not moving in your direction within a set timeframe "
            "(e.g. 10 trading days), exit regardless of price. Capital tied up in a dead trade "
            "is opportunity cost.\n\n"
            "The golden rule: decide your stop before you enter, not after. Emotional stops are "
            "almost always too late.\n\n"
            "Educational only, not financial advice."
        ),
        "tags": "stop-loss,risk,ATR,trading",
        "ticker_tags": "",
        "likes_count": 51,
        "views_count": 2890,
        "is_pinned": 1,
        "replies": [
            {
                "reply_id": "reply_seed_006a",
                "author_name": "Sarah Chen",
                "author_role": "investor",
                "content": "The time stop concept is underrated. I have been burned so many times by dead money positions. Setting a calendar exit forces you to re-evaluate your thesis periodically.",
                "likes_count": 22,
            },
        ],
    },
    {
        "post_id": "post_seed_007",
        "category": "Beginners Corner",
        "title": "New to investing — what are the most important concepts to learn first?",
        "content": (
            "Hi everyone, I just signed up for RocketTrade and I am completely new to investing. "
            "I have been reading a lot but there is so much information that I feel overwhelmed. "
            "What are the 5 most important concepts a beginner should understand before starting?\n\n"
            "I am 24 years old, have a stable job, and can invest about $500 a month. "
            "My goal is long-term wealth building over 20+ years. Any guidance is appreciated!"
        ),
        "tags": "beginner,learning,basics",
        "ticker_tags": "",
        "likes_count": 15,
        "views_count": 890,
        "replies": [
            {
                "reply_id": "reply_seed_007a",
                "author_name": "Marcus Rivera",
                "author_role": "investor",
                "content": "Great question! I would start with: (1) compounding — understand how returns grow over time. (2) diversification — don't put everything in one stock. (3) P/E ratio — a basic valuation metric. (4) Dollar-cost averaging — invest a fixed amount regularly. (5) Risk tolerance — know how much volatility you can stomach. With 20+ years, time is your biggest advantage.",
                "likes_count": 33,
            },
            {
                "reply_id": "reply_seed_007b",
                "author_name": "Jordan Expert",
                "author_role": "expert",
                "content": "At 24 with a long time horizon, low-cost index funds are your best friend. Read 'The Little Book of Common Sense Investing' by John Bogle. You can add individual stocks later once you understand the fundamentals.",
                "likes_count": 27,
            },
        ],
    },
    {
        "post_id": "post_seed_008",
        "category": "Global Markets",
        "title": "Singapore market update — DBS and UOB dividend play in a high-rate environment",
        "content": (
            "Singapore banks have been one of the standout performers in the STI this year. "
            "Here is why I think DBS and UOB remain interesting in the current environment.\n\n"
            "DBS: trailing dividend yield of approximately 5.8%, NIM (net interest margin) has "
            "expanded with higher rates, and management has been consistent on capital returns. "
            "The recent CEO transition is worth monitoring.\n\n"
            "UOB: slightly lower yield at 5.2% but strong ASEAN expansion story via the Citibank "
            "retail acquisition. Growing fee income is reducing rate sensitivity over time.\n\n"
            "Key risk: if the Fed cuts rates aggressively, Singapore banks will see NIM compression "
            "within 2–3 quarters due to SIBOR linkage. Watch the Fed dots carefully.\n\n"
            "Educational only, not financial advice."
        ),
        "tags": "Singapore,banks,dividend,STI,SIBOR",
        "ticker_tags": "DBS.SI,UOB.SI",
        "likes_count": 23,
        "views_count": 1120,
        "replies": [],
    },
    {
        "post_id": "post_seed_009",
        "category": "Crypto & Digital Assets",
        "title": "Bitcoin halving cycles and what history tells us about price action",
        "content": (
            "With the most recent Bitcoin halving now behind us, I wanted to share a historical "
            "analysis of what happened in the 12–18 months following previous halvings.\n\n"
            "2012 halving: price went from ~$12 to ~$1,100 over 12 months (+9,000%)\n"
            "2016 halving: price went from ~$650 to ~$20,000 over 18 months (+2,980%)\n"
            "2020 halving: price went from ~$8,500 to ~$69,000 over 18 months (+712%)\n\n"
            "The returns diminish each cycle as market cap grows — this is expected. "
            "What matters more than percentage gain is the structural supply reduction. "
            "Miners now receive 3.125 BTC per block vs 6.25 previously.\n\n"
            "Correlation with traditional markets has increased — BTC now moves more with "
            "risk assets like Nasdaq. This is different from the 2020 cycle.\n\n"
            "Educational only, not financial advice. Crypto is highly volatile."
        ),
        "tags": "bitcoin,halving,crypto,cycles",
        "ticker_tags": "BTC",
        "likes_count": 36,
        "views_count": 1980,
        "replies": [
            {
                "reply_id": "reply_seed_009a",
                "author_name": "Wei Zhang",
                "author_role": "investor",
                "content": "Good breakdown. The diminishing returns point is often ignored by retail traders who expect 2012-level gains. The correlation with Nasdaq is the most important structural change IMO.",
                "likes_count": 14,
            },
        ],
    },
    {
        "post_id": "post_seed_010",
        "category": "Risk Management",
        "title": "How I size my positions — the 2% rule and why it saved my portfolio",
        "content": (
            "Position sizing is the most underrated skill in trading and investing. "
            "Most beginners focus on picking the right stocks, but controlling how much "
            "you allocate to each position is what keeps you in the game long-term.\n\n"
            "The 2% rule: never risk more than 2% of your total portfolio on any single trade. "
            "This means if you have a $10,000 portfolio and your stop-loss is 10% below entry, "
            "you should only invest $2,000 in that position.\n\n"
            "Why this works:\n"
            "• You can withstand 50 consecutive losing trades before losing your account\n"
            "• Removes emotion from position sizing decisions\n"
            "• Forces you to set a stop-loss before entering\n\n"
            "For long-term investors (not traders), I adapt this to: cap any single stock "
            "at 8–10% of total portfolio regardless of conviction level.\n\n"
            "Educational only, not financial advice."
        ),
        "tags": "position-sizing,risk,2-percent-rule,portfolio",
        "ticker_tags": "",
        "likes_count": 44,
        "views_count": 2340,
        "replies": [
            {
                "reply_id": "reply_seed_010a",
                "author_name": "Priya Nair",
                "author_role": "investor",
                "content": "The 2% rule changed how I trade. Before this I was putting 20-30% into single positions and one bad trade wiped out weeks of gains.",
                "likes_count": 19,
            },
            {
                "reply_id": "reply_seed_010b",
                "author_name": "David Park",
                "author_role": "investor",
                "content": "Great post. Kelly Criterion is another advanced sizing method worth looking into once you have win rate and average win/loss data from your own trades.",
                "likes_count": 12,
            },
        ],
    },
]


def seed_forum_posts():
    """Seed realistic topic-specific forum posts on first run."""
    with get_session() as session:
        existing = session.query(ForumPost).count()
        if existing > 0:
            return  # already seeded

        for data in SEED_POSTS:
            replies_data = data.pop("replies", [])
            post = ForumPost(
                post_id=data["post_id"],
                user_id=None,
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
                reply = ForumReply(
                    reply_id=r["reply_id"],
                    post_id=post.post_id,
                    user_id=None,
                    author_name=r["author_name"],
                    author_role=r["author_role"],
                    content=r["content"],
                    likes_count=r.get("likes_count", 0),
                )
                session.add(reply)

        session.flush()
        print(f"[FORUM] Seeded {len(SEED_POSTS)} posts across {len(FORUM_CATEGORIES)} topic categories.")


# ── Repository ────────────────────────────────────────────────────────────────

class ForumRepository:

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
            elif sort == "most_replies":
                q = q.order_by(ForumPost.updated_at.desc())
            else:
                q = q.order_by(ForumPost.is_pinned.desc(), ForumPost.updated_at.desc())

            total = q.count()
            posts = q.offset((page - 1) * page_size).limit(page_size).all()

            return {
                "posts": [_serialise_post(session, p, user_id=user_id, include_replies=False) for p in posts],
                "total": total,
                "page": page,
                "page_size": page_size,
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
            validated_category = _validate_category(category)
            post = ForumPost(
                post_id=f"post_{uuid4()}",
                user_id=user_id,
                author_name=author_name,
                author_role=author_role,
                title=title,
                content=content,
                category=validated_category,
                tags=",".join(tags or []),
                ticker_tags=",".join([t.upper() for t in (ticker_tags or [])]),
            )
            session.add(post)
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def add_reply(post_id, user_id, content):
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
                content=content,
            )
            post.updated_at = _now()
            session.add(reply)
            session.flush()
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
                # fallback: return top posts of all time if nothing recent
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
        """Count of posts per category for the sidebar."""
        with get_session() as session:
            results = {}
            for cat in FORUM_CATEGORIES:
                count = session.query(ForumPost).filter(ForumPost.category == cat).count()
                results[cat] = count
            return results

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
    def delete_post(post_id, user_id=None):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return False
            session.query(ForumPostLike).filter(ForumPostLike.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostSave).filter(ForumPostSave.post_id == post_id).delete(synchronize_session=False)
            session.query(ForumPostView).filter(ForumPostView.post_id == post_id).delete(synchronize_session=False)
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
    def delete_reply(post_id, reply_id, user_id=None):
        with get_session() as session:
            post = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
            if not post:
                return None
            reply = session.query(ForumReply).filter(
                ForumReply.post_id == post_id, ForumReply.reply_id == reply_id
            ).first()
            if not reply or not _can_modify_reply(session, reply, user_id):
                return None
            session.query(ForumReplyLike).filter(ForumReplyLike.reply_id == reply_id).delete(synchronize_session=False)
            session.delete(reply)
            post.updated_at = _now()
            session.flush()
            return _serialise_post(session, post, user_id=user_id, include_replies=True)

    @staticmethod
    def get_forum_stats():
        with get_session() as session:
            return {
                "total_posts":   session.query(ForumPost).count(),
                "total_replies": session.query(ForumReply).count(),
                "total_likes":   session.query(ForumPostLike).count(),
                "total_saves":   session.query(ForumPostSave).count(),
            }


# ── ExpertQuestion Repository ─────────────────────────────────────────────────

class ExpertQuestionRepository:
    @staticmethod
    def seed_for_expert(user_id=None):
        with get_session() as session:
            expert_id = _resolve_expert_id(session, user_id)
            if not expert_id:
                return []
            existing = session.query(ExpertQuestion).filter(ExpertQuestion.expert_id == expert_id).count()
            if existing > 0:
                questions = session.query(ExpertQuestion).filter(
                    ExpertQuestion.expert_id == expert_id
                ).order_by(ExpertQuestion.submitted_at.desc()).all()
                return [_serialise_question(q) for q in questions]

            demo = [
                ExpertQuestion(question_id="question_demo_nvda", expert_id=expert_id, investor_name="Sarah Chen", investor_email="sarah.chen@email.com", title="Should I rebalance my NVDA-heavy portfolio?", question_type="Portfolio Review", tickers="NVDA,MSFT,AAPL", urgency="High", status="Pending", investment_goal="Long-term growth", risk_profile="Moderate-Aggressive", portfolio_value=52000, content="My portfolio is now heavily concentrated in NVDA after the recent rally. Should I trim some gains and rebalance into other technology or defensive stocks?"),
                ExpertQuestion(question_id="question_demo_dbs", expert_id=expert_id, investor_name="Marcus Rivera", investor_email="marcus.rivera@email.com", title="DBS entry price and dividend strategy", question_type="Stock Analysis", tickers="DBS.SI,UOB.SI", urgency="Medium", status="Pending", investment_goal="Dividend income", risk_profile="Moderate", portfolio_value=30000, content="I am considering DBS for dividend income. Is the current price still attractive, or should I wait for a pullback before entering?"),
                ExpertQuestion(question_id="question_demo_defensive", expert_id=expert_id, investor_name="Priya Nair", investor_email="priya.nair@email.com", title="How do I make my portfolio less volatile?", question_type="Risk Management", tickers="AAPL,KO,JNJ", urgency="Low", status="Pending", investment_goal="Capital preservation", risk_profile="Conservative", portfolio_value=18000, content="I am worried about market volatility. What type of defensive allocation should I add so my portfolio moves less aggressively?"),
            ]
            for q in demo:
                session.add(q)
            session.flush()
            return [_serialise_question(q) for q in demo]

    @staticmethod
    def list_for_expert(user_id=None):
        return ExpertQuestionRepository.seed_for_expert(user_id)

    @staticmethod
    def get(question_id):
        with get_session() as session:
            q = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            return _serialise_question(q) if q else None

    @staticmethod
    def reply(question_id, reply_text):
        with get_session() as session:
            q = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            if not q:
                return None
            q.reply_text = reply_text
            q.status = "Answered"
            q.answered_at = _now()
            session.flush()
            return _serialise_question(q)

    @staticmethod
    def delete_reply(question_id):
        with get_session() as session:
            q = session.query(ExpertQuestion).filter(ExpertQuestion.question_id == question_id).first()
            if not q:
                return None
            q.reply_text = None
            q.status = "Pending"
            q.answered_at = None
            session.flush()
            return _serialise_question(q)
