# app/models/like.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class Like(Document):
    user_id:     PydanticObjectId
    target_id:   PydanticObjectId
    target_type: str   # "Post" or "Comment"
    created_at:  datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "likes"
        indexes = [[("user_id", 1), ("target_id", 1), ("target_type", 1)]]
