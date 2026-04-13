# app/api/routes/social.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from beanie import PydanticObjectId
from app.models.user import User
from app.models.post import Post
from app.models.comment import Comment
from app.models.like import Like
from app.models.follow import Follow
from app.models.notification import Notification
from app.core.security import get_current_user

router = APIRouter(prefix="/social", tags=["social"])


class LikeBody(BaseModel):
    target_id:   str
    target_type: str   # "Post" or "Comment"

class CommentBody(BaseModel):
    postId:            str
    text:              str
    parent_comment_id: str = ""

class FollowBody(BaseModel):
    user_id: str


@router.post("/like")
async def toggle_like(body: LikeBody, me: User = Depends(get_current_user)):
    if body.target_type not in ["Post", "Comment"]:
        raise HTTPException(400, "target_type must be Post or Comment")
    tid = PydanticObjectId(body.target_id)

    existing = await Like.find_one(Like.user_id == me.id, Like.target_id == tid, Like.target_type == body.target_type)
    if existing:
        await existing.delete()
        if body.target_type == "Post":
            doc = await Post.get(tid)
            if doc: doc.likes_count = max(0, doc.likes_count - 1); await doc.save()
        else:
            doc = await Comment.get(tid)
            if doc: doc.likes_count = max(0, doc.likes_count - 1); await doc.save()
        return {"success": True, "liked": False}
    else:
        await Like(user_id=me.id, target_id=tid, target_type=body.target_type).insert()
        if body.target_type == "Post":
            doc = await Post.get(tid)
            if doc:
                doc.likes_count += 1; await doc.save()
                if doc.author_id != me.id:
                    await Notification(recipient_id=doc.author_id, sender_id=me.id, type="like",
                        entity_type="Post", entity_id=tid, message=f"{me.name} liked your post").insert()
        else:
            doc = await Comment.get(tid)
            if doc: doc.likes_count += 1; await doc.save()
        return {"success": True, "liked": True}

@router.get("/following")
async def get_following(me: User = Depends(get_current_user)):
    # 1. Find all follow records where the current user is the follower
    follows = await Follow.find(Follow.follower_id == me.id).to_list()
    following_ids = [f.following_id for f in follows]
    
    # 2. Fetch the actual user profiles for those IDs
    users = await User.find({"_id": {"$in": following_ids}}).to_list()
    
    # 3. Format them for the frontend
    formatted_users = []
    for u in users:
        formatted_users.append({
            "id": str(u.id),
            "name": u.name,
            "username": u.username,
            "avatar": {"url": u.avatar.url} if u.avatar else None,
            "is_verified": u.is_verified
        })
        
    return {"success": True, "users": formatted_users}


@router.post("/comment")
async def add_comment(body: CommentBody, me: User = Depends(get_current_user)):
    if not body.text.strip():
        raise HTTPException(400, "Comment text required")
    pid  = PydanticObjectId(body.postId)
    post = await Post.get(pid)
    if not post: raise HTTPException(404, "Post not found")

    comment = Comment(post_id=pid, author_id=me.id, text=body.text.strip(),
                      parent_comment_id=PydanticObjectId(body.parent_comment_id) if body.parent_comment_id else None)
    await comment.insert()
    post.comments_count += 1; await post.save()

    if post.author_id != me.id:
        await Notification(recipient_id=post.author_id, sender_id=me.id, type="comment",
            entity_type="Post", entity_id=pid, message=f"{me.name} commented on your post").insert()

    return {"success": True, "comment": {
        "id": str(comment.id), "text": comment.text, "likes_count": 0,
        "created_at": comment.created_at.isoformat(),
        "author": {"id": str(me.id), "name": me.name, "username": me.username,
                   "avatar": {"url": me.avatar.url}, "is_verified": me.is_verified},
    }}


@router.get("/comments/{post_id}")
async def get_comments(post_id: str):
    pid      = PydanticObjectId(post_id)
    comments = await Comment.find(Comment.post_id == pid, Comment.parent_comment_id == None).sort(-Comment.created_at).limit(50).to_list()
    result   = []
    for c in comments:
        author = await User.get(c.author_id)
        result.append({
            "id": str(c.id), "text": c.text, "likes_count": c.likes_count,
            "created_at": c.created_at.isoformat(),
            "author": {"id": str(author.id), "name": author.name, "username": author.username,
                       "avatar": {"url": author.avatar.url}, "is_verified": author.is_verified} if author else {},
        })
    return {"success": True, "comments": result}


@router.post("/follow")
async def toggle_follow(body: FollowBody, me: User = Depends(get_current_user)):
    uid = PydanticObjectId(body.user_id)
    if uid == me.id: raise HTTPException(400, "Cannot follow yourself")
    target = await User.get(uid)
    if not target: raise HTTPException(404, "User not found")

    existing = await Follow.find_one(Follow.follower_id == me.id, Follow.following_id == uid)
    if existing:
        await existing.delete()
        me.following_count     = max(0, me.following_count - 1)
        target.followers_count = max(0, target.followers_count - 1)
        await me.save(); await target.save()
        return {"success": True, "following": False}
    else:
        await Follow(follower_id=me.id, following_id=uid).insert()
        me.following_count     += 1
        target.followers_count += 1
        await me.save(); await target.save()
        await Notification(recipient_id=uid, sender_id=me.id, type="follow",
            entity_type="User", entity_id=me.id, message=f"{me.name} started following you").insert()
        return {"success": True, "following": True}
