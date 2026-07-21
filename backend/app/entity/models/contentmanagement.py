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
    # MEDIUMTEXT (not String(500)) so this can hold either a short URL/blurb
    # (most sections) or a base64-encoded image data URI (forum_room cover
    # images, uploaded from the admin Content Management page — see
    # ContentManagementPage.jsx). Widened via a schema patch in main.py for
    # existing databases; new databases get it directly from this model.
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
        """Persist a full new ordering for one section in a single call —
        order_index becomes each id's position in ordered_ids. Used by the
        admin content manager's drag-and-drop reordering (feature bubbles,
        footer links, plan feature lists, forum room cards): the frontend
        reorders the list locally as the user drags, then sends the whole
        resulting id order here once, instead of many one-step swaps."""
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
            # Footer — product links (title = label, description = URL)
            ContentManagement(content_id="footer_product_0",     section="footer_product", title="Features",            description="#", order_index=0),
            ContentManagement(content_id="footer_product_1",     section="footer_product", title="Pricing",             description="#", order_index=1),
            # Footer — company links
            ContentManagement(content_id="footer_company_0",     section="footer_company", title="About Us",            description="#", order_index=0),
            ContentManagement(content_id="footer_company_1",     section="footer_company", title="Careers",             description="#", order_index=1),
            ContentManagement(content_id="footer_company_2",     section="footer_company", title="Blog",                description="#", order_index=2),
            ContentManagement(content_id="footer_company_3",     section="footer_company", title="Press",               description="#", order_index=3),
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

            # ── Landing page — section headings/subtitles that were hardcoded
            # in Homepage.jsx (title = heading, description = subtitle) ─────
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
        ]

        # Dropped sections — not read by any real page (confirmed by searching
        # the whole frontend): "feature" (unused bubbles), "expert" (no expert
        # homepage reads it), "forum_room" (ForumPage.jsx uses its own bundled
        # images, never this table). Deletes any rows left over from before
        # these were removed from admin editing — safe to run repeatedly.
        dead_sections = ("feature", "expert", "forum_room")
        session.query(ContentManagement).filter(
            ContentManagement.section.in_(dead_sections)
        ).delete(synchronize_session=False)

        to_add = [e for e in entries if e.content_id not in existing_ids]
        if to_add:
            session.add_all(to_add)
