from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"]


class Article(Base):
    __tablename__ = "article"

    article_id = Column(String(50), primary_key=True,
                        default=lambda: f"article_{uuid4()}")
    expert_id  = Column(String(50), ForeignKey("expert.expert_id"), nullable=False)
    title      = Column(String(255), nullable=False)
    summary    = Column(String(500), nullable=False)
    content    = Column(Text, nullable=False)
    category   = Column(String(50), nullable=False, default="Beginner")
    tags       = Column(String(255), nullable=True)   # comma-separated e.g. "AAPL,NVDA"
    status     = Column(String(20), default="published")   # published | draft
    created_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")),
                        onupdate=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    # ── helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _row_to_dict(a, author_name=None):
        return {
            "article_id": a.article_id,
            "expert_id":  a.expert_id,
            "author":     author_name or "Expert",
            "title":      a.title,
            "summary":    a.summary,
            "content":    a.content,
            "category":   a.category,
            "tags":       [t.strip() for t in (a.tags or "").split(",") if t.strip()],
            "status":     a.status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        }

    @staticmethod
    def _get_author_name(session, expert_id):
        from app.entity.models.expert import Expert
        from app.entity.models.useraccount import UserAccount
        expert = session.query(Expert).filter(Expert.expert_id == expert_id).first()
        if not expert:
            return "Expert"
        user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first()
        return user.full_name if user else "Expert"

    # ── CRUD ─────────────────────────────────────────────────────────────────

    @staticmethod
    def create(expert_id, title, summary, content, category, tags=""):
        with get_session() as session:
            article = Article(
                expert_id=expert_id,
                title=title.strip(),
                summary=summary.strip(),
                content=content.strip(),
                category=category,
                tags=tags.strip(),
                status="published",
            )
            session.add(article)
            session.flush()
            return article.article_id

    @staticmethod
    def update(article_id, expert_id, title=None, summary=None,
               content=None, category=None, tags=None, status=None):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
                Article.expert_id  == expert_id,      # only own articles
            ).first()
            if not article:
                return False
            if title    is not None: article.title    = title.strip()
            if summary  is not None: article.summary  = summary.strip()
            if content  is not None: article.content  = content.strip()
            if category is not None: article.category = category
            if tags     is not None: article.tags     = tags.strip()
            if status   is not None: article.status   = status
            article.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            return True

    @staticmethod
    def delete(article_id, expert_id):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
                Article.expert_id  == expert_id,
            ).first()
            if not article:
                return False
            session.delete(article)
            return True

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    def getAll(category=None, tag=None, limit=50):
        with get_session() as session:
            q = session.query(Article).filter(Article.status == "published")
            if category:
                q = q.filter(Article.category == category)
            rows = q.order_by(Article.created_at.desc()).limit(limit).all()
            return [
                Article._row_to_dict(a, Article._get_author_name(session, a.expert_id))
                for a in rows
                if not tag or tag.upper() in (a.tags or "").upper()
            ]

    @staticmethod
    def getById(article_id):
        with get_session() as session:
            a = session.query(Article).filter(Article.article_id == article_id).first()
            if not a:
                return None
            return Article._row_to_dict(a, Article._get_author_name(session, a.expert_id))

    @staticmethod
    def getByExpert(expert_id):
        with get_session() as session:
            rows = session.query(Article).filter(
                Article.expert_id == expert_id
            ).order_by(Article.created_at.desc()).all()
            author = Article._get_author_name(session, expert_id)
            return [Article._row_to_dict(a, author) for a in rows]


def seed_articles():
    """Populate the Knowledge Hub with placeholder market-trend articles.

    Idempotent: skips entirely if any articles already exist, and attaches
    everything to the already-seeded expert account (kimhi@gmail.com).
    """
    from app.entity.models.expert import Expert
    from app.entity.models.useraccount import UserAccount

    with get_session() as session:
        already_seeded = session.query(Article).first()
        if already_seeded:
            return

        user = session.query(UserAccount).filter(
            UserAccount.email_address == "kimhi@gmail.com"
        ).first()
        if not user:
            print("[SEED] Skipping article seed — expert user not found yet")
            return

        expert = session.query(Expert).filter(
            Expert.user_id == user.user_id
        ).first()
        if not expert:
            print("[SEED] Skipping article seed — expert record not found yet")
            return

        expert_id = expert.expert_id

    articles = [
        dict(
            title="Understanding Market Trends",
            summary="A primer on what market trends actually are, why they form, and how investors use them to frame decisions instead of guesses.",
            content=(
                "A market trend is simply the general direction prices in a market "
                "or sector are moving over a meaningful period of time. Trends are "
                "usually grouped into three types: uptrends, where prices form a "
                "series of higher highs and higher lows; downtrends, the mirror "
                "image; and sideways trends, where prices move within a range "
                "without a clear direction.\n\n"
                "Trends exist because markets are driven by the collective behavior "
                "of millions of participants reacting to the same information — "
                "earnings reports, interest rate decisions, geopolitical events, and "
                "shifting sentiment. No single trend lasts forever, which is why "
                "experienced investors focus less on predicting the exact top or "
                "bottom and more on identifying which phase a trend is currently in.\n\n"
                "For beginners, the most useful habit is zooming out. A stock that "
                "looks volatile on a 1-day chart can look like a calm, steady "
                "uptrend on a 6-month chart. Trends are best read on the timeframe "
                "that matches your own investment horizon."
            ),
            category="Beginner",
            tags="trends,basics,education",
        ),
        dict(
            title="How to Analyze Market Trends Like a Pro",
            summary="A step-by-step guide to combining price action, volume, and key indicators when assessing whether a trend is likely to continue.",
            content=(
                "Professional analysts rarely rely on a single signal. Instead, they "
                "layer several tools to build conviction before acting:\n\n"
                "1. Price action first. Are highs and lows rising, falling, or flat? "
                "This is the rawest, least lagging signal available.\n\n"
                "2. Moving averages. The 50-day and 200-day moving averages help "
                "smooth out daily noise. When the shorter average crosses above the "
                "longer one (a 'golden cross'), it's often read as a bullish signal; "
                "the reverse ('death cross') is read as bearish.\n\n"
                "3. Volume confirmation. A price move on high volume carries more "
                "weight than the same move on thin volume, since it suggests broader "
                "participation rather than a handful of trades.\n\n"
                "4. Momentum indicators. Tools like RSI or MACD help flag when a "
                "trend may be overextended and due for a pause or reversal.\n\n"
                "5. Context. No indicator works in isolation — always weigh signals "
                "against the broader economic backdrop, sector performance, and any "
                "scheduled news that could override technical patterns entirely."
            ),
            category="Technical Analysis",
            tags="analysis,indicators,strategy",
        ),
        dict(
            title="Top 5 Market Trends to Watch in 2026",
            summary="A look at the major themes shaping markets this year and how they might influence portfolio decisions in the months ahead.",
            content=(
                "Markets in 2026 continue to be shaped by a handful of dominant "
                "themes that investors are tracking closely:\n\n"
                "1. AI infrastructure spending. Continued capital expenditure from "
                "major tech companies on chips, data centers, and energy capacity "
                "remains a key driver of both earnings and volatility in the tech sector.\n\n"
                "2. Interest rate policy. Central bank decisions continue to set the "
                "tone for equity valuations, bond yields, and currency markets "
                "globally — small policy shifts can ripple across every asset class.\n\n"
                "3. Reshoring and supply chains. Companies continue adjusting "
                "manufacturing and supply networks in response to trade policy and "
                "geopolitical risk, creating new winners in logistics and industrials.\n\n"
                "4. Energy transition. Investment in renewables, grid infrastructure, "
                "and battery storage continues to expand as a long-term structural trend.\n\n"
                "5. Retail investor participation. Increased access through mobile "
                "trading apps and fractional shares has changed how quickly retail "
                "sentiment can move smaller-cap stocks.\n\n"
                "These themes won't move in a straight line, and surprises are "
                "guaranteed — but they're a reasonable starting framework for "
                "thinking about where capital is flowing this year."
            ),
            category="Market News",
            tags="2026,outlook,macro",
        ),
        dict(
            title="Market Trends Explained (Video Companion)",
            summary="A companion write-up to our short video covering how to read market trends in plain language, without the jargon.",
            content=(
                "This article accompanies our short explainer video on market "
                "trends. The core idea is simple: a trend is just the path of least "
                "resistance for price. When more buyers than sellers are stepping "
                "in, price grinds higher; when sellers dominate, it grinds lower.\n\n"
                "The video walks through three quick visual examples — an uptrend "
                "in a large-cap tech stock, a downtrend during a sector-wide "
                "pullback, and a sideways range during an earnings blackout period.\n\n"
                "Key takeaway: trends are about probability, not certainty. "
                "Recognizing a trend doesn't tell you exactly when it will end — it "
                "only tells you which direction has had the upper hand recently."
            ),
            category="Beginner",
            tags="video,basics,education",
        ),
        dict(
            title="Market Trend Scanner: A Quick-Start Guide",
            summary="How to use a trend scanner to quickly surface stocks moving in a clear direction, and what to check before acting on a signal.",
            content=(
                "A trend scanner filters a large universe of stocks down to a "
                "shortlist matching specific criteria — for example, stocks above "
                "their 50-day moving average with rising volume. This is useful for "
                "narrowing attention quickly, but it's only the first step.\n\n"
                "Before acting on anything a scanner surfaces, it's worth checking:\n\n"
                "- Why is this stock trending? Is there a specific news catalyst, "
                "earnings beat, or sector-wide move behind it?\n\n"
                "- How extended is the move already? A stock up sharply over a short "
                "window carries more reversal risk than one in an early, gradual climb.\n\n"
                "- What's the broader market doing? A bullish scan result during a "
                "broad market downturn deserves extra scrutiny.\n\n"
                "Treat scanners as a discovery tool, not a decision-making tool on "
                "their own — they're best paired with your own risk management rules."
            ),
            category="Technical Analysis",
            tags="tools,scanner,screening",
        ),
        dict(
            title="Why Diversification Still Matters in Trending Markets",
            summary="Even in a strong bull market, concentration risk can quietly build up in a portfolio. Here's how to keep it in check.",
            content=(
                "When a handful of stocks are leading a strong uptrend, it's tempting "
                "to concentrate a portfolio around the winners. The risk is that "
                "concentration cuts both ways — the same names that drove gains can "
                "drive outsized losses when sentiment turns.\n\n"
                "Diversification doesn't mean abandoning conviction in your best "
                "ideas. It means sizing positions so that no single name, sector, or "
                "theme can derail your overall plan if it underperforms.\n\n"
                "A simple gut-check: ask what percentage of your total portfolio "
                "would be affected if your largest holding dropped 30% overnight. If "
                "that number makes you uncomfortable, it's worth rebalancing — "
                "regardless of how strong the recent trend has looked."
            ),
            category="Risk Management",
            tags="diversification,portfolio,risk",
        ),
        dict(
            title="Reading Earnings Season: A Trend Investor's Checklist",
            summary="A practical checklist for filtering signal from noise during the flood of quarterly earnings reports.",
            content=(
                "Earnings season can shift trends quickly, but the headline "
                "beat-or-miss number rarely tells the full story. A quick checklist "
                "worth running through for each report:\n\n"
                "1. Revenue vs. earnings. Did earnings beat mostly from cost cutting, "
                "or did revenue growth actually accelerate?\n\n"
                "2. Forward guidance. Markets often react more to guidance for the "
                "next quarter than to the quarter that just ended.\n\n"
                "3. Margin trends. Are margins expanding or compressing compared to "
                "the prior few quarters?\n\n"
                "4. Management commentary. Listen for changes in tone around demand, "
                "competition, or input costs.\n\n"
                "5. Sector read-through. A strong or weak report from one company can "
                "move related stocks even if their own fundamentals haven't changed.\n\n"
                "Running through this checklist takes a few minutes per report and "
                "helps separate genuine trend shifts from short-lived headline reactions."
            ),
            category="Fundamental",
            tags="earnings,fundamentals,checklist",
        ),
        dict(
            title="Trend Following vs. Mean Reversion: Two Core Strategies",
            summary="A side-by-side look at two opposing approaches to trading trends, and the conditions where each tends to work best.",
            content=(
                "Trend following and mean reversion sit at opposite ends of the "
                "strategy spectrum, and most active investors lean toward one or "
                "blend both depending on conditions.\n\n"
                "Trend following assumes that a stock moving in a direction is more "
                "likely to continue than reverse in the near term. Strategies built "
                "on this idea aim to enter early in a confirmed trend and ride it, "
                "accepting smaller, more frequent losses in exchange for occasional "
                "large wins.\n\n"
                "Mean reversion assumes the opposite — that prices tend to overshoot "
                "and eventually drift back toward an average or fair value. These "
                "strategies look for stocks that have moved unusually far, "
                "unusually fast, and bet on a pullback or bounce.\n\n"
                "Neither approach works in every environment. Trend following tends "
                "to struggle in choppy, range-bound markets, while mean reversion "
                "can be punished badly during strong, sustained trends. Knowing "
                "which regime the market is currently in matters as much as the "
                "strategy itself."
            ),
            category="Strategy",
            tags="strategy,trend-following,mean-reversion",
        ),
    ]

    with get_session() as session:
        for a in articles:
            session.add(Article(
                expert_id=expert_id,
                title=a["title"],
                summary=a["summary"],
                content=a["content"],
                category=a["category"],
                tags=a["tags"],
                status="published",
            ))
        session.commit()

    print(f"[SEED] Added {len(articles)} placeholder Knowledge Hub articles")
