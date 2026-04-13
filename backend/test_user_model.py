#!/usr/bin/env python3
"""Quick test to verify User model fields are accessible"""
from app.models.user import User

print("Testing User model...")
print(f"User.email attribute exists: {hasattr(User, 'email')}")
print(f"User.username attribute exists: {hasattr(User, 'username')}")

# Test field access for Beanie queries
try:
    email_field = User.email
    print(f"✓ User.email is accessible: {email_field}")
except AttributeError as e:
    print(f"✗ User.email failed: {e}")

try:
    username_field = User.username
    print(f"✓ User.username is accessible: {username_field}")
except AttributeError as e:
    print(f"✗ User.username failed: {e}")

print("\nModel import successful!")
