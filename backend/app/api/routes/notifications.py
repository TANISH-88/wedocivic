# app/api/routes/notifications.py
from fastapi import APIRouter, Depends
from app.models.notification import Notification
from app.models.user import User
from app.core.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
async def get_notifications(me: User = Depends(get_current_user)):
    notifs = await Notification.find(Notification.recipient_id == me.id).sort(-Notification.created_at).limit(30).to_list()
    result = []
    for n in notifs:
        sender = await User.get(n.sender_id)
        result.append({
            "id":          str(n.id),
            "type":        n.type,
            "message":     n.message,
            "entity_type": n.entity_type,
            "entity":      str(n.entity_id),
            "is_read":     n.is_read,
            "created_at":  n.created_at.isoformat(),
            "sender": {
                "id":       str(sender.id),
                "name":     sender.name,
                "username": sender.username,
                "avatar":   {"url": sender.avatar.url},
            } if sender else {},
        })
    return {"success": True, "notifications": result}


@router.put("/read-all")
async def mark_all_read(me: User = Depends(get_current_user)):
    await Notification.find(Notification.recipient_id == me.id, Notification.is_read == False).update({"$set": {"is_read": True}})
    return {"success": True}
