# app/models/post.py
from typing import List
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

IMPACT_TAGS = [
    "environment","education","healthcare","infrastructure",
    "poverty","human-rights","women-empowerment","youth",
    "disability","agriculture","water-sanitation","governance",
    "disaster-relief","technology","arts-culture","other",
]

class MediaEmbed(BaseModel):
    url:       str
    public_id: str
    type:      str = "image"   # "image" or "video"

class Post(Document):
    author_id:      PydanticObjectId
    caption:        str = ""
    media:          List[MediaEmbed] = []
    location:       str = ""
    impact_tags:    List[str] = []
    likes_count:    int = 0
    comments_count: int = 0
    is_archived:    bool = False
    created_at:     datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "posts"
        indexes = ["author_id", "impact_tags", "likes_count", "created_at"]
