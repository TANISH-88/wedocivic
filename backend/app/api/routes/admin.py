# app/api/routes/admin.py
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, EmailStr
from beanie import PydanticObjectId
from beanie.operators import Or
from app.models.user import User
from app.models.post import Post
from app.models.event import Event
from app.models.group import Group, GroupMember, GroupInvitation
from app.models.message import GroupMessage
from app.core.security import get_admin_user, create_access_token

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminLoginBody(BaseModel):
    email:    EmailStr
    password: str

class ResetPasswordBody(BaseModel):
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
        "category":        u.category,
        "followers_count": u.followers_count,
        "following_count": u.following_count,
        "posts_count":     u.posts_count,
        "impact_score":    u.impact_score,
        "is_verified":     u.is_verified,
        "is_active":       u.is_active,
        "role":            u.role,
        "auth_provider":   u.auth_provider,
        "created_at":      u.created_at.isoformat(),
    }


# ── Admin Login ───────────────────────────────────────────────────────────────
@router.post("/login")
async def admin_login(body: AdminLoginBody):
    """Admin-only login endpoint"""
    user = await User.find_one(User.email == body.email.lower())
    if not user or user.role != "admin" or not user.verify_password(body.password):
        raise HTTPException(401, "Invalid admin credentials")
    
    return {
        "success": True,
        "token": create_access_token(str(user.id)),
        "user": user_dict(user)
    }


# ── Dashboard Stats ───────────────────────────────────────────────────────────
@router.get("/stats")
async def get_stats(admin: User = Depends(get_admin_user)):
    """Get dashboard statistics"""
    total_users  = await User.count()
    total_posts  = await Post.count()
    total_events = await Event.count()
    active_users = await User.find(User.is_active == True).count()
    
    return {
        "success": True,
        "stats": {
            "total_users":  total_users,
            "active_users": active_users,
            "total_posts":  total_posts,
            "total_events": total_events,
        }
    }


# ── User Management ───────────────────────────────────────────────────────────
@router.get("/users")
async def get_all_users(
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
):
    """Get all users with pagination and filters"""
    skip = (page - 1) * limit
    
    query = {}
    if search:
        users = await User.find(
            User.is_active == True,  # Only show active users
            Or(
                User.username.regex(search, "i"),
                User.name.regex(search, "i"),
                User.email.regex(search, "i")
            )
        ).skip(skip).limit(limit).to_list()
        total = await User.find(
            User.is_active == True,  # Only show active users
            Or(
                User.username.regex(search, "i"),
                User.name.regex(search, "i"),
                User.email.regex(search, "i")
            )
        ).count()
    elif role:
        users = await User.find(
            User.is_active == True,  # Only show active users
            User.role == role
        ).skip(skip).limit(limit).to_list()
        total = await User.find(
            User.is_active == True,  # Only show active users
            User.role == role
        ).count()
    else:
        users = await User.find(User.is_active == True).skip(skip).limit(limit).to_list()  # Only show active users
        total = await User.find(User.is_active == True).count()  # Only show active users
    
    return {
        "success": True,
        "users": [user_dict(u) for u in users],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        }
    }


@router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    admin: User = Depends(get_admin_user)
):
    """Toggle user active status"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    if user.role == "admin":
        raise HTTPException(403, "Cannot deactivate admin users")
    
    user.is_active = not user.is_active
    await user.save()
    
    return {
        "success": True,
        "user": user_dict(user)
    }


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role: str = Query(..., regex="^(user|admin)$"),
    admin: User = Depends(get_admin_user)
):
    """Update user role"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    user.role = role
    await user.save()
    
    return {
        "success": True,
        "user": user_dict(user)
    }


@router.patch("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    body: ResetPasswordBody,
    admin: User = Depends(get_admin_user)
):
    """Reset user password (admin only)"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    if len(body.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    
    user.set_password(body.new_password)
    await user.save()
    
    return {
        "success": True,
        "message": "Password reset successfully"
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: User = Depends(get_admin_user)
):
    """Delete a user permanently from database"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    if user.role == "admin":
        raise HTTPException(403, "Cannot delete admin users")
    
    # Hard delete - remove from database permanently
    await user.delete()
    
    return {"success": True, "message": "User deleted permanently"}


# ── Group Points Reset ──────────────────────────────────────────────────
class UpdatePointsRequest(BaseModel):
    points: float  # Can be positive or negative
    action: str = "admin_adjustment"

@router.patch("/users/{user_id}/points")
async def update_user_points(
    user_id: str,
    body: UpdatePointsRequest,
    admin: User = Depends(get_admin_user)
):
    """Increase/decrease user points with admin logging"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    old_score = user.impact_score
    await user.add_impact(f"admin_adjustment: {body.action}", body.points)
    
    return {
        "success": True,
        "user": user_dict(user),
        "change": body.points,
        "old_score": old_score,
        "new_score": user.impact_score,
        "message": f"Points {'increased' if body.points > 0 else 'decreased'} by {abs(body.points)}"
    }

@router.get("/users/{user_id}/impact-log")
async def get_user_impact_log(
    user_id: str,
    admin: User = Depends(get_admin_user)
):
    """Get detailed impact log for a user"""
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    return {
        "success": True,
        "impact_score": user.impact_score,
        "log": [
            {
                "action": log.action,
                "points": log.points,
                "created_at": log.created_at.isoformat()
            }
            for log in reversed(user.impact_log)  # Most recent first
        ]
    }


# ── Post Management ───────────────────────────────────────────────────────────
@router.get("/posts")
async def get_all_posts(
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all posts with pagination"""
    skip = (page - 1) * limit
    posts = await Post.find_all().sort("-created_at").skip(skip).limit(limit).to_list()
    total = await Post.count()
    
    # Populate author info
    result = []
    for post in posts:
        author = await User.get(post.author_id)
        result.append({
            "id": str(post.id),
            "content": post.content,
            "media": post.media,
            "likes_count": post.likes_count,
            "comments_count": post.comments_count,
            "created_at": post.created_at.isoformat(),
            "author": {
                "id": str(author.id),
                "name": author.name,
                "username": author.username,
                "avatar": {"url": author.avatar.url}
            } if author else None
        })
    
    return {
        "success": True,
        "posts": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        }
    }


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    admin: User = Depends(get_admin_user)
):
    """Delete a post"""
    post = await Post.get(PydanticObjectId(post_id))
    if not post:
        raise HTTPException(404, "Post not found")
    
    # Update author's post count
    author = await User.get(post.author_id)
    if author:
        author.posts_count = max(0, author.posts_count - 1)
        await author.save()
    
    await post.delete()
    return {"success": True, "message": "Post deleted"}


# ── Event Management ──────────────────────────────────────────────────────────
@router.get("/events")
async def get_all_events(
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get all events with pagination"""
    skip = (page - 1) * limit
    events = await Event.find_all().sort("-created_at").skip(skip).limit(limit).to_list()
    total = await Event.count()
    
    # Populate organizer info
    result = []
    for event in events:
        organizer = await User.get(event.organizer_id)
        result.append({
            "id": str(event.id),
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "date": event.date.isoformat() if event.date else None,
            "attendees_count": event.attendees_count,
            "created_at": event.created_at.isoformat(),
            "organizer": {
                "id": str(organizer.id),
                "name": organizer.name,
                "username": organizer.username,
                "avatar": {"url": organizer.avatar.url}
            } if organizer else None
        })
    
    return {
        "success": True,
        "events": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        }
    }


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    admin: User = Depends(get_admin_user)
):
    """Delete an event"""
    event = await Event.get(PydanticObjectId(event_id))
    if not event:
        raise HTTPException(404, "Event not found")
    
    await event.delete()
    return {"success": True, "message": "Event deleted"}


# ── Group Management ──────────────────────────────────────────────────────────
class AdminBulkDeleteGroupsRequest(BaseModel):
    group_ids: List[str]


@router.get("/groups")
async def get_all_groups(
    admin: User = Depends(get_admin_user),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    group_type: Optional[str] = None,
):
    """Get all groups with pagination"""
    skip = (page - 1) * limit
    
    if group_type == "official":
        groups = await Group.find(Group.is_official == True).skip(skip).limit(limit).to_list()
        total = await Group.find(Group.is_official == True).count()
    elif group_type == "community":
        groups = await Group.find(Group.is_community == True).skip(skip).limit(limit).to_list()
        total = await Group.find(Group.is_community == True).count()
    elif group_type == "normal":
        groups = await Group.find(
            Group.is_official != True,
            Group.is_community != True
        ).skip(skip).limit(limit).to_list()
        total = await Group.find(
            Group.is_official != True,
            Group.is_community != True
        ).count()
    else:
        groups = await Group.find_all().skip(skip).limit(limit).to_list()
        total = await Group.count()
    
    result = []
    for group in groups:
        creator = await User.get(PydanticObjectId(group.creator_id)) if group.creator_id else None
        result.append({
            "id": str(group.id),
            "_id": str(group.id),
            "name": group.name,
            "slug": group.slug,
            "description": getattr(group, "description", ""),
            "avatar": getattr(group, "avatar", None),
            "is_official": getattr(group, "is_official", False),
            "is_community": getattr(group, "is_community", False),
            "member_count": getattr(group, "member_count", 0),
            "created_at": group.created_at.isoformat() if group.created_at else None,
            "creator": {
                "id": str(creator.id),
                "name": creator.name,
                "username": creator.username,
            } if creator else None
        })
    
    return {
        "success": True,
        "groups": result,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        }
    }


@router.delete("/groups/{group_id}")
async def admin_delete_group(
    group_id: str,
    admin: User = Depends(get_admin_user)
):
    """Delete a single group (admin only - no ownership check)"""
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")
    
    # Clean up related data
    if getattr(group, "is_official", False):
        await User.find({"official_group_id": str(group.id)}).update({"$unset": {"official_group_id": ""}})
    
    await GroupMember.find(GroupMember.group_id == str(group.id)).delete()
    await GroupMessage.find(GroupMessage.group_id == str(group.id)).delete()
    await GroupInvitation.find(GroupInvitation.group_id == str(group.id)).delete()
    await group.delete()
    
    return {"success": True, "message": "Group deleted"}


@router.post("/groups/bulk-delete")
async def admin_bulk_delete_groups(
    request: AdminBulkDeleteGroupsRequest,
    admin: User = Depends(get_admin_user)
):
    """
    Admin bulk delete groups - NO ownership check.
    Admins can delete any groups regardless of who created them.
    """
    deleted_count = 0
    deleted_groups = []
    skipped_groups = []
    
    for group_id in request.group_ids:
        try:
            group = await Group.get(PydanticObjectId(group_id))
            if not group:
                skipped_groups.append({"id": group_id, "reason": "Not found"})
                continue
            
            deleted_groups.append({
                "id": str(group.id),
                "name": group.name,
                "slug": getattr(group, "slug", "")
            })
            
            # Clean up related data
            if getattr(group, "is_official", False):
                await User.find({"official_group_id": str(group.id)}).update({"$unset": {"official_group_id": ""}})
            
            await GroupMember.find(GroupMember.group_id == str(group.id)).delete()
            await GroupMessage.find(GroupMessage.group_id == str(group.id)).delete()
            await GroupInvitation.find(GroupInvitation.group_id == str(group.id)).delete()
            await group.delete()
            deleted_count += 1
        except Exception as e:
            skipped_groups.append({"id": group_id, "reason": str(e)})
    
    return {
        "success": True,
        "message": f"Deleted {deleted_count} groups, skipped {len(skipped_groups)}",
        "deleted_count": deleted_count,
        "deleted_groups": deleted_groups,
        "skipped_groups": skipped_groups
    }
