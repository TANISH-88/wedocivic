from datetime import datetime
from typing import Optional, List, Annotated, Any
from beanie import Document, Indexed
from pydantic import BaseModel, Field
from beanie import Document
from typing import List, Optional
from datetime import datetime
from pydantic import Field

class Group(Document):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = ""
    avatar_url: Optional[str] = None
    creator_id: Optional[str] = ""
    members: List[Any] = []
    members_count: int = 0
    is_official: bool = False
    is_community: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    admins: List[str] = []
    pending_requests: List[str] = []
    affiliated_hubs: List[str] = [] 
    pending_community_invites: List[str] = []
    
    # Points aggregation fields for cascading system
    total_points: int = 0  # Sum of all members' contributed_points (for official hubs and regular groups)
    
    # Reset baseline for communities - only count points after this timestamp
    reset_baseline: Optional[datetime] = None
    
    # Points at reset time - used for community reset (subtract from current total)
    points_at_reset: float = 0

    class Settings:
        name = "groups"


class GroupMember(Document):
    group_id: Annotated[str, Indexed()]
    user_id: Annotated[str, Indexed()]
    role: str = "member"  # "admin" or "member"
    joined_at: datetime = Field(default_factory=datetime.utcnow)
    # NEW: Added to track points for each user in this specific group
    contributed_points: int = 0 

    class Settings:
        name = "group_members"


class GroupInvitation(Document):
    group_id: Annotated[str, Indexed()]
    inviter_id: str
    invitee_id: Annotated[str, Indexed()]
    status: str = "pending"  # "pending", "accepted", "declined"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "group_invitations"