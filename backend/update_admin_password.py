import asyncio
from app.core.database import connect_db, close_db
from app.models.user import User

async def update_password():
    await connect_db()
    
    email = input("Admin email: ").strip().lower()
    new_password = input("New password: ").strip()
    
    user = await User.find_one(User.email == email)
    if not user:
        print(f"❌ User with email {email} not found")
    else:
        user.set_password(new_password)
        await user.save()
        print(f"✓ Password updated for {email}")
    
    await close_db()

if __name__ == "__main__":
    asyncio.run(update_password())
