#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: apply-gmail-smtp.sh
# Purpose: Instantly apply the correct Gmail SMTP credentials to Supabase
# ==============================================================================

echo "🚀 Applying Gmail SMTP configuration to Supabase..."

SUPABASE_ENV="/root/supabase/docker/.env"
if [ ! -f "$SUPABASE_ENV" ]; then
    SUPABASE_ENV=$(find /root /home /opt -name ".env" 2>/dev/null | grep -E "supabase" | head -n 1 || true)
fi

if [ -z "$SUPABASE_ENV" ] || [ ! -f "$SUPABASE_ENV" ]; then
    echo "❌ Error: Could not locate Supabase .env file."
    exit 1
fi

echo "✅ Located Supabase .env at: $SUPABASE_ENV"

# Backup
BACKUP_PATH="${SUPABASE_ENV}.smtp_bak_$(date +%s)"
cp "$SUPABASE_ENV" "$BACKUP_PATH"
echo "💾 Backup saved to: $BACKUP_PATH"

python3 -c "
import sys

env_file = '$SUPABASE_ENV'
host = 'smtp.gmail.com'
port = '587'
user = 'mokai2008@gmail.com'
# Google app passwords can be used without spaces
password = 'ivcnutxignvzyugl'
sender_name = 'Michael Gad Math Academy'

with open(env_file, 'r') as f:
    lines = f.readlines()

new_lines = []
keys_to_update = {
    'SMTP_HOST': host,
    'GOTRUE_SMTP_HOST': host,
    'SMTP_PORT': port,
    'GOTRUE_SMTP_PORT': port,
    'SMTP_USER': user,
    'GOTRUE_SMTP_USER': user,
    'SMTP_PASS': password,
    'GOTRUE_SMTP_PASS': password,
    'SMTP_ADMIN_EMAIL': user,
    'GOTRUE_SMTP_ADMIN_EMAIL': user,
    'SMTP_SENDER_NAME': sender_name,
    'GOTRUE_SMTP_SENDER_NAME': sender_name,
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

# Append any missing keys
for k, v in keys_to_update.items():
    if k not in handled_keys:
        new_lines.append(f'{k}={v}\n')

with open(env_file, 'w') as f:
    f.writelines(new_lines)

print('✅ Host set to:', host)
print('✅ Port set to:', port)
print('✅ User set to:', user)
print('✅ Password set securely (spaces stripped)')
"

echo ""
echo "🔄 Restarting Supabase Auth container..."
SUPABASE_DIR=$(dirname "$SUPABASE_ENV")
if [ -f "$SUPABASE_DIR/docker-compose.yml" ]; then
    (cd "$SUPABASE_DIR" && (docker compose restart auth 2>/dev/null || docker-compose restart auth 2>/dev/null))
else
    docker ps -q -f name=auth | xargs -r docker restart
fi

echo ""
echo "🎉 ALL DONE! Gmail SMTP is now properly configured with smtp.gmail.com."
echo "Go back to https://gadmaths.com/forgot-password and click 'Send Reset Link'!"
