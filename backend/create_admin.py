"""
Script to create an admin user
Usage: python create_admin.py
"""
import asyncio
from app.core.database import connect_db, close_db
from app.models.user import User


async def create_admin():
    await connect_db()
    
    email = input("Admin email: ").strip().lower()
    password = input("Admin password: ").strip()
    name = input("Admin name: ").strip()
    username = input("Admin username: ").strip().lower()
    
    # Check if user exists
    existing = await User.find_one(User.email == email)
    if existing:
        print(f"\n✓ User with email {email} already exists")
        if existing.role == "admin":
            print("✓ User is already an admin")
        else:
            existing.role = "admin"
            await existing.save()
            print("✓ User role updated to admin")
    else:
        # Create new admin user
        user = User(
            name=name,
            username=username,
            email=email,
            role="admin",
            is_active=True,
            auth_provider="local"
        )
        user.set_password(password)
        await user.insert()
        print(f"\n✓ Admin user created successfully!")
        print(f"  Email: {email}")
        print(f"  Username: {username}")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(create_admin())
