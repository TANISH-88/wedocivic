"""
Check if admin user exists and their details
"""
import asyncio
from app.core.database import connect_db, close_db
from app.models.user import User


async def check_admin():
    await connect_db()
    
    print("\n=== Checking Admin Users ===\n")
    
    # Find all admin users
    admins = await User.find(User.role == "admin").to_list()
    
    if not admins:
        print("❌ No admin users found!")
        print("\nTo create an admin user, run:")
        print("  python create_admin.py")
    else:
        print(f"✓ Found {len(admins)} admin user(s):\n")
        for admin in admins:
            print(f"  Email:    {admin.email}")
            print(f"  Username: {admin.username}")
            print(f"  Name:     {admin.name}")
            print(f"  Role:     {admin.role}")
            print(f"  Active:   {admin.is_active}")
            print(f"  Has Password: {bool(admin.password)}")
            print(f"  Auth Provider: {admin.auth_provider}")
            print()
    
    # Also check all users
    all_users = await User.find_all().to_list()
    print(f"\nTotal users in database: {len(all_users)}")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(check_admin())
