#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: configure-supabase-auth.sh
# Purpose: Configure Site URL, Redirect URLs, and check SMTP on self-hosted Supabase
# ==============================================================================

echo "🔍 Locating Supabase Docker configuration on VPS..."

SUPABASE_ENV=""

# 1. Try to find .env file from running auth / gotrue docker container
if command -v docker &> /dev/null; then
    AUTH_CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'supabase.*auth|gotrue' | head -n 1 || true)
    if [ -n "$AUTH_CONTAINER" ]; then
        echo "🐳 Found Auth container: $AUTH_CONTAINER"
    fi
fi

# 2. Check standard Supabase directories
CANDIDATES=(
    "/root/supabase/docker/.env"
    "/home/gadmaths/supabase/docker/.env"
    "/root/supabase/.env"
    "/home/gadmaths/supabase/.env"
    "/opt/supabase/docker/.env"
    "/opt/supabase/.env"
    "/var/lib/docker/volumes/supabase_api_config/_data/.env"
)

for c in "${CANDIDATES[@]}"; do
    if [ -f "$c" ]; then
        SUPABASE_ENV="$c"
        break
    fi
done

# 3. Fallback search if not found
if [ -z "$SUPABASE_ENV" ] || [ ! -f "$SUPABASE_ENV" ]; then
    echo "🔎 Searching filesystem for Supabase .env file..."
    SUPABASE_ENV=$(find /root /home /opt -name ".env" 2>/dev/null | grep -E "supabase" | head -n 1 || true)
fi

if [ -z "$SUPABASE_ENV" ] || [ ! -f "$SUPABASE_ENV" ]; then
    echo "❌ Error: Could not automatically locate the Supabase .env file."
    echo "Please find your Supabase docker directory (e.g. /root/supabase/docker) and run this script from there."
    exit 1
fi

echo "✅ Located Supabase .env at: $SUPABASE_ENV"

# 4. Create timestamped backup
BACKUP_PATH="${SUPABASE_ENV}.bak_$(date +%s)"
cp "$SUPABASE_ENV" "$BACKUP_PATH"
echo "💾 Backup saved to: $BACKUP_PATH"

TARGET_SITE_URL="https://gadmaths.com"
TARGET_REDIRECTS="https://gadmaths.com/reset-password,https://gadmaths.com/auth/callback,https://gadmaths.com/**,http://localhost:3000/**"

# 5. Update or append SITE_URL and ADDITIONAL_REDIRECT_URLS
python3 -c "
import sys, re

env_file = '$SUPABASE_ENV'
site_url = '$TARGET_SITE_URL'
redirects = '$TARGET_REDIRECTS'

with open(env_file, 'r') as f:
    lines = f.readlines()

updated_site_url = False
updated_redirects = False
updated_gotrue_site_url = False
updated_gotrue_allow = False

new_lines = []
for line in lines:
    if line.startswith('SITE_URL='):
        new_lines.append(f'SITE_URL={site_url}\n')
        updated_site_url = True
    elif line.startswith('ADDITIONAL_REDIRECT_URLS='):
        new_lines.append(f'ADDITIONAL_REDIRECT_URLS={redirects}\n')
        updated_redirects = True
    elif line.startswith('GOTRUE_SITE_URL='):
        new_lines.append(f'GOTRUE_SITE_URL={site_url}\n')
        updated_gotrue_site_url = True
    elif line.startswith('GOTRUE_URI_ALLOW_LIST='):
        new_lines.append(f'GOTRUE_URI_ALLOW_LIST={redirects}\n')
        updated_gotrue_allow = True
    else:
        new_lines.append(line)

if not updated_site_url:
    new_lines.append(f'\nSITE_URL={site_url}\n')
if not updated_redirects:
    new_lines.append(f'ADDITIONAL_REDIRECT_URLS={redirects}\n')
if not updated_gotrue_site_url:
    new_lines.append(f'GOTRUE_SITE_URL={site_url}\n')
if not updated_gotrue_allow:
    new_lines.append(f'GOTRUE_URI_ALLOW_LIST={redirects}\n')

with open(env_file, 'w') as f:
    f.writelines(new_lines)

print('✅ Updated SITE_URL to:', site_url)
print('✅ Updated ADDITIONAL_REDIRECT_URLS / GOTRUE_URI_ALLOW_LIST')
"

# 6. Check SMTP settings
echo ""
echo "📧 Checking Email (SMTP) Configuration..."
SMTP_HOST=$(grep -E "^(SMTP_HOST|GOTRUE_SMTP_HOST)=" "$SUPABASE_ENV" | head -n 1 || true)
SMTP_USER=$(grep -E "^(SMTP_USER|GOTRUE_SMTP_USER)=" "$SUPABASE_ENV" | head -n 1 || true)

if [ -z "$SMTP_HOST" ] || [[ "$SMTP_HOST" == *"localhost"* ]] || [[ "$SMTP_HOST" == *"="" "* ]] || [[ "$SMTP_HOST" == *"=" ]]; then
    echo "⚠️  WARNING: SMTP server is not yet configured in $SUPABASE_ENV."
    echo "   Without SMTP credentials (like Resend, Gmail, Brevo, or Hostinger email),"
    echo "   Supabase cannot deliver reset password emails to user inboxes."
else
    echo "✅ SMTP is configured: $SMTP_HOST ($SMTP_USER)"
fi

# 7. Restart Auth service
echo ""
echo "🔄 Restarting Supabase Auth service to apply changes..."
SUPABASE_DIR=$(dirname "$SUPABASE_ENV")

if [ -f "$SUPABASE_DIR/docker-compose.yml" ] || [ -f "$SUPABASE_DIR/docker-compose.yaml" ]; then
    (cd "$SUPABASE_DIR" && (docker compose restart auth 2>/dev/null || docker-compose restart auth 2>/dev/null || docker compose restart 2>/dev/null))
elif [ -n "$AUTH_CONTAINER" ]; then
    docker restart "$AUTH_CONTAINER"
else
    # Fallback restart any running auth container
    docker ps -q -f name=auth | xargs -r docker restart
fi

echo ""
echo "🎉 SUCCESS: Supabase Auth URLs are now configured for https://gadmaths.com!"
