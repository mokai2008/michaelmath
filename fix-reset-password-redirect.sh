#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: fix-reset-password-redirect.sh
# Purpose: Configure canonical www domain in Supabase & rebuild website so
#          reset password email links go straight to /reset-password
# ==============================================================================

echo "================================================================="
echo "🔧 Fixing Password Reset Email Redirect Destination"
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

echo "📂 Located Supabase .env at: $SUPABASE_ENV"

# 1. Update Supabase .env with canonical www and non-www allowlists
python3 -c "
import sys

env_file = '$SUPABASE_ENV'
site_url = 'https://www.gadmaths.com'
redirects = 'https://www.gadmaths.com/reset-password,https://www.gadmaths.com/auth/callback,https://www.gadmaths.com/**,https://gadmaths.com/reset-password,https://gadmaths.com/auth/callback,https://gadmaths.com/**,http://localhost:3000/**'

with open(env_file, 'r') as f:
    lines = f.readlines()

new_lines = []
keys_to_update = {
    'SITE_URL': site_url,
    'GOTRUE_SITE_URL': site_url,
    'ADDITIONAL_REDIRECT_URLS': redirects,
    'GOTRUE_URI_ALLOW_LIST': redirects,
}

handled_keys = set()

for line in lines:
    updated = False
    for k, v in keys_to_update.items():
        if line.startswith(f'{k}='):
            new_lines.append(f'{k}={v}\n')
            handled_keys.add(k)
            updated = True
            break
    if not updated:
        new_lines.append(line)

for k, v in keys_to_update.items():
    if k not in handled_keys:
        new_lines.append(f'{k}={v}\n')

with open(env_file, 'w') as f:
    f.writelines(new_lines)

print('✅ Supabase SITE_URL set to:', site_url)
print('✅ Supabase Redirect allowlist updated with both www and non-www domains!')
"

# 2. Force recreate auth container
echo ""
echo "🔄 Force-recreating Supabase Auth container to apply changes..."
SUPABASE_DIR=$(dirname "$SUPABASE_ENV")
if [ -f "$SUPABASE_DIR/docker-compose.yml" ] || [ -f "$SUPABASE_DIR/docker-compose.yaml" ]; then
    (cd "$SUPABASE_DIR" && (docker compose up -d --force-recreate auth 2>/dev/null || docker-compose up -d --force-recreate auth 2>/dev/null || docker compose restart auth 2>/dev/null))
fi

# 3. Build & Restart Next.js website
echo ""
echo "📦 Building and restarting website on VPS..."
cd /home/gadmaths/htdocs
npm run build
pm2 restart all

echo ""
echo "🎉 ALL DONE!"
echo "Now request a new password reset at https://www.gadmaths.com/forgot-password."
echo "Clicking the link in your email will now open the 'Set New Password' page directly!"
