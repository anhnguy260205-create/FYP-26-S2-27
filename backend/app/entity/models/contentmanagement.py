from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.mysql import MEDIUMTEXT
from app.entity.database.base import Base
from app.entity.database.session import get_session
from uuid import uuid4


class ContentManagement(Base):
    __tablename__ = "content_management"

    content_id = Column(String(50), primary_key=True, default=lambda: f"content_{uuid4()}")
    section = Column(String(50), nullable=False)   # e.g. "hero", "why_investor", "platform_features"
    title = Column(String(255), nullable=False)
   
    description = Column(MEDIUMTEXT, nullable=True)
    
    image_url = Column(MEDIUMTEXT, nullable=True)
    video_url = Column(MEDIUMTEXT, nullable=True)
    order_index = Column(Integer, default=0)

    @staticmethod
    def get_all():
        with get_session() as session:
            rows = session.query(ContentManagement).order_by(
                ContentManagement.section, ContentManagement.order_index
            ).all()
            return [_serialize(r) for r in rows]

    @staticmethod
    def update(content_id: str, title: str, description: str, image_url: str | None = None, video_url: str | None = None) -> bool:
        with get_session() as session:
            row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id
            ).first()
            if not row:
                return False
            row.title = title
            row.description = description
            if image_url is not None:
                row.image_url = image_url
            if video_url is not None:
                row.video_url = video_url
            return True

    @staticmethod
    def reorder_section(section: str, ordered_ids: list) -> bool:

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
        "image_url": row.image_url,
        "video_url": row.video_url,
        "order_index": row.order_index,
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
            ContentManagement(content_id="free_plan_cta",   section="free_plan", title="Get Started Free", order_index=2),
            # Premium plan info
            ContentManagement(content_id="premium_plan_name",  section="premium_plan", title="Pro",     description="",                             order_index=0),
            ContentManagement(content_id="premium_plan_price", section="premium_plan", title="$20.99",  description="per month, billed annually",   order_index=1),
            ContentManagement(content_id="premium_plan_cta",   section="premium_plan", title="Upgrade to Premium", order_index=2),
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
            ContentManagement(content_id="footer_company_0",     section="footer_company", title="About Us",            description="/about-us", order_index=0),
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
            ContentManagement(content_id="footer_contact_0",     section="footer_contact", title="Help Center",          description="/support", order_index=1),
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
            ContentManagement(content_id="header_why_investor",       section="page_headers", title="Why RocketTrade",                           description="Built to help you invest smarter, without the real-money risk.", order_index=1),
            ContentManagement(content_id="header_features_investor",  section="page_headers", title="Everything You Need to Invest Smarter",      description="One platform, six ways to sharpen your edge.", order_index=2),
            ContentManagement(content_id="header_pricing",            section="page_headers", title="Simple, Transparent Pricing",                description="Compare our Free and Pro plans — create an investor account to get started.", order_index=3),
            ContentManagement(content_id="header_started",            section="page_headers", title="How to Get Started",                         description="Signing up only takes a few minutes, for investors and experts alike.", order_index=4),
            ContentManagement(content_id="header_expert_benefits",    section="page_headers", title="Why Join as a RocketTrade Expert",           description="Use premium tools, earn from your expertise, and grow your professional network with investors.", order_index=5),
            ContentManagement(content_id="header_faq",                section="page_headers", title="Frequently Asked Questions",                 description="Everything you need to know before you get started.", order_index=6),

            # "Everything You Need to Invest Smarter" — investor feature cards
            ContentManagement(content_id="platform_feat_0", section="platform_features", title="Paper Trading Exchange",             description="Trade against live market prices using virtual paper funds — build real skills with zero real-money risk.", order_index=0),
            ContentManagement(content_id="platform_feat_1", section="platform_features", title="AI Stock Predictions",               description="Multi-day price forecasts and sector quant ratings powered by machine learning, updated with live data.", order_index=1),
            ContentManagement(content_id="platform_feat_2", section="platform_features", title="Investor Community",                 description="Join discussion rooms on technical analysis, portfolio strategy, and market news with fellow investors.", order_index=2),
            ContentManagement(content_id="platform_feat_3", section="platform_features", title="AI Chatbot & Expert Consultants",    description="Get instant answers from our AI assistant, or browse and connect with verified market experts.", order_index=3),
            ContentManagement(content_id="platform_feat_4", section="platform_features", title="Educational Content",                description="Learn at your own pace with a growing library of articles — from beginner basics to advanced strategy.", order_index=4),
            ContentManagement(content_id="platform_feat_5", section="platform_features", title="Ask the Experts",                    description="Submit your investing questions directly to verified experts and get personalized answers.", order_index=5),


            # "Why RocketTrade" — investor trust cards
            ContentManagement(content_id="why_investor_0", section="why_investor", title="Zero-Risk Learning", description="Practice with virtual funds against live market prices — sharpen your instincts without risking real money.", order_index=0),
            ContentManagement(content_id="why_investor_1", section="why_investor", title="AI when you need speed. Experts when you need certainty.", description="Live prices and news sentiment keep your paper portfolio in sync with what's actually happening in the market.", order_index=1),
            ContentManagement(content_id="why_investor_2", section="why_investor", title="Expert-Backed Community", description="Learn alongside fellow investors and get answers straight from verified market experts.", order_index=2),


            # Expert role benefits shown before the FAQ on the landing page
            ContentManagement(content_id="expert_benefit_0", section="expert_role_benefits", title="Premium Investor Tools Included", description="Experts get access to the same advanced tools as Premium investors, including AI predictions, portfolio insights, paper trading, and market dashboards.", order_index=0),
            ContentManagement(content_id="expert_benefit_1", section="expert_role_benefits", title="Monthly Compensation", description="Verified experts can earn monthly compensation based on their activity, contributions, and investor engagement on the platform.", order_index=1),
            ContentManagement(content_id="expert_benefit_2", section="expert_role_benefits", title="Grow Your Network", description="Build your professional presence by sharing insights, answering investor questions, publishing content, and connecting with the RocketTrade community.", order_index=2),

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

            # Expert Compensation page (ExpertCompensationPage.jsx)
            ContentManagement(content_id="expert_compensation_header", section="expert_compensation_page", title="Compensation", description="Track your earnings, payout history, and follower eligibility.", order_index=0),
            ContentManagement(content_id="expert_compensation_notice", section="expert_compensation_page", title="Display-only notice", description="Compensation figures on this page are calculated for display purposes only — no funds are transferred.", order_index=1),
            ContentManagement(content_id="expert_compensation_locked_title", section="expert_compensation_page", title="Compensation is locked", description="You need a verified expert profile before you can view earnings and payouts. Submit your credential documents to get verified.", order_index=2),
            ContentManagement(content_id="expert_compensation_locked_cta", section="expert_compensation_page", title="Submit Documents", order_index=3),
            ContentManagement(content_id="expert_compensation_eligibility_title", section="expert_compensation_page", title="Follower Eligibility", description="Reach {threshold} followers to earn {amount}/month.", order_index=4),
            ContentManagement(content_id="expert_compensation_history_title", section="expert_compensation_page", title="Payout History", description="Your compensation for each completed month.", order_index=5),
            ContentManagement(content_id="expert_compensation_history_empty", section="expert_compensation_page", title="No completed months yet — history appears here once your first full calendar month has passed.", order_index=6),

            # Expert Documents page (ExpertDocumentPage.jsx)
            ContentManagement(content_id="expert_documents_page_header", section="expert_documents_page", title="Submit Your Documents", description="Add links to your certificates, degrees, or employment letters for admin verification.", order_index=0),
            ContentManagement(content_id="expert_documents_add_label", section="expert_documents_page", title="Add Document", order_index=1),
            ContentManagement(content_id="expert_documents_submit_cta", section="expert_documents_page", title="Submit Documents →", order_index=2),
            ContentManagement(content_id="expert_documents_skip_cta", section="expert_documents_page", title="Skip for now", order_index=3),
            ContentManagement(content_id="expert_documents_error_empty", section="expert_documents_page", title="Please add at least one document.", order_index=4),

            # Expert Knowledge Hub page (ExpertKnowledgeHub.jsx)
            ContentManagement(content_id="expert_knowledge_header", section="expert_knowledge_page", title="My Articles", description="Create, edit, and track the educational articles you submit for admin review.", order_index=0),
            ContentManagement(content_id="expert_knowledge_write_cta", section="expert_knowledge_page", title="+ Write Article", order_index=1),
            ContentManagement(content_id="expert_knowledge_empty_all", section="expert_knowledge_page", title="You haven't written any articles yet.", order_index=2),
            ContentManagement(content_id="expert_knowledge_empty_filtered", section="expert_knowledge_page", title="No {tab} articles.", order_index=3),
            ContentManagement(content_id="expert_knowledge_form_new", section="expert_knowledge_page", title="Write New Article", order_index=4),
            ContentManagement(content_id="expert_knowledge_form_edit", section="expert_knowledge_page", title="Edit Article", order_index=5),
            ContentManagement(content_id="expert_knowledge_form_submit", section="expert_knowledge_page", title="Submit for Review", order_index=6),
            ContentManagement(content_id="expert_knowledge_verification_required_title", section="expert_knowledge_page", title="Verification Required", description="Only verified experts can create and publish educational content. Please submit your verification documents to get started.", order_index=7),
            ContentManagement(content_id="expert_knowledge_verification_pending_title", section="expert_knowledge_page", title="Verification Pending", description="Your verification request is under review by the admin. You will be able to create and submit articles once approved.", order_index=8),
            ContentManagement(content_id="expert_knowledge_apply_cta", section="expert_knowledge_page", title="Apply for Verification", order_index=9),
            ContentManagement(content_id="expert_knowledge_under_review", section="expert_knowledge_page", title="⏳ Under Review", order_index=10),

            # Shared Expert Portfolio list page (ExpertPortfolio.jsx)
            ContentManagement(content_id="expert_portfolio_list_header", section="expert_portfolio_page", title="Expert Portfolio", description="Explore and invest in portfolios managed by our expert consultants.", order_index=0),
            ContentManagement(content_id="expert_portfolio_list_expert_header", section="expert_portfolio_page", title="Expert Portfolio", description="Preview how investors browse verified expert portfolios.", order_index=1),
            ContentManagement(content_id="expert_portfolio_search_placeholder", section="expert_portfolio_page", title="Search expert by name or keyword...", order_index=2),
            ContentManagement(content_id="expert_portfolio_search_cta", section="expert_portfolio_page", title="Search", order_index=3),
            ContentManagement(content_id="expert_portfolio_empty", section="expert_portfolio_page", title="No experts found.", order_index=4),


            # Community Forum page (ForumPage.jsx)
            ContentManagement(content_id="forum_header", section="forum_page", title="Community Forum",
                description="Share ideas, discuss markets, and learn from the RocketTrade community.", order_index=0),
            ContentManagement(content_id="forum_new_post_cta", section="forum_page", title="New Post", order_index=1),
            ContentManagement(content_id="forum_search_placeholder", section="forum_page", title="Search posts, topics, or authors...", order_index=2),
            ContentManagement(content_id="forum_trending_label", section="forum_page", title="Trending Right Now", order_index=3),
            ContentManagement(content_id="forum_activity_label", section="forum_page", title="My Activity", order_index=4),
            ContentManagement(content_id="forum_topics_label", section="forum_page", title="Browse by Topic", order_index=5),
            ContentManagement(content_id="forum_latest_label", section="forum_page", title="Latest Posts", order_index=6),
            ContentManagement(content_id="forum_latest_cta", section="forum_page", title="See all →", order_index=7),

            # Community Forum topics. The content_id maps to the internal category used by existing posts;
            # admins can edit the visible name and description without breaking old post categories.
            ContentManagement(content_id="forum_topic_technical", section="forum_topics", title="Technical Analysis",
                description="Discuss charts, indicators, price action, and trading setups.", order_index=0),
            ContentManagement(content_id="forum_topic_ai", section="forum_topics", title="AI Predictions",
                description="Talk about AI forecasts, model signals, and prediction confidence.", order_index=1),
            ContentManagement(content_id="forum_topic_strategy", section="forum_topics", title="Portfolio Strategy",
                description="Share asset allocation ideas, diversification plans, and portfolio reviews.", order_index=2),
            ContentManagement(content_id="forum_topic_news", section="forum_topics", title="Market News",
                description="Follow market headlines, earnings updates, and macro events.", order_index=3),
            ContentManagement(content_id="forum_topic_beginner", section="forum_topics", title="Beginners Corner",
                description="Ask beginner-friendly questions and learn investing fundamentals.", order_index=4),
            ContentManagement(content_id="forum_topic_trading", section="forum_topics", title="Trading Tips",
                description="Exchange practical trading habits, watchlist ideas, and risk-control tips.", order_index=5),
            ContentManagement(content_id="forum_topic_it", section="forum_topics", title="Information Technology",
                description="Discuss technology stocks, software companies, and digital infrastructure.", order_index=6),
            ContentManagement(content_id="forum_topic_financials", section="forum_topics", title="Financials",
                description="Cover banks, insurers, payment networks, and financial-sector trends.", order_index=7),
            ContentManagement(content_id="forum_topic_consumer", section="forum_topics", title="Consumer Discretionary",
                description="Discuss consumer brands, retail companies, travel, and discretionary spending trends.", order_index=8),
            ContentManagement(content_id="forum_topic_communication", section="forum_topics", title="Communication Services",
                description="Talk about media, telecom, advertising, and communication-platform companies.", order_index=9),
            ContentManagement(content_id="forum_topic_energy", section="forum_topics", title="Energy",
                description="Discuss oil, gas, renewables, utilities, and energy-market developments.", order_index=10),
            ContentManagement(content_id="forum_topic_real_estate", section="forum_topics", title="Real Estate",
                description="Discuss REITs, property markets, and real-estate investment themes.", order_index=11),

            # Shared Expert Detail page (ExpertDetail.jsx)
            ContentManagement(content_id="expert_detail_core_title", section="expert_detail_page", title="Core Information", order_index=0),
            ContentManagement(content_id="expert_detail_portfolio_tab", section="expert_detail_page", title="Portfolio", order_index=1),
            ContentManagement(content_id="expert_detail_reviews_tab", section="expert_detail_page", title="Reviews", order_index=2),
            ContentManagement(content_id="expert_detail_ask_cta", section="expert_detail_page", title="Ask Question", order_index=3),
            ContentManagement(content_id="expert_detail_follow_cta", section="expert_detail_page", title="Follow", order_index=4),
            ContentManagement(content_id="expert_detail_following_cta", section="expert_detail_page", title="Following", order_index=5),
            ContentManagement(content_id="expert_detail_rate_cta", section="expert_detail_page", title="Rate", order_index=6),
            ContentManagement(content_id="expert_detail_edit_rating_cta", section="expert_detail_page", title="Edit Rating", order_index=7),
            ContentManagement(content_id="expert_detail_reviews_title", section="expert_detail_page", title="Portfolio Reviews", order_index=8),

            # --- Previously-hardcoded investor pages, now editable ---

            # AIChatbot.jsx
            ContentManagement(content_id="header_ai_chatbot_page", section="page_headers",
                title="RocketTrade AI Assistant", description="Ask about stocks, market trends, technical analysis, and more", order_index=23),

            # BecomeExpertPage.jsx
            ContentManagement(content_id="header_become_expert_page", section="page_headers",
                title="Become an Expert", description="Prove your trading skill to unlock expert privileges — publish educational articles, share your portfolio with premium users, and enjoy complimentary premium benefits.", order_index=24),
            ContentManagement(content_id="become_expert_approved_heading", section="become_expert_page", title="You are a verified expert!", order_index=0),
            ContentManagement(content_id="become_expert_approved_desc", section="become_expert_page", title="You can now publish articles, share your portfolio and enjoy premium benefits.", order_index=1),
            ContentManagement(content_id="become_expert_pending_heading", section="become_expert_page", title="Application under review", order_index=2),
            ContentManagement(content_id="become_expert_pending_desc", section="become_expert_page", title="Your documents are being reviewed. You will be notified once a decision is made.", order_index=3),
            ContentManagement(content_id="become_expert_applied_heading", section="become_expert_page", title="Application started \u2014 submit your documents", order_index=4),
            ContentManagement(content_id="become_expert_applied_cta", section="become_expert_page", title="Upload Documents \u2192", order_index=5),
            ContentManagement(content_id="become_expert_eligible_heading", section="become_expert_page", title="\U0001F389 You meet the requirements!", order_index=6),
            ContentManagement(content_id="become_expert_eligible_desc", section="become_expert_page", title="Apply now and upload supporting documents (certificates, degrees, employment letters) for review.", order_index=7),
            ContentManagement(content_id="become_expert_eligible_cta", section="become_expert_page", title="Apply to Become an Expert \u2192", order_index=8),
            ContentManagement(content_id="become_expert_default_heading", section="become_expert_page", title="Keep trading to qualify", order_index=9),
            # "{stocks}" and "{margin}" get swapped client-side for the real numbers
            ContentManagement(content_id="become_expert_default_desc", section="become_expert_page", title="Trade at least {stocks} different stocks and reach a {margin}% profit margin to apply for expert status.", order_index=10),

            # PortfolioOverviewPage.jsx
            ContentManagement(content_id="header_portfolio_overview_page", section="page_headers",
                title="Portfolio Overview", description="Full trading analytics, holdings, and order history", order_index=25),

            # QuantRatingPage.jsx
            ContentManagement(content_id="header_quant_rating_page", section="page_headers",
                title="Sector Quant Ratings", description="Calibrated machine-learning buy ratings, modelled per GICS sector. Each score is a true, calibrated probability — not a black-box index.", order_index=26),

            # TransactionHistoryPage.jsx
            ContentManagement(content_id="header_transaction_history_page", section="page_headers",
                title="Transaction History", description="All executed buy & sell orders", order_index=27),
            ContentManagement(content_id="transaction_history_empty_heading", section="transaction_history_page", title="No transactions yet", order_index=0),
            ContentManagement(content_id="transaction_history_empty_desc", section="transaction_history_page", title="Start trading to see your history here", order_index=1),
            ContentManagement(content_id="transaction_history_empty_cta", section="transaction_history_page", title="Go to Markets", order_index=2),

            # InvestorProfilePage.jsx — tab section headings (no single page-level header; it's a tabbed settings page)
            ContentManagement(content_id="investor_profile_personal_info_heading", section="investor_profile_page", title="Personal Information", order_index=0),
            ContentManagement(content_id="investor_profile_account_settings_heading", section="investor_profile_page", title="Account Settings", order_index=1),

            # TransactionPortalPage.jsx
            ContentManagement(content_id="header_transaction_portal_page", section="page_headers",
                title="Transaction Portal", description="Full overview of your paper trading activity", order_index=28),
            ContentManagement(content_id="transaction_portal_history_cta", section="transaction_portal_page", title="View History \u2192", order_index=0),

            # UpdateParticularPage.jsx — "{username}" gets swapped client-side for the real username
            ContentManagement(content_id="update_particular_heading", section="update_particular_page", title="Welcome, {username}! \U0001F44B", order_index=0),
            ContentManagement(content_id="update_particular_desc", section="update_particular_page", title="Let's set up your profile before you start trading.", order_index=1),
            ContentManagement(content_id="update_particular_submit_cta", section="update_particular_page", title="Get Started \u2192", order_index=2),
            ContentManagement(content_id="update_particular_skip_cta", section="update_particular_page", title="Skip for now", order_index=3),

            # PaymentSuccess.jsx
            ContentManagement(content_id="payment_success_loading_heading", section="payment_result_page", title="Activating your subscription...", order_index=0),
            ContentManagement(content_id="payment_success_loading_desc", section="payment_result_page", title="Please wait a moment.", order_index=1),
            ContentManagement(content_id="payment_success_error_heading", section="payment_result_page", title="Something went wrong", order_index=2),
            ContentManagement(content_id="payment_success_error_cta", section="payment_result_page", title="Homepage", order_index=3),
            ContentManagement(content_id="payment_success_heading", section="payment_result_page", title="Payment Successful", order_index=4),
            ContentManagement(content_id="payment_success_desc", section="payment_result_page", title="Your subscription is now active.", order_index=5),
            ContentManagement(content_id="payment_success_cta", section="payment_result_page", title="Homepage", order_index=6),

            # PaymentFail.jsx
            ContentManagement(content_id="payment_fail_heading", section="payment_result_page", title="Payment Failed", order_index=7),
            ContentManagement(content_id="payment_fail_desc", section="payment_result_page", title="Please try again.", order_index=8),
            ContentManagement(content_id="payment_fail_retry_cta", section="payment_result_page", title="Try Again", order_index=9),
            ContentManagement(content_id="payment_fail_home_cta", section="payment_result_page", title="Go Home", order_index=10),

            # AboutUsPage.jsx — "\n" in the title marks a line break for the
            # hero heading, matching how the page splits it into two lines.
            ContentManagement(content_id="about_hero", section="page_headers",
                title="Smarter Investing.\nBetter Future.",
                description="Our mission is to make intelligent investing more accessible through AI-driven analytics, real-time market information, and intuitive financial tools.",
                order_index=19),
            ContentManagement(content_id="about_hero_para2", section="page_headers",
                title="Rocket Trade is committed to providing a secure, reliable, and transparent platform that enables investors to evaluate market opportunities and make data-informed decisions with greater confidence.",
                order_index=20),
            ContentManagement(content_id="about_values_header", section="page_headers", title="Our Values", order_index=21),
            ContentManagement(content_id="about_value_0", section="about_values", title="Trust & Security", description="We prioritize the security of user data and investment information through reliable protection and responsible data practices.", order_index=0),
            ContentManagement(content_id="about_value_1", section="about_values", title="AI Innovation", description="We apply artificial intelligence and predictive analytics to deliver meaningful market insights and smarter investment tools.", order_index=1),
            ContentManagement(content_id="about_value_2", section="about_values", title="Transparency", description="We provide clear and accessible information to support informed and responsible financial decision-making.", order_index=2),
            ContentManagement(content_id="about_value_3", section="about_values", title="User First", description="We design every feature around the needs of investors, focusing on accessibility, usability, and long-term value.", order_index=3),
            ContentManagement(content_id="about_people_header", section="page_headers",
                title="Meet the Team Behind Rocket Trade",
                description="A collaborative team bringing together technology, data, and innovation to build a smarter and more accessible investment platform.",
                order_index=22),
            ContentManagement(content_id="about_people_badge", section="about_page",
                title="OUR PEOPLE", order_index=0),
            ContentManagement(content_id="about_team_role", section="about_page",
                title="ROCKET TRADE TEAM", order_index=1),
            # Team member cards — title = name, description = avatar initials
            ContentManagement(content_id="about_team_0", section="about_team", title="Nguy Kim Anh",          description="NKA", order_index=0),
            ContentManagement(content_id="about_team_1", section="about_team", title="Jordan Lim Jun Hong",   description="JL",  order_index=1),
            ContentManagement(content_id="about_team_2", section="about_team", title="Kim Bogyeong",          description="KB",  order_index=2),
            ContentManagement(content_id="about_team_3", section="about_team", title="Lanice Lam Wen Xin",    description="LL",  order_index=3),
            ContentManagement(content_id="about_team_4", section="about_team", title="Lim Ying Xin",          description="LY",  order_index=4),

            # SupportPage.jsx (Help Center) — "|" in the title marks where
            # the gradient-accent span starts in the hero heading.
            ContentManagement(content_id="help_hero", section="page_headers",
                title="How can we|help you?",
                description="Find answers, explore support topics, or contact our team for further assistance.",
                order_index=23),
            ContentManagement(content_id="help_search_placeholder", section="help_page",
                title="Search for help...", order_index=0),
            ContentManagement(content_id="help_faq_header", section="help_page",
                title="Frequently Asked Questions",
                description="Browse frequently asked questions across all support topics.",
                order_index=1),
            ContentManagement(content_id="help_faq_category_desc", section="help_page",
                title="Showing questions related to {category}.", order_index=2),
            ContentManagement(content_id="help_empty_heading", section="help_page",
                title="No matching questions found", order_index=3),
            ContentManagement(content_id="help_empty_desc", section="help_page",
                title="Try using a different search term or select another category.", order_index=4),
            ContentManagement(content_id="help_contact_heading", section="help_contact",
                title="Didn't find an answer to your questions?", order_index=0),
            ContentManagement(content_id="help_contact_desc", section="help_contact",
                title="Get in touch with us for more details", order_index=1),
            ContentManagement(content_id="help_contact_cta", section="help_contact",
                title="Contact Support", order_index=2),
            ContentManagement(content_id="help_contact_email", section="help_contact",
                title="kim@gmail.com", order_index=3),
            ContentManagement(content_id="help_category_0", section="help_categories", title="Account & Login",          order_index=0),
            ContentManagement(content_id="help_category_1", section="help_categories", title="Subscription & Payments",  order_index=1),
            ContentManagement(content_id="help_category_2", section="help_categories", title="Stock Trading",            order_index=2),
            ContentManagement(content_id="help_category_3", section="help_categories", title="AI Predictions",           order_index=3),
            ContentManagement(content_id="help_category_4", section="help_categories", title="Community Forum",          order_index=4),
            ContentManagement(content_id="help_category_5", section="help_categories", title="Privacy & Security",       order_index=5),
            # FAQ question/answer pairs. SupportPage.jsx groups each block of
            # three FAQs under the category at the same positional index, so
            # admins can rename category labels without breaking filtering.
            ContentManagement(content_id="help_faq_0",  section="help_faqs", title="How do I create an account?", description="Select Get Started or Register from the homepage. Enter the required personal information, choose the appropriate account type, and submit the registration form. You may also be required to verify your email address before logging in.", order_index=0),
            ContentManagement(content_id="help_faq_1",  section="help_faqs", title="How can I reset my password?", description="Open the login page and select Forgot Password. Enter the email address associated with your account and follow the password reset instructions sent to your email.", order_index=1),
            ContentManagement(content_id="help_faq_2",  section="help_faqs", title="Why can\u2019t I log in?", description="Confirm that your email address and password are correct. Check whether your account has been verified or suspended. If the issue continues, reset your password or contact the Rocket Trade support team.", order_index=2),
            ContentManagement(content_id="help_faq_3",  section="help_faqs", title="How do I subscribe to a premium plan?", description="Log in to your investor account, open the Subscription page from your profile menu, select an available plan, and complete the payment process.", order_index=3),
            ContentManagement(content_id="help_faq_4",  section="help_faqs", title="Can I cancel my subscription?", description="Yes. Open the Subscription page, review your active plan, and select the cancellation option. Your access may remain available until the end of the current billing period.", order_index=4),
            ContentManagement(content_id="help_faq_5",  section="help_faqs", title="What should I do if my payment fails?", description="Check that your payment information is correct and that sufficient funds are available. Try the payment again. If the issue continues, contact your payment provider or Rocket Trade support.", order_index=5),
            ContentManagement(content_id="help_faq_6",  section="help_faqs", title="How do I buy a stock?", description="Open the real-time stock dashboard, select a stock, and choose Buy. Enter the quantity, review the estimated transaction amount, and confirm the order.", order_index=6),
            ContentManagement(content_id="help_faq_7",  section="help_faqs", title="How do I sell a stock?", description="Open your portfolio or the relevant stock page, select Sell, enter the quantity you want to sell, review the transaction details, and confirm the sale.", order_index=7),
            ContentManagement(content_id="help_faq_8",  section="help_faqs", title="Where can I view my transaction history?", description="Open Transactions from the investor navigation menu and select Transaction History. This page displays your previous buy and sell activities.", order_index=8),
            ContentManagement(content_id="help_faq_9",  section="help_faqs", title="How are AI stock predictions generated?", description="Rocket Trade uses machine-learning models to analyse historical market data, current market information, and identifiable patterns. These models generate analytical estimates that may support investment research.", order_index=9),
            ContentManagement(content_id="help_faq_10", section="help_faqs", title="Are AI predictions guaranteed to be accurate?", description="No. AI predictions are analytical estimates and cannot guarantee future market performance. They should not be treated as professional financial advice or as guaranteed investment outcomes.", order_index=10),
            ContentManagement(content_id="help_faq_11", section="help_faqs", title="Where can I view prediction results?", description="Prediction results and analytical insights are available through the supported stock dashboard and relevant analysis tools within Rocket Trade.", order_index=11),
            ContentManagement(content_id="help_faq_12", section="help_faqs", title="How do I create a forum post?", description="Open the Community Forum, select the option to create a new post, enter the title and content, choose an appropriate category, and publish the post.", order_index=12),
            ContentManagement(content_id="help_faq_13", section="help_faqs", title="How do I reply to another user?", description="Open the relevant forum post, enter your response in the reply section, and submit the comment. Your reply will appear within the discussion.", order_index=13),
            ContentManagement(content_id="help_faq_14", section="help_faqs", title="How do forum notifications work?", description="You may receive a notification when another user likes your post or replies to one of your discussions. Notifications can be viewed from your account notification page.", order_index=14),
            ContentManagement(content_id="help_faq_15", section="help_faqs", title="How is my personal information protected?", description="Rocket Trade applies authentication, controlled access, secure data-handling practices, and account protection measures to reduce unauthorised access to user information.", order_index=15),
            ContentManagement(content_id="help_faq_16", section="help_faqs", title="Is my payment information stored?", description="Payment transactions are processed through the connected payment provider. Rocket Trade should not directly display or store complete payment card credentials.", order_index=16),
            ContentManagement(content_id="help_faq_17", section="help_faqs", title="What should I do if I notice suspicious activity?", description="Change your password immediately and log out of your account. Record any unusual activity and contact the Rocket Trade support team with the relevant details.", order_index=17),

        ]

   
        dead_sections = ("feature", "expert", "forum_room", "expert_tools", "expert_tools_cta")
        session.query(ContentManagement).filter(
            ContentManagement.section.in_(dead_sections)
        ).delete(synchronize_session=False)


        dead_header_ids = (
            "header_expert_tools", "header_model_portfolio",
            "header_expert_profile", "header_documents",
            "expert_hero_subtitle",
            "model_portfolio_empty_msg", "model_portfolio_cta_create", "model_portfolio_cta_manage",
            "expert_profile_edit_cta", "expert_profile_not_rated",
            "compensation_pending_label", "compensation_need_followers",
            "compensation_locked_label", "compensation_locked_msg",
            "documents_desc_verified", "documents_desc_unverified",
            "documents_cta_verified", "documents_cta_unverified",
        )
        session.query(ContentManagement).filter(
            ContentManagement.content_id.in_(dead_header_ids)
        ).delete(synchronize_session=False)

        
        placeholder_fixes = {
            "footer_company_0": "/about-us",
            "footer_contact_0": "/support",
        }
        for content_id, real_url in placeholder_fixes.items():
            row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id,
                ContentManagement.description == "#",
            ).first()
            if row:
                row.description = real_url

        to_add = [e for e in entries if e.content_id not in existing_ids]
        if to_add:
            session.add_all(to_add)
