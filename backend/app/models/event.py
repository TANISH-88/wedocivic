# app/models/event.py
from typing import List, Optional
from datetime import datetime
from beanie import Document, PydanticObjectId
from pydantic import BaseModel, Field

class CoverImageEmbed(BaseModel):
    url:       str = ""
    public_id: str = ""

class Event(Document):
    organizer_id:        PydanticObjectId
    title:               str
    description:         str
    location:            str
    event_date:          datetime
    volunteers_required: int = 1
    participants:        List[PydanticObjectId] = []
    participants_count:  int = 0
    cover_image:         CoverImageEmbed = Field(default_factory=CoverImageEmbed)
    impact_tags:         List[str] = []
    status:              str = "upcoming"
    created_at:          datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name    = "events"
        indexes = ["organizer_id", "event_date", "status"]
