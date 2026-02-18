#!/bin/bash
# GMQ EC2 Bootstrap Script
# Runs via user-data on first boot. CDK injects GMQ_PUBLIC_IP and GMQ_DOMAIN_NAME.
set -euxo pipefail
exec > >(tee /var/log/gmq-setup.log) 2>&1

APP_DIR=/opt/gmq
APP_USER=ec2-user
if [[ -z "${GMQ_PUBLIC_IP:-}" ]]; then
  IMDS_TOKEN=$(curl -fsS --connect-timeout 2 -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300" || true)
  if [[ -n "${IMDS_TOKEN}" ]]; then
    GMQ_PUBLIC_IP=$(curl -fsS --connect-timeout 2 -H "X-aws-ec2-metadata-token: ${IMDS_TOKEN}" "http://169.254.169.254/latest/meta-data/public-ipv4" || true)
  else
    GMQ_PUBLIC_IP=$(curl -fsS --connect-timeout 2 "http://169.254.169.254/latest/meta-data/public-ipv4" || true)
  fi
fi

echo "=== [1/8] Swap 2GB (critical for t3.micro 1GB RAM) ==="
if swapon --show=NAME | grep -q '^/swapfile$'; then
  echo "Swapfile already active, skipping creation."
else
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile || true
fi
if ! grep -q '^/swapfile swap swap defaults 0 0$' /etc/fstab; then
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
fi

echo "=== [2/8] System packages ==="
dnf update -y
dnf install -y docker git nginx certbot python3-certbot-nginx

echo "=== [3/8] Node.js 20 + PM2 ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

echo "=== [4/8] Docker + PostgreSQL ==="
systemctl enable --now docker
usermod -aG docker $APP_USER

DB_PASSWORD=""
if docker ps -a --filter "name=^/gmq-postgres$" --format '{{.Names}}' | grep -qx 'gmq-postgres'; then
  echo "PostgreSQL container already exists, reusing it."
  DB_PASSWORD=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' gmq-postgres | sed -n 's/^POSTGRES_PASSWORD=//p' | tail -n 1 || true)
  docker start gmq-postgres >/dev/null 2>&1 || true
fi

if [[ -z "${DB_PASSWORD}" && -f "${APP_DIR}/.env" ]]; then
  DB_PASSWORD=$(sed -n 's#^DATABASE_URL=postgresql://gmq_admin:\([^@]*\)@localhost:5432/goodmathquestions$#\1#p' "${APP_DIR}/.env" | tail -n 1 || true)
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
fi

if ! docker ps -a --filter "name=^/gmq-postgres$" --format '{{.Names}}' | grep -qx 'gmq-postgres'; then
  docker run -d \
    --name gmq-postgres \
    --restart unless-stopped \
    -e POSTGRES_USER=gmq_admin \
    -e "POSTGRES_PASSWORD=${DB_PASSWORD}" \
    -e POSTGRES_DB=goodmathquestions \
    -v pgdata:/var/lib/postgresql/data \
    -p 127.0.0.1:5432:5432 \
    postgres:16-alpine
fi

echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec gmq-postgres pg_isready -U gmq_admin >/dev/null 2>&1; then
    echo "PostgreSQL ready."
    break
  fi
  sleep 2
done

echo "=== [5/8] Clone application ==="
if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Application repo already exists, skipping clone."
else
  git clone https://github.com/gudeming/goodmathquestions.git "$APP_DIR" || {
    echo "ERROR: git clone failed."
    echo "If repo is private, SSH in and clone manually, then run /opt/gmq/scripts/ec2-deploy.sh --init"
    exit 1
  }
fi

echo "=== [6/8] Environment ==="
NEXTAUTH_SECRET=$(openssl rand -base64 32)
SITE_URL=${GMQ_DOMAIN_NAME:+https://$GMQ_DOMAIN_NAME}
SITE_URL=${SITE_URL:-http://$GMQ_PUBLIC_IP}
if [[ -z "${SITE_URL}" || "${SITE_URL}" == "http://" ]]; then
  SITE_URL="http://127.0.0.1"
fi

cat > "$APP_DIR/.env" << EOF
DATABASE_URL=postgresql://gmq_admin:${DB_PASSWORD}@localhost:5432/goodmathquestions
DIRECT_URL=postgresql://gmq_admin:${DB_PASSWORD}@localhost:5432/goodmathquestions
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${SITE_URL}
NODE_ENV=production
EOF

chown -R $APP_USER:$APP_USER "$APP_DIR"

echo "=== [7/8] Build (this takes 5-10 min on t3.micro) ==="
cd "$APP_DIR"
su - $APP_USER -c "cd $APP_DIR && npm install"
su - $APP_USER -c "cd $APP_DIR && npx prisma generate --schema packages/db/prisma/schema.prisma"
su - $APP_USER -c "cd $APP_DIR && npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss"
su - $APP_USER -c "cd $APP_DIR && npx turbo build --filter=@gmq/web"

echo "=== [8/8] Start services ==="

# Systemd service for Next.js
cat > /etc/systemd/system/gmq-web.service << 'SVCEOF'
[Unit]
Description=GoodMathQuestions Web
After=network.target docker.service

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/gmq/apps/web
EnvironmentFile=/opt/gmq/.env
ExecStart=/usr/bin/node /opt/gmq/node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable --now gmq-web

# Nginx — reverse proxy
cat > /etc/nginx/nginx.conf << 'NGXEOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    log_format    main '$remote_addr - $remote_user [$time_local] "$request" '
                       '$status $body_bytes_sent "$http_referer" "$http_user_agent"';
    access_log    /var/log/nginx/access.log main;
    sendfile      on;
    tcp_nopush    on;
    keepalive_timeout 65;
    gzip          on;
    gzip_types    text/plain text/css application/json application/javascript text/xml;

    include /etc/nginx/conf.d/*.conf;
}
NGXEOF

cat > /etc/nginx/conf.d/gmq.conf << 'CONFEOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
CONFEOF

nginx -t
systemctl enable --now nginx

# HTTPS setup (domain required). Falls back to HTTP if certificate issuance fails.
if [[ -n "${GMQ_DOMAIN_NAME:-}" ]]; then
  echo "=== Enabling HTTPS for ${GMQ_DOMAIN_NAME} ==="

  if certbot --nginx --non-interactive --agree-tos --register-unsafely-without-email -d "${GMQ_DOMAIN_NAME}"; then
    cat > /etc/nginx/conf.d/gmq.conf << CONFEOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${GMQ_DOMAIN_NAME};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name ${GMQ_DOMAIN_NAME};
    client_max_body_size 10m;

    ssl_certificate /etc/letsencrypt/live/${GMQ_DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${GMQ_DOMAIN_NAME}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
CONFEOF

    nginx -t
    systemctl reload nginx

    # Keep certs updated.
    systemctl enable --now certbot-renew.timer || systemctl enable --now certbot.timer || true
  else
    echo "WARNING: HTTPS certificate issuance failed. Keeping HTTP-only nginx config."
    SITE_URL="http://${GMQ_DOMAIN_NAME}"
  fi
fi

echo "============================================"
echo "  GMQ Setup Complete!"
echo "  URL: ${SITE_URL}"
echo "  Logs: journalctl -u gmq-web -f"
echo "  Setup log: /var/log/gmq-setup.log"
echo "============================================"
