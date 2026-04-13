# app/core/database.py
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from pymongo.errors import ConfigurationError, ServerSelectionTimeoutError

_client: AsyncIOMotorClient = None

async def connect_db():
    global _client
    try:
        # Configure timeouts to handle DNS issues and network delays
        # serverSelectionTimeoutMS: Max time to wait for server selection (default 30000ms)
        # connectTimeoutMS: Max time to wait for initial connection (default 10000ms)
        mongo_uri = settings.MONGO_URI
        
        # Add connection timeout parameters if not already present
        separator = "&" if "?" in mongo_uri else "?"
        if "serverSelectionTimeoutMS" not in mongo_uri:
            mongo_uri += f"{separator}serverSelectionTimeoutMS=5000"
        
        _client = AsyncIOMotorClient(
            mongo_uri,
            connectTimeoutMS=5000,
            serverSelectionTimeoutMS=5000,
            retryWrites=True,
        )
        
        from app.models.user         import User
        from app.models.post         import Post
        from app.models.comment      import Comment
        from app.models.like         import Like
        from app.models.follow       import Follow
        from app.models.event        import Event
        from app.models.notification import Notification
        from app.models.message      import GroupMessage
        from app.models.group        import Group, GroupMember, GroupInvitation 

        await init_beanie(
            database=_client[settings.DB_NAME],
            document_models=[
                User, Post, Comment, Like, Follow, Event, 
                Notification, Group, GroupMember, GroupMessage, GroupInvitation
            ],
        )
        print(f"✅  MongoDB connected & Hub Initialized  →  {settings.DB_NAME}")
    
    except (ConfigurationError, ServerSelectionTimeoutError) as e:
        print(f"❌ MongoDB Connection Error: {str(e)[:200]}")
        print("\n⚠️  Failed to initialize Beanie. Cannot start server without database connection!")
        print("\n💡 Quick fixes:")
        print("   • Option 1: Install MongoDB locally → https://www.mongodb.com/try/download/community")
        print("   • Option 2: Check MongoDB Atlas cluster is running and your IP is whitelisted")
        print("   • Option 3: Use Docker → docker run -d -p 27017:27017 mongo:latest")
        print("   • Option 4: Verify MONGO_URI environment variable is set correctly\n")
        raise


async def close_db():
    global _client
    if _client:
        _client.close()
        print("MongoDB connection closed")