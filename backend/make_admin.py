"""
Make an existing user an admin
"""
import asyncio
from app.core.database import connect_db, close_db
from app.models.user import User


async def make_admin():
    await connect_db()
    
    email = input("Enter user email to make admin: ").strip().lower()
    
    user = await User.find_one(User.email == email)
    
    if not user:
        print(f"\n❌ User with email '{email}' not found")
        print("\nAvailable users:")
        all_users = await User.find_all().limit(10).to_list()
        for u in all_users:
            print(f"  - {u.email} (role: {u.role})")
    else:
        print(f"\n✓ Found user: {user.name} (@{user.username})")
        print(f"  Current role: {user.role}")
        
        if user.role == "admin":
            print("  User is already an admin!")
        else:
            user.role = "admin"
            await user.save()
            print(f"  ✓ Updated role to: admin")
        
        # Also set password if needed
        set_password = input("\nDo you want to set a new password? (y/n): ").strip().lower()
        if set_password == 'y':
            new_password = input("Enter new password: ").strip()
            user.set_password(new_password)
            await user.save()
            print("✓ Password updated")
        
        print(f"\n✓ Admin user ready!")
        print(f"  Email: {user.email}")
        print(f"  Password: {'(updated)' if set_password == 'y' else '(unchanged)'}")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(make_admin())
