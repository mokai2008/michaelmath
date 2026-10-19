#!/usr/bin/env bash
set -e

echo "=== NGINX SITES ==="
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*; do
    if [ -f "$f" ]; then
        echo "--- File: $f ---"
        cat "$f"
    fi
done

echo ""
echo "=== SUPABASE DOCKER ENV ==="
if [ -f "/root/supabase/docker/.env" ]; then
    grep -E "API_EXTERNAL_URL|SITE_URL|KONG_HTTP_PORT|KONG_HTTPS_PORT|GOTRUE" /root/supabase/docker/.env || true
fi

echo ""
echo "=== WEBSITE .ENV.LOCAL ON VPS ==="
if [ -f "/home/gadmaths/htdocs/.env.local" ]; then
    grep -E "SUPABASE" /home/gadmaths/htdocs/.env.local | sed 's/KEY=.*/KEY=***/' || true
fi

echo ""
echo "=== RECOVERY EMAIL TEMPLATE ==="
find /root/supabase -name "*recovery*.html" 2>/dev/null | while read -r tf; do
    echo "--- Template: $tf ---"
    cat "$tf"
done
