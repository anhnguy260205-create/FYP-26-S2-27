from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.entity.database.connection import get_session
from app.entity.models.forum_consultation import ExpertPortfolio, ConsultationQuestion, ForumPost, ForumComment
from app.entity.models.useraccount import UserAccount

router = APIRouter(prefix="/api/features", tags=["Consultant & Forum Features"])

# --- Request Schemas ---
class PortfolioSchema(BaseModel):
    user_id: str
    bio: str
    experience_years: int
    hourly_rate: str
    skills: str
    covered_tickers: str

class ReplyQuestionSchema(BaseModel):
    reply_content: str

class PostCreateSchema(BaseModel):
    user_id: str
    title: str
    content: str
    category: str

class CommentCreateSchema(BaseModel):
    user_id: str
    content: str

# --- Expert Portfolio Endpoints ---
@router.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    with get_session() as session:
        port = session.query(ExpertPortfolio).filter(ExpertPortfolio.user_id == user_id).first()
        if not port:
            return {"success": False, "message": "No portfolio found"}
        return {
            "success": True,
            "portfolio": {
                "bio": port.bio,
                "experience_years": port.experience_years,
                "hourly_rate": port.hourly_rate,
                "skills": port.skills,
                "covered_tickers": port.covered_tickers
            }
        }

@router.post("/portfolio/save")
def save_portfolio(data: PortfolioSchema):
    with get_session() as session:
        port = session.query(ExpertPortfolio).filter(ExpertPortfolio.user_id == data.user_id).first()
        if not port:
            port = ExpertPortfolio(user_id=data.user_id)
            session.add(port)
        port.bio = data.bio
        port.experience_years = data.experience_years
        port.hourly_rate = data.hourly_rate
        port.skills = data.skills
        port.covered_tickers = data.covered_tickers
        session.commit()
        return {"success": True, "message": "Portfolio updated successfully"}

# --- Consultation Desk Endpoints ---
@router.get("/consultations/{expert_id}")
def get_consultations(expert_id: str):
    with get_session() as session:
        questions = session.query(ConsultationQuestion).filter(ConsultationQuestion.expert_id == expert_id).all()
        result = []
        for q in questions:
            inv = session.query(UserAccount).filter(UserAccount.user_id == q.investor_id).first()
            result.append({
                "id": q.question_id,
                "client": inv.full_name if inv else "Anonymous Investor",
                "title": q.title,
                "ticker": q.ticker,
                "content": q.content,
                "status": q.status,
                "reply": q.reply_content
            })
        return {"success": True, "questions": result}

@router.post("/consultations/reply/{question_id}")
def reply_consultation(question_id: str, data: ReplyQuestionSchema):
    with get_session() as session:
        q = session.query(ConsultationQuestion).filter(ConsultationQuestion.question_id == question_id).first()
        if not q:
            raise HTTPException(status_code=404, detail="Question not found")
        q.reply_content = data.reply_content
        q.status = "replied"
        session.commit()
        return {"success": True, "message": "Reply transmitted safely"}

# --- Community Forum Endpoints ---
@router.get("/forum/posts")
def get_forum_posts():
    with get_session() as session:
        posts = session.query(ForumPost).order_by(ForumPost.created_at.desc()).all()
        result = []
        for p in posts:
            author = session.query(UserAccount).filter(UserAccount.user_id == p.user_id).first()
            comments_count = session.query(ForumComment).filter(ForumComment.post_id == p.post_id).count()
            result.append({
                "id": p.post_id,
                "title": p.title,
                "content": p.content,
                "category": p.category,
                "views": p.views,
                "likes": p.likes,
                "time": p.created_at.strftime("%b %d, %Y"),
                "author": {
                    "name": author.full_name if author else "Unknown User",
                    "role": author.profile.profile_name if (author and author.profile) else "basic",
                    "initials": (author.full_name[:2].upper() if author and author.full_name else "FI")
                },
                "comments_count": comments_count
            })
        return {"success": True, "posts": result}

@router.post("/forum/posts/create")
def create_forum_post(data: PostCreateSchema):
    with get_session() as session:
        new_post = ForumPost(
            user_id=data.user_id,
            title=data.title,
            content=data.content,
            category=data.category
        )
        session.add(new_post)
        session.commit()
        return {"success": True, "message": "Post created"}

@router.get("/forum/posts/{post_id}")
def get_forum_post_detail(post_id: str):
    with get_session() as session:
        p = session.query(ForumPost).filter(ForumPost.post_id == post_id).first()
        if not p:
            raise HTTPException(status_code=404, detail="Post not found")
        p.views += 1
        session.commit()

        author = session.query(UserAccount).filter(UserAccount.user_id == p.user_id).first()
        comments = session.query(ForumComment).filter(ForumComment.post_id == post_id).order_by(ForumComment.created_at.ascii()).all()
        
        comments_list = []
        for c in comments:
            c_author = session.query(UserAccount).filter(UserAccount.user_id == c.user_id).first()
            comments_list.append({
                "id": c.comment_id,
                "author": c_author.full_name if c_author else "User",
                "content": c.content,
                "time": c.created_at.strftime("%b %d, %Y %H:%M")
            })

        return {
            "success": True,
            "post": {
                "id": p.post_id,
                "title": p.title,
                "content": p.content,
                "category": p.category,
                "views": p.views,
                "likes": p.likes,
                "time": p.created_at.strftime("%b %d, %Y"),
                "author": {
                    "name": author.full_name if author else "System User",
                    "initials": (author.full_name[:2].upper() if author and author.full_name else "FI")
                },
                "replies": comments_list
            }
        }

@router.post("/forum/posts/{post_id}/comment")
def add_forum_comment(post_id: str, data: CommentCreateSchema):
    with get_session() as session:
        comment = ForumComment(post_id=post_id, user_id=data.user_id, content=data.content)
        session.add(comment)
        session.commit()
        return {"success": True, "message": "Comment posted successfully"}