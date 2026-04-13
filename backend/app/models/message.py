from datetime import datetime
from beanie import Document, Indexed
from pydantic import Field

class GroupMessage(Document):
    group_id: Indexed(str)
    sender_id: Indexed(str)
    sender_name: str
    text: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "group_messages"