#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: debug-supabase-smtp.sh
# Purpose: Force-reload Supabase Auth with new .env and show live logs
# ==============================================================================

echo "================================================================="
echo "🔍 Supabase Auth SMTP Diagnostics & Reload"
echo "================================================================="
echo ""

SUPABASE_ENV="/root/supabase/docker/.env"
if [ ! -f "$SUPABASE_ENV" ]; then
    SUPABASE_ENV=$(find /root /home /opt -name ".env" 2>/dev/null | grep -E "supabase" | head -n 1 || true)
fi

if [ -z "$SUPABASE_ENV" ] || [ ! -f "$SUPABASE_ENV" ]; then
    echo "❌ Error: Could not locate Supabase .env file."
    exit 1
fi

SUPABASE_DIR=$(dirname "$SUPABASE_ENV")
echo "📂 Supabase directory: $SUPABASE_DIR"
echo ""

# 1. Force recreate container so Docker re-reads the updated .env file
echo "🔄 Force-recreating Supabase Auth container with updated .env..."
if [ -f "$SUPABASE_DIR/docker-compose.yml" ] || [ -f "$SUPABASE_DIR/docker-compose.yaml" ]; then
    (cd "$SUPABASE_DIR" && (docker compose up -d --force-recreate auth 2>/dev/null || docker-compose up -d --force-recreate auth 2>/dev/null || docker compose up -d auth 2>/dev/null))
fi

sleep 2

# 2. Find Auth container name
AUTH_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'supabase.*auth|gotrue' | head -n 1 || true)
if [ -z "$AUTH_CONTAINER" ]; then
    echo "❌ Could not find running Supabase Auth container."
    exit 1
fi

echo "🐳 Running container: $AUTH_CONTAINER"
echo ""

# 3. Check what environment variables are ACTUALLY loaded inside the container
echo "📋 Active SMTP settings inside container:"
docker exec "$AUTH_CONTAINER" env 2>/dev/null | grep -iE "smtp|site_url" | sed 's/PASS=.*/PASS=******/' || true
echo ""

# 4. Test network connectivity from VPS to Gmail SMTP
echo "🌐 Testing connection to smtp.gmail.com:587..."
if command -v nc &>/dev/null; then
    nc -z -v -w 5 smtp.gmail.com 587 2>&1 || true
elif command -v timeout &>/dev/null; then
    timeout 5 bash -c "</dev/tcp/smtp.gmail.com/587" 2>/dev/null && echo "✅ Port 587 is OPEN and reachable" || echo "⚠️ Could not connect to smtp.gmail.com on port 587"
fi
echo ""

# 5. Display the latest Auth logs
echo "📜 Recent Auth logs (looking for email errors):"
echo "--------------------------------------------------"
docker logs "$AUTH_CONTAINER" --tail 25 2>&1
echo "--------------------------------------------------"
echo ""
echo "👉 Now click 'Send Reset Link' on https://gadmaths.com/forgot-password"
echo "   and watch this terminal or check the logs again."
