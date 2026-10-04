#!/bin/bash

# IT Issue Tracker - Demo User Creation Script
# สร้าง users ผ่าน API /auth/register ตามที่ระบุใน requirements
# Roles other than "user" can only be assigned by an admin, so this script logs in as the
# seeded admin first and sends its Bearer token with every /api/auth/register call.

cd "$(dirname "$0")/.." || exit 1

# Read a single KEY=value from .env (not sourced, so values are never executed)
read_env() {
    [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2-
}

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="$BASE_URL/api/auth/register"
ADMIN_USERNAME="${ADMIN_USERNAME:-$(read_env ADMIN_USERNAME)}"
ADMIN_USERNAME="${ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-$(read_env ADMIN_PASSWORD)}"
DEMO_PASSWORD="${DEMO_PASSWORD:-$(read_env DEMO_PASSWORD)}"

if [ -z "$ADMIN_PASSWORD" ] || [ -z "$DEMO_PASSWORD" ]; then
    echo "❌ ADMIN_PASSWORD / DEMO_PASSWORD are not set - run: bash scripts/init-env.sh"
    exit 1
fi

echo "🚀 Creating demo users for IT Issue Tracker..."
echo "================================================"

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

# Log in as the admin created by scripts/seed-admin.js
echo "🔑 Logging in as admin '$ADMIN_USERNAME'..."
login_response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}")
ADMIN_TOKEN=$(echo "$login_response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Admin login failed: $login_response"
    exit 1
fi
echo "✅ Admin login successful"
echo ""

# Function to create user (as admin)
create_user() {
    local username=$1
    local role=$2

    echo "Creating user: $username (Role: $role)"

    response=$(curl -s -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d "{
            \"username\": \"$username\",
            \"password\": \"$DEMO_PASSWORD\",
            \"role\": \"$role\"
        }")

    if echo "$response" | grep -q "successfully"; then
        echo "✅ User '$username' created successfully"
    elif echo "$response" | grep -q "exists"; then
        echo "⚠️  User '$username' already exists"
    else
        echo "❌ Failed to create user '$username': $response"
    fi
    echo ""
}

echo "👥 Creating demo users..."
echo ""
create_user "support01" "support"
create_user "support02" "support"
create_user "user" "user"

echo "================================================"
echo "🎉 User creation completed!"
echo ""
echo "📋 Demo Users:"
echo "  Username    | Role    | Password"
echo "  ------------|---------|-------------------------"
echo "  $ADMIN_USERNAME       | admin   | ADMIN_PASSWORD in .env"
echo "  support01   | support | DEMO_PASSWORD in .env"
echo "  support02   | support | DEMO_PASSWORD in .env"
echo "  user        | user    | DEMO_PASSWORD in .env"
echo ""
echo "🌐 Access the application at: $BASE_URL"
