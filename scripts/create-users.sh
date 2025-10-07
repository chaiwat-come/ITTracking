#!/bin/bash

# IT Issue Tracker - User Creation Script
# สร้าง users ผ่าน API /auth/register ตามที่ระบุใน requirements

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api/auth/register"

echo "🚀 Creating default users for IT Issue Tracker..."
echo "================================================"

# Function to create user
create_user() {
    local username=$1
    local password=$2
    local role=$3
    
    echo "Creating user: $username (Role: $role)"
    
    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$username\",
            \"password\": \"$password\",
            \"role\": \"$role\"
        }")
    
    if echo "$response" | grep -q "successfully"; then
        echo "✅ User '$username' created successfully"
    elif echo "$response" | grep -q "already exists"; then
        echo "⚠️  User '$username' already exists"
    else
        echo "❌ Failed to create user '$username': $response"
    fi
    echo ""
}

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
for i in {1..30}; do
    if curl -s "$BASE_URL" > /dev/null 2>&1; then
        echo "✅ Server is ready!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 2
done

# Create default users
echo "👥 Creating default users..."
echo ""

# Admin user
create_user "admin" "admin" "admin"

# Support users
create_user "support01" "support01" "support"
create_user "support02" "support02" "support"

# Regular user
create_user "user" "user" "user"

echo "================================================"
echo "🎉 User creation completed!"
echo ""
echo "📋 Default Users:"
echo "  Username    | Password | Role"
echo "  ------------|----------|--------"
echo "  admin       | admin | admin"
echo "  support01   | support01 | support"
echo "  support02   | support02 | support"
echo "  user        | user | user"
echo ""
echo "🌐 Access the application at: $BASE_URL"
echo ""

# Test login for admin user
echo "🧪 Testing admin login..."
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "password"
    }')

if echo "$login_response" | grep -q "token"; then
    echo "✅ Admin login test successful"
else
    echo "❌ Admin login test failed: $login_response"
fi

echo ""
echo "✨ Setup complete! You can now log in with any of the users above."
