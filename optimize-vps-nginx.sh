#!/usr/bin/env bash
set -e

# ==============================================================================
# Script to configure high-speed zero-copy video streaming on Hostinger VPS
# ==============================================================================

echo "🚀 Starting Nginx Video Streaming Optimization..."

# 1. Ensure directory permissions so Nginx (www-data) can read the uploads directly
echo "📂 Setting folder permissions for /home/gadmaths/htdocs/public/uploads..."
chmod 755 /home/gadmaths /home/gadmaths/htdocs /home/gadmaths/htdocs/public /home/gadmaths/htdocs/public/uploads || true
find /home/gadmaths/htdocs/public/uploads -type d -exec chmod 755 {} + 2>/dev/null || true
find /home/gadmaths/htdocs/public/uploads -type f -exec chmod 644 {} + 2>/dev/null || true

# 2. Ensure ffmpeg is installed on VPS for instant MP4 video FastStart streaming
if ! command -v ffmpeg &> /dev/null; then
  echo "📦 Installing ffmpeg on VPS for instant MP4 FastStart streaming..."
  DEBIAN_FRONTEND=noninteractive apt-get update -y && apt-get install -y ffmpeg || true
fi

# 3. Organize loose uploads into course folders
if [ -f "/home/gadmaths/htdocs/scripts/migrate-uploads.mjs" ]; then
  echo "🚚 Organizing loose uploads into course folders..."
  node /home/gadmaths/htdocs/scripts/migrate-uploads.mjs || true
  find /home/gadmaths/htdocs/public/uploads -type d -exec chmod 755 {} + 2>/dev/null || true
  find /home/gadmaths/htdocs/public/uploads -type f -exec chmod 644 {} + 2>/dev/null || true
fi

# 4. Optimize all existing MP4 videos across all course folders for instant FastStart
if command -v ffmpeg &> /dev/null; then
  echo "⚡ Optimizing existing MP4 videos for instant 0-second FastStart playback across all course folders..."
  find /home/gadmaths/htdocs/public/uploads -type f -name "*.mp4" | while read -r vid; do
    [ -f "$vid" ] || continue
    ffmpeg -y -i "$vid" -c copy -movflags +faststart "${vid}.tmp.mp4" 2>/dev/null && mv "${vid}.tmp.mp4" "$vid" || rm -f "${vid}.tmp.mp4"
  done
  echo "✅ Existing video files converted to FastStart!"
fi

# 4. Locate the active Nginx configuration file for gadmaths.com
NGINX_CONF=""
for file in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf /etc/nginx/sites-available/*; do
  if [ -f "$file" ] && (grep -q "gadmaths.com" "$file" 2>/dev/null || grep -q "3000" "$file" 2>/dev/null); then
    NGINX_CONF="$file"
    break
  fi
done

if [ -z "$NGINX_CONF" ]; then
  if [ -f "/etc/nginx/sites-available/default" ]; then
    NGINX_CONF="/etc/nginx/sites-available/default"
  elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    NGINX_CONF="/etc/nginx/conf.d/default.conf"
  fi
fi

if [ -z "$NGINX_CONF" ]; then
  echo "❌ Error: Could not locate active Nginx configuration file."
  echo "Please check /etc/nginx/sites-available/ or /etc/nginx/conf.d/"
  exit 1
fi

echo "🔍 Found active Nginx configuration: $NGINX_CONF"

# 5. Create a safety backup
BACKUP_FILE="${NGINX_CONF}.bak_$(date +%s)"
cp "$NGINX_CONF" "$BACKUP_FILE"
echo "💾 Created backup at: $BACKUP_FILE"

# 6. Check if location /uploads/ is already present
if grep -q "location /uploads/" "$NGINX_CONF"; then
  echo "ℹ️ location /uploads/ already exists in $NGINX_CONF. Updating configuration..."
  # Remove existing location /uploads/ block to refresh it
  python3 -c "
import re, sys

with open('$NGINX_CONF', 'r') as f:
    content = f.read()

pattern = r'location\s+/uploads/\s*\{[^}]*\}'
new_content = re.sub(pattern, '', content)

with open('$NGINX_CONF', 'w') as f:
    f.write(new_content)
"
fi

# 7. Insert high-speed video streaming block and ensure client_max_body_size
python3 -c "
import sys, re

conf_path = '$NGINX_CONF'
with open(conf_path, 'r') as f:
    content = f.read()

# Snippet to insert with direct kernel zero-copy and zero-compression overhead
upload_block = '''
    # ⚡ High-Speed Direct Kernel Zero-Copy Video Streaming (added by gadmaths optimizer)
    client_max_body_size 500M;

    location /uploads/ {
        alias /home/gadmaths/htdocs/public/uploads/;
        sendfile on;
        sendfile_max_chunk 4m;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        gzip off;
        open_file_cache max=1000 inactive=30s;
        open_file_cache_valid 60s;
        open_file_cache_min_uses 2;
        open_file_cache_errors on;
        expires 30d;
        add_header Cache-Control \"public, max-age=2592000, immutable\";
        add_header Accept-Ranges \"bytes\";
        add_header Access-Control-Allow-Origin *;
    }
'''

# Find the server block containing gadmaths.com or proxy_pass, and insert before the first location /
if 'location / {' in content:
    new_content = content.replace('location / {', upload_block + '\n    location / {', 1)
elif 'location /' in content:
    new_content = re.sub(r'location\s+/[^{]*\{', upload_block + r'\n    \g<0>', content, count=1)
else:
    # Append inside the last server { block before closing brace
    last_brace = content.rfind('}')
    if last_brace != -1:
        new_content = content[:last_brace] + upload_block + '\n' + content[last_brace:]
    else:
        new_content = content + upload_block

with open(conf_path, 'w') as f:
    f.write(new_content)
"

# 6. Test Nginx syntax
echo "🧪 Testing Nginx configuration syntax..."
if nginx -t; then
  echo "✅ Nginx syntax test passed! Reloading Nginx..."
  systemctl reload nginx
  echo "🎉 SUCCESS: Direct high-speed Nginx zero-copy video streaming is now active!"
  echo "Videos in /uploads/ are now served directly by Nginx at full wire speed with byte-range streaming."
else
  echo "❌ Nginx syntax error! Restoring original backup..."
  cp "$BACKUP_FILE" "$NGINX_CONF"
  systemctl reload nginx
  echo "⚠️ Backup restored. Nginx was NOT changed."
  exit 1
fi

# 7. Check and fix Supabase Studio basic-auth hang if present
if [ -f "/home/gadmaths/htdocs/fix-supabase-studio.sh" ]; then
  echo "🛡️ Checking Supabase Studio configuration..."
  bash /home/gadmaths/htdocs/fix-supabase-studio.sh || true
fi
