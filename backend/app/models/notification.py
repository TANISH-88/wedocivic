# app/models/notification.py
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import Field

class Notification(Document):
    recipient_id: PydanticObjectId
    sender_id:    PydanticObjectId
    type:         str
    entity_type:  str
    entity_id:    PydanticObjectId
    message:      str = ""
    is_read:      bool = False
    created_at:   datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "notifications"
        indexes = ["recipient_id", "is_read", "created_at"]
