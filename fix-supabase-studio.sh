#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: fix-supabase-studio.sh
# Purpose: Fix Supabase Studio hanging on login & 401 manifest errors on VPS
# ==============================================================================

echo "🔍 Searching for Supabase kong.yml configuration on VPS..."

KONG_YML=""

# 1. Try finding via running Kong docker container mount
if command -v docker &> /dev/null; then
    KONG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'supabase-kong|kong' | head -n 1 || true)
    if [ -n "$KONG_CONTAINER" ]; then
        echo "🐳 Found Kong container: $KONG_CONTAINER"
        CONTAINER_MOUNT=$(docker inspect "$KONG_CONTAINER" 2>/dev/null | grep -o '/[^"]*kong\.ya\?ml' | head -n 1 || true)
        if [ -f "$CONTAINER_MOUNT" ]; then
            KONG_YML="$CONTAINER_MOUNT"
        fi
    fi
fi

# 2. Check standard Supabase directories if not found via container
if [ -z "$KONG_YML" ] || [ ! -f "$KONG_YML" ]; then
    CANDIDATES=(
        "/root/supabase/docker/volumes/api/kong.yml"
        "/root/supabase/volumes/api/kong.yml"
        "/home/gadmaths/supabase/docker/volumes/api/kong.yml"
        "/home/gadmaths/supabase/volumes/api/kong.yml"
        "/opt/supabase/docker/volumes/api/kong.yml"
        "/opt/supabase/volumes/api/kong.yml"
        "/var/lib/docker/volumes/supabase_api_config/_data/kong.yml"
    )
    for c in "${CANDIDATES[@]}"; do
        if [ -f "$c" ]; then
            KONG_YML="$c"
            break
        fi
    done
fi

# 3. Fallback search across filesystem
if [ -z "$KONG_YML" ] || [ ! -f "$KONG_YML" ]; then
    echo "🔎 Searching filesystem for kong.yml..."
    KONG_YML=$(find / -name "kong.yml" 2>/dev/null | grep -E "supabase|volumes" | head -n 1 || true)
fi

if [ -z "$KONG_YML" ] || [ ! -f "$KONG_YML" ]; then
    echo "❌ Error: Could not locate kong.yml. Please run:"
    echo "   find / -name 'kong.yml'"
    echo "and specify the path manually."
    exit 1
fi

echo "✅ Located kong.yml at: $KONG_YML"

# 4. Create timestamped backup
BACKUP_PATH="${KONG_YML}.bak_$(date +%s)"
cp "$KONG_YML" "$BACKUP_PATH"
echo "💾 Backup saved to: $BACKUP_PATH"

# 5. Check if dashboard-static is already present
if grep -q "dashboard-static" "$KONG_YML"; then
    echo "ℹ️  'dashboard-static' route is already configured in $KONG_YML."
else
    echo "⚡ Patching kong.yml to bypass basic-auth on /_next and /favicon..."

    python3 -c "
import sys

kong_path = '$KONG_YML'
with open(kong_path, 'r') as f:
    content = f.read()

static_service_snippet = '''  ## Studio Static Assets (Bypass Basic Auth to fix Next.js 401 manifest crash)
  - name: dashboard-static
    url: http://studio:3000/
    routes:
      - name: dashboard-static-routes
        strip_path: false
        paths:
          - /_next
          - /favicon
          - /img
          - /assets
    plugins:
      - name: cors

'''

if '- name: dashboard' in content:
    new_content = content.replace('- name: dashboard', static_service_snippet + '  - name: dashboard', 1)
    with open(kong_path, 'w') as f:
        f.write(new_content)
    print('✅ Successfully injected dashboard-static bypass into kong.yml')
else:
    print('⚠️  Warning: \"- name: dashboard\" marker not found. Please review kong.yml manually.')
    sys.exit(1)
"
fi

# 6. Restart/Reload Kong container to apply configuration
echo "🔄 Reloading Kong configuration..."
if [ -n "$KONG_CONTAINER" ]; then
    docker exec "$KONG_CONTAINER" kong reload 2>/dev/null || docker restart "$KONG_CONTAINER"
    echo "✅ Applied configuration to Kong container: $KONG_CONTAINER"
else
    if command -v docker &> /dev/null; then
        KONG_ID=$(docker ps -q -f name=kong | head -n 1 || true)
        if [ -n "$KONG_ID" ]; then
            docker exec "$KONG_ID" kong reload 2>/dev/null || docker restart "$KONG_ID"
            echo "✅ Applied configuration to Kong container ($KONG_ID)"
        else
            echo "ℹ️ Kong container not identified automatically. Restarting all Supabase services or please run: docker compose restart kong"
        fi
    fi
fi

echo ""
echo "🎉 ALL DONE!"
echo "Supabase Studio static assets (/_next and /favicon/manifest.json) are now served without 401 errors."
echo "You can now log in at http://187.77.97.9:8000/project/default instantly without hanging!"
