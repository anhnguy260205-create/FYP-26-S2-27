import os
from groq import AsyncGroq
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

from app.control.services.auth import get_current_user
from app.control.services.rate_limit import limiter
from app.entity.models.chatusage import ChatUsage

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])
# message format used by the chatbot
class ChatMessage(BaseModel):
    role: str
    content: str
# request data sent to the chatbot
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system: Optional[str] = None
# clean up the chatbot response before sending it back
def sanitize_reply(reply: str) -> str:
    if not reply:
        return reply
    # remove plan-related wording from the response
    replacements = {
        "since I'm a Basic plan user, ": "",
        "Since I'm a Basic plan user, ": "",
        "as a Basic plan user, ": "",
        "As a Basic plan user, ": "",
        "since I am a Basic plan user, ": "",
        "Since I am a Basic plan user, ": "",
        "as a Premium plan user, ": "",
        "As a Premium plan user, ": "",
        "Basic plan user": "user",
        "Premium plan user": "user",
        "Basic user": "user",
        "Premium user": "user",
        "Educational only — not financial advice.": "Educational only, not financial advice.",
    }

    cleaned = reply
    for old, new in replacements.items():
        cleaned = cleaned.replace(old, new)

    # remove markdown bold markers
    cleaned = cleaned.replace("**", "")

    lines = [line.rstrip() for line in cleaned.splitlines()]
    compact = []
    blank_seen = False
    for line in lines:
        if not line.strip():
            if not blank_seen and compact:
                compact.append("")
            blank_seen = True
        else:
            compact.append(line)
            blank_seen = False

    return "\n".join(compact).strip()
# send a message to the AI chatbot
@router.post("/chat")
@limiter.limit("15/minute")
async def chat(
    request: Request,
    data: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    # check the user's chatbot usage limit and claim a slot atomically
    # all user roles get unlimited chances except basic investors, who only get 3
    reservation = ChatUsage.reserve(current_user["user_id"])
    if not reservation["allowed"]:
        return JSONResponse(status_code=403, content={
            "success": False,
            "limit_reached": True,
            "questions_used": reservation["questions_used"],
            "questions_limit": reservation["limit"],
            "message": "Free chatbot limit reached. Upgrade to Premium for unlimited AI chat.",
        })
    #get Groq API key from the environment
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        ChatUsage.release(reservation["usage_id"])
        return JSONResponse(status_code=500, content={"detail": "GROQ_API_KEY not configured."})

    try:
        client = AsyncGroq(api_key=api_key)

        msgs = []
        if data.system:
            msgs.append({"role": "system", "content": data.system})
        msgs += [{"role": m.role, "content": m.content} for m in data.messages]

        response = await client.chat.completions.create(
            model="openai/gpt-oss-20b",
            max_tokens=430,
            temperature=0.55,
            top_p=0.9,
            messages=msgs,
        )
        # slot was already reserved before calling Groq, just report it
        return {
            "reply": sanitize_reply(response.choices[0].message.content),
            "questions_used": reservation["questions_used"],
            "questions_limit": reservation["limit"],
        }

    except Exception as e:
        # Groq call failed, release the slot so it doesn't cost a free question
        ChatUsage.release(reservation["usage_id"])

        message = str(e)
        lowered = message.lower()
        status_code = getattr(e, "status_code", None) or getattr(e, "status", None)
        # handle rate limit errors separately
        if status_code == 429 or "rate limit" in lowered or "rate_limit" in lowered or "429" in lowered:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "RATE_LIMIT",
                    "message": "Please wait a little and try again. A shorter question may also help it go through faster.",
                },
            )

        return JSONResponse(
            status_code=500,
            content={
                "detail": "CHATBOT_ERROR",
                "message": "The AI assistant is temporarily unavailable. Please try again shortly.",
            },
        )

# get the user's chatbot usage
@router.get("/usage")
def chat_usage(current_user: dict = Depends(get_current_user)):
    return {"success": True, **ChatUsage.get_usage(current_user["user_id"])}

# claim 1 free-question slot for a reply the frontend builds locally instead of calling Groq
# without this, local replies never touched ChatUsage so they were free and unlimited
@router.post("/reserve")
def reserve_local_reply(current_user: dict = Depends(get_current_user)):
    reservation = ChatUsage.reserve(current_user["user_id"])
    if not reservation["allowed"]:
        return JSONResponse(status_code=403, content={
            "success": False,
            "limit_reached": True,
            "questions_used": reservation["questions_used"],
            "questions_limit": reservation["limit"],
            "message": "Free chatbot limit reached. Upgrade to Premium for unlimited AI chat.",
        })
    return {
        "success": True,
        "questions_used": reservation["questions_used"],
        "questions_limit": reservation["limit"],
    }
