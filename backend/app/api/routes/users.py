import os
import json
import traceback
from typing import Optional, List

from dotenv import load_dotenv

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from beanie import PydanticObjectId
from google import genai
from google.genai import types

from app.core.config import settings
from app.models.user import User, AvatarEmbed
from app.models.follow import Follow
# NEW: Imported GroupMember to update group points
from app.models.group import GroupMember, Group
from app.core.security import get_current_user, get_optional_user
from app.core import cloudinary as cld
from app.utils.formatters import user_dict, mini_user # Using shared formatters

# Load the variables from the .env file
load_dotenv()

router = APIRouter(prefix="/users", tags=["users"])

# --- GEMINI CONFIGURATION ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEYY")
client = genai.Client(api_key=GEMINI_API_KEY)
MODEL_NAME = "gemini-2.5-flash"

# --- REGISTRY ---
GARBAGE_REGISTRY = {
    "aluminum can": {"category": "Metal", "points": 10},
    "garbage": {"category": "Waste", "points": 0.1},
    "Nescafe sachet": {"category": "Paper", "points": 0.2},
    "waste": {"category": "Waste", "points": 0.1},
    "soda can": {"category": "Metal", "points": 10},
    "crushed soda can": {"category": "Metal", "points": 10},
    "wooden stir stick": {"category": "Wood", "points": 3},
    "napkin": {"category": "Paper", "points": 2},
    "crumpled can": {"category": "Metal", "points": 10},
    "crushed plastic bottle": {"category": "Plastic", "points": 8},
    "waste coffee cup": {"category": "Paper", "points": 5},
    "empty cup": {"category": "Paper", "points": 5},
    
    "red bull can": {"category": "Metal", "points": 10},
    "waste sugar sachet": {"category": "Paper", "points": 2},
    "monster energy can": {"category": "Metal", "points": 10},
    "crushed beverage can": {"category": "Metal", "points": 10},
    "crushed energy drink can": {"category": "Metal", "points": 10},
    "crushed can": {"category": "Metal", "points": 10},
    "empty blister pack": {"category": "Medical", "points": 5},
    "empty medicine blister pack": {"category": "Medical", "points": 5},
    "popped blister pack": {"category": "Medical", "points": 5},
    "empty food packaging": {"category": "Plastic", "points": 3},
    "empty chip bag": {"category": "Plastic", "points": 4},
    "tin can": {"category": "Metal", "points": 12},
    
    
    "glass bottle": {"category": "Glass", "points": 15},
    "blister pack": {"category": "Medical", "points": 5},
    "empty pill blister pack": {"category": "Medical", "points": 5},
    "pill blister pack": {"category": "Medical", "points": 5},
    "cardboard box": {"category": "Paper", "points": 12},
    "paper sheet": {"category": "Paper", "points": 2},
    "plastic wrapper": {"category": "Plastic", "points": 3},
    "chip bag": {"category": "Plastic", "points": 4},
    "battery": {"category": "Electronic", "points": 25},
    
    
}

# --- Pydantic Models ---
class ClaimRequest(BaseModel):
    amount: float

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

# ==========================================
# 1. SPECIALIZED ROUTES (Must be ABOVE /{username})
# ==========================================

@router.get("/leaderboard")
async def leaderboard(
    search: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    groupType: Optional[str] = "Individual Users",  # Individual Users, Group, Official Group, Community
    limit: int = 10,
    skip: int = 0
):
    """
    Get leaderboard with filtering support.
    groupType: Individual Users | Group | Official Group | Community
    """
    
    # Build query filter
    query_filter = {"is_active": True}
    
    # Add search filter (name/username)
    if search and len(search.strip()) >= 2:
        query_filter["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"username": {"$regex": search, "$options": "i"}}
        ]
    
    # Add state filter
    if state and state.strip():
        query_filter["state"] = {"$regex": f"^{state}$", "$options": "i"}
    
    # Add city filter
    if city and city.strip():
        query_filter["city"] = {"$regex": f"^{city}$", "$options": "i"}
    
    # For Individual Users view, exclude Authority users (only show Citizens)
    if groupType == "Individual Users":
        query_filter["category"] = {"$ne": "Authority"}
        query_filter["role"] = {"$ne": "authority"}
    
    import logging
    logging.warning(f"[LEADERBOARD] groupType={groupType}, filter={query_filter}")
    
    # Get users with sorting by impact_score descending
    users = await User.find(query_filter).sort(-User.impact_score).skip(skip).limit(limit).to_list()
    
    for u in users:
        logging.warning(f"[LEADERBOARD] User: {u.username}, role={u.role}, category={u.category}")
    
    # Get total count for pagination info
    total_count = await User.find(query_filter).count()
    
    return {
        "success": True, 
        "users": [mini_user(u) for u in users],
        "total": total_count,
        "limit": limit,
        "skip": skip
    }

@router.get("/search")
async def search_users(q: str = ""):
    if len(q.strip()) < 2:
        return {"success": True, "users": []}
    users = await User.find(
        {"$or": [{"username": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]}
    ).limit(20).to_list()
    return {"success": True, "users": [mini_user(u) for u in users]}

@router.get("/me/connections")
async def get_my_connections(me: User = Depends(get_current_user)):
    # Re-use the smart logic for the logged-in user
    return {
        "success": True,
        "following": (await get_following(str(me.id)))["following"],
        "followers": (await get_followers(str(me.id)))["followers"]
    }

# ==========================================
# 2. CONNECTION MANAGEMENT (FOLLOWERS/FOLLOWING)
# ==========================================

@router.delete("/{target_id}/unfollow")
async def unfollow_user(target_id: str, me: User = Depends(get_current_user)):
    target_obj_id = PydanticObjectId(target_id)
    follow_rel = await Follow.find_one({
        "follower_id": {"$in": [str(me.id), PydanticObjectId(me.id)]},
        "following_id": {"$in": [target_id, target_obj_id]}
    })

    if not follow_rel:
        raise HTTPException(404, "Relationship not found")
        
    await follow_rel.delete()
    me.following_count = max(0, (me.following_count or 0) - 1)
    await me.save()
    
    target_user = await User.get(target_obj_id)
    if target_user:
        target_user.followers_count = max(0, (target_user.followers_count or 0) - 1)
        await target_user.save()

    return {"success": True}


@router.delete("/{follower_id}/remove_follower")
async def remove_follower(follower_id: str, me: User = Depends(get_current_user)):
    follower_obj_id = PydanticObjectId(follower_id)

    # ✅ FIXED HERE
    follow_rel = await Follow.find_one({
        "follower_id": {"$in": [follower_id, follower_obj_id]}, 
        "following_id": {"$in": [str(me.id), PydanticObjectId(me.id)]}
    })
    
    if not follow_rel:
        raise HTTPException(404, "Relationship not found")
        
    await follow_rel.delete()
    me.followers_count = max(0, (me.followers_count or 0) - 1)
    await me.save()
    
    follower_user = await User.get(follower_obj_id)
    if follower_user:
        follower_user.following_count = max(0, (follower_user.following_count or 0) - 1)
        await follower_user.save()

    return {"success": True}

    return {"success": True}

@router.get("/{user_id}/followers")
async def get_followers(user_id: str):
    try:
        # Create a list of possible IDs to check (String and ObjectId)
        possible_ids = [user_id]
        try:
            possible_ids.append(PydanticObjectId(user_id))
        except:
            pass

        # Search for ANY follow record where following_id matches any of our possible IDs
        follows = await Follow.find({"following_id": {"$in": possible_ids}}).to_list()
        
        # Extract follower_ids and convert to ObjectIds for the User search
        ids_to_fetch = []
        for f in follows:
            try:
                # Add the follower_id (convert to ObjectId to find the User document)
                ids_to_fetch.append(PydanticObjectId(f.follower_id))
            except:
                continue
                
        users = await User.find({"_id": {"$in": ids_to_fetch}}).to_list()
        return {"success": True, "followers": [mini_user(u) for u in users]}
    except Exception as e:
        print(f"Error: {e}")
        return {"success": False, "followers": []}

@router.get("/{user_id}/following")
async def get_following(user_id: str):
    try:
        possible_ids = [user_id]
        try:
            possible_ids.append(PydanticObjectId(user_id))
        except:
            pass

        # Search for records where this user is the FOLLOWER
        follows = await Follow.find({"follower_id": {"$in": possible_ids}}).to_list()
        
        ids_to_fetch = []
        for f in follows:
            try:
                ids_to_fetch.append(PydanticObjectId(f.following_id))
            except:
                continue
                
        users = await User.find({"_id": {"$in": ids_to_fetch}}).to_list()
        return {"success": True, "following": [mini_user(u) for u in users]}
    except Exception as e:
        print(f"Error: {e}")
        return {"success": False, "following": []}
# ==========================================
# 3. AI & PROFILE ROUTES
# ==========================================

@router.post("/detect")
async def detect_garbage(
    file: UploadFile = File(...), 
    video: Optional[UploadFile] = File(None),
    targets: Optional[str] = Form(None),
    custom_objects: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    try:
        image_content = await file.read()
        contents = [types.Part.from_bytes(data=image_content, mime_type=file.content_type)]
        
        prompt = "Detect garbage items: name (class_name), quantity (count), confidence."
        contents.append(prompt)

        manual_flat_schema = {
            "type": "OBJECT",
            "properties": {
                "items": {
                    "type": "ARRAY",
                    "items": {
                        "type": "OBJECT",
                        "properties": {
                            "class_name": {"type": "STRING"},
                            "count": {"type": "INTEGER"},
                            "confidence": {"type": "NUMBER"}
                        },
                        "required": ["class_name", "count", "confidence"]
                    }
                }
            },
            "required": ["items"]
        }
        
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=manual_flat_schema,
            )
        )

        if response.text:
            data = json.loads(response.text)
            items = data.get("items", [])
            formatted = [{"class": i.get("class_name"), "count": i.get("count"), "confidence": i.get("confidence")} for i in items]
            return {"items": formatted, "total_objects": sum(i['count'] for i in formatted if i.get('count'))}
        return {"items": [], "total_objects": 0}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calculate_points")
async def calculate_points(selected_items: List[dict], current_user: User = Depends(get_current_user)):
    total_score = 0
    breakdown = []
    for item in selected_items:
        raw_name = (item.get("class") or item.get("class_name") or "").lower().strip()
        count = item.get("count", 1)
        data = GARBAGE_REGISTRY.get(raw_name)
        if data:
            pts = data["points"] * count
            total_score += pts
            breakdown.append({"item": raw_name, "category": data["category"], "count": count, "total": pts})
        else:
            breakdown.append({"item": raw_name, "category": "REJECTED", "count": count, "total": 0})
    return {"total_points": total_score, "breakdown": breakdown}


# --- UPDATED CLAIM POINTS ROUTE ---
@router.post("/claim-points")
async def claim_points(request: ClaimRequest, current_user: User = Depends(get_current_user)):
    current_user.do_claim() 
    current_user.impact_score += request.amount
    await current_user.save()
    
    # NEW LOGIC: Distribute points to all groups the user is a part of
    user_id_str = str(current_user.id)
    user_memberships = await GroupMember.find(GroupMember.user_id == user_id_str).to_list()
    
    for membership in user_memberships:
        current_points = getattr(membership, "contributed_points", 0) 
        # Convert request.amount to int just in case, since GroupMember expects an int
        membership.contributed_points = current_points + int(request.amount)
        await membership.save()
        
        # CASCADE LOGIC: Update group's total_points ONLY for official hubs
        group = await Group.get(membership.group_id)
        if group and group.is_official:
            # Recalculate group's total points from all members (only for official hubs)
            all_memberships = await GroupMember.find(GroupMember.group_id == str(group.id)).to_list()
            group.total_points = sum(m.contributed_points for m in all_memberships)
            await group.save()
            
            # Cascade to parent communities
            # Find all communities that include this hub
            communities = await Group.find(
                Group.is_community == True,
                {"affiliated_hubs": {"$in": [str(group.id)]}}
            ).to_list()
            
            for community in communities:
                # Recalculate community points from all affiliated hubs
                hub_points_total = 0
                for hub_id in community.affiliated_hubs:
                    hub = await Group.get(hub_id)
                    if hub:
                        hub_points_total += hub.total_points
                
                community.total_points = hub_points_total
                await community.save()

    return {"success": True, "points_awarded": request.amount, "new_score": current_user.impact_score, "streak": current_user.claim_streak}


@router.post("/change-password")
async def change_password(request: ChangePasswordRequest, current_user: User = Depends(get_current_user)):
    if not current_user.verify_password(request.current_password):
        raise HTTPException(400, "Current password incorrect")
    current_user.set_password(request.new_password)
    await current_user.save()
    return {"success": True}

@router.put("/update-profile")
async def update_profile(
    name: Optional[str] = Form(None),
    bio: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
):
    if name: current_user.name = name
    if bio: current_user.bio = bio
    if avatar:
        data = await avatar.read()
        res = await cld.upload_avatar(data)
        current_user.avatar = AvatarEmbed(url=res["url"], public_id=res["public_id"])
    await current_user.save()
    u_dict = user_dict(current_user)
    u_dict["city"] = getattr(current_user, "city", "")
    u_dict["state"] = getattr(current_user, "state", "")
    return {"success": True, "user": u_dict}

@router.get("/{username}")
async def get_profile(username: str, current_user: Optional[User] = Depends(get_optional_user)):
    user = await User.find_one(User.username == username.lower().strip())
    if not user: raise HTTPException(404, "User not found")
    is_following = False
    if current_user:
        is_following = bool(await Follow.find_one(Follow.follower_id == str(current_user.id), Follow.following_id == str(user.id)))
    u_dict = user_dict(user)
    u_dict["city"] = getattr(user, "city", "")
    u_dict["state"] = getattr(user, "state", "")
    return {"success": True, "user": u_dict, "isFollowing": is_following}

@router.get("/me")
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user
