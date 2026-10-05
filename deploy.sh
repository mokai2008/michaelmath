#!/usr/bin/env bash
set -e

echo "🚀 Deploying latest code and optimizing Nginx on Hostinger VPS (187.77.97.9)..."
ssh -t root@187.77.97.9 "cd /home/gadmaths/htdocs && git fetch --all && git reset --hard origin/main && bash optimize-vps-nginx.sh && npm run build && pm2 restart 0"
echo "✅ Deployment & Nginx video optimization completed successfully! Check https://gadmaths.com"
