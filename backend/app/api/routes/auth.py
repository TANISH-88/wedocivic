import re
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.models.user import User, AvatarEmbed
from app.core.security import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterBody(BaseModel):
    name:     str
    username: str
    email:    EmailStr
    password: str
    city:     str  # <-- ADD THIS
    state:    str  # <-- ADD THIS

# NEW: Body for Authority Registration
class RegisterAuthorityBody(BaseModel):
    name:         str
    username:     str
    email:        EmailStr
    password:     str
    designation:  str
    organization: str
    city:         str  # <-- ADD THIS
    state:        str  # <-- ADD THIS

class LoginBody(BaseModel):
    email:    EmailStr
    password: str

class GoogleBody(BaseModel):
    id_token: str

class ForgotPasswordBody(BaseModel):
    email: EmailStr

class ResetPasswordBody(BaseModel):
    token:        str
    new_password: str

def user_dict(u: User) -> dict:
    return {
        "id":              str(u.id),
        "name":            u.name,
        "username":        u.username,
        "email":           u.email,
        "avatar":          {"url": u.avatar.url, "public_id": u.avatar.public_id},
        "bio":             u.bio,
        "location":        u.location,
        "city":            getattr(u, "city", ""),  # <-- ADD THIS
        "state":           getattr(u, "state", ""), # <-- ADD THIS
        "website":         u.website,
        "category":        u.category,
        "skills":          u.skills,
        "interests":       u.interests,
        "designation":     u.designation, # Added for authorities
        "organization":    u.organization, # Added for authorities
        "followers_count": u.followers_count,
        "following_count": u.following_count,
        "posts_count":     u.posts_count,
        "impact_score":    u.impact_score,
        "is_verified":     u.is_verified,
        "role":            u.role,
        "auth_provider":   u.auth_provider,
        "created_at":      u.created_at.isoformat(),
        "last_claim_date": u.last_claim_date,
        "claim_streak":    u.claim_streak or 0,
        "can_claim_today": u.can_claim_today(),
    }


@router.post("/register", status_code=201)
async def register(body: RegisterBody):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.match(r'^[a-z0-9_.]{3,30}$', body.username.lower()):
        raise HTTPException(400, "Username: 3-30 chars, lowercase letters/numbers/_ only")
    existing = await User.find_one({"$or": [{"email": body.email.lower()}, {"username": body.username.lower()}]})
    if existing:
        field = "Email" if existing.email == body.email.lower() else "Username"
        raise HTTPException(409, f"{field} already in use")
    user = User(name=body.name, username=body.username.lower(), email=body.email.lower(), city=body.city, state=body.state)
    user.set_password(body.password)
    await user.insert()
    return {"success": True, "token": create_access_token(str(user.id)), "user": user_dict(user)}


# NEW: Dedicated route for Authority Registration
@router.post("/register/authority", status_code=201)
async def register_authority(body: RegisterAuthorityBody):
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    if not re.match(r'^[a-z0-9_.]{3,30}$', body.username.lower()):
        raise HTTPException(400, "Username: 3-30 chars, lowercase letters/numbers/_ only")
    existing = await User.find_one({"$or": [{"email": body.email.lower()}, {"username": body.username.lower()}]})
    if existing:
        field = "Email" if existing.email == body.email.lower() else "Username"
        raise HTTPException(409, f"{field} already in use")
    
    # Notice we set role="authority" and category="Authority" here!
    user = User(
        name=body.name, 
        username=body.username.lower(), 
        email=body.email.lower(),
        role="authority",
        category="Authority",
        designation=body.designation,
        organization=body.organization,
        city=body.city,
        state=body.state,
        is_verified=True # Authorities get immediate blue checkmark
    )
    user.set_password(body.password)
    await user.insert()
    return {"success": True, "token": create_access_token(str(user.id)), "user": user_dict(user)}


@router.post("/login")
async def login(body: LoginBody):
    user = await User.find_one({"email": body.email.lower()})
    if not user or user.auth_provider != "local" or not user.verify_password(body.password):
        raise HTTPException(401, "Invalid email or password")
    user.last_seen = datetime.utcnow()
    await user.save()
    return {"success": True, "token": create_access_token(str(user.id)), "user": user_dict(user)}


@router.post("/google")
async def google_login(body: GoogleBody):
    try:
        from google.oauth2 import id_token as g_id
        from google.auth.transport import requests as g_req
        from app.core.config import settings
        info = g_id.verify_oauth2_token(body.id_token, g_req.Request(), settings.GOOGLE_CLIENT_ID)
    except Exception:
        raise HTTPException(401, "Invalid Google token")
    google_id = info["sub"]
    email     = info.get("email", "")
    user = await User.find_one({"$or": [{"google_id": google_id}, {"email": email}]})
    if not user:
        base = re.sub(r"[^a-z0-9_.]", "", email.split("@")[0].lower()) or "user"
        username = base
        counter = 1
        while await User.find_one({"username": username}):
            username = f"{base}{counter}"; counter += 1
        user = User(name=info.get("name",""), username=username, email=email,
                    google_id=google_id, auth_provider="google",
                    avatar=AvatarEmbed(url=info.get("picture",""), public_id=""))
        await user.insert()
    elif not user.google_id:
        user.google_id = google_id; user.auth_provider = "google"
        if not user.avatar.url: user.avatar = AvatarEmbed(url=info.get("picture",""), public_id="")
        await user.save()
    return {"success": True, "token": create_access_token(str(user.id)), "user": user_dict(user)}


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"success": True, "user": user_dict(current_user)}


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    import secrets, httpx
    from app.core.config import settings

    user = await User.find_one({"email": body.email.lower()})
    if not user or user.auth_provider != "local":
        return {"success": True, "message": "If that email is registered, you will receive a reset link."}

    token = secrets.token_urlsafe(32)
    user.reset_token = token
    user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
    await user.save()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post("https://api.emailjs.com/api/v1.0/email/send", json={
                "service_id":  settings.EMAILJS_SERVICE_ID,
                "template_id": settings.EMAILJS_TEMPLATE_ID,
                "user_id":     settings.EMAILJS_PUBLIC_KEY,
                "accessToken": settings.EMAILJS_PRIVATE_KEY,
                "template_params": {
                    "email":     user.email,
                    "name":      user.name,
                    "link":      reset_link,
                    "from_name": settings.FROM_NAME,
                },
            })
    except Exception as e:
        print(f"[FORGOT-PASSWORD] EmailJS send error: {e}")

    return {"success": True, "message": "If that email is registered, you will receive a reset link."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordBody):
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    user = await User.find_one({"reset_token": body.token})
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(400, "Invalid or expired reset token")

    user.set_password(body.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await user.save()
    return {"success": True, "message": "Password has been reset successfully"}