# app/models/comment.py
from typing import Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class Comment(Document):
    post_id:           PydanticObjectId
    author_id:         PydanticObjectId
    text:              str
    likes_count:       int = 0
    parent_comment_id: Optional[PydanticObjectId] = None
    created_at:        datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "comments"
        indexes = ["post_id", "author_id", "created_at"]
