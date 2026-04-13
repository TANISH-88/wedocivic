from typing import List, Optional, Any, Dict
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, File, UploadFile
from beanie import PydanticObjectId
from fastapi.encoders import jsonable_encoder
from bson import ObjectId
from datetime import datetime, timezone

from app.models.group import Group, GroupMember, GroupInvitation
from app.models.message import GroupMessage
from app.models.follow import Follow
from app.models.user import User
from app.core.security import get_current_user, get_admin_user

router = APIRouter(prefix="/groups", tags=["groups"])


# --- Request Body Models ---

class RespondInviteRequest(BaseModel):
    accept: bool

class GroupCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    initial_members: List[str]
    is_official: bool = False
    is_community: bool = False

class MessageCreate(BaseModel):
    text: str

class AddMemberRequest(BaseModel):
    user_id: str

class AddPointsRequest(BaseModel):
    points: int


# --- Helpers for Data Formatting ---

def mini_user(u: User) -> dict:
    return {
        "id": str(u.id),
        "name": u.name,
        "username": u.username,
        "avatar": {"url": u.avatar.url} if u.avatar else None,
        "role": getattr(u, "role", getattr(u, "tag", "citizen")),
        "impact_score": getattr(u, "impact_score", 0)  # Include user's overall points
    }

def mini_group(g: Any) -> Optional[dict]:
    try:
        if hasattr(g, "model_dump"): data = g.model_dump()
        elif hasattr(g, "dict"): data = g.dict()
        else: data = dict(g)

        return {
            "id": str(data.get("id", data.get("_id", ""))),
            "name": data.get("name", "Unnamed Hub"),
            "slug": data.get("slug", "no-handle"),
            "description": data.get("description", ""),
            "members_count": data.get("members_count", 0),
            "creator_id": str(data.get("creator_id", "")),
            "is_official": bool(data.get("is_official", False)),
            "is_community": bool(data.get("is_community", False)),
            "avatar_url": data.get("avatar_url", None),
            "total_points": data.get("total_points", 0),
        }
    except Exception as e:
        print(f"Error formatting group: {e}")
        return None

def serialize_message(msg: GroupMessage) -> dict:
    return {
        "id": str(msg.id),
        "group_id": msg.group_id,
        "sender_id": msg.sender_id,
        "sender_name": msg.sender_name,
        "text": msg.text,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


# --- WebSocket Manager ---

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, group_id: str):
        await websocket.accept()
        if group_id not in self.active_connections:
            self.active_connections[group_id] = []
        self.active_connections[group_id].append(websocket)

    def disconnect(self, websocket: WebSocket, group_id: str):
        if group_id in self.active_connections:
            self.active_connections[group_id].remove(websocket)
            if not self.active_connections[group_id]:
                del self.active_connections[group_id]

    async def broadcast(self, group_id: str, message: dict):
        if group_id in self.active_connections:
            for connection in self.active_connections[group_id]:
                await connection.send_json(message)

manager = ConnectionManager()


# --- Routes ---

# 1. DISCOVER
# --- SEPARATED DISCOVER ROUTES ---

@router.get("/discover/normal")
async def discover_normal_groups(q: Optional[str] = None, me: User = Depends(get_current_user)):
    try:
        query = {"is_official": {"$ne": True}, "is_community": {"$ne": True}}
        if q: query["name"] = {"$regex": q, "$options": "i"}
        
        groups = await Group.find(query).limit(20).to_list()
        # Debug: print what we found
        for g in groups:
            print(f"📍 NORMAL DISCOVER - {g.name}: is_official={g.is_official}, is_community={g.is_community}")
        
        # Filter out invalid groups (missing slug or creator, or marked as deleted)
        valid_groups = [g for g in groups if g.slug and g.creator_id]
        return {"success": True, "groups": [m for g in valid_groups if (m := mini_group(g)) is not None]}
    except Exception as e:
        return {"success": False, "groups": [], "error": str(e)}


@router.get("/discover/official")
async def discover_official_groups(q: Optional[str] = None, me: User = Depends(get_current_user)):
    try:
        query = {"is_official": True, "is_community": {"$ne": True}}
        if q: query["name"] = {"$regex": q, "$options": "i"}
        
        groups = await Group.find(query).limit(20).to_list()
        # Debug: print what we found
        for g in groups:
            print(f"📍 OFFICIAL DISCOVER - {g.name}: is_official={g.is_official}, is_community={g.is_community}")
        
        # Filter out invalid groups
        valid_groups = [g for g in groups if g.slug and g.creator_id]
        return {"success": True, "groups": [m for g in valid_groups if (m := mini_group(g)) is not None]}
    except Exception as e:
        return {"success": False, "groups": [], "error": str(e)}


@router.get("/discover/community")
async def discover_community_groups(q: Optional[str] = None, me: User = Depends(get_current_user)):
    try:
        query = {"is_community": True}
        if q: query["name"] = {"$regex": q, "$options": "i"}
        
        groups = await Group.find(query).limit(20).to_list()
        # Filter out invalid groups
        valid_groups = [g for g in groups if g.slug and g.creator_id]
        return {"success": True, "groups": [m for g in valid_groups if (m := mini_group(g)) is not None]}
    except Exception as e:
        return {"success": False, "groups": [], "error": str(e)}

# 2. MY GROUPS
@router.get("/me")
async def get_my_groups(me: User = Depends(get_current_user)):
    memberships = await GroupMember.find(GroupMember.user_id == str(me.id)).to_list()
    if not memberships:
        return {"success": True, "groups": []}
    group_ids = [PydanticObjectId(m.group_id) for m in memberships]
    groups = await Group.find({"_id": {"$in": group_ids}}).to_list()
    formatted = [m for g in groups if (m := mini_group(g)) is not None]
    return {"success": True, "groups": formatted}


# 3. MY INVITATIONS
@router.get("/invitations/me")
async def get_my_invitations(me: User = Depends(get_current_user)):
    invites = await GroupInvitation.find(
        GroupInvitation.invitee_id == str(me.id),
        GroupInvitation.status == "pending"
    ).to_list()

    result = []
    for inv in invites:
        group = await Group.get(PydanticObjectId(inv.group_id))
        inviter = await User.get(PydanticObjectId(inv.inviter_id))
        if group and inviter:
            result.append({
                "id": str(inv.id),
                "group_name": group.name,
                "inviter_name": inviter.name,
            })

    return {"success": True, "invitations": result}


# 4. RESPOND TO INVITATION
@router.post("/invitations/{invite_id}/respond")
async def respond_to_invite(
    invite_id: str,
    request: RespondInviteRequest,
    me: User = Depends(get_current_user)
):
    invite = await GroupInvitation.get(PydanticObjectId(invite_id))
    if not invite or invite.invitee_id != str(me.id):
        raise HTTPException(404, "Invitation not found")

    if not request.accept:
        invite.status = "declined"
        await invite.save()
        return {"success": True, "message": "Invitation declined."}

    invite.status = "accepted"
    await invite.save()

    existing = await GroupMember.find_one(
        GroupMember.group_id == invite.group_id,
        GroupMember.user_id == str(me.id)
    )
    if not existing:
        await GroupMember(group_id=invite.group_id, user_id=str(me.id), role="member").insert()
        group = await Group.get(PydanticObjectId(invite.group_id))
        if group:
            if str(me.id) not in group.members:
                group.members.append(str(me.id))
            group.members_count += 1
            await group.save()

    return {"success": True, "message": "You have joined the hub!"}


# 5. CREATE
@router.post("/create")
async def create_group(request: GroupCreate, me: User = Depends(get_current_user)):
    # Debug logging
    print(f"🔥 CREATE GROUP - is_official: {request.is_official}, is_community: {request.is_community}")
    
    slug = request.slug.lower().strip()
    existing = await Group.find_one(Group.slug == slug)
    if existing:
        raise HTTPException(400, "Group handle (slug) already taken")

    new_group = Group(
        name=request.name,
        slug=slug,
        description=request.description,
        creator_id=str(me.id),
        members_count=1,
        is_official=request.is_official,
        is_community=request.is_community,
        members=[str(me.id)]
    )
    
    print(f"🔥 SAVING GROUP - is_official: {new_group.is_official}, is_community: {new_group.is_community}")
    
    await new_group.insert()
    await GroupMember(group_id=str(new_group.id), user_id=str(me.id), role="admin").insert()

    for m_id in request.initial_members:
        try:
            await handle_member_addition(str(new_group.id), AddMemberRequest(user_id=m_id), me)
        except Exception:
            continue

    return {"success": True, "group": mini_group(new_group)}


# 6. GET BY SLUG
# 6. GET BY SLUG (Updated to fetch Hub details for Communities)
@router.get("/slug/{slug}")
async def get_group_by_slug(slug: str):
    group = await Group.find_one(Group.slug == slug.lower().strip())
    if not group:
        raise HTTPException(404, "Group not found")
    
    group_dict = mini_group(group)
    
    # 🚀 If it's a community, fetch full details for all affiliated hubs
    if getattr(group, "is_community", False):
        hub_ids = getattr(group, "affiliated_hubs", [])
        if hub_ids:
            # Fetch full hub objects from the DB
            hubs = await Group.find({"_id": {"$in": [ObjectId(hid) for hid in hub_ids]}}).to_list()
            
            # For communities, use the live total points of each affiliated hub
            hub_data = []
            for h in hubs:
                hub_dict = mini_group(h)
                if hub_dict:
                    if hub_dict["is_official"]:
                        # Get the live total points of the official hub
                        memberships = await GroupMember.find(GroupMember.group_id == str(h.id)).to_list()
                        user_ids = [PydanticObjectId(m.user_id) for m in memberships]
                        users = await User.find({"_id": {"$in": user_ids}}).to_list()
                        
                        # Get hub's own reset_baseline
                        hub_reset_baseline = getattr(h, 'reset_baseline', None)
                        
                        live_total_points = 0
                        for u in users:
                            member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
                            if member_record:
                                for log_entry in u.impact_log:
                                    is_admin_adjustment = "admin_adjustment" in log_entry.action
                                    log_time = log_entry.created_at
                                    log_time_naive = log_time.replace(tzinfo=None) if log_time.tzinfo else log_time
                                    
                                    if is_admin_adjustment:
                                        # Only count admin adjustments AFTER hub's reset_baseline
                                        if hub_reset_baseline:
                                            reset_naive = hub_reset_baseline.replace(tzinfo=None) if hub_reset_baseline.tzinfo else hub_reset_baseline
                                            if log_time_naive >= reset_naive:
                                                live_total_points += log_entry.points
                                        else:
                                            live_total_points += log_entry.points
                                    else:
                                        join_date = member_record.joined_at
                                        join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
                                        if log_time_naive >= join_date_naive:
                                            live_total_points += log_entry.points
                        
                        hub_dict["total_points"] = max(0, live_total_points)
                    
                    hub_data.append(hub_dict)
            
            group_dict["affiliated_hubs_data"] = hub_data
            
            # Calculate community total from affiliated hubs' live points
            raw_total = sum(hub["total_points"] for hub in hub_data)
            
            # For community reset: subtract points_at_reset
            points_at_reset = getattr(group, 'points_at_reset', 0) or 0
            community_total = max(0, raw_total - points_at_reset)
            group_dict["total_points"] = community_total
        else:
            group_dict["affiliated_hubs_data"] = []

    return {"success": True, "group": group_dict}

# 7. JOIN (FIXED: All organic joins now require Admin Approval)
@router.post("/{group_id}/join")
async def join_group(group_id: str, current_user: User = Depends(get_current_user)):
    try:
        group = await Group.get(PydanticObjectId(group_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid group ID")
        
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    user_id_str = str(current_user.id)

    # Safely fetch lists for the group
    pending = getattr(group, "pending_requests", []) or []
    members = getattr(group, "members", []) or []

    if user_id_str in pending:
        raise HTTPException(status_code=400, detail="Your request is already pending approval.")
        
    if user_id_str in members:
        raise HTTPException(status_code=400, detail="You are already a member.")

    # --- OFFICIAL HUB LOGIC (Strict 1-Group Lock) ---
    if getattr(group, "is_official", False):
        current_lock = getattr(current_user, "official_group_id", None)
        
        if current_lock and str(current_lock) != str(group_id):
            try:
                locked_group = await Group.get(PydanticObjectId(current_lock))
            except Exception:
                locked_group = None
            
            in_members = False
            in_pending = False

            if locked_group:
                in_members = user_id_str in getattr(locked_group, "members", [])
                in_pending = user_id_str in getattr(locked_group, "pending_requests", [])

            if not locked_group or (not in_members and not in_pending):
                # 👻 GHOST LOCK CLEARED
                await User.find_one({"_id": current_user.id}).update({"$unset": {"official_group_id": ""}})
            else:
                group_name = getattr(locked_group, "name", "Unknown Hub")
                if in_members:
                    raise HTTPException(status_code=403, detail=f"You are already a member of Official Hub: {group_name}")
                else:
                    raise HTTPException(status_code=403, detail=f"You have a pending request in Official Hub: {group_name}")

        # 🔒 APPLY LOCK
        await User.find_one({"_id": current_user.id}).update({"$set": {"official_group_id": group_id}})

        group.pending_requests = pending + [user_id_str]
        await group.save()
        return {"success": True, "message": "Request sent to Authority for approval!"}

    # --- CITIZEN & COMMUNITY LOGIC (Request-Based) ---
    # Add to pending requests instead of direct joining
    group.pending_requests = pending + [user_id_str]
    await group.save()

    return {"success": True, "message": "Request sent to the admin for approval!"}


# 8. GET MEMBERS
@router.get("/{group_id}/members")
async def get_group_members(group_id: str):
    # Fetch the group to check for reset_baseline and is_official
    try:
        group = await Group.get(PydanticObjectId(group_id))
    except:
        group = None
    
    reset_baseline = getattr(group, 'reset_baseline', None) if group else None
    is_official = getattr(group, 'is_official', False) if group else False
    
    memberships = await GroupMember.find(GroupMember.group_id == group_id).to_list()
    user_ids = [PydanticObjectId(m.user_id) for m in memberships]
    users = await User.find({"_id": {"$in": user_ids}}).to_list()
    
    formatted_members = []
    for u in users:
        member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
        if member_record:
            join_date = member_record.joined_at
            join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
            points_since_joining = 0
            
            print(f"[DEBUG get_group_members] Processing {u.name}: join_date={join_date_naive}, is_official={is_official}")
            
            for log_entry in u.impact_log:
                is_admin_adjustment = "admin_adjustment" in log_entry.action
                log_time = log_entry.created_at
                log_time_naive = log_time.replace(tzinfo=None) if log_time.tzinfo else log_time
                
                if is_admin_adjustment and is_official and reset_baseline:
                    # For official hubs with reset: only count admin adjustments AFTER reset_baseline
                    reset_naive = reset_baseline.replace(tzinfo=None) if reset_baseline.tzinfo else reset_baseline
                    if log_time_naive >= reset_naive:
                        points_since_joining += log_entry.points
                        print(f"  [admin adj after reset] +{log_entry.points}")
                else:
                    # For ALL other cases (regular activities, or admin adj without reset):
                    # Only count if AFTER the user's join date
                    if log_time_naive >= join_date_naive:
                        points_since_joining += log_entry.points
                        print(f"  [{log_entry.action}] +{log_entry.points} (after join)")
            
            print(f"  TOTAL points_since_joining: {points_since_joining}")
            
            u_dict = mini_user(u)
            u_dict["contributed_points"] = getattr(member_record, "contributed_points", 0)
            u_dict["points_since_joining"] = max(0, points_since_joining)
            u_dict["joined_at"] = join_date.isoformat()
            formatted_members.append(u_dict)
        
    return {"success": True, "members": formatted_members}


# 9. GET MESSAGES
@router.get("/{group_id}/messages")
async def get_messages(group_id: str, me: User = Depends(get_current_user)):
    membership = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == str(me.id)
    )
    if not membership:
        raise HTTPException(403, "Access denied. You must be a member to view this chat.")

    messages = await GroupMessage.find(
        GroupMessage.group_id == group_id
    ).sort("created_at").to_list()

    return {"success": True, "messages": [serialize_message(m) for m in messages]}


# 10. SEND MESSAGE
@router.post("/{group_id}/messages")
async def send_message(
    group_id: str,
    request: MessageCreate,
    me: User = Depends(get_current_user)
):
    membership = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == str(me.id)
    )
    if not membership:
        raise HTTPException(403, "Access denied. You must be a member to send messages.")

    msg = GroupMessage(
        group_id=group_id,
        sender_id=str(me.id),
        sender_name=me.name,
        text=request.text
    )
    await msg.insert()

    msg_dict = serialize_message(msg)
    await manager.broadcast(group_id, msg_dict)

    return {"success": True, "message": msg_dict}


# 11. ADD MEMBER
@router.post("/{group_id}/members/add")
async def handle_member_addition(
    group_id: str,
    request: AddMemberRequest,
    me: User = Depends(get_current_user)
):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")

    is_member = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == str(me.id)
    )
    if not is_member:
        raise HTTPException(403, "You must be a member to add others.")

    target_id = PydanticObjectId(request.user_id)

    already_member = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == str(target_id)
    )
    if already_member:
        return {"success": False, "message": "User is already in the group."}

    target_follows_me = await Follow.find_one(
        Follow.follower_id == target_id,
        Follow.following_id == me.id
    )

    if target_follows_me:
        await GroupMember(group_id=group_id, user_id=str(target_id)).insert()
        group.members_count += 1
        if str(target_id) not in group.members:
            group.members.append(str(target_id))
        await group.save()
        return {"success": True, "action": "added", "message": "Follower added directly."}

    i_follow_target = await Follow.find_one(
        Follow.follower_id == me.id,
        Follow.following_id == target_id
    )

    if i_follow_target:
        existing_invite = await GroupInvitation.find_one(
            GroupInvitation.group_id == group_id,
            GroupInvitation.invitee_id == str(target_id),
            GroupInvitation.status == "pending"
        )
        if existing_invite:
            return {"success": True, "message": "Invitation already pending."}

        await GroupInvitation(
            group_id=group_id,
            inviter_id=str(me.id),
            invitee_id=str(target_id)
        ).insert()
        return {"success": True, "action": "invited", "message": "Invitation sent successfully."}

    raise HTTPException(403, "You can only add followers or invite people you follow.")


# 12. LEAVE
@router.delete("/{group_id}/leave")
async def leave_group(group_id: str, me: User = Depends(get_current_user)):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")

    if group.creator_id == str(me.id):
        raise HTTPException(400, "As the creator, you cannot leave. You must delete the group.")

    membership = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == str(me.id)
    )
    if not membership:
        raise HTTPException(404, "You are not a member of this group.")

    if getattr(group, "is_official", False) and getattr(me, "official_group_id", None) == group_id:
        # Direct DB command to clear lock
        await User.find_one({"_id": me.id}).update({"$unset": {"official_group_id": ""}})

    await membership.delete()

    if str(me.id) in group.members:
        group.members.remove(str(me.id))

    group.members_count = max(1, group.members_count - 1)
    await group.save()

    return {"success": True, "message": "Left the group successfully."}


# 13. DELETE GROUP
@router.delete("/{group_id}")
async def delete_group(group_id: str, me: User = Depends(get_current_user)):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")

    if group.creator_id != str(me.id):
        raise HTTPException(403, "Only the hub creator can delete it.")

    if getattr(group, "is_official", False):
        await User.find({"official_group_id": group_id}).update({"$unset": {"official_group_id": ""}})

    await GroupMember.find(GroupMember.group_id == group_id).delete()
    await GroupMessage.find(GroupMessage.group_id == group_id).delete()
    await GroupInvitation.find(GroupInvitation.group_id == group_id).delete()
    await group.delete()

    return {"success": True, "message": "Hub deleted permanently."}


# 14. REMOVE MEMBER
@router.delete("/{group_id}/members/{user_id}")
async def remove_member(
    group_id: str,
    user_id: str,
    me: User = Depends(get_current_user)
):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")

    if group.creator_id != str(me.id):
        raise HTTPException(403, "Only the admin can remove members.")

    if user_id == str(me.id):
        raise HTTPException(400, "You cannot remove yourself.")

    membership = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    )
    if not membership:
        raise HTTPException(404, "Member not found.")

    if getattr(group, "is_official", False):
        target_user = await User.get(PydanticObjectId(user_id))
        if target_user and getattr(target_user, "official_group_id", None) == group_id:
            # Direct DB command
            await User.find_one({"_id": ObjectId(user_id)}).update({"$unset": {"official_group_id": ""}})

    await membership.delete()

    if user_id in group.members:
        group.members.remove(user_id)

    group.members_count = max(1, group.members_count - 1)
    await group.save()

    await manager.broadcast(group_id, {
        "type": "system",
        "action": "kick",
        "user_id": user_id
    })

    return {"success": True, "message": "Member removed."}


# 15. PENDING REQUESTS
@router.get("/{group_id}/pending")
async def get_pending_requests(group_id: str, current_user: User = Depends(get_current_user)):
    group = await Group.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if str(current_user.id) != group.creator_id and str(current_user.id) not in getattr(group, "admins", []):
        raise HTTPException(status_code=403, detail="Not authorized to view requests")

    pending_ids = group.pending_requests
    if not pending_ids:
        return {"success": True, "requests": []}

    pending_users = await User.find(
        {"_id": {"$in": [ObjectId(uid) for uid in pending_ids]}}
    ).to_list()

    formatted_users = [
        {
            "id": str(u.id),
            "name": u.name,
            "username": u.username,
            "avatar": {"url": u.avatar.url} if getattr(u, "avatar", None) else None,
        }
        for u in pending_users
    ]

    return {"success": True, "requests": formatted_users}


# 16. APPROVE REQUEST
@router.post("/{group_id}/approve/{user_id}")
async def approve_request(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    group = await Group.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if str(current_user.id) != group.creator_id and str(current_user.id) not in getattr(group, "admins", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    if user_id not in group.pending_requests:
        raise HTTPException(status_code=400, detail="User is not in the pending list")

    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if getattr(group, "is_official", False):
        current_official_id = getattr(user, "official_group_id", None)
        if current_official_id and current_official_id != group_id:
            raise HTTPException(status_code=400, detail="User joined another official group while waiting.")
        
        # Direct DB update for approval lock
        await User.find_one({"_id": user.id}).update({"$set": {"official_group_id": group_id}})

    group.pending_requests.remove(user_id)

    if user_id not in group.members:
        group.members.append(user_id)
        group.members_count += 1

    await group.save()

    existing_member = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    )
    if not existing_member:
        await GroupMember(group_id=group_id, user_id=user_id, role="member").insert()

    return {"success": True, "message": "User approved and added to group!"}


# 17. REJECT REQUEST
# 17. REJECT REQUEST (FIXED: Safe Lock Clearing)
@router.post("/{group_id}/reject/{user_id}")
async def reject_request(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user)
):
    group = await Group.get(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    if str(current_user.id) != group.creator_id and str(current_user.id) not in getattr(group, "admins", []):
        raise HTTPException(status_code=403, detail="Not authorized")

    if user_id in group.pending_requests:
        group.pending_requests.remove(user_id)
        await group.save()
        
        # ONLY clear the lock if they were rejected from an Official Hub
        if getattr(group, "is_official", False):
            await User.find_one({"_id": ObjectId(user_id)}).update({"$unset": {"official_group_id": ""}})

    return {"success": True, "message": "Request rejected."}


# 18. WEBSOCKET
@router.websocket("/{group_id}/ws")
async def websocket_endpoint(websocket: WebSocket, group_id: str):
    await manager.connect(websocket, group_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, group_id)


# 19. AWARD POINTS TO MEMBER
@router.post("/{group_id}/members/{user_id}/points")
async def award_points(
    group_id: str, 
    user_id: str, 
    request: AddPointsRequest, 
    me: User = Depends(get_current_user)
):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")
    
    # Only allow point awards in official hubs, not citizen hubs
    if not group.is_official:
        raise HTTPException(400, "Points can only be awarded in Official Hubs")

    membership = await GroupMember.find_one(
        GroupMember.group_id == group_id,
        GroupMember.user_id == user_id
    )
    if not membership:
        raise HTTPException(404, "Member not found in this group.")

    # Get the user and update their overall impact score
    user = await User.get(PydanticObjectId(user_id))
    if not user:
        raise HTTPException(404, "User not found")
    
    old_score = user.impact_score
    action_description = f"Official Hub Award from {group.name}"
    await user.add_impact(action_description, request.points)

    return {
        "success": True, 
        "message": f"Awarded {request.points} points to user's overall score!", 
        "old_score": old_score,
        "new_score": user.impact_score,
        "change": request.points
    }

# ==========================================
# 🎨 GROUP LOGO MANAGEMENT
# ==========================================

@router.put("/{group_id}/update-logo")
async def update_group_logo(
    group_id: str,
    logo: Optional[UploadFile] = File(None),
    me: User = Depends(get_current_user)
):
    group = await Group.get(PydanticObjectId(group_id))
    if not group:
        raise HTTPException(404, "Group not found")
    
    # Check if user is creator or admin
    user_id_str = str(me.id)
    is_creator = user_id_str == group.creator_id
    is_admin = user_id_str in getattr(group, 'admins', [])
    
    if not (is_creator or is_admin):
        raise HTTPException(403, "Only group creator or admins can update logo")
    
    if logo:
        from app.core.cloudinary import upload_avatar
        data = await logo.read()
        # Upload to groups folder instead of avatars
        res = await upload_avatar(data)
        group.avatar_url = res["url"]
        await group.save()
        
        return {
            "success": True, 
            "message": "Group logo updated successfully!",
            "avatar_url": res["url"]
        }
    else:
        raise HTTPException(400, "No logo file provided")

# 19. RESET GROUP POINTS (Group Admin Only)
@router.post("/{group_id}/reset-points")
async def reset_group_points(
    group_id: str,
    me: User = Depends(get_current_user)
):
    """Reset points contributed to this group (group admin only)"""
    try:
        group = await Group.get(PydanticObjectId(group_id))
        if not group:
            raise HTTPException(404, "Group not found")
        
        # Check if user is group creator or admin
        user_id_str = str(me.id)
        is_creator = user_id_str == group.creator_id
        is_admin = user_id_str in getattr(group, 'admins', [])
        
        if not (is_creator or is_admin):
            raise HTTPException(403, "Only group creator or admins can reset points")
        
        # Check group type
        is_official = getattr(group, 'is_official', False)
        is_community = getattr(group, 'is_community', False)
        
        print(f"Reset points called for group {group_id}: is_official={is_official}, is_community={is_community}")
        
        if is_official:
            # For Official Hubs: Set reset_baseline timestamp
            # Only admin adjustments AFTER this time will count
            group.reset_baseline = datetime.now(timezone.utc)
            await group.save()
            
            return {
                "success": True,
                "message": f"Official Hub reset! Points now start from 0. User's actual points unchanged.",
                "reset_time": group.reset_baseline.isoformat()
            }
            
            return {
                "success": True,
                "message": f"Reset {reset_count} members. Cleared {total_points_reset} points.",
                "total_points_reset": total_points_reset,
                "members_affected": reset_count
            }
            
        elif is_community:
            # For Communities: Store the current total as "points_at_reset"
            # Community will show: (current hub total) - (points_at_reset)
            # This does NOT affect affiliated hubs at all
            hub_ids = getattr(group, "affiliated_hubs", [])
            
            # Calculate current total from affiliated hubs
            current_total = 0
            if hub_ids:
                hubs = await Group.find({"_id": {"$in": [ObjectId(hid) for hid in hub_ids]}}).to_list()
                for h in hubs:
                    if getattr(h, 'is_official', False):
                        memberships = await GroupMember.find(GroupMember.group_id == str(h.id)).to_list()
                        if memberships:
                            user_ids = [PydanticObjectId(m.user_id) for m in memberships]
                            users = await User.find({"_id": {"$in": user_ids}}).to_list()
                            
                            for u in users:
                                member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
                                if member_record and hasattr(u, 'impact_log') and u.impact_log:
                                    for log_entry in u.impact_log:
                                        is_admin = "admin_adjustment" in log_entry.action
                                        is_reset = "group_reset" in log_entry.action
                                        if is_admin or is_reset:
                                            current_total += log_entry.points
            
            # Store the current total as baseline - future display will subtract this
            group.points_at_reset = current_total
            group.reset_baseline = datetime.now(timezone.utc)
            await group.save()
            
            return {
                "success": True,
                "message": f"Community reset! Was showing {max(0, current_total)} points. Now shows 0. Affiliated hubs unchanged.",
                "points_reset": current_total,
                "affiliated_hubs_count": len(hub_ids)
            }
        
        else:
            # Not official or community - must be citizen hub
            print(f"Reset not supported: is_official={is_official}, is_community={is_community}")
            raise HTTPException(400, f"Point reset not supported for citizen hubs (is_official={is_official}, is_community={is_community})")
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in reset_group_points: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Internal server error: {str(e)}")

    # ==========================================
# 🏆 GROUP LEADERBOARD
# ==========================================

@router.get("/leaderboard/list")
async def get_group_leaderboard(
    groupType: str = "all",  # "all", "group", "official", "community"
    search: str = "",
    state: str = "",
    city: str = "",
    limit: int = 10,
    skip: int = 0
):
    """
    Get groups ranked by total_points.
    - groupType: "group" (regular groups), "official" (official groups), "community" (communities), "all" (all types)
    - search: filter by group name
    - state/city: filter by creator's location
    """
    try:
        from app.models.user import User
        
        # Build query based on groupType
        query = {}
        
        if groupType == "group":
            # Regular groups (not official, not community)
            query = {"is_official": False, "is_community": False}
        elif groupType == "official":
            # Official groups only
            query = {"is_official": True}
        elif groupType == "community":
            # Communities only
            query = {"is_community": True}
        # else "all" - no filter
        
        # Add search filter if provided
        if search and search.strip():
            query["name"] = {"$regex": search.strip(), "$options": "i"}
        
        # Fetch all matching groups first (we'll filter by creator location in memory)
        all_groups = await Group.find(query).sort(-Group.total_points).to_list()
        
        # Filter by creator's state/city if provided
        filtered_groups = []
        for group in all_groups:
            # Check creator's location if state/city filters are provided
            if state or city:
                if not group.creator_id:
                    continue
                creator = await User.get(group.creator_id)
                if not creator:
                    continue
                # Check state filter
                if state and state.strip():
                    creator_state = getattr(creator, 'state', '') or ''
                    if creator_state.lower() != state.lower():
                        continue
                # Check city filter
                if city and city.strip():
                    creator_city = getattr(creator, 'city', '') or ''
                    if creator_city.lower() != city.lower():
                        continue
            filtered_groups.append(group)
        
        # Apply pagination
        total_count = len(filtered_groups)
        paginated_groups = filtered_groups[skip:skip + limit]
        
        # Format groups with live total_points calculation
        formatted_groups = []
        for idx, group in enumerate(paginated_groups, start=skip + 1):
            group_dict = mini_group(group)
            if group_dict:
                # Calculate live total_points for official groups
                if getattr(group, 'is_official', False):
                    memberships = await GroupMember.find(GroupMember.group_id == str(group.id)).to_list()
                    user_ids = [PydanticObjectId(m.user_id) for m in memberships]
                    users = await User.find({"_id": {"$in": user_ids}}).to_list()
                    
                    hub_reset_baseline = getattr(group, 'reset_baseline', None)
                    
                    live_total_points = 0
                    for u in users:
                        member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
                        if member_record:
                            for log_entry in u.impact_log:
                                is_admin_adjustment = "admin_adjustment" in log_entry.action
                                log_time = log_entry.created_at
                                log_time_naive = log_time.replace(tzinfo=None) if log_time.tzinfo else log_time
                                
                                if is_admin_adjustment:
                                    if hub_reset_baseline:
                                        reset_naive = hub_reset_baseline.replace(tzinfo=None) if hub_reset_baseline.tzinfo else hub_reset_baseline
                                        if log_time_naive >= reset_naive:
                                            live_total_points += log_entry.points
                                    else:
                                        live_total_points += log_entry.points
                                else:
                                    join_date = member_record.joined_at
                                    join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
                                    if log_time_naive >= join_date_naive:
                                        live_total_points += log_entry.points
                    
                    group_dict["total_points"] = max(0, live_total_points)
                
                # Calculate live total_points for communities (sum of affiliated hubs' points)
                elif getattr(group, 'is_community', False):
                    hub_ids = getattr(group, "affiliated_hubs", [])
                    community_total = 0
                    
                    if hub_ids:
                        from bson import ObjectId
                        hubs = await Group.find({"_id": {"$in": [ObjectId(hid) for hid in hub_ids]}}).to_list()
                        
                        for hub in hubs:
                            if getattr(hub, 'is_official', False):
                                # Calculate live points for each affiliated hub
                                memberships = await GroupMember.find(GroupMember.group_id == str(hub.id)).to_list()
                                user_ids = [PydanticObjectId(m.user_id) for m in memberships]
                                users = await User.find({"_id": {"$in": user_ids}}).to_list()
                                
                                hub_reset_baseline = getattr(hub, 'reset_baseline', None)
                                
                                hub_live_points = 0
                                for u in users:
                                    member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
                                    if member_record:
                                        for log_entry in u.impact_log:
                                            is_admin_adjustment = "admin_adjustment" in log_entry.action
                                            log_time = log_entry.created_at
                                            log_time_naive = log_time.replace(tzinfo=None) if log_time.tzinfo else log_time
                                            
                                            if is_admin_adjustment:
                                                if hub_reset_baseline:
                                                    reset_naive = hub_reset_baseline.replace(tzinfo=None) if hub_reset_baseline.tzinfo else hub_reset_baseline
                                                    if log_time_naive >= reset_naive:
                                                        hub_live_points += log_entry.points
                                                else:
                                                    hub_live_points += log_entry.points
                                            else:
                                                join_date = member_record.joined_at
                                                join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
                                                if log_time_naive >= join_date_naive:
                                                    hub_live_points += log_entry.points
                                
                                community_total += max(0, hub_live_points)
                    
                    # Subtract points_at_reset for community reset
                    points_at_reset = getattr(group, 'points_at_reset', 0) or 0
                    group_dict["total_points"] = max(0, community_total - points_at_reset)
                
                # Calculate live total_points for normal groups (non-official, non-community)
                else:
                    memberships = await GroupMember.find(GroupMember.group_id == str(group.id)).to_list()
                    user_ids = [PydanticObjectId(m.user_id) for m in memberships]
                    users = await User.find({"_id": {"$in": user_ids}}).to_list()
                    
                    import logging
                    logging.warning(f"[GROUP DEBUG] Group: {group.name}, Members: {len(memberships)}, Users found: {len(users)}")
                    
                    live_total_points = 0
                    for u in users:
                        member_record = next((m for m in memberships if m.user_id == str(u.id)), None)
                        if member_record:
                            user_points = 0
                            for log_entry in u.impact_log:
                                log_time = log_entry.created_at
                                log_time_naive = log_time.replace(tzinfo=None) if log_time.tzinfo else log_time
                                join_date = member_record.joined_at
                                join_date_naive = join_date.replace(tzinfo=None) if join_date.tzinfo else join_date
                                
                                # Only count points earned after joining
                                if log_time_naive >= join_date_naive:
                                    live_total_points += log_entry.points
                                    user_points += log_entry.points
                            logging.warning(f"[GROUP DEBUG] User: {u.username}, total impact: {u.impact_score}, points after join: {user_points}, joined: {member_record.joined_at}")
                    
                    logging.warning(f"[GROUP DEBUG] Total live points for {group.name}: {live_total_points}")
                    group_dict["total_points"] = max(0, live_total_points)
                
                group_dict["rank"] = idx
                formatted_groups.append(group_dict)
        
        # Re-sort by live total_points and re-assign ranks
        formatted_groups.sort(key=lambda x: x.get("total_points", 0), reverse=True)
        for i, g in enumerate(formatted_groups):
            g["rank"] = skip + i + 1
        
        return {
            "success": True,
            "groups": formatted_groups,
            "total": total_count,
            "hasMore": (skip + limit) < total_count
        }
        
    except Exception as e:
        print(f"Error in group leaderboard: {e}")
        import traceback
        traceback.print_exc()
        return {"success": False, "groups": [], "total": 0, "hasMore": False, "error": str(e)}

    # ==========================================
# 🚀 FEDERATED NETWORK (COMMUNITY <-> HUB)
# ==========================================

# 20. INVITE OFFICIAL HUB TO COMMUNITY
@router.post("/{community_id}/invite-hub/{hub_id}")
async def invite_hub_to_community(community_id: str, hub_id: str, me: User = Depends(get_current_user)):
    community = await Group.get(PydanticObjectId(community_id))
    hub = await Group.get(PydanticObjectId(hub_id))

    if not community or not hub:
        raise HTTPException(404, "Community or Hub not found")

    if not getattr(community, "is_community", False):
        raise HTTPException(400, "Only Communities can invite other hubs.")

    if not getattr(hub, "is_official", False):
        raise HTTPException(400, "You can only invite Official Hubs to a Community.")

    # Must be admin of the Community to send invites
    if community.creator_id != str(me.id) and str(me.id) not in getattr(community, "admins", []):
        raise HTTPException(403, "Only Community admins can invite hubs.")

    affiliated = getattr(community, "affiliated_hubs", []) or []
    if hub_id in affiliated:
        raise HTTPException(400, "This Official Hub is already part of your Community.")

    hub_pending = getattr(hub, "pending_community_invites", []) or []
    if community_id in hub_pending:
        raise HTTPException(400, "You have already invited this Official Hub.")

    # Add the community ID to the Official Hub's pending invites
    hub.pending_community_invites = hub_pending + [community_id]
    await hub.save()

    return {"success": True, "message": f"Invitation sent to {hub.name}!"}


# 21. VIEW COMMUNITY INVITES (For Official Hub Admins)
@router.get("/{hub_id}/community-invites")
async def get_community_invites(hub_id: str, me: User = Depends(get_current_user)):
    hub = await Group.get(PydanticObjectId(hub_id))
    if not hub: 
        raise HTTPException(404, "Hub not found")

    # Only Official Hub admins can see their incoming invites
    if hub.creator_id != str(me.id) and str(me.id) not in getattr(hub, "admins", []):
        raise HTTPException(403, "Not authorized to view hub invitations.")

    pending_ids = getattr(hub, "pending_community_invites", []) or []
    if not pending_ids:
        return {"success": True, "invites": []}

    # Fetch the details of the Communities that sent the invites
    communities = await Group.find({"_id": {"$in": [ObjectId(cid) for cid in pending_ids]}}).to_list()
    
    formatted = [
        {
            "id": str(c.id), 
            "name": c.name, 
            "slug": c.slug,
            "avatar_url": getattr(c, "avatar_url", None)
        } 
        for c in communities
    ]
    return {"success": True, "invites": formatted}


# 22. ACCEPT / REJECT COMMUNITY INVITE
@router.post("/{hub_id}/community-invites/{community_id}/respond")
async def respond_community_invite(
    hub_id: str, 
    community_id: str, 
    request: RespondInviteRequest, 
    me: User = Depends(get_current_user)
):
    hub = await Group.get(PydanticObjectId(hub_id))
    community = await Group.get(PydanticObjectId(community_id))

    if not hub or not community: 
        raise HTTPException(404, "Hub or Community not found")

    if hub.creator_id != str(me.id) and str(me.id) not in getattr(hub, "admins", []):
        raise HTTPException(403, "Not authorized to respond to invites.")

    hub_pending = getattr(hub, "pending_community_invites", []) or []
    if community_id not in hub_pending:
        raise HTTPException(400, "No pending invitation from this Community.")

    # 1. Remove from pending list
    hub.pending_community_invites.remove(community_id)
    
    # 2. If accepted, add to both affiliated_hubs lists
    if request.accept:
        hub_affil = getattr(hub, "affiliated_hubs", []) or []
        if community_id not in hub_affil: 
            hub.affiliated_hubs = hub_affil + [community_id]
        
        comm_affil = getattr(community, "affiliated_hubs", []) or []
        if hub_id not in comm_affil: 
            community.affiliated_hubs = comm_affil + [hub_id]

        await community.save()
        msg = "Invitation accepted! Your Official Hub is now linked to the Community."
    else:
        msg = "Community invitation declined."

    await hub.save()
    return {"success": True, "message": msg}


# ==========================================
# 🔄 RECALCULATE POINTS (Migration/Fix Tool)
# ==========================================

@router.post("/recalculate-all-points")
async def recalculate_all_points(me: User = Depends(get_current_user)):
    """
    Recalculates total_points for official hubs and cascades to communities.
    Citizen hubs (regular groups) do not aggregate user points.
    Use this to fix existing data after adding the points system.
    """
    try:
        # Step 1: Recalculate total_points only for official hubs (not citizen hubs)
        # Citizen hubs should not aggregate user points into group total_points
        official_hubs = await Group.find(Group.is_official == True).to_list()
        updated_count = 0
        
        for group in official_hubs:
            # Get all members of this group
            memberships = await GroupMember.find(GroupMember.group_id == str(group.id)).to_list()
            # Sum their contributed_points
            total = sum(m.contributed_points for m in memberships)
            
            # Update group's total_points
            group.total_points = total
            await group.save()
            updated_count += 1
        
        # Step 2: Reset citizen hubs' total_points to 0 (they should not track points)
        citizen_hubs = await Group.find(
            Group.is_official == False, 
            Group.is_community == False
        ).to_list()
        citizen_count = 0
        
        for citizen_hub in citizen_hubs:
            citizen_hub.total_points = 0
            await citizen_hub.save()
            citizen_count += 1
        
        # Step 3: Recalculate community points from affiliated hubs
        communities = await Group.find(Group.is_community == True).to_list()
        community_count = 0
        
        for community in communities:
            hub_ids = getattr(community, "affiliated_hubs", []) or []
            hub_points_total = 0
            
            for hub_id in hub_ids:
                hub = await Group.get(hub_id)
                if hub:
                    hub_points_total += getattr(hub, "total_points", 0)
            
            community.total_points = hub_points_total
            await community.save()
            community_count += 1
        
        return {
            "success": True,
            "message": f"Recalculated points for {updated_count} official hubs, reset {citizen_count} citizen hubs to 0 points, and updated {community_count} communities",
            "official_hubs_updated": updated_count,
            "citizen_hubs_reset": citizen_count,
            "communities_updated": community_count
        }
    except Exception as e:
        raise HTTPException(500, f"Error recalculating points: {str(e)}")


# ==========================================
# 🧹 CLEANUP ORPHANED/INVALID GROUPS
# ==========================================

@router.post("/cleanup-invalid-groups")
async def cleanup_invalid_groups(me: User = Depends(get_current_user)):
    """
    Removes groups that have invalid data (no slug, no creator, etc.)
    Use this to clean up corrupted groups from the database.
    """
    try:
        # Find all groups
        all_groups = await Group.find().to_list()
        deleted_count = 0
        deleted_groups = []
        
        for group in all_groups:
            # Check if group has critical missing data
            if not group.slug or not group.creator_id:
                deleted_groups.append({
                    "id": str(group.id),
                    "name": group.name,
                    "reason": "Missing slug" if not group.slug else "Missing creator_id"
                })
                
                # Delete related data
                await GroupMember.find(GroupMember.group_id == str(group.id)).delete()
                await GroupMessage.find(GroupMessage.group_id == str(group.id)).delete()
                await GroupInvitation.find(GroupInvitation.group_id == str(group.id)).delete()
                
                # Delete the group itself
                await group.delete()
                deleted_count += 1
        
        return {
            "success": True,
            "message": f"Cleaned up {deleted_count} invalid groups",
            "deleted_count": deleted_count,
            "deleted_groups": deleted_groups
        }
    except Exception as e:
        raise HTTPException(500, f"Error cleaning up groups: {str(e)}")


# ==========================================
# 🗑️ BULK DELETE GROUPS (ADMIN)
# ==========================================

@router.post("/bulk-delete-my-groups")
async def bulk_delete_my_groups(me: User = Depends(get_current_user)):
    """
    Deletes ALL groups created by the current user.
    Use with caution - this cannot be undone!
    """
    try:
        # Find all groups created by this user
        my_groups = await Group.find(Group.creator_id == str(me.id)).to_list()
        deleted_count = 0
        deleted_groups = []
        
        for group in my_groups:
            deleted_groups.append({
                "id": str(group.id),
                "name": group.name,
                "slug": group.slug,
                "type": "Community" if group.is_community else "Official" if group.is_official else "Citizen Hub"
            })
            
            # Clean up related data
            if getattr(group, "is_official", False):
                await User.find({"official_group_id": str(group.id)}).update({"$unset": {"official_group_id": ""}})
            
            await GroupMember.find(GroupMember.group_id == str(group.id)).delete()
            await GroupMessage.find(GroupMessage.group_id == str(group.id)).delete()
            await GroupInvitation.find(GroupInvitation.group_id == str(group.id)).delete()
            
            # Delete the group
            await group.delete()
            deleted_count += 1
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} groups",
            "deleted_count": deleted_count,
            "deleted_groups": deleted_groups
        }
    except Exception as e:
        raise HTTPException(500, f"Error deleting groups: {str(e)}")


class BulkDeleteRequest(BaseModel):
    group_ids: List[str]

@router.post("/bulk-delete-by-ids")
async def bulk_delete_by_ids(request: BulkDeleteRequest, me: User = Depends(get_current_user)):
    """
    Deletes multiple groups by their IDs.
    Only deletes groups where you are the creator.
    """
    try:
        deleted_count = 0
        deleted_groups = []
        skipped_groups = []
        
        for group_id in request.group_ids:
            try:
                group = await Group.get(PydanticObjectId(group_id))
                if not group:
                    skipped_groups.append({"id": group_id, "reason": "Not found"})
                    continue
                
                # Only delete if user is the creator
                if group.creator_id != str(me.id):
                    skipped_groups.append({"id": group_id, "name": group.name, "reason": "Not creator"})
                    continue
                
                deleted_groups.append({
                    "id": str(group.id),
                    "name": group.name,
                    "slug": group.slug
                })
                
                # Clean up related data
                if getattr(group, "is_official", False):
                    await User.find({"official_group_id": str(group.id)}).update({"$unset": {"official_group_id": ""}})
                
                await GroupMember.find(GroupMember.group_id == str(group.id)).delete()
                await GroupMessage.find(GroupMessage.group_id == str(group.id)).delete()
                await GroupInvitation.find(GroupInvitation.group_id == str(group.id)).delete()
                
                await group.delete()
                deleted_count += 1
            except Exception as e:
                skipped_groups.append({"id": group_id, "reason": str(e)})
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} groups, skipped {len(skipped_groups)}",
            "deleted_count": deleted_count,
            "deleted_groups": deleted_groups,
            "skipped_groups": skipped_groups
        }
    except Exception as e:
        raise HTTPException(500, f"Error deleting groups: {str(e)}")