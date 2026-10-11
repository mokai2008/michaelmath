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

# 4. Guarantee 100% Backwards Compatibility:
# Create hard links in root /public/uploads/ for all files that were organized into course subfolders.
# Hard links use ZERO extra disk space and ensure Nginx directly finds both:
# /uploads/video.mp4 AND /uploads/course_name/video.mp4
echo "🔗 Ensuring backwards-compatible links for all course uploads (0 byte overhead)..."
find /home/gadmaths/htdocs/public/uploads -mindepth 2 -type f ! -name ".*" | while read -r subfile; do
  fname=$(basename "$subfile")
  rootlink="/home/gadmaths/htdocs/public/uploads/$fname"
  if [ ! -e "$rootlink" ]; then
    ln -f "$subfile" "$rootlink" 2>/dev/null || cp -l "$subfile" "$rootlink" 2>/dev/null || true
  fi
done

# 4. Optimize all existing MP4 videos across all course folders for instant FastStart
if command -v ffmpeg &> /dev/null; then
  echo "⚡ Optimizing existing MP4 videos for instant 0-second FastStart playback across all course folders..."
  find /home/gadmaths/htdocs/public/uploads -type f -name "*.mp4" | while read -r vid; do
    [ -f "$vid" ] || continue
    ffmpeg -y -i "$vid" -c copy -movflags +faststart "${vid}.tmp.mp4" 2>/dev/null && mv "${vid}.tmp.mp4" "$vid" || rm -f "${vid}.tmp.mp4"
  done
  echo "✅ Existing video files converted to FastStart!"
fi

# 4. Locate all active Nginx configuration files for gadmaths.com
CONFS_TO_UPDATE=()
for file in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*.conf /etc/nginx/sites-available/*; do
  [ -f "$file" ] || continue
  if grep -q "gadmaths.com" "$file" 2>/dev/null || grep -q "3000" "$file" 2>/dev/null; then
    realfile=$(readlink -f "$file" 2>/dev/null || echo "$file")
    if [[ ! " ${CONFS_TO_UPDATE[@]} " =~ " ${realfile} " ]]; then
      CONFS_TO_UPDATE+=("$realfile")
    fi
  fi
done

if [ ${#CONFS_TO_UPDATE[@]} -eq 0 ]; then
  if [ -f "/etc/nginx/sites-available/default" ]; then
    CONFS_TO_UPDATE+=("/etc/nginx/sites-available/default")
  elif [ -f "/etc/nginx/conf.d/default.conf" ]; then
    CONFS_TO_UPDATE+=("/etc/nginx/conf.d/default.conf")
  fi
fi

if [ ${#CONFS_TO_UPDATE[@]} -eq 0 ]; then
  echo "❌ Error: Could not locate active Nginx configuration file."
  echo "Please check /etc/nginx/sites-available/ or /etc/nginx/conf.d/"
  exit 1
fi

echo "🔍 Found active Nginx configurations to optimize: ${CONFS_TO_UPDATE[*]}"

# 5. Create backups and insert high-speed video streaming blocks in all server blocks (HTTP & HTTPS)
BACKUPS=()
for NGINX_CONF in "${CONFS_TO_UPDATE[@]}"; do
  BACKUP_FILE="${NGINX_CONF}.bak_$(date +%s)"
  cp "$NGINX_CONF" "$BACKUP_FILE"
  BACKUPS+=("$BACKUP_FILE:$NGINX_CONF")
  echo "💾 Created backup at: $BACKUP_FILE"

  python3 -c "
import sys, re

conf_path = '$NGINX_CONF'
with open(conf_path, 'r') as f:
    content = f.read()

# Remove existing location /uploads/ blocks
content = re.sub(r'#\s*⚡ High-Speed[^\n]*\n(?:[ \t]*[^\n]*\n)*?[ \t]*location\s+/uploads/\s*\{[^}]*\}', '', content)
content = re.sub(r'location\s+/uploads/\s*\{[^}]*\}', '', content)

upload_block = '''
    # ⚡ High-Speed Direct Kernel Zero-Copy Video Streaming (added by gadmaths optimizer)
    client_max_body_size 500M;

    location /uploads/ {
        alias /home/gadmaths/htdocs/public/uploads/;
        sendfile on;
        sendfile_max_chunk 2m;
        tcp_nopush on;
        tcp_nodelay on;
        keepalive_timeout 65;
        gzip off;
        open_file_cache max=2000 inactive=120s;
        open_file_cache_valid 60s;
        open_file_cache_min_uses 1;
        open_file_cache_errors on;
        expires 30d;
        add_header Cache-Control \"public, max-age=2592000, immutable\";
        add_header Accept-Ranges \"bytes\";
        add_header Access-Control-Allow-Origin *;
        add_header Content-Disposition \"inline\";
    }
'''

# Insert upload_block before every location / { block (covers both HTTP and HTTPS port 443 server blocks)
if re.search(r'location\s+/\s*\{', content):
    new_content = re.sub(r'([ \t]*location\s+/\s*\{)', upload_block + r'\n\1', content)
else:
    last_brace = content.rfind('}')
    if last_brace != -1:
        new_content = content[:last_brace] + upload_block + '\n' + content[last_brace:]
    else:
        new_content = content + upload_block

with open(conf_path, 'w') as f:
    f.write(new_content)
"
done

# 6. Test Nginx syntax
echo "🧪 Testing Nginx configuration syntax..."
if nginx -t; then
  echo "✅ Nginx syntax test passed! Reloading Nginx..."
  systemctl reload nginx
  echo "🎉 SUCCESS: Direct high-speed Nginx zero-copy video streaming is now active!"
  echo "Videos in /uploads/ are now served directly by Nginx at full wire speed with byte-range streaming."
else
  echo "❌ Nginx syntax error! Restoring original backups..."
  for bkp in "${BACKUPS[@]}"; do
    src="${bkp%%:*}"
    dst="${bkp##*:}"
    cp "$src" "$dst"
  done
  systemctl reload nginx || true
  echo "⚠️ Backup restored. Nginx was NOT changed."
  exit 1
fi

# 7. Check and fix Supabase Studio basic-auth hang if present
if [ -f "/home/gadmaths/htdocs/fix-supabase-studio.sh" ]; then
  echo "🛡️ Checking Supabase Studio configuration..."
  bash /home/gadmaths/htdocs/fix-supabase-studio.sh || true
fi
