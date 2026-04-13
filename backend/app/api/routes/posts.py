# app/api/routes/posts.py
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from beanie import PydanticObjectId
from app.models.post import Post, MediaEmbed
from app.models.user import User
from app.models.follow import Follow
from app.models.like import Like
from app.core.security import get_current_user
from app.core import cloudinary as cld

router = APIRouter(prefix="/posts", tags=["posts"])


async def enrich(post: Post, me: Optional[User] = None) -> dict:
    author = await User.get(post.author_id)
    is_liked = False
    if me:
        is_liked = bool(await Like.find_one(Like.user_id == me.id, Like.target_id == post.id, Like.target_type == "Post"))
    return {
        "id":             str(post.id),
        "_id":            str(post.id),
        "author": {
            "id":          str(author.id) if author else "",
            "_id":         str(author.id) if author else "",
            "name":        author.name if author else "",
            "username":    author.username if author else "",
            "avatar":      {"url": author.avatar.url} if author else {"url": ""},
            "category":    author.category if author else "",
            "is_verified": author.is_verified if author else False,
        } if author else {},
        "caption":        post.caption,
        "media":          [{"url": m.url, "public_id": m.public_id, "type": m.type} for m in post.media],
        "location":       post.location,
        "impact_tags":    post.impact_tags,
        "likes_count":    post.likes_count,
        "comments_count": post.comments_count,
        "is_liked":       is_liked,
        "created_at":     post.created_at.isoformat(),
    }


@router.post("/create", status_code=201)
async def create_post(
    caption:     str = Form(""),
    location:    str = Form(""),
    impact_tags: str = Form(""),
    media:       List[UploadFile] = File(...),
    me:          User = Depends(get_current_user),
):
    if not media or len(media) == 0:
        raise HTTPException(400, "At least one media file is required")
    uploaded = []
    for f in media[:5]:
        data   = await f.read()
        result = await cld.upload_media(data, f.filename or "upload")
        uploaded.append(MediaEmbed(url=result["url"], public_id=result["public_id"], type=result["type"]))

    tags = [t.strip() for t in impact_tags.split(",") if t.strip()]
    post = Post(author_id=me.id, caption=caption, media=uploaded, location=location, impact_tags=tags)
    await post.insert()
    me.posts_count += 1
    await me.save()
    await me.add_impact("post", 10)
    return {"success": True, "post": await enrich(post, me)}


@router.get("/feed")
async def feed(page: int = 1, limit: int = 12, me: User = Depends(get_current_user)):
    # 1. Get the IDs of everyone the current user follows
    follows = await Follow.find(Follow.follower_id == me.id).to_list()
    
    # 2. Add the user's own ID to that list so they see their own posts too
    ids     = [f.following_id for f in follows] + [me.id]
    skip    = (page - 1) * limit
    
    # 3. ONLY fetch posts where the author is in that specific list of IDs
    posts   = await Post.find({"author_id": {"$in": ids}, "is_archived": False}).sort(-Post.created_at).skip(skip).limit(limit).to_list()

    # The fallback code injecting strangers has been removed from here!

    enriched = [await enrich(p, me) for p in posts]
    return {"success": True, "posts": enriched, "pagination": {"page": page, "limit": limit, "hasMore": len(posts) == limit}}


@router.get("/explore")
async def explore(tag: str = "", page: int = 1, limit: int = 12):
    q = {"is_archived": False}
    if tag: q["impact_tags"] = tag
    posts    = await Post.find(q).sort(-Post.created_at).skip((page - 1) * limit).limit(limit).to_list()
    enriched = [await enrich(p) for p in posts]
    return {"success": True, "posts": enriched, "pagination": {"page": page, "limit": limit, "hasMore": len(posts) == limit}}


@router.get("/user/{user_id}")
async def user_posts(user_id: str, page: int = 1, limit: int = 12):
    oid   = PydanticObjectId(user_id)
    posts = await Post.find(Post.author_id == oid, Post.is_archived == False).sort(-Post.created_at).skip((page - 1) * limit).limit(limit).to_list()
    enriched = [await enrich(p) for p in posts]
    return {"success": True, "posts": enriched, "pagination": {"page": page, "limit": limit, "hasMore": len(posts) == limit}}


@router.get("/{post_id}")
async def get_post(post_id: str):
    post = await Post.get(PydanticObjectId(post_id))
    if not post or post.is_archived:
        raise HTTPException(404, "Post not found")
    return {"success": True, "post": await enrich(post)}


@router.delete("/{post_id}")
async def delete_post(post_id: str, me: User = Depends(get_current_user)):
    post = await Post.get(PydanticObjectId(post_id))
    if not post: raise HTTPException(404, "Post not found")
    if post.author_id != me.id: raise HTTPException(403, "Not authorised")
    for m in post.media: cld.delete_media(m.public_id, m.type)
    await post.delete()
    me.posts_count = max(0, me.posts_count - 1)
    await me.save()
    return {"success": True, "message": "Post deleted"}