# backend/app/utils/formatters.py

# backend/app/utils/formatters.py

# backend/app/utils/formatters.py

def mini_user(u) -> dict:
    """The Ultimate Safety Formatter."""
    # 1. Convert ID to string safely
    uid = str(u.id) if hasattr(u, 'id') else str(getattr(u, '_id', ''))

    # 2. Try every possible name field (Beanie attribute or Dictionary key)
    # Some DBs use 'name', some use 'fullName', some use 'username'
    name = getattr(u, 'name', None) or getattr(u, 'username', 'Unknown User')
    username = getattr(u, 'username', 'user')

    return {
        "id": uid,
        "name": name,
        "username": username,
        "avatar": {"url": u.avatar.url} if u.avatar and hasattr(u.avatar, 'url') and u.avatar.url else None,
        "impact_score": getattr(u, 'impact_score', 0),
        "city": getattr(u, 'city', ""),
        "state": getattr(u, 'state', ""),
        "role": getattr(u, 'role', 'user'),
        "category": getattr(u, 'category', 'Citizen'),
    }

def user_dict(u) -> dict:
    """Full profile dictionary for auth and settings."""
    return {
        "id": str(u.id),
        "username": u.username,
        "name": u.name or u.username,
        "email": getattr(u, 'email', None),
        "bio": getattr(u, 'bio', ""),
        "location": getattr(u, 'location', ""),
        "city": getattr(u, 'city', ""),
        "state": getattr(u, 'state', ""),
        "category": getattr(u, 'category', "Citizen"),
        "impact_score": getattr(u, 'impact_score', 0),
        "followers_count": getattr(u, 'followers_count', 0),
        "following_count": getattr(u, 'following_count', 0),
        "avatar": {"url": u.avatar.url} if u.avatar and hasattr(u.avatar, 'url') else None,
        "is_verified": getattr(u, 'is_verified', False),
    }
