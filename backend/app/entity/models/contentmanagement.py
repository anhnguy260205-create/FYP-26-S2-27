from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from app.entity.database.base import Base
from app.entity.database.session import get_session
from uuid import uuid4


class ContentManagement(Base):
    __tablename__ = "content_management"

    content_id = Column(String(50), primary_key=True, default=lambda: f"content_{uuid4()}")
    section = Column(String(50), nullable=False)   # e.g. "hero", "why_investor", "platform_features"
    title = Column(String(255), nullable=False)
    # This used to be String(500), widened to MEDIUMTEXT so longer content
    # (or, previously, base64 images) wouldn't get truncated. Kept as
    # MEDIUMTEXT even after the image-upload feature was pulled since it
    # doesn't cost anything to leave it roomy.
    description = Column(MEDIUMTEXT, nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    @staticmethod
    def get_all():
        with get_session() as session:
            rows = session.query(ContentManagement).order_by(
                ContentManagement.section, ContentManagement.order_index
            ).all()
            return [_serialize(r) for r in rows]

    @staticmethod
    def get_by_section(section: str):
        with get_session() as session:
            rows = session.query(ContentManagement).filter(
                ContentManagement.section == section,
                ContentManagement.is_active == True
            ).order_by(ContentManagement.order_index).all()
            return [_serialize(r) for r in rows]

    @staticmethod
    def update(content_id: str, title: str, description: str) -> bool:
        with get_session() as session:
            row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id
            ).first()
            if not row:
                return False
            row.title = title
            row.description = description
            return True

    @staticmethod
    def reorder_section(section: str, ordered_ids: list) -> bool:
        """Saves a full new ordering for one section in a single call —
        order_index just becomes each id's position in ordered_ids. This is
        what backs the drag-and-drop reordering in the admin panel (feature
        cards, footer links, plan features, etc): the frontend reorders the
        list locally while you drag, then sends the whole new order here at
        once instead of a bunch of one-step swaps."""
        with get_session() as session:
            rows = session.query(ContentManagement).filter(
                ContentManagement.section == section,
                ContentManagement.content_id.in_(ordered_ids),
            ).all()
            by_id = {r.content_id: r for r in rows}
            if len(by_id) != len(ordered_ids):
                return False  # caller sent an id that doesn't belong to this section
            for index, content_id in enumerate(ordered_ids):
                by_id[content_id].order_index = index
            return True


def _serialize(row: ContentManagement) -> dict:
    return {
        "content_id": row.content_id,
        "section": row.section,
        "title": row.title,
        "description": row.description,
        "order_index": row.order_index,
        "is_active": row.is_active,
    }


def seed_landing_content():
    with get_session() as session:
        existing_ids = {r[0] for r in session.query(ContentManagement.content_id).all()}

        entries = [
            # Landing page hero
            ContentManagement(content_id="content_hero", section="hero",
                           title="Discover the Future of Smart Investing",
                           description="Explore powerful tools floating around your financial universe.",
                           order_index=0),
            ContentManagement(content_id="hero_cta_primary",   section="hero_cta", title="Get Started", order_index=0),
            ContentManagement(content_id="hero_cta_secondary", section="hero_cta", title="Login",       order_index=1),
            # Free plan info
            ContentManagement(content_id="free_plan_name",  section="free_plan", title="Starter", description="",                        order_index=0),
            ContentManagement(content_id="free_plan_price", section="free_plan", title="$0.00",   description="forever, no card needed", order_index=1),
            # Premium plan info
            ContentManagement(content_id="premium_plan_name",  section="premium_plan", title="Pro",     description="",                             order_index=0),
            ContentManagement(content_id="premium_plan_price", section="premium_plan", title="$20.99",  description="per month, billed annually",   order_index=1),
            # Free investor subscription features
            ContentManagement(content_id="free_feat_0", section="free_investor", title="Limited AI-Powered Stock Recommendations", order_index=0),
            ContentManagement(content_id="free_feat_1", section="free_investor", title="Limited Personal Watchlist Management",    order_index=1),
            ContentManagement(content_id="free_feat_2", section="free_investor", title="Limited Expert Portfolio Access",          order_index=2),
            ContentManagement(content_id="free_feat_3", section="free_investor", title="Real-Time Market Dashboard",               order_index=3),
            ContentManagement(content_id="free_feat_4", section="free_investor", title="Knowledge Hub Access",                     order_index=4),
            ContentManagement(content_id="free_feat_5", section="free_investor", title="AI Investment Chatbot",                    order_index=5),
            ContentManagement(content_id="free_feat_6", section="free_investor", title="Paper Trading",                            order_index=6),
            # Footer — brand
            ContentManagement(content_id="footer_brand",         section="footer_brand",   title="Rocket Trading",              description="AI-powered stock market predictions for the modern investor.", order_index=0),
            # Footer — version badge shown next to the brand name (e.g. "v1.0.0")
            ContentManagement(content_id="footer_version",       section="footer_meta",    title="v1.0.0",                       order_index=0),
            # Footer — product links (title = label, description = URL)
            ContentManagement(content_id="footer_product_0",     section="footer_product", title="Features",            description="#", order_index=0),
            ContentManagement(content_id="footer_product_1",     section="footer_product", title="Pricing",             description="#", order_index=1),
            # Footer — company links
            ContentManagement(content_id="footer_company_0",     section="footer_company", title="About Us",            description="#", order_index=0),
            ContentManagement(content_id="footer_company_1",     section="footer_company", title="Careers",             description="#", order_index=1),
            ContentManagement(content_id="footer_company_2",     section="footer_company", title="Blog",                description="#", order_index=2),
            ContentManagement(content_id="footer_company_3",     section="footer_company", title="Press",               description="#", order_index=3),
            ContentManagement(content_id="footer_company_4",     section="footer_company", title="Reviews",             description="/reviews", order_index=4),
            # Footer — resources links (was hardcoded and unreachable from admin before)
            ContentManagement(content_id="footer_resources_0",   section="footer_resources", title="GitHub Repository", description="#", order_index=0),
            ContentManagement(content_id="footer_resources_1",   section="footer_resources", title="Documentation",     description="#", order_index=1),
            ContentManagement(content_id="footer_resources_2",   section="footer_resources", title="API Status",        description="#", order_index=2),
            # Footer — contact
            ContentManagement(content_id="footer_contact_email", section="footer_contact", title="support@deskstock.ai", description="", order_index=0),
            ContentManagement(content_id="footer_contact_0",     section="footer_contact", title="Help Center",          description="#", order_index=1),
            ContentManagement(content_id="footer_contact_1",     section="footer_contact", title="Terms of Service",     description="#", order_index=2),
            ContentManagement(content_id="footer_contact_2",     section="footer_contact", title="Privacy Policy",       description="#", order_index=3),
            # Premium investor subscription features
            ContentManagement(content_id="prem_feat_0", section="premium_investor", title="Everything in Free Plan",           order_index=0),
            ContentManagement(content_id="prem_feat_1", section="premium_investor", title="Unlimited AI Stock Predictions",    order_index=1),
            ContentManagement(content_id="prem_feat_2", section="premium_investor", title="Expert Consultation Access",        order_index=2),
            ContentManagement(content_id="prem_feat_3", section="premium_investor", title="Advanced Portfolio Analytics",      order_index=3),
            ContentManagement(content_id="prem_feat_4", section="premium_investor", title="Priority Customer Support",         order_index=4),

            # Section headings/subtitles for the landing page. These used to be
            # hardcoded straight into Homepage.jsx (title = heading, description = subtitle).
            ContentManagement(content_id="header_video",             section="page_headers", title="See RocketTrade in Action",                description="Watch a quick walkthrough of the platform and its AI-powered tools.", order_index=0),
            ContentManagement(content_id="header_path",               section="page_headers", title="Choose Your Path",                          description="Tell us who you are, so we can show you what matters most.", order_index=1),
            ContentManagement(content_id="header_why_investor",       section="page_headers", title="Why RocketTrade",                           description="Built to help you invest smarter, without the real-money risk.", order_index=2),
            ContentManagement(content_id="header_why_expert",         section="page_headers", title="Why Become a RocketTrade Expert",            description="Turn your market knowledge into income and influence.", order_index=3),
            ContentManagement(content_id="header_features_investor",  section="page_headers", title="Everything You Need to Invest Smarter",      description="One platform, six ways to sharpen your edge.", order_index=4),
            ContentManagement(content_id="header_features_expert",    section="page_headers", title="Everything You Get as an Expert",            description="One platform, six ways to get paid and get seen.", order_index=5),
            ContentManagement(content_id="header_pricing",            section="page_headers", title="Simple, Transparent Pricing",                description="Compare our Free and Pro plans — create an investor account to get started.", order_index=6),
            ContentManagement(content_id="header_started",            section="page_headers", title="How to Get Started",                         description="Signing up only takes a few minutes, for investors and experts alike.", order_index=7),
            ContentManagement(content_id="header_faq",                section="page_headers", title="Frequently Asked Questions",                 description="Everything you need to know before you get started.", order_index=8),

            # Choose Your Path — the two role toggle cards
            ContentManagement(content_id="role_investor", section="role_options", title="Investor", description="Trade, learn, and get AI-backed predictions", order_index=0),
            ContentManagement(content_id="role_expert",   section="role_options", title="Expert",   description="Publish insights and mentor investors",       order_index=1),

            # "Everything You Need to Invest Smarter" — investor feature cards
            ContentManagement(content_id="platform_feat_0", section="platform_features", title="Paper Trading Exchange",             description="Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.", order_index=0),
            ContentManagement(content_id="platform_feat_1", section="platform_features", title="AI Stock Predictions",               description="Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.", order_index=1),
            ContentManagement(content_id="platform_feat_2", section="platform_features", title="Investor Community",                 description="Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.", order_index=2),
            ContentManagement(content_id="platform_feat_3", section="platform_features", title="AI Chatbot & Expert Consultants",    description="Get instant answers from our AI assistant, or browse and connect with verified market experts.", order_index=3),
            ContentManagement(content_id="platform_feat_4", section="platform_features", title="Educational Content",                description="Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.", order_index=4),
            ContentManagement(content_id="platform_feat_5", section="platform_features", title="Ask the Experts",                    description="Submit your investing questions directly to verified experts and get personalized answers.", order_index=5),

            # "Everything You Get as an Expert" — expert feature cards
            ContentManagement(content_id="expert_feat_0", section="expert_features", title="Paid Consultations",             description="Offer 1-on-1 sessions with investors and earn directly for your time and expertise.", order_index=0),
            ContentManagement(content_id="expert_feat_1", section="expert_features", title="Verified Expert Badge",          description="Stand out with a trust badge that boosts your visibility across the platform.", order_index=1),
            ContentManagement(content_id="expert_feat_2", section="expert_features", title="Publish Educational Content",    description="Share articles in the Knowledge Hub and become a go-to voice for new investors.", order_index=2),
            ContentManagement(content_id="expert_feat_3", section="expert_features", title="Answer Investor Questions",      description="Respond to Ask the Experts questions and grow your following one answer at a time.", order_index=3),
            ContentManagement(content_id="expert_feat_4", section="expert_features", title="Publish Portfolio Insights",     description="Share your strategy and quant calls, and let investors follow your track record.", order_index=4),
            ContentManagement(content_id="expert_feat_5", section="expert_features", title="AI-Matched Reach",               description="Get surfaced to investors using AI predictions who want a human expert's take.", order_index=5),

            # "Why RocketTrade" — investor trust cards
            ContentManagement(content_id="why_investor_0", section="why_investor", title="Zero-Risk Learning", description="Practice with virtual funds against live market prices — sharpen your instincts without risking real money.", order_index=0),
            ContentManagement(content_id="why_investor_1", section="why_investor", title="AI when you need speed. Experts when you need certainty.", description="Live prices and news sentiment keep your paper portfolio in sync with what's actually happening in the market.", order_index=1),
            ContentManagement(content_id="why_investor_2", section="why_investor", title="Expert-Backed Community", description="Learn alongside fellow investors and get answers straight from verified market experts.", order_index=2),

            # "Why Become a RocketTrade Expert" — expert trust cards
            ContentManagement(content_id="why_expert_0", section="why_expert", title="Get Paid for Your Expertise", description="Earn from paid consultations and premium content — your market knowledge has real value here.", order_index=0),
            ContentManagement(content_id="why_expert_1", section="why_expert", title="Be the certainty investors need when speed isn't enough.", description="Reach investors who are already using AI predictions and want a real expert to validate the call.", order_index=1),
            ContentManagement(content_id="why_expert_2", section="why_expert", title="Build a Following You Own", description="Grow your reputation through Q&A, portfolio publishing, and the community forum.", order_index=2),

            # FAQ (title = question, description = answer)
            ContentManagement(content_id="faq_0", section="faq", title="Is this real money trading?", description="No. RocketTrade is a paper trading platform — you trade against live market prices using virtual funds, so you can build real skills with zero financial risk.", order_index=0),
            ContentManagement(content_id="faq_1", section="faq", title="How much does it cost to use RocketTrade?", description="You can start for free with our Starter plan. Upgrade to Pro anytime for unlimited AI predictions, deeper quant ratings, and priority expert access.", order_index=1),
            ContentManagement(content_id="faq_2", section="faq", title="How accurate are the AI predictions?", description="Our models combine technical indicators and news sentiment to forecast short-term price direction. They're a decision-support tool, not a guarantee, so always do your own research too.", order_index=2),
            ContentManagement(content_id="faq_3", section="faq", title="Do I need any trading experience to get started?", description="Not at all. Our Educational Content library covers everything from beginner basics to advanced strategy, so you can learn as you go.", order_index=3),
            ContentManagement(content_id="faq_4", section="faq", title="Can I get help from a real person?", description="Yes — chat instantly with our AI assistant, or connect with a verified market expert through consultations and Q&A.", order_index=4),
            ContentManagement(content_id="faq_5", section="faq", title="Can I cancel or change my plan anytime?", description="Yes, you can upgrade, downgrade, or cancel your subscription at any time from your account settings.", order_index=5),

            # "How to Get Started" — registration steps (STEP 1/2/3/4 label comes from position, not stored)
            ContentManagement(content_id="get_started_0", section="get_started_steps", title="Choose your role & sign up", description="Pick Investor or Expert, then create your account with a username, email, and password.", order_index=0),
            ContentManagement(content_id="get_started_1", section="get_started_steps", title="Verify your email",           description="Confirm the verification email we send you to activate your account.", order_index=1),
            ContentManagement(content_id="get_started_2", section="get_started_steps", title="Agree to the terms",         description="Review and accept RocketTrade's Terms and Conditions and Privacy Policy.", order_index=2),
            ContentManagement(content_id="get_started_3", section="get_started_steps", title="Start using RocketTrade",    description="Investors jump straight into paper trading; Experts get verified before publishing insights.", order_index=3),

            # Investor home page (LoggedInHomePage.jsx) — same content for
            # Basic and Premium, used to be hardcoded straight into the component.
            ContentManagement(content_id="header_investor_features", section="page_headers", title="Explore RocketTrade", description="Everything the platform offers, all in one place", order_index=9),
            ContentManagement(content_id="investor_home_feat_0", section="investor_home_features", title="Paper Trading Exchange",          description="Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.", order_index=0),
            ContentManagement(content_id="investor_home_feat_1", section="investor_home_features", title="AI Stock Predictions",            description="Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.", order_index=1),
            ContentManagement(content_id="investor_home_feat_2", section="investor_home_features", title="Investor Community",              description="Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.", order_index=2),
            ContentManagement(content_id="investor_home_feat_3", section="investor_home_features", title="AI Chatbot & Expert Consultants", description="Get instant answers from our AI assistant, or browse and connect with verified market experts.", order_index=3),
            ContentManagement(content_id="investor_home_feat_4", section="investor_home_features", title="Educational Content",             description="Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.", order_index=4),
            # Button text for each card above, matched up by position (same index,
            # "_cta" suffix on the id). Went with sibling rows instead of adding a
            # 3rd column to the table — didn't want a schema change just for this.
            ContentManagement(content_id="investor_home_feat_0_cta", section="investor_home_features_cta", title="Start trading", order_index=0),
            ContentManagement(content_id="investor_home_feat_1_cta", section="investor_home_features_cta", title="Explore",       order_index=1),
            ContentManagement(content_id="investor_home_feat_2_cta", section="investor_home_features_cta", title="Explore",       order_index=2),
            ContentManagement(content_id="investor_home_feat_3_cta", section="investor_home_features_cta", title="Explore",       order_index=3),
            ContentManagement(content_id="investor_home_feat_4_cta", section="investor_home_features_cta", title="Explore",       order_index=4),

            ContentManagement(content_id="header_investor_dashboard", section="page_headers", title="The Realtime Trading Dashboard", description="One screen for every stock — AI-powered predictions, verified expert commentary, and paper trading against live market prices.", order_index=10),
            ContentManagement(content_id="investor_home_dash_0", section="investor_home_dashboard", title="AI Predictions",             description="Multi-day price forecasts and confidence scores powered by machine learning.", order_index=0),
            ContentManagement(content_id="investor_home_dash_1", section="investor_home_dashboard", title="Verified Expert Comments",   description="Get insights straight from verified market experts on every stock page.", order_index=1),
            ContentManagement(content_id="investor_home_dash_2", section="investor_home_dashboard", title="Paper Trading",              description="Trade against live market prices using virtual funds, zero real-money risk.", order_index=2),

            # The rest of the investor dashboard — was still hardcoded even
            # after the sections above got wired up.
            ContentManagement(content_id="header_ai_insights", section="page_headers", title="Today's AI Insights", order_index=12),
            # These 4 swap in depending on the investor's state — first 3 by
            # portfolio risk level, last one while data's still loading.
            ContentManagement(content_id="ai_tagline_low",     section="investor_home_taglines", title="Your portfolio is looking healthy today.", order_index=0),
            ContentManagement(content_id="ai_tagline_medium",  section="investor_home_taglines", title="Moderate risk today — worth a quick check-in.", order_index=1),
            ContentManagement(content_id="ai_tagline_high",    section="investor_home_taglines", title="Higher risk today — you may want to review your positions.", order_index=2),
            ContentManagement(content_id="ai_tagline_loading", section="investor_home_taglines", title="Personalized signals from RocketTrade's prediction models", order_index=3),

            ContentManagement(content_id="header_portfolio_summary", section="page_headers", title="Portfolio Summary", order_index=13),
            ContentManagement(content_id="portfolio_summary_cta",    section="investor_home_misc", title="View Full Portfolio \u2192", order_index=0),

            ContentManagement(content_id="header_watchlist", section="page_headers", title="My Watchlist", order_index=14),
            ContentManagement(content_id="watchlist_cta",    section="investor_home_misc", title="View Full Watchlist \u2192", order_index=1),

            # Shown in the hero instead of today's P&L, only for investors
            # with zero holdings so far.
            ContentManagement(content_id="hero_empty_state", section="investor_home_misc", title="Start building your portfolio with your first trade.", order_index=2),

            # Small badge/tag shown on each Platform Features card (top-right corner)
            ContentManagement(content_id="investor_home_feat_0_badge", section="investor_home_features_badge", title="Live market prices",    order_index=0),
            ContentManagement(content_id="investor_home_feat_1_badge", section="investor_home_features_badge", title="ML-powered forecasts",   order_index=1),
            ContentManagement(content_id="investor_home_feat_2_badge", section="investor_home_features_badge", title="Live discussions",        order_index=2),
            ContentManagement(content_id="investor_home_feat_3_badge", section="investor_home_features_badge", title="Ask anything",            order_index=3),
            ContentManagement(content_id="investor_home_feat_4_badge", section="investor_home_features_badge", title="Beginner to advanced",     order_index=4),

            # Watchlist card when it's empty (no stocks added yet)
            ContentManagement(content_id="header_watchlist_empty", section="page_headers", title="Start building your watchlist",
                description="Track stocks you're interested in and receive AI insights on how they're moving.", order_index=15),
            ContentManagement(content_id="watchlist_empty_cta", section="investor_home_misc", title="+ Add Stocks", order_index=3),

            # Basic-tier upgrade banner — only shows while subscription_status != "premium"
            ContentManagement(content_id="investor_banner_basic", section="investor_banner_basic",
                title="Stop guessing. Start trading with an edge.",
                description="Unlock custom price alerts, deeper AI forecasts, and priority access to verified experts — for less than a coffee a day.",
                order_index=0),
            ContentManagement(content_id="investor_banner_basic_cta", section="investor_banner_basic", title="View Pricing", order_index=1),

            # Premium-tier renewal banner — only shows while subscription_status == "premium".
            # "{days}" gets swapped client-side for the actual number of days left
            # until sub_renewal_date, see LoggedInHomePage.jsx for that part.
            ContentManagement(content_id="investor_banner_premium", section="investor_banner_premium",
                title="You're a Premium Member",
                description="Enjoy unlimited AI predictions, expert access, and advanced analytics. {days} days left until your subscription renews.",
                order_index=0),
            ContentManagement(content_id="investor_banner_premium_cta", section="investor_banner_premium", title="Manage Subscription", order_index=1),

            # Expert home page (ExpertLoggedInPage.jsx) — also used to be hardcoded
            ContentManagement(content_id="expert_hero_subtitle", section="expert_hero",
                title="Manage your portfolio, publish content, and connect with investors.", order_index=0),
            ContentManagement(content_id="header_expert_tools", section="page_headers", title="Your Tools", description="Everything you need to publish, answer, and grow your reach", order_index=11),
            ContentManagement(content_id="expert_tool_0", section="expert_tools", title="Real-time Dashboard", description="View live stock prices, AI-powered predictions, and market insights to support investment decision-making.", order_index=0),
            ContentManagement(content_id="expert_tool_1", section="expert_tools", title="Knowledge Hub",       description="Write and publish educational articles for investors, from beginner basics to advanced strategy.", order_index=1),
            ContentManagement(content_id="expert_tool_2", section="expert_tools", title="Community Forum",     description="Join discussions with investors and fellow experts on markets, strategy, and platform news.", order_index=2),
            ContentManagement(content_id="expert_tool_3", section="expert_tools", title="Model Portfolio",     description="Publish and rebalance the model portfolio investors follow — holdings, allocation, and rationale.", order_index=3),
            ContentManagement(content_id="expert_tool_4", section="expert_tools", title="Messages",            description="Your place to talk directly with investors and answer the questions they send you.", order_index=4),
            # All 5 cards above share this one button label
            ContentManagement(content_id="expert_tools_cta", section="expert_tools_cta", title="Open", order_index=0),

            # Model Portfolio card
            ContentManagement(content_id="header_model_portfolio", section="page_headers", title="Model Portfolio",
                description="The portfolio investors follow", order_index=16),
            ContentManagement(content_id="model_portfolio_empty_msg", section="expert_home_misc", title="You haven't set up a model portfolio yet.", order_index=0),
            ContentManagement(content_id="model_portfolio_cta_create", section="expert_home_misc", title="Create Portfolio", order_index=1),
            ContentManagement(content_id="model_portfolio_cta_manage", section="expert_home_misc", title="Manage Portfolio", order_index=2),

            # Your Profile card
            ContentManagement(content_id="header_expert_profile", section="page_headers", title="Your Profile", order_index=17),
            ContentManagement(content_id="expert_profile_edit_cta", section="expert_home_misc", title="Edit Profile", order_index=3),
            ContentManagement(content_id="expert_profile_not_rated", section="expert_home_misc", title="Not yet rated \u2014 keep building your reputation with investors.", order_index=4),

            # Verification Documents banner
            ContentManagement(content_id="header_documents", section="page_headers", title="Verification Documents", order_index=18),
            ContentManagement(content_id="documents_desc_verified",   section="expert_home_misc", title="Manage the credential documents tied to your verified expert account.", order_index=5),
            ContentManagement(content_id="documents_desc_unverified", section="expert_home_misc", title="Submit your credential documents to get verified and unlock the rest of the platform.", order_index=6),
            ContentManagement(content_id="documents_cta_verified",    section="expert_home_misc", title="Manage Documents", order_index=7),
            ContentManagement(content_id="documents_cta_unverified",  section="expert_home_misc", title="Submit Documents", order_index=8),

            # Compensation card, inside the Your Profile section
            ContentManagement(content_id="compensation_pending_label", section="expert_home_misc", title="Pending payout", order_index=9),
            # "{followers}" gets replaced client-side with the real follower
            # threshold number — see ProfileSummarySection in ExpertLoggedInPage.jsx
            ContentManagement(content_id="compensation_need_followers", section="expert_home_misc", title="Need {followers} followers to earn", order_index=10),
            ContentManagement(content_id="compensation_locked_label", section="expert_home_misc", title="Locked", order_index=11),
            ContentManagement(content_id="compensation_locked_msg", section="expert_home_misc", title="Get verified to unlock compensation", order_index=12),
        ]

        # These three sections used to have admin tabs but got dropped — went
        # through the whole frontend and none of them are actually read
        # anywhere. "feature" was a set of bubbles nothing displayed, "expert"
        # was a hero no expert page ever fetched, and "forum_room" was meant
        # for cover images but ForumPage.jsx just uses its own bundled ones.
        # This cleans out any leftover rows from when they still existed —
        # fine to run over and over, it's just a delete.
        dead_sections = ("feature", "expert", "forum_room")
        session.query(ContentManagement).filter(
            ContentManagement.section.in_(dead_sections)
        ).delete(synchronize_session=False)

        to_add = [e for e in entries if e.content_id not in existing_ids]
        if to_add:
            session.add_all(to_add)
