#!/bin/bash
# AnyClaw deploy script — syncs source to server, builds on server, restarts
# Usage: ./deploy.sh
set -e

SERVER="root@157.230.173.91"
REMOTE_DIR="/opt/anyclaw"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🦀 AnyClaw Deploy"
echo "================="

# 1. Sync source to server (exclude dev/build files)
echo "📤 Syncing source to $SERVER:$REMOTE_DIR..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='data/*.db*' \
  --exclude='.env.local' \
  --exclude='.env' \
  "$LOCAL_DIR/" "$SERVER:$REMOTE_DIR/"

# 2. Install deps + build on server (native modules compile for Linux)
echo "📦 Installing deps & building on server..."
ssh "$SERVER" "cd $REMOTE_DIR && npm install --registry https://registry.npmjs.org 2>&1 | tail -3"
ssh "$SERVER" "cd $REMOTE_DIR && npx next build 2>&1 | tail -5"

# 3. Ensure data + agents dirs exist
ssh "$SERVER" "mkdir -p $REMOTE_DIR/data /root/agents/anyclaw"

# 4. Restart service
echo "🔄 Restarting service..."
ssh "$SERVER" "systemctl restart anyclaw"
sleep 3

# 5. Verify
STATUS=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/agents")
if [ "$STATUS" = "200" ]; then
  echo "✅ Deploy complete! API responding 200"
  echo "🌐 http://157.230.173.91"
else
  echo "⚠️  Deploy finished but API returned $STATUS"
  ssh "$SERVER" "journalctl -u anyclaw --no-pager -n 5"
fi
