# app/models/follow.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class Follow(Document):
    follower_id:  PydanticObjectId
    following_id: PydanticObjectId
    created_at:   datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "follows"
        indexes = [[("follower_id", 1), ("following_id", 1)], "follower_id", "following_id"]
