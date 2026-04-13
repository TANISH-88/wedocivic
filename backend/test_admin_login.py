"""
Test admin login to debug issues
"""
import asyncio
from app.core.database import connect_db, close_db
from app.models.user import User


async def test_login():
    await connect_db()
    
    print("\n=== Admin Login Debugger ===\n")
    
    email = input("Enter email to test: ").strip().lower()
    password = input("Enter password to test: ").strip()
    
    print(f"\nSearching for user with email: {email}")
    user = await User.find_one(User.email == email)
    
    if not user:
        print("❌ FAIL: User not found")
        print("\nAvailable users:")
        all_users = await User.find_all().limit(10).to_list()
        for u in all_users:
            print(f"  - {u.email} (role: {u.role})")
    else:
        print(f"✓ User found: {user.name}")
        print(f"  Email: {user.email}")
        print(f"  Username: {user.username}")
        print(f"  Role: {user.role}")
        print(f"  Active: {user.is_active}")
        print(f"  Auth Provider: {user.auth_provider}")
        print(f"  Has Password: {bool(user.password)}")
        
        # Check role
        print(f"\n--- Checking Role ---")
        if user.role == "admin":
            print("✓ PASS: User has admin role")
        else:
            print(f"❌ FAIL: User role is '{user.role}', not 'admin'")
            print("   Fix: Run 'python make_admin.py' to make this user an admin")
        
        # Check password
        print(f"\n--- Checking Password ---")
        if not user.password:
            print("❌ FAIL: User has no password (might be Google OAuth user)")
            print("   Fix: Run 'python make_admin.py' to set a password")
        else:
            password_valid = user.verify_password(password)
            if password_valid:
                print("✓ PASS: Password is correct")
            else:
                print("❌ FAIL: Password is incorrect")
                print("   Fix: Run 'python create_admin.py' with same email to reset password")
        
        # Final verdict
        print(f"\n--- Final Result ---")
        if user.role == "admin" and user.password and user.verify_password(password):
            print("✓✓✓ LOGIN SHOULD WORK ✓✓✓")
            print(f"\nYou can login at /admin/login with:")
            print(f"  Email: {email}")
            print(f"  Password: (the one you just entered)")
        else:
            print("❌❌❌ LOGIN WILL FAIL ❌❌❌")
            print("\nTo fix, run:")
            print("  python make_admin.py")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(test_login())
