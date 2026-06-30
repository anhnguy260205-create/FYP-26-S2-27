import os
from groq import AsyncGroq
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system: Optional[str] = None

def sanitize_reply(reply: str) -> str:
    """Clean plan wording and robotic markdown before showing AI replies."""
    if not reply:
        return reply

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

    # Remove markdown bold markers so labels appear as plain text: "Quick take:"
    cleaned = cleaned.replace("**", "")

    # Keep paragraph spacing tidy without crushing bullet lists.
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

@router.post("/chat")
async def chat(data: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return JSONResponse(status_code=500, content={"detail": "GROQ_API_KEY not configured."})

    try:
        client = AsyncGroq(api_key=api_key)

        msgs = []
        if data.system:
            msgs.append({"role": "system", "content": data.system})
        msgs += [{"role": m.role, "content": m.content} for m in data.messages]

        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            max_tokens=430,
            temperature=0.55,
            top_p=0.9,
            messages=msgs,
        )
        return {"reply": sanitize_reply(response.choices[0].message.content)}

    except Exception as e:
        message = str(e)
        lowered = message.lower()
        status_code = getattr(e, "status_code", None) or getattr(e, "status", None)

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
