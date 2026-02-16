#!/bin/bash
# AnyClaw server setup — run once on the server to create systemd service + nginx config
set -e

SERVER="root@157.230.173.91"

echo "🦀 AnyClaw Server Setup"
echo "======================="

# 1. Create systemd service
echo "⚙️  Creating systemd service..."
ssh "$SERVER" 'cat > /etc/systemd/system/anyclaw.service << EOF
[Unit]
Description=AnyClaw - AI Agents for Everyone
After=network.target openclaw.service

[Service]
Type=simple
WorkingDirectory=/opt/anyclaw
ExecStart=/usr/bin/node /opt/anyclaw/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=ANYCLAW_DB_PATH=/opt/anyclaw/data/anyclaw.db
Environment=OPENCLAW_HOST=127.0.0.1
Environment=OPENCLAW_GATEWAY_PORT=18789
Environment=OPENCLAW_API_PORT=3334
Environment=JWT_SECRET=$(openssl rand -hex 32)

[Install]
WantedBy=multi-user.target
EOF'

# 2. Create nginx site config
echo "🌐 Configuring nginx..."
ssh "$SERVER" 'cat > /etc/nginx/sites-available/anyclaw << EOF
server {
    listen 80;
    server_name anyclaw.local _;

    # AnyClaw app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
        proxy_cache_bypass \$http_upgrade;
    }

    # Ops dashboard on /ops path (preserve existing)
    location /ops {
        proxy_pass http://127.0.0.1:8081;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF'

# 3. Enable site (replace default with anyclaw)
ssh "$SERVER" 'ln -sf /etc/nginx/sites-available/anyclaw /etc/nginx/sites-enabled/anyclaw && rm -f /etc/nginx/sites-enabled/default'

# 4. Test and reload nginx
echo "🔍 Testing nginx config..."
ssh "$SERVER" 'nginx -t && systemctl reload nginx'

# 5. Enable and start anyclaw service
echo "🚀 Starting AnyClaw..."
ssh "$SERVER" 'systemctl daemon-reload && systemctl enable anyclaw && systemctl start anyclaw'

# 6. Check status
echo "📊 Status:"
ssh "$SERVER" 'systemctl status anyclaw --no-pager | head -15'

echo ""
echo "✅ Server setup complete!"
echo "🌐 AnyClaw: http://157.230.173.91"
echo "📊 Ops:     http://157.230.173.91:8081"
