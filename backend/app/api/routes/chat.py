import os
import traceback
from typing import Optional, List, Dict
from dotenv import load_dotenv

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai  # Modern SDK v1.x
from google.genai import types

# Load the variables from the .env file
load_dotenv()

router = APIRouter()

# --- CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEYY")
client = genai.Client(api_key=GEMINI_API_KEY)

# UPDATED: Using gemini-2.5-flash as 1.5 is no longer supported on this endpoint
MODEL_NAME = "gemini-2.5-flash"

# ✅ CivicAura Professional System Prompt
CIVIC_AURA_IDENTITY = """
You are the "Civic Assistant," the heart of CivicAura in Lucknow. 
Your tone is encouraging, tech-savvy, and deeply committed to a cleaner city.

CORE KNOWLEDGE:
1. SMART LENS: Users MUST scan trash AND record a video of disposal to earn points. (YOLOv8 AI verified).
2. REWARDS: Points are "Aura Points." Higher points = higher status in Lucknow.
3. TIERS: 
   - 🌱 Seed (0-100)
   - 🌿 Sprout (101-500) 
   - 🛡️ Guardian (501-2000)
   - 👑 Civic Legend (2000+)
4. MISSION: Reward citizens for cleaning, reporting 'Black Spots', and joining community drives at BBDU and across Lucknow.

GUIDELINES:
- If a user is a 'Seed', motivate them to reach 'Sprout'.
- If a user mentions a dirty area, tell them to "Report a Black Spot" in the app.
- Keep responses concise (under 3-4 sentences) so they look good in the chat bubble.
"""

# --- Pydantic Models ---
class ChatMessage(BaseModel):
    role: str # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    user_name: Optional[str] = "Citizen"
    user_points: Optional[float] = 0.0
    history: Optional[List[Dict[str, str]]] = [] # Pass history from frontend

# --- Helper Functions ---
def get_tier(points: float) -> str:
    if points <= 100: return "Seed"
    if points <= 500: return "Sprout"
    if points <= 2000: return "Guardian"
    return "Civic Legend"

# --- API Route ---
@router.post("/query")
async def chat_gemini(request: ChatRequest):
    try:
        # 1. Build the Dynamic Persona Header
        persona = f"""{CIVIC_AURA_IDENTITY}

CURRENT USER CONTEXT:
Name: {request.user_name}
Aura Points: {request.user_points}
Tier: {get_tier(request.user_points)}

IMPORTANT:
- Use EXACT Aura Points given above
- Do NOT assume or change points
- Always base tier on given points only
"""

        # 2. Format History for the v1.x SDK (types.Content)
        formatted_history = []
        for m in (request.history or []):
            formatted_history.append(
                types.Content(
                    role=m.get("role", "user"), 
                    parts=[types.Part(text=m.get("content", ""))]
                )
            )

        # 3. Generate Content using System Instruction for better logic
        response = client.models.generate_content(
            model=MODEL_NAME,
            config=types.GenerateContentConfig(
                system_instruction=persona,
                temperature=0.7,
            ),
            # Append the new message to the existing history
            contents=formatted_history + [
                types.Content(
                    role="user", 
                    parts=[types.Part(text=request.message)]
                )
            ]
        )

        return {
            "reply": response.text.strip(),
            "status": "success"
        }

    except Exception as e:
        print(f"AI Error: {e}")
        traceback.print_exc()
        # Raising detail so it's visible in Render logs/frontend
        raise HTTPException(status_code=500, detail=str(e))
