from typing import Optional, List
from datetime import datetime, date, timedelta
from beanie import Document
from pydantic import EmailStr, Field, BaseModel
from pymongo import IndexModel, ASCENDING
from app.core.security import hash_password, verify_password


class AvatarEmbed(BaseModel):
    url:       str = ""
    public_id: str = ""


class ImpactLog(BaseModel):
    action:     str
    points:     float
    created_at: datetime = Field(default_factory=datetime.utcnow)


class User(Document):
    # Identity
    name:          str
    username:      str
    email:         EmailStr
    password:      Optional[str] = None
    google_id:     Optional[str] = None
    auth_provider: str = "local"

    # FIX: `role` was declared TWICE — removed the duplicate at the bottom
    role: str = "user"

    official_group_id: Optional[str] = None

    # Profile
    avatar:    AvatarEmbed = Field(default_factory=AvatarEmbed)
    bio:       str = ""
    location:  str = ""
    city:      Optional[str] = ""
    state:     Optional[str] = ""
    website:   str = ""
    category:  str = "Citizen"
    skills:    List[str] = []
    interests: List[str] = []

    # Authority specific fields
    designation:  Optional[str] = None
    organization: Optional[str] = None

    # Counts
    followers_count: int = 0
    following_count: int = 0
    posts_count:     int = 0

    # Impact
    impact_score: float = 0.0
    impact_log:   List[ImpactLog] = []

    # Daily claim
    last_claim_date: Optional[str] = None   # "YYYY-MM-DD"
    claim_streak:    int = 0

    # Password reset
    reset_token:         Optional[str] = None
    reset_token_expires: Optional[datetime] = None

    # Account
    is_verified: bool = False   # FIX: was missing, caused KeyError in user_dict
    is_active:   bool = True
    last_seen:   datetime = Field(default_factory=datetime.utcnow)
    created_at:  datetime = Field(default_factory=datetime.utcnow)

    # ── Methods ───────────────────────────────────────────────────────────────

    def verify_password(self, plain: str) -> bool:
        if not self.password:
            return False
        return verify_password(plain, self.password)

    def set_password(self, plain: str):
        self.password = hash_password(plain)

    async def add_impact(self, action: str, points: float):
        self.impact_score += points
        self.impact_log.append(ImpactLog(action=action, points=points))
        await self.save()

    def can_claim_today(self) -> bool:
        today = date.today().isoformat()
        return self.last_claim_date != today

    def do_claim(self) -> float:
        today = date.today()
        today_str = today.isoformat()

        yesterday_str = (today - timedelta(days=1)).isoformat()
        if self.last_claim_date == yesterday_str:
            self.claim_streak = (self.claim_streak or 0) + 1
        else:
            self.claim_streak = 1

        base_pts  = 5.0
        bonus_pts = float(min((self.claim_streak - 1), 10))
        total_pts = base_pts + bonus_pts

        self.impact_score    += total_pts
        self.last_claim_date  = today_str
        self.impact_log.append(
            ImpactLog(action=f"daily_claim_streak_{self.claim_streak}", points=total_pts)
        )
        return total_pts

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("username", ASCENDING)], unique=True, name="username_unique_idx"),
            IndexModel([("email", ASCENDING)], unique=True, name="email_unique_idx"),
            "impact_score",
            "category"
        ] 