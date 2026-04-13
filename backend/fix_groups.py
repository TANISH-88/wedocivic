"""
Run this from your backend folder:
    python fix_groups.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URI = "mongodb+srv://vishalofficial700_db_user:CNwTrt9P4EhEjfkf@cluster0.opzrukd.mongodb.net/civicimpact?retryWrites=true&w=majority"
DB_NAME = "civicimpact"

async def fix():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    groups = db["groups"]

    official_slugs  = ["bjp", "fz1", "fz2", "fz3", "congress"]
    community_slugs = ["adasd", "tyuuty"]

    # 1. Fix missing flags
    r1 = await groups.update_many(
        {"is_official": {"$exists": False}},
        {"$set": {"is_official": False, "is_community": False}}
    )
    print(f"✅ Fixed missing flags: {r1.modified_count} documents updated")

    # 2. Fix missing members_count
    r2 = await groups.update_many(
        {"members_count": {"$exists": False}},
        {"$set": {"members_count": 1}}
    )
    print(f"✅ Fixed missing members_count: {r2.modified_count} documents updated")

    # 3. Mark official groups
    r3 = await groups.update_many(
        {"slug": {"$in": official_slugs}},
        {"$set": {"is_official": True, "is_community": False}}
    )
    print(f"✅ Marked official groups: {r3.modified_count} documents updated")

    # 4. Mark community groups
    r4 = await groups.update_many(
        {"slug": {"$in": community_slugs}},
        {"$set": {"is_official": False, "is_community": True}}
    )
    print(f"✅ Marked community groups: {r4.modified_count} documents updated")

    # 5. Force all remaining to explicit False/False (fixes any leftover bad values)
    r5 = await groups.update_many(
        {"slug": {"$nin": official_slugs + community_slugs}},
        {"$set": {"is_official": False, "is_community": False}}
    )
    print(f"✅ Force-set remaining as normal: {r5.modified_count} documents updated")

    # 6. Show raw flag values with types (catches True vs 1 vs 'true' bugs)
    print("\n📋 RAW FLAG VALUES IN DB:")
    all_groups = await groups.find(
        {}, {"name": 1, "slug": 1, "is_official": 1, "is_community": 1}
    ).to_list(100)
    for g in all_groups:
        is_off = g.get("is_official")
        is_com = g.get("is_community")
        kind = "OFFICIAL" if is_off else "COMMUNITY" if is_com else "NORMAL"
        print(f"  [{kind}] {g.get('name')} (@{g.get('slug')}) | is_official={is_off!r} ({type(is_off).__name__}) | is_community={is_com!r} ({type(is_com).__name__})")

    # 7. Simulate exact discover query for normal groups
    print("\n🔍 DISCOVER QUERY RESULT for type=normal:")
    normal_groups = await groups.find(
        {"is_official": {"$ne": True}, "is_community": {"$ne": True}}
    ).to_list(100)
    print(f"  Found {len(normal_groups)} normal groups:")
    for g in normal_groups:
        print(f"    - {g.get('name')} (@{g.get('slug')})")

    client.close()
    print("\n✅ Done! Restart your FastAPI server now.")

asyncio.run(fix())