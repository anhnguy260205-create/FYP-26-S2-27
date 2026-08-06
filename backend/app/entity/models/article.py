from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from app.entity.database.base import Base
from app.entity.database.session import get_session
from datetime import datetime
from zoneinfo import ZoneInfo
from uuid import uuid4


CATEGORIES = ["Beginner", "Technical Analysis", "Fundamental", "Risk Management", "Market News", "Strategy"]


class Article(Base):
    __tablename__ = "article"

    article_id  = Column(String(50), primary_key=True,
                         default=lambda: f"article_{uuid4()}")
    expert_id   = Column(String(50), ForeignKey("expert.expert_id"), nullable=True)
    author_type = Column(String(20), nullable=False, default="expert")  # "expert" | "admin"
    author_name = Column(String(100), nullable=True)                    # set for admin articles
    title       = Column(String(255), nullable=False)
    summary     = Column(String(500), nullable=False)
    content     = Column(Text, nullable=False)
    category    = Column(String(50), nullable=False, default="Beginner")
    tags        = Column(String(255), nullable=True)
    status      = Column(String(20), default="published")
    created_at  = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")))
    updated_at  = Column(DateTime, default=lambda: datetime.now(ZoneInfo("Asia/Singapore")),
                         onupdate=lambda: datetime.now(ZoneInfo("Asia/Singapore")))

    #  helpers S

    @staticmethod
    def _row_to_dict(a, resolved_author=None):
        if a.author_type == "admin":
            display_author = a.author_name or "Admin"
        else:
            display_author = resolved_author or "Expert"
        return {
            "article_id":  a.article_id,
            "expert_id":   a.expert_id,
            "author_type": a.author_type,
            "author":      display_author,
            "author_name": display_author,
            "title":       a.title,
            "summary":     a.summary,
            "content":     a.content,
            "category":    a.category,
            "tags":        [t.strip() for t in (a.tags or "").split(",") if t.strip()],
            "status":      a.status,
            "created_at":  a.created_at.isoformat() if a.created_at else None,
            "updated_at":  a.updated_at.isoformat() if a.updated_at else None,
        }

    @staticmethod
    def _get_author_name(session, expert_id):
        if not expert_id:
            return "Expert"
        from app.entity.models.expert import Expert
        from app.entity.models.useraccount import UserAccount
        expert = session.query(Expert).filter(Expert.expert_id == expert_id).first()
        if not expert:
            return "Expert"
        user = session.query(UserAccount).filter(UserAccount.user_id == expert.user_id).first()
        return user.full_name or user.username if user else "Expert"

    #  Expert CRUD 

    @staticmethod
    def create(expert_id, title, summary, content, category, tags=""):
        with get_session() as session:
            article = Article(
                expert_id=expert_id,
                author_type="expert",
                title=title.strip(),
                summary=summary.strip(),
                content=content.strip(),
                category=category,
                tags=tags.strip(),
                status="pending",
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
                Article.expert_id  == expert_id,
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

    #  Admin CRUD (no expert_id required) 

    @staticmethod
    def admin_create(title, summary, content, category, tags="", status="published", author_name=None):
        with get_session() as session:
            article = Article(
                expert_id=None,
                author_type="admin",
                author_name=(author_name.strip() if author_name else None) or "Admin",
                title=title.strip(),
                summary=summary.strip() if summary else "",
                content=content.strip(),
                category=category,
                tags=tags.strip() if tags else "",
                status=status,
            )
            session.add(article)
            session.flush()
            return article.article_id

    @staticmethod
    def admin_update(article_id, title=None, summary=None,
                     content=None, category=None, tags=None, status=None, author_name=None):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
            ).first()
            if not article:
                return False
            if title       is not None: article.title       = title.strip()
            if summary     is not None: article.summary     = summary.strip()
            if content     is not None: article.content     = content.strip()
            if category    is not None: article.category    = category
            if tags        is not None: article.tags        = tags.strip()
            if status      is not None: article.status      = status
            if author_name is not None and article.author_type == "admin":
                article.author_name = author_name.strip() or "Admin"
            article.updated_at = datetime.now(ZoneInfo("Asia/Singapore"))
            return True

    @staticmethod
    def admin_delete(article_id):
        with get_session() as session:
            article = session.query(Article).filter(
                Article.article_id == article_id,
            ).first()
            if not article:
                return False
            session.delete(article)
            return True

    @staticmethod
    def getAll_admin(category=None, limit=200):
        """Admin view — returns ALL articles regardless of status."""
        with get_session() as session:
            q = session.query(Article)
            if category:
                q = q.filter(Article.category == category)
            rows = q.order_by(Article.created_at.desc()).limit(limit).all()
            return [
                Article._row_to_dict(a, Article._get_author_name(session, a.expert_id))
                for a in rows
            ]

    # ── Queries ───────────────────────────────────────────────────────────────

    @staticmethod
    def getAll(category=None, tag=None, limit=50):
        """Investor/expert view — published articles only, both expert and admin."""
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
    everything to the already-seeded expert account (jordan@gmail.com).
    """
    from app.entity.models.expert import Expert
    from app.entity.models.useraccount import UserAccount

    with get_session() as session:
        already_seeded = session.query(Article).first()
        if already_seeded:
            return

        user = session.query(UserAccount).filter(
            UserAccount.email_address == "jordan@gmail.com"
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


def seed_expert_articles():
    """Populate the Knowledge Hub with 3 articles each for the additional
    verified expert roster (see SEED_EXPERTS in app.entity.models.expert).
    Idempotent per-article via a fixed article_id, so it's safe to call every
    startup and safe to re-run after adding new experts to the roster."""
    from app.entity.models.expert import get_seed_expert_ids

    experts = get_seed_expert_ids()
    if not experts:
        print("[SEED] Skipping expert article seed — no seed experts found yet")
        return

    ARTICLES_BY_EXPERT = {
        "elena_vasquez": [
            dict(
                article_id="article_seed_elena_01",
                title="How to Read a Balance Sheet Without Falling Asleep",
                summary="A plain-language walkthrough of the three things on a balance sheet that actually matter for judging whether a company is financially sound.",
                content=(
                    "A balance sheet looks intimidating mostly because of how it's "
                    "formatted, not because the ideas inside it are complicated. At its "
                    "core it answers one question: what does the company own, what does "
                    "it owe, and what's left over for shareholders?\n\n"
                    "Assets are grouped by how quickly they can be turned into cash — "
                    "cash and receivables first, followed by inventory, then long-term "
                    "assets like property and equipment. Liabilities follow the same "
                    "logic on the other side: what's due soon versus what's due years "
                    "from now. Equity is simply assets minus liabilities — the residual "
                    "claim shareholders have on the business.\n\n"
                    "Three ratios do most of the work when screening a balance sheet "
                    "quickly. Current ratio (current assets ÷ current liabilities) tells "
                    "you whether short-term obligations are covered. Debt-to-equity "
                    "tells you how much of the business is financed by borrowing versus "
                    "owner capital. And a quick scan of goodwill relative to total assets "
                    "flags whether a company has grown mostly through acquisitions — "
                    "goodwill is the premium paid above book value, and too much of it "
                    "is a soft spot if those acquisitions underperform.\n\n"
                    "None of these numbers mean much in isolation. The habit worth "
                    "building is comparing a company's balance sheet to its own history "
                    "and to close peers in the same industry, since capital intensity "
                    "varies enormously between, say, a software company and a utility."
                ),
                category="Fundamental",
                tags="balance-sheet,fundamentals,valuation",
            ),
            dict(
                article_id="article_seed_elena_02",
                title="Intrinsic Value 101: Discounted Cash Flow for Long-Term Investors",
                summary="Why a DCF model matters less for the exact number it spits out and more for the assumptions it forces you to make explicit.",
                content=(
                    "A discounted cash flow model estimates what a business is worth "
                    "today by projecting the cash it will generate in the future and "
                    "discounting those amounts back to present value. The formula "
                    "itself is simple; the difficulty — and the value — is entirely in "
                    "the assumptions.\n\n"
                    "Three inputs drive almost all of the output: the growth rate of "
                    "free cash flow, the discount rate (usually a company's weighted "
                    "average cost of capital), and the terminal value assumption for "
                    "cash flows beyond the forecast period. Small changes to any of "
                    "these swing the final valuation dramatically, which is exactly why "
                    "professional investors treat a single-point DCF output with "
                    "suspicion and instead run a range of scenarios — bear, base, and "
                    "bull — to see how sensitive the conclusion really is.\n\n"
                    "The real value of building a DCF isn't the final number. It's the "
                    "discipline of writing down, explicitly, what has to be true about a "
                    "business for its current price to make sense — what growth rate, "
                    "what margins, what competitive position it needs to hold for how "
                    "long. Once those assumptions are on paper, it becomes much easier "
                    "to spot when a stock's price has quietly priced in an unrealistic "
                    "story.\n\n"
                    "For long-term investors, a rough DCF paired with a wide margin of "
                    "safety beats a precise-looking model built on fragile assumptions "
                    "every time."
                ),
                category="Fundamental",
                tags="DCF,intrinsic-value,valuation,long-term",
            ),
            dict(
                article_id="article_seed_elena_03",
                title="Moat Investing: What Makes a Business Truly Defensible",
                summary="A framework for separating businesses with a durable competitive advantage from ones that just happen to be doing well right now.",
                content=(
                    "A 'moat' is shorthand for whatever structurally protects a "
                    "company's profits from being competed away. The term is used "
                    "loosely a lot, so it helps to break it down into a few concrete "
                    "sources rather than treating it as a vague quality judgment.\n\n"
                    "Switching costs exist when it's expensive, risky, or disruptive for "
                    "a customer to leave — enterprise software is the classic example. "
                    "Network effects exist when a product gets more valuable as more "
                    "people use it, which is why dominant marketplaces and social "
                    "platforms are so hard to displace once they reach scale. Cost "
                    "advantages come from structural scale or unique access to cheap "
                    "inputs, not just temporary efficiency. And intangible assets — "
                    "brand trust, patents, regulatory licenses — can lock in pricing "
                    "power for decades.\n\n"
                    "The test that separates a real moat from a temporary advantage is "
                    "durability under pressure. Has the company defended its margins "
                    "through a downturn, a new competitor entering, or a technology "
                    "shift? A business that only looks strong because the whole industry "
                    "is currently doing well doesn't have a moat — it has a tailwind, "
                    "and tailwinds reverse.\n\n"
                    "Moat investing isn't about finding the cheapest stock. It's about "
                    "finding businesses worth being patient with, because the "
                    "competitive position that generates today's returns is likely to "
                    "still be intact in ten years."
                ),
                category="Fundamental",
                tags="moat,competitive-advantage,quality-investing",
            ),
        ],
        "marcus_chen": [
            dict(
                article_id="article_seed_marcus_01",
                title="Reading Candlestick Patterns: The Five You Actually Need",
                summary="Most traders try to memorise forty candlestick patterns. These five cover the situations that come up constantly and are worth actually knowing well.",
                content=(
                    "Candlestick charts pack open, high, low, and close into a single "
                    "visual, and certain recurring shapes tend to show up at turning "
                    "points. There are dozens of named patterns, but most of them are "
                    "rare or unreliable. Five come up often enough, and with enough "
                    "signal, to be worth learning properly.\n\n"
                    "The doji — where open and close are nearly identical — signals "
                    "indecision, and is most meaningful after a strong trend, where it "
                    "can mark exhaustion. The hammer and its inverse, the shooting star, "
                    "show a sharp intraday rejection of a price level and are strongest "
                    "when they appear right at a known support or resistance zone rather "
                    "than in open space. The engulfing pattern — a candle that fully "
                    "swallows the prior candle's range in the opposite direction — shows "
                    "a real shift in control between buyers and sellers, and carries more "
                    "weight on higher volume.\n\n"
                    "The single biggest mistake beginners make with candlesticks is "
                    "reading them in isolation. A hammer at a random point on the chart "
                    "means very little. A hammer forming exactly at a level that's held "
                    "three times before, on above-average volume, after an extended "
                    "decline — that's a signal worth acting on.\n\n"
                    "Treat candlestick patterns as context, not triggers. They tell you "
                    "where to pay closer attention, not what to do next on their own."
                ),
                category="Technical Analysis",
                tags="candlesticks,chart-patterns,technical",
            ),
            dict(
                article_id="article_seed_marcus_02",
                title="Support and Resistance: Why Round Numbers Matter",
                summary="A look at why price so often reacts near psychologically round levels, and how to draw support/resistance zones instead of exact lines.",
                content=(
                    "Support is a price level where buying pressure has historically "
                    "been strong enough to halt or reverse a decline. Resistance is the "
                    "mirror image on the way up. Neither is a precise line, even though "
                    "charts often make them look that way — they're better thought of "
                    "as zones, because different market participants place their orders "
                    "at slightly different prices around the same general level.\n\n"
                    "Round numbers — $50, $100, $200 — act as support and resistance "
                    "surprisingly often, and not because of anything fundamental. It's "
                    "purely behavioral: traders set stop-losses, take-profit orders, and "
                    "limit orders at round numbers because they're easy to remember and "
                    "easy to type. When enough participants cluster orders at the same "
                    "price, that price becomes self-reinforcing.\n\n"
                    "A level gains credibility each time price tests it and reverses, "
                    "but that same repeated testing also weakens it over time — each "
                    "touch absorbs some of the orders sitting at that level, so a "
                    "fourth or fifth test is statistically more likely to break through "
                    "than the first or second. This is why a 'strong' level that finally "
                    "breaks often does so decisively, with a sharp move rather than a "
                    "slow grind.\n\n"
                    "The practical takeaway: draw zones, not lines, expect the first "
                    "test of a fresh level to be the most reliable, and treat repeated "
                    "failed breaks as a warning that a breakout may be building."
                ),
                category="Technical Analysis",
                tags="support-resistance,price-action,technical",
            ),
            dict(
                article_id="article_seed_marcus_03",
                title="Fibonacci Retracements: Tool or Self-Fulfilling Prophecy?",
                summary="An honest look at why Fibonacci retracement levels seem to work, separating the math from the crowd psychology that actually drives it.",
                content=(
                    "Fibonacci retracement tools mark levels — most commonly 38.2%, "
                    "50%, and 61.8% — between a recent swing high and swing low, on the "
                    "idea that a pullback often reverses near one of these ratios before "
                    "the prior trend resumes.\n\n"
                    "There's no established economic reason price should respect ratios "
                    "derived from a 13th-century sequence describing rabbit population "
                    "growth. The honest explanation is closer to a self-fulfilling "
                    "prophecy: because so many traders watch the same levels and place "
                    "orders around them, those levels end up mattering — not because of "
                    "the math, but because of the shared attention.\n\n"
                    "That doesn't make the tool useless, but it changes how it should be "
                    "used. Fibonacci levels work best as one input layered onto an "
                    "existing area of interest — a retracement level that lines up with "
                    "a prior support zone or a round number carries more weight than "
                    "either signal alone. A retracement level sitting in open space with "
                    "no other confluence is far less reliable.\n\n"
                    "Used this way — as a confluence tool rather than a standalone "
                    "signal — Fibonacci retracements can sharpen entries. Used as a "
                    "trigger on their own, they're closer to numerology than analysis."
                ),
                category="Technical Analysis",
                tags="fibonacci,retracement,confluence,technical",
            ),
        ],
        "priya_sharma": [
            dict(
                article_id="article_seed_priya_01",
                title="Covered Calls: Generating Income From Stocks You Already Own",
                summary="How the covered call strategy works, what it actually trades away in exchange for income, and when it fits a portfolio.",
                content=(
                    "A covered call means selling a call option against shares you "
                    "already own. In exchange for collecting a premium up front, you "
                    "agree to sell those shares at the option's strike price if the "
                    "stock rises above it before expiration.\n\n"
                    "The strategy works best on stocks you're comfortable holding "
                    "long-term but don't expect to make an explosive move in the near "
                    "term. The premium collected provides some income and a small "
                    "cushion against a decline, but it comes at a real cost: if the "
                    "stock rallies sharply past the strike, you're capped — your upside "
                    "is sold away for the premium you collected, and you'll be forced to "
                    "sell shares you might have preferred to keep.\n\n"
                    "Strike selection is the entire game. A strike close to the current "
                    "price generates more premium but caps upside almost immediately. A "
                    "strike further out of the money generates less premium but leaves "
                    "more room for the stock to run before you're capped. Many investors "
                    "target strikes around 5-10% above the current price with 30-45 days "
                    "to expiration as a starting point, then adjust based on how much "
                    "upside conviction they have.\n\n"
                    "Covered calls aren't a way to eliminate risk — the downside on the "
                    "stock is still fully there, just slightly cushioned by the premium. "
                    "They're best understood as a tool for converting some of a "
                    "position's expected upside into current income, which only makes "
                    "sense if you're genuinely willing to make that trade."
                ),
                category="Risk Management",
                tags="options,covered-calls,income,risk",
            ),
            dict(
                article_id="article_seed_priya_02",
                title="Understanding Implied Volatility Before You Trade Options",
                summary="Why the price of an option depends as much on expected future volatility as it does on where the stock is trading right now.",
                content=(
                    "Implied volatility (IV) is the market's estimate of how much a "
                    "stock is likely to move going forward, expressed as an annualised "
                    "percentage and baked directly into an option's price. It's the one "
                    "variable in an option price that isn't directly observable — "
                    "everything else (stock price, strike, time to expiration, interest "
                    "rates) is known, and IV is solved for backward from the option's "
                    "market price.\n\n"
                    "High IV means options are expensive relative to the stock's price; "
                    "low IV means they're cheap. This matters enormously depending on "
                    "which side of a trade you're on. Buying options when IV is "
                    "elevated — right before an earnings report, for example — means "
                    "paying a premium that can evaporate quickly even if you're right "
                    "about direction, because IV tends to collapse once the uncertain "
                    "event passes ('volatility crush').\n\n"
                    "Selling options when IV is elevated captures that same premium "
                    "instead of paying it, which is why many income-focused options "
                    "strategies are built around selling volatility rather than betting "
                    "on direction. The tradeoff is that selling options carries "
                    "asymmetric risk — the premium collected is capped, but losses on an "
                    "uncovered position are not.\n\n"
                    "Before placing any options trade, it's worth checking where current "
                    "IV sits relative to that stock's own recent history (its IV rank or "
                    "IV percentile). The same absolute IV number can be cheap for one "
                    "stock and expensive for another."
                ),
                category="Risk Management",
                tags="options,implied-volatility,risk-management",
            ),
            dict(
                article_id="article_seed_priya_03",
                title="Position Sizing Under Uncertainty: A Framework",
                summary="A practical way to decide how large a position should be, based on conviction and the size of the potential loss rather than gut feel.",
                content=(
                    "Most investors spend far more time deciding what to buy than how "
                    "much to buy — which is backwards, because position sizing has a "
                    "bigger impact on long-term results than stock selection alone. Two "
                    "investors with identical picks can end up with completely different "
                    "outcomes purely based on how they sized their positions.\n\n"
                    "A useful starting framework ties position size to two things: how "
                    "far the stop-loss is from entry, and how much of the total "
                    "portfolio you're willing to risk on any single idea being wrong. If "
                    "you're willing to risk 1-2% of your portfolio on a trade, and your "
                    "stop is 10% below entry, the position size falls out of the math "
                    "directly — you're not picking a dollar amount arbitrarily, you're "
                    "working backward from the risk you've already decided is "
                    "acceptable.\n\n"
                    "Conviction should adjust the range, not override the framework "
                    "entirely. A higher-conviction idea might justify sizing toward the "
                    "top of your normal range rather than doubling your usual risk per "
                    "trade — because conviction is a feeling, and feelings are wrong "
                    "often enough that the framework needs to survive being wrong.\n\n"
                    "The goal of position sizing isn't to maximise the return on any "
                    "single trade. It's to make sure no single trade — however "
                    "confident you feel about it going in — can meaningfully damage the "
                    "portfolio if it doesn't work out."
                ),
                category="Risk Management",
                tags="position-sizing,risk,portfolio-management",
            ),
        ],
        "david_okafor": [
            dict(
                article_id="article_seed_david_01",
                title="Reading Central Bank Language: What 'Data Dependent' Really Means",
                summary="A guide to decoding the deliberately vague language central banks use, and what shifts in wording tend to signal about future policy.",
                content=(
                    "Central bank statements are written to be parsed word by word, "
                    "which is why markets can swing on a single adjective changing "
                    "between meetings. Understanding a handful of recurring phrases goes "
                    "a long way toward reading these statements the way professional "
                    "traders do.\n\n"
                    "'Data dependent' signals that the central bank isn't committing to a "
                    "pre-set path — future decisions hinge on incoming inflation and "
                    "employment figures. This phrase tends to appear more when policy is "
                    "close to a turning point, since a bank with a clear, committed path "
                    "doesn't need to hedge as much. 'Patient' or 'wait and see' signals a "
                    "pause is likely at the next meeting. References to policy being "
                    "'restrictive' versus 'accommodative' tell you where the bank "
                    "believes current rates sit relative to a neutral level.\n\n"
                    "Just as important as the words themselves is what changed from the "
                    "previous statement. Markets react less to the overall message and "
                    "more to the marginal shift — a single word softened or hardened "
                    "compared to last time often moves yields and currencies more than "
                    "the headline decision itself, because the decision was usually "
                    "already priced in.\n\n"
                    "The practical skill here isn't predicting policy — it's noticing "
                    "when the market's prior expectation and the actual language "
                    "diverge, since that gap is usually where the volatility comes from."
                ),
                category="Market News",
                tags="central-banks,monetary-policy,macro",
            ),
            dict(
                article_id="article_seed_david_02",
                title="Currency Moves and Your Portfolio: A Primer on FX Risk",
                summary="Why holding foreign stocks or ETFs means taking on a second, often overlooked bet on that country's currency.",
                content=(
                    "Any time you own an asset denominated in a currency other than "
                    "your own, your total return is made up of two separate pieces: how "
                    "the asset performed in its local currency, and how that currency "
                    "moved against yours over the same period. Investors often focus "
                    "entirely on the first and forget the second exists.\n\n"
                    "A stock can rise 10% in its local market and still lose you money "
                    "if that country's currency falls more than 10% against your own "
                    "over the same period — and the reverse is equally true, where a "
                    "flat or even negative local return can still produce a solid gain "
                    "once converted back, if the currency moved in your favour.\n\n"
                    "This matters most for two groups of investors: those holding "
                    "unhedged international ETFs, where currency swings can dominate "
                    "short-term returns even when the underlying companies are doing "
                    "fine, and those holding assets in countries with higher inflation "
                    "or less stable monetary policy, where currency depreciation can be "
                    "a persistent structural drag rather than short-term noise.\n\n"
                    "You don't need to actively trade currencies to manage this risk. "
                    "The simplest step is just being aware of how much of your portfolio "
                    "sits in unhedged foreign-currency exposure, and deciding "
                    "deliberately whether that's a bet you actually want to be making, "
                    "or one that's showing up in your returns by accident."
                ),
                category="Market News",
                tags="currency,FX,international-investing,macro",
            ),
            dict(
                article_id="article_seed_david_03",
                title="Emerging Markets in a Higher-Rate World",
                summary="How a sustained period of higher developed-market interest rates changes the calculus for investing in emerging economies.",
                content=(
                    "Emerging market assets are unusually sensitive to developed-market "
                    "interest rates, particularly U.S. rates, because a large share of "
                    "emerging market government and corporate debt is issued in U.S. "
                    "dollars. When U.S. rates rise, that debt gets more expensive to "
                    "service, and dollar-denominated capital that once flowed freely "
                    "into higher-yielding emerging markets has less incentive to leave "
                    "home.\n\n"
                    "This creates a fairly reliable pattern: periods of aggressive "
                    "developed-market rate hikes tend to coincide with emerging market "
                    "underperformance and currency weakness, as capital rotates back "
                    "toward higher-yielding, lower-risk developed assets. The reverse "
                    "tends to hold during rate-cutting cycles, when the 'search for "
                    "yield' pushes capital back out along the risk curve.\n\n"
                    "Not all emerging markets are affected equally. Countries with large "
                    "current account deficits, heavy reliance on external dollar "
                    "financing, or high foreign ownership of local debt are the most "
                    "exposed. Countries with strong domestic savings, current account "
                    "surpluses, or significant commodity export revenue tend to weather "
                    "these cycles considerably better.\n\n"
                    "For an investor considering emerging market exposure, the useful "
                    "question isn't just 'which market has the best growth story' — "
                    "it's how exposed that specific market is to a stronger dollar and "
                    "tighter global liquidity, since that variable has historically "
                    "explained more of the volatility than local growth headlines."
                ),
                category="Market News",
                tags="emerging-markets,interest-rates,macro,global",
            ),
        ],
        "sofia_martins": [
            dict(
                article_id="article_seed_sofia_01",
                title="Building a Barbell Portfolio: Pairing Blue Chips With High-Conviction Bets",
                summary="A strategy for combining a stable core with a small allocation to higher-risk, higher-upside positions like crypto or early-stage growth names.",
                content=(
                    "A barbell portfolio deliberately avoids the middle of the risk "
                    "spectrum. Instead of a portfolio full of moderately risky assets, "
                    "it pairs a large, very stable core with a small, deliberately "
                    "high-risk satellite — skipping the 'medium risk' assets in between "
                    "that offer neither strong downside protection nor meaningful upside "
                    "convexity.\n\n"
                    "In practice, this might look like 85-90% of a portfolio in broad "
                    "index funds, high-quality bonds, and blue-chip dividend payers, "
                    "with the remaining 10-15% allocated to positions with genuine "
                    "asymmetric upside — a basket of digital assets, early-stage growth "
                    "names, or venture-style bets. The core is sized to survive the "
                    "satellite going to zero without derailing long-term goals; the "
                    "satellite is sized to meaningfully move the needle if it works.\n\n"
                    "The psychological benefit is underrated: because the risky sleeve "
                    "is capped by design, it's much easier to actually hold through "
                    "volatility instead of panic-selling, since a 50% drawdown in a 10% "
                    "allocation is a 5% portfolio impact, not a catastrophe.\n\n"
                    "The discipline that makes a barbell work is refusing to let the "
                    "satellite creep upward after a winning streak. Rebalancing back to "
                    "target weights periodically is what keeps the strategy's risk "
                    "profile honest over time."
                ),
                category="Strategy",
                tags="portfolio-strategy,barbell,asset-allocation",
            ),
            dict(
                article_id="article_seed_sofia_02",
                title="Dollar-Cost Averaging Into Volatile Assets: Does It Actually Work?",
                summary="What the math actually says about spreading purchases over time versus investing a lump sum, especially for highly volatile assets.",
                content=(
                    "Dollar-cost averaging (DCA) means investing a fixed amount at "
                    "regular intervals regardless of price, rather than deploying all "
                    "your capital at once. It's especially popular for volatile assets "
                    "like individual growth stocks or crypto, where the fear of buying "
                    "right before a sharp drop is a real psychological barrier.\n\n"
                    "Mathematically, lump-sum investing outperforms DCA more often than "
                    "not, simply because markets trend upward over long periods more "
                    "often than they decline — money invested sooner has more time "
                    "exposed to that upward drift. Historical studies on major indices "
                    "generally show lump-sum beating DCA in roughly two-thirds of "
                    "rolling periods.\n\n"
                    "That statistic misses the actual reason people use DCA, though: "
                    "it's a behavioral tool, not a return-maximising one. DCA reduces "
                    "the regret of a single bad-timing decision, since no one purchase "
                    "determines the outcome, and it lowers the emotional barrier to "
                    "actually investing consistently rather than sitting in cash waiting "
                    "for a 'better' entry point that may never come. For highly "
                    "volatile assets specifically, DCA also meaningfully reduces the "
                    "variance of your average entry price, even if it doesn't improve "
                    "the expected return.\n\n"
                    "The honest framing: DCA is a tool for making sure you actually "
                    "invest, consistently, without needing to predict short-term price "
                    "moves — not a strategy that beats lump-sum on expected return."
                ),
                category="Strategy",
                tags="dollar-cost-averaging,crypto,volatility,strategy",
            ),
            dict(
                article_id="article_seed_sofia_03",
                title="On-Chain Metrics 101: What Active Addresses and Exchange Flows Tell You",
                summary="An introduction to reading blockchain data directly, rather than relying solely on price charts, when evaluating crypto assets.",
                content=(
                    "Unlike traditional equities, blockchain-based assets come with a "
                    "public, real-time ledger of every transaction — which means "
                    "investors have a source of fundamental-style data that simply "
                    "doesn't exist for most other asset classes. Learning to read a few "
                    "core on-chain metrics adds a layer of information beyond price "
                    "charts alone.\n\n"
                    "Active addresses — the count of unique wallets transacting in a "
                    "given period — is a rough proxy for actual network usage, similar "
                    "to daily active users for a tech platform. A price rally "
                    "unaccompanied by rising active addresses is a warning sign that the "
                    "move may be speculative rather than usage-driven.\n\n"
                    "Exchange flows track the net movement of an asset onto or off "
                    "centralized exchanges. Large net inflows to exchanges often precede "
                    "selling pressure, since assets typically need to be on an exchange "
                    "to be sold. Sustained net outflows — coins moving into private "
                    "wallets or long-term custody — are generally read as a sign holders "
                    "expect to hold rather than sell soon.\n\n"
                    "None of these metrics work as standalone trading signals — they're "
                    "noisy, and can be skewed by a handful of large wallets. Used "
                    "alongside price action and broader market context, though, on-chain "
                    "data gives crypto investors a genuine informational edge that "
                    "simply isn't available when analysing a traditional equity."
                ),
                category="Strategy",
                tags="crypto,on-chain,blockchain,data",
            ),
        ],
    }

    added = 0
    with get_session() as session:
        for username, articles in ARTICLES_BY_EXPERT.items():
            info = experts.get(username)
            if not info:
                continue
            for a in articles:
                if session.query(Article).filter(
                    Article.article_id == a["article_id"]
                ).first():
                    continue
                session.add(Article(
                    article_id=a["article_id"],
                    expert_id=info["expert_id"],
                    author_type="expert",
                    title=a["title"],
                    summary=a["summary"],
                    content=a["content"],
                    category=a["category"],
                    tags=a["tags"],
                    status="published",
                ))
                added += 1
        session.flush()

    print(f"[SEED] Added {added} Knowledge Hub articles across {len(experts)} experts")
