from sqlalchemy import Column, String, Integer, Boolean
from app.entity.database.base import Base
from app.entity.database.session import get_session
from uuid import uuid4


class LandingContent(Base):
    __tablename__ = "landing_content"

    content_id = Column(String(50), primary_key=True, default=lambda: f"content_{uuid4()}")
    section = Column(String(50), nullable=False)   # "hero" or "feature"
    title = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    order_index = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)

    @staticmethod
    def get_all():
        with get_session() as session:
            rows = session.query(LandingContent).order_by(
                LandingContent.section, LandingContent.order_index
            ).all()
            return [_serialize(r) for r in rows]

    @staticmethod
    def get_by_section(section: str):
        with get_session() as session:
            rows = session.query(LandingContent).filter(
                LandingContent.section == section,
                LandingContent.is_active == True
            ).order_by(LandingContent.order_index).all()
            return [_serialize(r) for r in rows]

    @staticmethod
    def update(content_id: str, title: str, description: str) -> bool:
        with get_session() as session:
            row = session.query(LandingContent).filter(
                LandingContent.content_id == content_id
            ).first()
            if not row:
                return False
            row.title = title
            row.description = description
            return True


def _serialize(row: LandingContent) -> dict:
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
        existing_ids = {r[0] for r in session.query(LandingContent.content_id).all()}

        entries = [
            # Landing page hero
            LandingContent(content_id="content_hero", section="hero",
                           title="Discover the Future of Smart Investing",
                           description="Explore powerful tools floating around your financial universe.",
                           order_index=0),
            # Landing page feature bubbles
            LandingContent(content_id="feature_ai_assistant",   section="feature", title="AI Assistant",         description="Smart financial insights",       order_index=0),
            LandingContent(content_id="feature_market_trends",  section="feature", title="Market Trends",        description="Live stock movement",             order_index=1),
            LandingContent(content_id="feature_ai_predictions", section="feature", title="AI Predictions",       description="Future market insights",          order_index=2),
            LandingContent(content_id="feature_alerts",         section="feature", title="Alerts",               description="Real-time notifications",         order_index=3),
            LandingContent(content_id="feature_experts",        section="feature", title="Professional Experts", description="Insights from industry leaders",  order_index=4),
            # Expert home page
            LandingContent(content_id="content_expert_hero", section="expert",
                           title="Lead the Future of Wealth Management",
                           description="Provide trusted investment expertise and data-driven strategies to help clients achieve their goals.",
                           order_index=0),
            # Free plan info
            LandingContent(content_id="free_plan_name",  section="free_plan", title="Starter", description="",                        order_index=0),
            LandingContent(content_id="free_plan_price", section="free_plan", title="$0.00",   description="forever, no card needed", order_index=1),
            # Premium plan info
            LandingContent(content_id="premium_plan_name",  section="premium_plan", title="Pro",     description="",                             order_index=0),
            LandingContent(content_id="premium_plan_price", section="premium_plan", title="$20.99",  description="per month, billed annually",   order_index=1),
            # Free investor subscription features
            LandingContent(content_id="free_feat_0", section="free_investor", title="Limited AI-Powered Stock Recommendations", order_index=0),
            LandingContent(content_id="free_feat_1", section="free_investor", title="Limited Personal Watchlist Management",    order_index=1),
            LandingContent(content_id="free_feat_2", section="free_investor", title="Limited Expert Portfolio Access",          order_index=2),
            LandingContent(content_id="free_feat_3", section="free_investor", title="Real-Time Market Dashboard",               order_index=3),
            LandingContent(content_id="free_feat_4", section="free_investor", title="Knowledge Hub Access",                     order_index=4),
            LandingContent(content_id="free_feat_5", section="free_investor", title="AI Investment Chatbot",                    order_index=5),
            LandingContent(content_id="free_feat_6", section="free_investor", title="Paper Trading",                            order_index=6),
            # Premium investor subscription features
            LandingContent(content_id="prem_feat_0", section="premium_investor", title="Everything in Free Plan",           order_index=0),
            LandingContent(content_id="prem_feat_1", section="premium_investor", title="Unlimited AI Stock Predictions",    order_index=1),
            LandingContent(content_id="prem_feat_2", section="premium_investor", title="Expert Consultation Access",        order_index=2),
            LandingContent(content_id="prem_feat_3", section="premium_investor", title="Advanced Portfolio Analytics",      order_index=3),
            LandingContent(content_id="prem_feat_4", section="premium_investor", title="Priority Customer Support",         order_index=4),
        ]

        # Remove old auto-generated feature entries (content_id starts with "content_"
        # and section is "feature") — these are duplicates from the original seed
        known_ids = {e.content_id for e in entries}
        old_features = session.query(LandingContent).filter(
            LandingContent.section == "feature",
            LandingContent.content_id.notin_(known_ids)
        ).all()
        for row in old_features:
            session.delete(row)

        to_add = [e for e in entries if e.content_id not in existing_ids]
        if to_add:
            session.add_all(to_add)
