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

    @staticmethod
    def create(section: str, title: str, description: str = "",
               image_url: str | None = None, video_url: str | None = None) -> dict:
        """Add a new card/item to an existing list section (FAQ, footer links,
        legal numbered sections, etc.). Placed at the end of the section."""
        with get_session() as session:
            max_index = session.query(ContentManagement).filter(
                ContentManagement.section == section
            ).count()
            row = ContentManagement(
                section=section,
                title=title,
                description=description,
                image_url=image_url,
                video_url=video_url,
                order_index=max_index,
            )
            session.add(row)
            session.flush()
            return _serialize(row)

    @staticmethod
    def delete(content_id: str) -> bool:
        with get_session() as session:
            row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id
            ).first()
            if not row:
                return False
            session.delete(row)
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
            # Footer — product links (title = label, description = URL). These point at the
            # Features/Pricing sections on the landing page itself (public, no login required).
            ContentManagement(content_id="footer_product_0",     section="footer_product", title="Features",            description="/#features", order_index=0),
            ContentManagement(content_id="footer_product_1",     section="footer_product", title="Pricing",             description="/#pricing", order_index=1),
            # Footer — company links. Careers/Blog/Press were dropped: we don't have job
            # postings, a blog, or press coverage to link to, so those would just be dead "#"
            # links. Only keep pages that actually exist.
            ContentManagement(content_id="footer_company_0",     section="footer_company", title="About Us",            description="/about-us", order_index=0),
            ContentManagement(content_id="footer_company_4",     section="footer_company", title="Reviews",             description="/reviews", order_index=1),
 
            # Footer — contact
            ContentManagement(content_id="footer_contact_email", section="footer_contact", title="kimanh.work26@gmail.com", description="", order_index=0),
            ContentManagement(content_id="footer_contact_0",     section="footer_contact", title="Help Center",          description="/support", order_index=1),
            ContentManagement(content_id="footer_contact_1",     section="footer_contact", title="Terms of Service",     description="/terms-of-service", order_index=2),
            ContentManagement(content_id="footer_contact_2",     section="footer_contact", title="Privacy Policy",       description="/privacy-policy", order_index=3),
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
            ContentManagement(content_id="faq_0", section="faq", title="Is this real money trading?", description="Nope — RocketTrade is a paper trading platform. You trade against live market prices using virtual funds, so you can build real skills without any real financial risk.", order_index=0),
            ContentManagement(content_id="faq_1", section="faq", title="How much does it cost to use RocketTrade?", description="You can get started for free with our Starter plan. Whenever you're ready, upgrade to Pro for unlimited AI predictions, deeper quant ratings, and priority access to our experts.", order_index=1),
            ContentManagement(content_id="faq_2", section="faq", title="How accurate are the AI predictions?", description="Our models combine technical indicators with news sentiment to forecast short-term price direction. Think of it as a decision-support tool rather than a guarantee — it's always worth doing your own research too.", order_index=2),
            ContentManagement(content_id="faq_3", section="faq", title="Do I need any trading experience to get started?", description="Not at all. Our Educational Content library covers everything from the basics to more advanced strategy, so you can pick things up as you go.", order_index=3),
            ContentManagement(content_id="faq_4", section="faq", title="Can I get help from a real person?", description="Yes — you can chat with our AI assistant instantly, or connect with one of our verified market experts through consultations and Q&A.", order_index=4),
            ContentManagement(content_id="faq_5", section="faq", title="Can I cancel or change my plan anytime?", description="Definitely. You can upgrade, downgrade, or cancel your subscription whenever you like, right from your account settings.", order_index=5),

            # "How to Get Started" — registration steps (STEP 1/2/3/4 label comes from position, not...
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

            # Expert Features quick-link cards shown on the shared logged-in
            # homepage (LoggedInHomePage.jsx), experts only. Icons and link
            # targets stay hardcoded client-side, same as other card sections.
            ContentManagement(content_id="header_expert_features", section="page_headers",
                title="Expert Features", description="Your expert tools", order_index=29),
            ContentManagement(content_id="expert_home_feat_0", section="expert_home_features",
                title="My Education Content", description="Write and manage the articles you've published to the knowledge hub.", order_index=0),
            ContentManagement(content_id="expert_home_feat_1", section="expert_home_features",
                title="My Portfolio", description="Publish and manage the portfolio you share with investors.", order_index=1),
            ContentManagement(content_id="expert_home_feat_2", section="expert_home_features",
                title="Compensation", description="Track your earnings and payout history as a verified expert.", order_index=2),
            # Button text for each card above, matched up by position (same pattern as investor_home_...
            ContentManagement(content_id="expert_home_feat_0_cta", section="expert_home_features_cta", title="Open", order_index=0),
            ContentManagement(content_id="expert_home_feat_1_cta", section="expert_home_features_cta", title="Open", order_index=1),
            ContentManagement(content_id="expert_home_feat_2_cta", section="expert_home_features_cta", title="Open", order_index=2),
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

            # Community Forum topics.
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

            # InvestorProfilePage.jsx — tab section headings (no single page-level header; it's a tab...
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
                title="kimanh.work26@gmail.com", order_index=3),
            ContentManagement(content_id="help_category_0", section="help_categories", title="Account & Login",          order_index=0),
            ContentManagement(content_id="help_category_1", section="help_categories", title="Subscription & Payments",  order_index=1),
            ContentManagement(content_id="help_category_2", section="help_categories", title="Stock Trading",            order_index=2),
            ContentManagement(content_id="help_category_3", section="help_categories", title="AI Predictions",           order_index=3),
            ContentManagement(content_id="help_category_4", section="help_categories", title="Community Forum",          order_index=4),
            ContentManagement(content_id="help_category_5", section="help_categories", title="Privacy & Security",       order_index=5),
            # FAQ question/answer pairs. SupportPage.jsx groups each block of
            # three FAQs under the category at the same positional index, so
            # admins can rename category labels without breaking filtering.
            ContentManagement(content_id="help_faq_0",  section="help_faqs", title="How do I create an account?", description="Head to the homepage and click Get Started or Register. You'll just need to fill in a few basic details and pick your account type — investor or expert. We'll usually ask you to verify your email before you can log in.", order_index=0),
            ContentManagement(content_id="help_faq_1",  section="help_faqs", title="How can I reset my password?", description="No worries, it happens. On the login page, click Forgot Password and enter the email you signed up with, and we'll send you a link to set a new one.", order_index=1),
            ContentManagement(content_id="help_faq_2",  section="help_faqs", title="Why can\u2019t I log in?", description="First, double-check your email and password — typos are the usual culprit. It's also worth checking that your account is verified and hasn't been suspended. Still stuck? Reset your password, or reach out to our support team and we'll sort it out.", order_index=2),
            ContentManagement(content_id="help_faq_3",  section="help_faqs", title="How do I subscribe to a premium plan?", description="Log in to your investor account, then head to Subscription from your profile menu. From there you can pick a plan and check out — it only takes a minute.", order_index=3),
            ContentManagement(content_id="help_faq_4",  section="help_faqs", title="Can I cancel my subscription?", description="Yep, anytime. Go to your Subscription page, find your current plan, and hit cancel. You'll keep your premium access until the end of the billing period you've already paid for.", order_index=4),
            ContentManagement(content_id="help_faq_5",  section="help_faqs", title="What should I do if my payment fails?", description="Start by checking your card details and making sure there's enough available balance, then give it another go. If it still won't go through, it's worth checking with your bank or card provider — and if you're really stuck, our support team is happy to help.", order_index=5),
            ContentManagement(content_id="help_faq_6",  section="help_faqs", title="How do I buy a stock?", description="Open the real-time dashboard, pick a stock, and hit Buy. Enter how many shares you want, take a look at the estimated cost, and confirm — that's it.", order_index=6),
            ContentManagement(content_id="help_faq_7",  section="help_faqs", title="How do I sell a stock?", description="From your portfolio (or the stock's page), hit Sell, enter the quantity you're letting go of, double-check the details, and confirm the trade.", order_index=7),
            ContentManagement(content_id="help_faq_8",  section="help_faqs", title="Where can I view my transaction history?", description="Head to Transactions in your investor menu, then Transaction History — you'll find a full record of everything you've bought and sold.", order_index=8),
            ContentManagement(content_id="help_faq_9",  section="help_faqs", title="How are AI stock predictions generated?", description="Our models look at historical price data, current market activity, and recurring patterns to generate an analytical estimate of where a stock might be headed. Think of it as a research tool, not a crystal ball.", order_index=9),
            ContentManagement(content_id="help_faq_10", section="help_faqs", title="Are AI predictions guaranteed to be accurate?", description="No, and we want to be upfront about that. They're estimates based on data, not promises. Markets are unpredictable, so please don't treat our predictions as financial advice or a guaranteed outcome.", order_index=10),
            ContentManagement(content_id="help_faq_11", section="help_faqs", title="Where can I view prediction results?", description="You'll find predictions and related insights right on each stock's dashboard, alongside the other analysis tools.", order_index=11),
            ContentManagement(content_id="help_faq_12", section="help_faqs", title="How do I create a forum post?", description="Head into the Community Forum and look for the New Post button. Give it a title, write what's on your mind, pick a category, and post it — the community will take it from there.", order_index=12),
            ContentManagement(content_id="help_faq_13", section="help_faqs", title="How do I reply to another user?", description="Open the post you want to respond to, type your reply in the box below it, and hit submit. It'll show up right in the discussion thread.", order_index=13),
            ContentManagement(content_id="help_faq_14", section="help_faqs", title="How do forum notifications work?", description="If someone likes your post or replies to you, we'll let you know. You can check all your notifications anytime from your account's notification page.", order_index=14),
            ContentManagement(content_id="help_faq_15", section="help_faqs", title="How is my personal information protected?", description="We take this seriously. Your data is protected through authentication checks, restricted access controls, and secure handling practices designed to keep it away from anyone who shouldn't see it.", order_index=15),
            ContentManagement(content_id="help_faq_16", section="help_faqs", title="Is my payment information stored?", description="Not by us. Your payments are handled directly by our payment provider, and we never see or store your full card details on our end.", order_index=16),
            ContentManagement(content_id="help_faq_17", section="help_faqs", title="What should I do if I notice suspicious activity?", description="Change your password right away and log out of any active sessions. Then note down what you noticed and get in touch with our support team — we'll help you look into it.", order_index=17),

        ]

   
        dead_sections = ("feature", "expert", "forum_room", "expert_tools", "expert_tools_cta")
        session.query(ContentManagement).filter(
            ContentManagement.section.in_(dead_sections)
        ).delete(synchronize_session=False)

        # Careers/Blog/Press footer links were dropped (no jobs page, blog, or press coverage
        # to link to) — remove them from databases that were seeded before this change.
        dead_footer_ids = ("footer_company_1", "footer_company_2", "footer_company_3")
        session.query(ContentManagement).filter(
            ContentManagement.content_id.in_(dead_footer_ids)
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
            "footer_product_0": "/#features",
            "footer_product_1": "/#pricing",
            "footer_contact_1": "/terms-of-service",
            "footer_contact_2": "/privacy-policy",
        }
        for content_id, real_url in placeholder_fixes.items():
            row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id,
                ContentManagement.description == "#",
            ).first()
            if row:
                row.description = real_url

        # The contact email went through a couple of placeholder values
        # ("support@deskstock.ai", then "kim@gmail.com") before landing on the
        # real one. Correct both footer and help-centre copies on databases
        # seeded before this fix, wherever they still hold a stale value.
        stale_contact_emails = ("support@deskstock.ai", "kim@gmail.com")
        for content_id in ("footer_contact_email", "help_contact_email"):
            contact_row = session.query(ContentManagement).filter(
                ContentManagement.content_id == content_id,
                ContentManagement.title.in_(stale_contact_emails),
            ).first()
            if contact_row:
                contact_row.title = "kimanh.work26@gmail.com"

        # FAQ copy was rewritten to sound more natural (less formulaic
        # "open X, select Y" phrasing) — refresh the answer text on databases
        # that were seeded with the older wording, not just newly-added rows.
        faq_updates = {
            e.content_id: e.description
            for e in entries
            if e.content_id.startswith("faq_") or e.content_id.startswith("help_faq_")
        }
        if faq_updates:
            faq_rows = session.query(ContentManagement).filter(
                ContentManagement.content_id.in_(faq_updates.keys())
            ).all()
            for row in faq_rows:
                new_description = faq_updates.get(row.content_id)
                if new_description is not None and row.description != new_description:
                    row.description = new_description

        # Legal pages — Terms of Service & Privacy Policy. section="page_headers" for the
        # hero title/subtitle pair (matches every other page's hero pattern), section=
        # "legal_meta" for the intro-paragraph/date items (looked up by content_id, not
        # section), section="terms_of_service"/"privacy_policy" for the numbered sections.
        legal_entries = [
            ContentManagement(content_id="tos_hero", section="page_headers",
                title="Terms of Service",
                description="These terms govern your use of Rocket Trade's paper trading and market-education platform. Please read them carefully.",
                order_index=0),
            ContentManagement(content_id="privacy_hero", section="page_headers",
                title="Privacy Policy",
                description="This policy explains what personal data Rocket Trade collects, how we use it, and the rights you have under Singapore's Personal Data Protection Act.",
                order_index=0),

            ContentManagement(content_id="tos_intro", section="legal_meta",
                title="Introduction paragraph", order_index=0, description=
                "Rocket Trade Pte. Ltd. (\"we\", \"us\", \"the Platform\") operates a paper trading and investment-education platform. These Terms of Service form an agreement between you and Rocket Trade for use of the website, mobile experience, and related services, and are governed by Singapore law."),
            ContentManagement(content_id="tos_last_updated", section="legal_meta", title="August 10, 2026", order_index=0),
            ContentManagement(content_id="privacy_intro", section="legal_meta",
                title="Introduction paragraph", order_index=0, description=
                "Rocket Trade Pte. Ltd. (\"we\", \"us\", \"the Platform\") respects your privacy. This Privacy Policy describes how we collect, use, protect, and disclose personal data when you use our paper trading and market-education platform, in accordance with the Personal Data Protection Act 2012 of Singapore."),
            ContentManagement(content_id="privacy_last_updated", section="legal_meta", title="August 10, 2026", order_index=0),

            ContentManagement(content_id="tos_1", section="terms_of_service", title="1. Acceptance of Terms", order_index=0, description=
                "These Terms of Service (\"Terms\") form a legal agreement between you and Rocket Trade Pte. Ltd. (\"Rocket Trade\", \"we\", \"us\", or \"our\"), governing your access to and use of the Rocket Trade website, mobile experience, and related services (together, the \"Platform\").\n\n"
                "By creating an account or otherwise using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not register for or use the Platform.\n\n"
                "We may update these Terms from time to time to reflect changes to the Platform or applicable law. Where changes are material, we will take reasonable steps to notify you (such as an in-app notice or email). Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms."),
            ContentManagement(content_id="tos_2", section="terms_of_service", title="2. What Rocket Trade Is — and Is Not", order_index=1, description=
                "Rocket Trade is a paper trading and market-education platform. The Platform provides AI-generated stock predictions, market data, quant ratings, educational content, and community and expert-led discussion features to help users practise and learn about investing in a risk-free, simulated environment.\n\n"
                "Rocket Trade is not a licensed financial adviser, dealer, or capital markets services provider, and does not carry out any regulated activity under the Securities and Futures Act 2001 or the Financial Advisers Act 2001 of Singapore. We are not licensed or regulated by the Monetary Authority of Singapore (MAS), and nothing on the Platform should be treated as a regulated financial advisory or dealing service."),
            ContentManagement(content_id="tos_3", section="terms_of_service", title="3. AI Predictions & Analytical Content", order_index=2, description=
                "The Platform generates AI-based stock predictions, quant ratings, and other analytical content using machine-learning models applied to historical and current market data. This content is provided for informational and educational purposes only and does not constitute financial, investment, tax, or legal advice, and does not take into account your personal investment objectives, financial situation, or particular needs.\n\n"
                "AI-generated predictions are analytical estimates, not facts, and are not guaranteed to be accurate, complete, or timely. They should never be treated as a promise of future performance. Any decisions you make based on Platform content — including decisions you may separately make to invest real money elsewhere — are made entirely at your own risk, and you should seek independent, licensed financial advice before making any real-world investment decision."),
            ContentManagement(content_id="tos_4", section="terms_of_service", title="4. Market Data & Third-Party Information", order_index=3, description=
                "Market prices, charts, and related data displayed on the Platform are sourced from third-party market data providers and may be delayed, simulated, incomplete, or subject to interruption. We do not warrant the accuracy, completeness, or timeliness of any market data shown on the Platform, and you should not rely on it as a real-time or authoritative source for making financial decisions outside the Platform.\n\n"
                "Third-party market data remains the property of the relevant data provider or exchange and is provided to you solely for use within the Platform."),
            ContentManagement(content_id="tos_5", section="terms_of_service", title="5. Accounts & Security", order_index=4, description=
                "You must provide accurate registration information (such as your email address, and optionally your name, phone number, and address) and keep your login credentials confidential. You are responsible for all activity that occurs under your account, and must notify us promptly at kimanh.work26@gmail.com if you suspect unauthorised use of your account or a security incident affecting it.\n\n"
                "You must be at least 18 years old (the age of majority in Singapore under the Age of Majority Act 1971) to create an account and enter into these Terms. We may suspend or terminate accounts that violate these Terms, provide false information, or engage in abusive behaviour toward other users."),
            ContentManagement(content_id="tos_6", section="terms_of_service", title="6. Paper Trading, Virtual Wallet & Real Payments — What's Real and What's Not", order_index=5, description=
                "It's important that you understand exactly what is real money and what is simulated on Rocket Trade:\n\n"
                "Simulated (no real money, no cash value): all buying and selling of stocks, your in-platform cash wallet balance, \"cash in\" and \"cash out\" transfers to and from that wallet (even where you are asked for a bank name and account number for realism), gifts sent to experts, and expert compensation ledger credits. These are entirely virtual figures within a sandbox environment for educational purposes. They cannot be withdrawn, redeemed, converted into real currency, or transferred to a real bank account, and no real bank transfer or money movement of any kind occurs when you use these features.\n\n"
                "Real (actual payment): only your premium subscription fee, charged through our payment processor, Stripe, is a real charge to your real payment card. See Section 7 below.\n\n"
                "Where a bank name or account number is requested as part of the simulated cash portal feature, this is for demonstration purposes only; account numbers are masked before storage and are never used to initiate any real transaction."),
            ContentManagement(content_id="tos_7", section="terms_of_service", title="7. Subscriptions & Payments", order_index=6, description=
                "Rocket Trade offers a free tier and a paid premium subscription with additional features. Paid subscriptions are billed in the currency and at the price shown at checkout, and are processed through our third-party payment processor, Stripe. We do not store your full card details on our servers.\n\n"
                "Subscriptions renew automatically until cancelled. You can cancel at any time from your account's Subscription page; access typically continues until the end of the current billing period. Fees already paid are generally non-refundable, except where required by the Consumer Protection (Fair Trading) Act 2003 or other applicable Singapore law, or as otherwise stated at the point of purchase."),
            ContentManagement(content_id="tos_8", section="terms_of_service", title="8. Acceptable Use", order_index=7, description=
                "When using the Platform, you agree not to: access or attempt to access the Platform through automated means (bots, scrapers, or similar tools) except where we provide an official API; reverse-engineer, decompile, or attempt to extract the source code of the Platform; circumvent or attempt to circumvent any security, rate-limiting, or access-control measures; misuse the AI chatbot to generate unlawful, harmful, or abusive content; exploit bugs in the simulated wallet, gifting, or compensation systems in bad faith; or use the Platform in any way that violates applicable law or infringes the rights of others.\n\n"
                "We may investigate and take appropriate action against anyone who, in our reasonable judgment, violates this section, including suspending or terminating accounts and, where necessary, reporting conduct to the relevant authorities."),
            ContentManagement(content_id="tos_9", section="terms_of_service", title="9. Community Conduct", order_index=8, description=
                "The forum, expert portfolios, reviews, and chat features are meant for respectful discussion of markets, strategies, and platform feedback. You agree not to post content that is unlawful, defamatory, harassing, or that infringes on another person's intellectual property or other rights, and not to use these features to spam, mislead, or impersonate others.\n\n"
                "We reserve the right to remove content or restrict accounts that violate this policy, in line with the moderation tools available to our administrators, and to report unlawful content to the relevant authorities where required."),
            ContentManagement(content_id="tos_10", section="terms_of_service", title="10. Experts & Expert Program", order_index=9, description=
                "Users who apply for and are approved as Experts may publish portfolios, commentary, and educational content on the Platform, and may accumulate compensation credits as described within the Platform based on followers and engagement. As described in Section 6, this compensation is currently tracked as an in-platform ledger figure for educational and gamification purposes and is not a real cash payout; if this changes in future, we will update these Terms and notify affected users before the change takes effect.\n\n"
                "Expert content reflects personal opinion only; it is not independently verified by us and is not a guarantee of investment outcomes for anyone who follows it, even within the simulated environment."),
            ContentManagement(content_id="tos_11", section="terms_of_service", title="11. Intellectual Property", order_index=10, description=
                "The Platform's design, branding, software, and original content are owned by Rocket Trade Pte. Ltd. or our licensors and are protected by Singapore and international intellectual property laws, including the Copyright Act 2021. Market data and third-party content displayed on the Platform remain the property of their respective owners.\n\n"
                "You retain ownership of content you post (such as forum posts and reviews), but by posting it you grant us a non-exclusive, royalty-free, worldwide licence to host, display, reproduce, and distribute that content within the Platform for the purpose of operating and promoting the service.\n\n"
                "If you believe content on the Platform infringes your intellectual property rights, please contact us at kimanh.work26@gmail.com with details of the alleged infringement, and we will review and, where appropriate, remove or disable access to the content."),
            ContentManagement(content_id="tos_12", section="terms_of_service", title="12. Availability & Changes to the Platform", order_index=11, description=
                "We aim to keep the Platform available and reliable, but we do not guarantee that it will be available at all times or free from interruption, and we do not provide any uptime or service-level commitment. The Platform may be unavailable from time to time for maintenance, updates, or reasons outside our reasonable control.\n\n"
                "We may add, change, suspend, or discontinue any feature of the Platform (including specific market data feeds, AI models, or community features) at any time, with or without notice, and will not be liable for any resulting loss where this occurs."),
            ContentManagement(content_id="tos_13", section="terms_of_service", title="13. Disclaimers & Limitation of Liability", order_index=12, description=
                "The Platform is provided \"as is\" and \"as available\", without warranties of any kind, whether express or implied. We do not guarantee that predictions, market data, or the service itself will be uninterrupted, accurate, or error-free.\n\n"
                "To the fullest extent permitted by law — including subject to any limits imposed by the Unfair Contract Terms Act 1977 of Singapore — Rocket Trade Pte. Ltd. and its officers, employees, and agents will not be liable for any indirect, incidental, special, or consequential loss or damage arising from your use of the Platform, including any decisions made using information found on it. Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited, such as liability for death or personal injury caused by negligence, or for fraud.\n\n"
                "You agree to indemnify and hold us harmless from any claims, losses, or expenses (including reasonable legal costs) arising from your breach of these Terms or your misuse of the Platform."),
            ContentManagement(content_id="tos_14", section="terms_of_service", title="14. Termination", order_index=13, description=
                "You may stop using the Platform and request account deletion at any time by contacting our support team through the Help Centre or at kimanh.work26@gmail.com. We may suspend or terminate accounts that breach these Terms or applicable law, with or without notice where circumstances reasonably require it.\n\n"
                "Provisions of these Terms that by their nature should survive termination (including intellectual property, disclaimers, limitation of liability, and governing law) will continue to apply after your account is closed."),
            ContentManagement(content_id="tos_15", section="terms_of_service", title="15. Governing Law & Dispute Resolution", order_index=14, description=
                "These Terms are governed by and construed in accordance with the laws of the Republic of Singapore, without regard to conflict of law principles.\n\n"
                "Any dispute arising out of or in connection with these Terms, including any question regarding its existence, validity, or termination, shall first be addressed through good-faith negotiation between you and us. If it cannot be resolved this way, the dispute shall be referred to and finally resolved by the courts of Singapore, which shall have exclusive jurisdiction, save that we may also seek injunctive or other equitable relief in any court of competent jurisdiction where necessary to protect our rights."),
            ContentManagement(content_id="tos_16", section="terms_of_service", title="16. General", order_index=15, description=
                "If any provision of these Terms is found to be invalid or unenforceable under Singapore law, that provision will be limited or severed to the minimum extent necessary, and the remaining provisions will continue in full force and effect.\n\n"
                "These Terms, together with our Privacy Policy, constitute the entire agreement between you and us regarding the Platform and supersede any prior agreements on this subject. We may assign these Terms in connection with a merger, acquisition, or sale of assets; you may not assign your rights under these Terms without our consent. A person who is not a party to these Terms has no rights under the Contracts (Rights of Third Parties) Act 2001 to enforce any term of these Terms."),
            ContentManagement(content_id="tos_17", section="terms_of_service", title="17. Contact Us", order_index=16, description=
                "Questions about these Terms can be sent to our support team through the Help Centre, or by emailing kimanh.work26@gmail.com."),

            ContentManagement(content_id="privacy_1", section="privacy_policy", title="1. About This Policy", order_index=0, description=
                "Rocket Trade Pte. Ltd. (\"we\", \"us\", \"the Platform\") is committed to protecting your personal data in accordance with the Personal Data Protection Act 2012 of Singapore (\"PDPA\"). This Privacy Policy explains what personal data we collect, why we collect it, how we use, store, and protect it, and the rights you have over it.\n\n"
                "This Policy applies to all users of the Rocket Trade paper trading and market-education platform. By using the Platform, you consent to the collection, use, and disclosure of your personal data as described in this Policy, to the extent permitted by the PDPA."),
            ContentManagement(content_id="privacy_2", section="privacy_policy", title="2. Account & Profile Data", order_index=1, description=
                "When you register, we collect your email address and password, and optionally your full name, username, phone number, and address if you choose to provide them. Your password is never stored in plain text.\n\n"
                "If you use the simulated cash portal ('cash in' / 'cash out') feature, we collect a bank name and account number for demonstration purposes only — account numbers are masked (only the last 4 digits are retained) before storage, and no real bank transfer ever takes place. See our Terms of Service for details on which features are simulated."),
            ContentManagement(content_id="privacy_3", section="privacy_policy", title="3. Activity Data", order_index=2, description=
                "We collect data generated by your use of the Platform, including your simulated trading activity (buy/sell orders, holdings, watchlists, price alerts), forum posts, reviews and ratings you leave, expert applications and portfolios you create, gifts sent within the Platform, and your conversations with the AI chatbot.\n\n"
                "We also collect standard technical and log data, such as login timestamps and session identifiers, used to keep your account secure and the Platform running smoothly."),
            ContentManagement(content_id="privacy_4", section="privacy_policy", title="4. Subscriptions & Payment Data", order_index=3, description=
                "If you subscribe to a premium plan, your payment is processed by our third-party payment processor, Stripe. We receive confirmation of your subscription status, plan, and billing history, but we do not receive or store your full card number, expiry date, or CVV on our servers — these are handled directly by Stripe in accordance with its own privacy policy and applicable card-industry security standards."),
            ContentManagement(content_id="privacy_5", section="privacy_policy", title="5. Purposes of Use", order_index=4, description=
                "Under the PDPA, we only collect, use, or disclose your personal data where you have given consent, or where collection without consent is permitted or required by law. By registering an account, you consent to our collection and use of your personal data for the purposes below:\n\n"
                "To create and manage your account, authenticate you when you log in, and remember your session.\n\n"
                "To operate core features of the Platform, including simulated trading, watchlists, alerts, the community forum, expert portfolios, reviews, gifts, and the AI chatbot.\n\n"
                "To process premium subscription payments through Stripe and manage billing.\n\n"
                "To send account-related notifications by email (such as alerts you set up, forum activity, password resets, or subscription renewal reminders) and to respond to support requests submitted through the Help Centre.\n\n"
                "To maintain the security, integrity, and reliability of the Platform, including detecting misuse of the service, and to comply with our legal and regulatory obligations.\n\n"
                "We will not use your personal data for a new purpose not disclosed here without first obtaining your consent, unless permitted or required by law."),
            ContentManagement(content_id="privacy_6", section="privacy_policy", title="6. Withdrawing Consent", order_index=5, description=
                "You may withdraw your consent to our collection, use, or disclosure of your personal data at any time by contacting us at kimanh.work26@gmail.com, subject to legal or contractual restrictions. Please note that withdrawing consent for certain purposes (for example, account authentication) may mean we are no longer able to provide you with the Platform or particular features, and we will inform you of the likely consequences before acting on your request."),
            ContentManagement(content_id="privacy_7", section="privacy_policy", title="7. Community Content", order_index=6, description=
                "Content you choose to post publicly on the Platform — such as forum posts, comments, reviews, ratings, and expert profiles — is visible to other users of the Platform and, depending on your account and post settings, may be visible to the public. Please avoid including personal data in public posts that you would not want others to see."),
            ContentManagement(content_id="privacy_8", section="privacy_policy", title="8. How We Protect Your Data", order_index=7, description=
                "Account authentication is handled through Firebase Authentication (Google), and application data is stored in our backend database. In accordance with the PDPA's Protection Obligation, we apply reasonable technical and organisational measures — including access controls, password hashing, and secure credential handling — to protect your personal data against unauthorised access, collection, use, disclosure, copying, modification, or disposal.\n\n"
                "No online platform can guarantee absolute security. If you believe your account has been compromised, please change your password immediately and contact our support team.\n\n"
                "In the event of a data breach that is likely to result in significant harm to affected individuals, or that affects 500 or more individuals, we will notify the Personal Data Protection Commission (PDPC) and affected individuals as required under the PDPA's mandatory data breach notification obligation."),
            ContentManagement(content_id="privacy_9", section="privacy_policy", title="9. Data Retention", order_index=8, description=
                "We retain personal data only for as long as it is necessary to fulfil the purposes for which it was collected, or as required by law (for example, accounting and tax record-keeping obligations). Where personal data is no longer necessary for any of these purposes, we will cease to retain it, or anonymise it, in accordance with the PDPA's Retention Limitation Obligation."),
            ContentManagement(content_id="privacy_10", section="privacy_policy", title="10. Third-Party Services We Use", order_index=9, description=
                "We rely on a small number of third-party service providers to operate the Platform, and personal data is shared with each of them only to the extent needed for them to perform their function:\n\n"
                "Firebase Authentication (Google) — handles account sign-up, login, and session security.\n\n"
                "Stripe — processes premium subscription payments; handles your payment card details directly.\n\n"
                "Brevo and Gmail (SMTP) — send transactional emails such as OTP codes, password resets, welcome emails, and subscription renewal reminders.\n\n"
                "Groq — powers the AI investment chatbot; messages you send to the chatbot are transmitted to Groq's API for processing in order to generate a response.\n\n"
                "Market data providers (including Yahoo Finance and Alpaca Markets data feeds) — supply the stock prices, charts, and historical data shown on the Platform. These providers do not receive your personal data; only anonymous requests for market data are made.\n\n"
                "Some of these providers may process or store data outside Singapore. Where personal data is transferred overseas, we take steps required under the PDPA's Transfer Limitation Obligation to ensure a standard of protection comparable to that under the PDPA."),
            ContentManagement(content_id="privacy_11", section="privacy_policy", title="11. Other Disclosure of Personal Data", order_index=10, description=
                "Beyond the service providers listed in Section 10, we do not sell your personal data, and we do not share it with third parties for their own marketing purposes.\n\n"
                "We may disclose personal data if required to do so by law or a competent authority, or to protect the rights, safety, and security of Rocket Trade and its users."),
            ContentManagement(content_id="privacy_12", section="privacy_policy", title="12. Access & Correction Rights", order_index=11, description=
                "Under the PDPA, you have the right to request access to the personal data we hold about you, and to request correction of any error or omission in that data. You can review and update most of your account details directly from your profile settings, or by submitting a request to our Data Protection Officer at kimanh.work26@gmail.com.\n\n"
                "We will respond to access and correction requests within a reasonable time. We may charge a reasonable fee for access requests as permitted under the PDPA, and will inform you of any applicable fee in advance.\n\n"
                "You can manage or cancel a premium subscription from the Subscription page, and manage optional notification preferences from your account's notification settings."),
            ContentManagement(content_id="privacy_13", section="privacy_policy", title="13. Account & Data Deletion", order_index=12, description=
                "You can request deletion of your account and associated personal data at any time by contacting our support team at kimanh.work26@gmail.com. Some information may be retained where necessary for legal, security, or record-keeping purposes, as described in Section 9 above."),
            ContentManagement(content_id="privacy_14", section="privacy_policy", title="14. Cookies & Session Data", order_index=13, description=
                "We use session storage to keep you signed in during a browsing session. We do not use this data for third-party advertising, and Rocket Trade does not display ads on the Platform."),
            ContentManagement(content_id="privacy_15", section="privacy_policy", title="15. Children's Privacy", order_index=14, description=
                "Rocket Trade is not directed at children, and accounts require users to be at least 18 years old, the age of majority in Singapore. We do not knowingly collect personal data from children."),
            ContentManagement(content_id="privacy_16", section="privacy_policy", title="16. Changes to This Policy", order_index=15, description=
                "We may update this Privacy Policy from time to time to reflect changes to the Platform or applicable law. We will update the \"Last updated\" date above when changes are made, and will notify you of material changes where required."),
            ContentManagement(content_id="privacy_17", section="privacy_policy", title="17. Our Data Protection Officer & How to Contact Us", order_index=16, description=
                "In accordance with the PDPA, we have appointed a Data Protection Officer (DPO) responsible for ensuring our compliance with the Act. You may contact our DPO with any questions, feedback, or complaints about how your personal data is handled, or to make an access, correction, or withdrawal-of-consent request, by emailing kimanh.work26@gmail.com.\n\n"
                "If you are not satisfied with our response, you may lodge a complaint with the Personal Data Protection Commission of Singapore (PDPC) at pdpc.gov.sg."),
        ]
        entries.extend(legal_entries)

        to_add = [e for e in entries if e.content_id not in existing_ids]
        if to_add:
            session.add_all(to_add)
