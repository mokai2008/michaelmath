#!/usr/bin/env bash
set -e

# ==============================================================================
# Script: setup-supabase-smtp.sh
# Purpose: Configure real SMTP credentials for Supabase password recovery emails
# ==============================================================================

echo "================================================================="
echo "📧 Supabase SMTP Email Setup for Michael Gad Math Academy"
echo "================================================================="
echo ""

# 1. Locate .env
SUPABASE_ENV="/root/supabase/docker/.env"
if [ ! -f "$SUPABASE_ENV" ]; then
    SUPABASE_ENV=$(find /root /home /opt -name ".env" 2>/dev/null | grep -E "supabase" | head -n 1 || true)
fi

if [ -z "$SUPABASE_ENV" ] || [ ! -f "$SUPABASE_ENV" ]; then
    echo "❌ Error: Could not locate Supabase .env file."
    exit 1
fi

echo "✅ Using Supabase config: $SUPABASE_ENV"
echo ""

# Presets selection
echo "Choose your email provider:"
echo "  1) Gmail (requires Gmail App Password)"
echo "  2) Hostinger Business / Domain Email (e.g. noreply@gadmaths.com)"
echo "  3) Brevo / Sendinblue (smtp-relay.brevo.com)"
echo "  4) Resend (smtp.resend.com)"
echo "  5) Custom SMTP Provider"
echo ""
read -p "Select [1-5]: " PROVIDER_CHOICE

case "$PROVIDER_CHOICE" in
    1)
        DEFAULT_HOST="smtp.gmail.com"
        DEFAULT_PORT="587"
        echo "💡 Tip for Gmail: Use a 16-character Google App Password (not your normal password)."
        echo "   Generate one at: https://myaccount.google.com/apppasswords"
        ;;
    2)
        DEFAULT_HOST="smtp.hostinger.com"
        DEFAULT_PORT="465"
        ;;
    3)
        DEFAULT_HOST="smtp-relay.brevo.com"
        DEFAULT_PORT="587"
        ;;
    4)
        DEFAULT_HOST="smtp.resend.com"
        DEFAULT_PORT="587"
        ;;
    *)
        DEFAULT_HOST=""
        DEFAULT_PORT="587"
        ;;
esac

echo ""
if [ -n "$DEFAULT_HOST" ]; then
    read -p "SMTP Host [$DEFAULT_HOST]: " INPUT_HOST
    SMTP_HOST="${INPUT_HOST:-$DEFAULT_HOST}"
else
    read -p "SMTP Host (e.g. smtp.gmail.com): " SMTP_HOST
fi

read -p "SMTP Port [${DEFAULT_PORT:-587}]: " INPUT_PORT
SMTP_PORT="${INPUT_PORT:-${DEFAULT_PORT:-587}}"

read -p "Email Address / Username (e.g. contact@gadmaths.com or your@gmail.com): " SMTP_USER
read -s -p "Email Password / App Password: " SMTP_PASS
echo ""

read -p "Sender Name [Michael Gad Math Academy]: " INPUT_NAME
SENDER_NAME="${INPUT_NAME:-Michael Gad Math Academy}"

# Backup
BACKUP_PATH="${SUPABASE_ENV}.smtp_bak_$(date +%s)"
cp "$SUPABASE_ENV" "$BACKUP_PATH"
echo ""
echo "💾 Created backup at: $BACKUP_PATH"

# Update .env
python3 -c "
import sys

env_file = '$SUPABASE_ENV'
host = '$SMTP_HOST'
port = '$SMTP_PORT'
user = '$SMTP_USER'
password = '''$SMTP_PASS'''
sender_name = '$SENDER_NAME'

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

print('✅ Supabase .env successfully updated with new SMTP credentials!')
"

# Restart auth service
echo ""
echo "🔄 Restarting Supabase Auth container..."
SUPABASE_DIR=$(dirname "$SUPABASE_ENV")
if [ -f "$SUPABASE_DIR/docker-compose.yml" ]; then
    (cd "$SUPABASE_DIR" && (docker compose restart auth 2>/dev/null || docker-compose restart auth 2>/dev/null))
else
    docker ps -q -f name=auth | xargs -r docker restart
fi

echo ""
echo "🎉 SUCCESS: SMTP is now configured!"
echo "Now visit https://gadmaths.com/forgot-password and send a test reset link."
