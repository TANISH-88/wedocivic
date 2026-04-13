# app/api/routes/events.py
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from beanie import PydanticObjectId
from app.models.event import Event, CoverImageEmbed
from app.models.user import User
from app.core.security import get_current_user
from app.core import cloudinary as cld

router = APIRouter(prefix="/events", tags=["events"])


async def enrich_event(e: Event) -> dict:
    org = await User.get(e.organizer_id)
    return {
        "id":                  str(e.id),
        "title":               e.title,
        "description":         e.description,
        "location":            e.location,
        "event_date":          e.event_date.isoformat(),
        "volunteers_required": e.volunteers_required,
        "participants_count":  e.participants_count,
        "participants":        [str(p) for p in e.participants],
        "impact_tags":         e.impact_tags,
        "status":              e.status,
        "cover_image":         {"url": e.cover_image.url, "public_id": e.cover_image.public_id},
        "created_at":          e.created_at.isoformat(),
        "organizer": {
            "id":          str(org.id),
            "name":        org.name,
            "username":    org.username,
            "avatar":      {"url": org.avatar.url},
            "category":    org.category,
            "is_verified": org.is_verified,
        } if org else {},
    }


@router.post("/create", status_code=201)
async def create_event(
    title:               str = Form(...),
    description:         str = Form(...),
    location:            str = Form(...),
    event_date:          str = Form(...),
    volunteers_required: int = Form(10),
    impact_tags:         str = Form(""),
    cover_image:         Optional[UploadFile] = File(None),
    me:                  User = Depends(get_current_user),
):
    try:
        dt = datetime.fromisoformat(event_date)
    except ValueError:
        raise HTTPException(400, "Invalid date format. Use ISO format: 2025-12-31T10:00:00")

    if dt < datetime.utcnow():
        raise HTTPException(400, "Event date must be in the future")

    cover = CoverImageEmbed()
    if cover_image:
        data   = await cover_image.read()
        result = await cld.upload_media(data, cover_image.filename or "event", folder="civicimpact/events")
        cover  = CoverImageEmbed(url=result["url"], public_id=result["public_id"])

    tags  = [t.strip() for t in impact_tags.split(",") if t.strip()]
    event = Event(
        organizer_id=me.id, title=title, description=description,
        location=location, event_date=dt, volunteers_required=volunteers_required,
        impact_tags=tags, cover_image=cover,
    )
    await event.insert()
    await me.add_impact("event_created", 20)
    return {"success": True, "event": await enrich_event(event)}


@router.get("/")
async def get_events(status: str = "upcoming", page: int = 1, limit: int = 10):
    events   = await Event.find(Event.status == status).sort(Event.event_date).skip((page - 1) * limit).limit(limit).to_list()
    enriched = [await enrich_event(e) for e in events]
    return {"success": True, "events": enriched, "pagination": {"page": page, "limit": limit, "hasMore": len(events) == limit}}


@router.post("/{event_id}/join")
async def join_event(event_id: str, me: User = Depends(get_current_user)):
    event = await Event.get(PydanticObjectId(event_id))
    if not event:    raise HTTPException(404, "Event not found")
    if event.status != "upcoming": raise HTTPException(400, "Event not accepting participants")

    if me.id in event.participants:
        event.participants.remove(me.id)
        event.participants_count = max(0, event.participants_count - 1)
        await event.save()
        return {"success": True, "joined": False, "message": "Left event"}

    if event.participants_count >= event.volunteers_required:
        raise HTTPException(400, "Event is full")

    event.participants.append(me.id)
    event.participants_count += 1
    await event.save()
    await me.add_impact("event_joined", 5)
    return {"success": True, "joined": True, "message": "Successfully joined!"}
