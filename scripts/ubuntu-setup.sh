#!/bin/bash
# GMQ Ubuntu Bootstrap Script
#
# Provisions a bare Ubuntu 22.04/24.04 host into a working GMQ server:
# Node 20 + nginx + Docker(Postgres/Redis) + systemd + optional HTTPS.
#
# Usage (as a sudo-capable non-root user, e.g. `ubuntu`):
#   ./scripts/ubuntu-setup.sh
#   GMQ_DOMAIN_NAME=goodmathquestions.com ./scripts/ubuntu-setup.sh
#
# Idempotent: safe to re-run. Existing containers, certs and the database
# password are reused rather than regenerated.
#
# NOTE ON HTTPS: certificate issuance uses the HTTP-01 challenge on port 80, so
# it succeeds even when 443 is still closed at the cloud firewall. The redirect
# to HTTPS is only enabled after 443 is confirmed reachable — otherwise the site
# would redirect visitors to an unreachable port.
set -euo pipefail

APP_DIR=${GMQ_APP_DIR:-/opt/gmq}
APP_USER=${GMQ_APP_USER:-$(id -un)}
REPO_URL=${GMQ_REPO_URL:-https://github.com/gudeming/goodmathquestions.git}
DOMAIN=${GMQ_DOMAIN_NAME:-}
NODE_MAJOR=20

if [[ "$APP_USER" == "root" ]]; then
  echo "Refusing to run as root: the app runs as an unprivileged user." >&2
  echo "Create one, give it sudo, and re-run as that user." >&2
  exit 1
fi

log() { echo -e "\n=== $* ==="; }

log "[1/9] Swap (a 2GB box cannot build Next.js without it)"
if ! swapon --show=NAME --noheadings | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "Created 2GB swapfile."
else
  echo "Swap already active: $(swapon --show=NAME,SIZE --noheadings | tr '\n' ' ')"
fi

log "[2/9] System packages"
sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
  ca-certificates curl git nginx certbot python3-certbot-nginx

log "[3/9] Docker"
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
fi
sudo systemctl enable --now docker
sudo usermod -aG docker "$APP_USER" || true

log "[4/9] Node.js ${NODE_MAJOR}"
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs
fi
echo "node $(node -v) / npm $(npm -v)"

log "[5/9] PostgreSQL + Redis (loopback-bound)"
if ! sudo docker ps -a --format '{{.Names}}' | grep -qx gmq-postgres; then
  DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
  sudo docker run -d --name gmq-postgres --restart unless-stopped \
    -e POSTGRES_USER=gmq_admin -e "POSTGRES_PASSWORD=${DB_PASSWORD}" \
    -e POSTGRES_DB=goodmathquestions \
    -v pgdata:/var/lib/postgresql/data \
    -p 127.0.0.1:5432:5432 postgres:16-alpine >/dev/null
  echo "Created gmq-postgres."
else
  DB_PASSWORD=$(sudo docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' gmq-postgres \
    | sed -n 's/^POSTGRES_PASSWORD=//p' | tail -1)
  sudo docker start gmq-postgres >/dev/null 2>&1 || true
  echo "Reusing existing gmq-postgres."
fi

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "FATAL: could not determine the database password." >&2
  exit 1
fi

if ! sudo docker ps -a --format '{{.Names}}' | grep -qx gmq-redis; then
  sudo docker run -d --name gmq-redis --restart unless-stopped \
    -v redisdata:/data -p 127.0.0.1:6379:6379 redis:7-alpine >/dev/null
  echo "Created gmq-redis."
else
  sudo docker start gmq-redis >/dev/null 2>&1 || true
  echo "Reusing existing gmq-redis."
fi

echo "Waiting for PostgreSQL..."
for _ in $(seq 1 30); do
  if sudo docker exec gmq-postgres pg_isready -U gmq_admin >/dev/null 2>&1; then break; fi
  sleep 2
done
sudo docker exec gmq-postgres pg_isready -U gmq_admin

log "[6/9] Application code"
sudo mkdir -p "$APP_DIR"
sudo chown "$APP_USER:$APP_USER" "$APP_DIR"
if [[ -d "$APP_DIR/.git" ]]; then
  git -C "$APP_DIR" pull --ff-only origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

# Preserve NEXTAUTH_SECRET across re-runs: rotating it logs every user out.
if [[ -f "$APP_DIR/.env" ]]; then
  NEXTAUTH_SECRET=$(sed -n 's/^NEXTAUTH_SECRET=//p' "$APP_DIR/.env" | tail -1)
fi
NEXTAUTH_SECRET=${NEXTAUTH_SECRET:-$(openssl rand -base64 32)}
SITE_URL=${DOMAIN:+https://$DOMAIN}
SITE_URL=${SITE_URL:-http://$(curl -fsS --connect-timeout 5 https://api.ipify.org || echo 127.0.0.1)}

cat > "$APP_DIR/.env" <<EOF
DATABASE_URL=postgresql://gmq_admin:${DB_PASSWORD}@localhost:5432/goodmathquestions
DIRECT_URL=postgresql://gmq_admin:${DB_PASSWORD}@localhost:5432/goodmathquestions
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
NEXTAUTH_URL=${SITE_URL}
NODE_ENV=production
EOF
chmod 600 "$APP_DIR/.env"

log "[7/9] Install, migrate, build"
cd "$APP_DIR"
set -a; . "$APP_DIR/.env"; set +a
npm install --no-audit --no-fund
npx prisma generate --schema packages/db/prisma/schema.prisma
npx prisma db push --schema packages/db/prisma/schema.prisma --accept-data-loss
if [[ "$(sudo docker exec gmq-postgres psql -U gmq_admin -d goodmathquestions -tAc 'select count(*) from "Question"')" == "0" ]]; then
  npm run db:seed
fi
NODE_OPTIONS="--max-old-space-size=1400" npx turbo build --filter=@gmq/web

log "[8/9] systemd service"
sudo tee /etc/systemd/system/gmq-web.service >/dev/null <<SVC
[Unit]
Description=GoodMathQuestions Web
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}/apps/web
EnvironmentFile=${APP_DIR}/.env
ExecStart=/usr/bin/node ${APP_DIR}/node_modules/next/dist/bin/next start -p 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
sudo systemctl daemon-reload
sudo systemctl enable --now gmq-web
sudo systemctl restart gmq-web

for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -m 5 http://127.0.0.1:3000/; then break; fi
  sleep 2
done
curl -fsS -o /dev/null -m 10 http://127.0.0.1:3000/ && echo "App responding on :3000"

log "[9/9] nginx"
write_nginx_conf() {
  # $1 = "redirect" to force HTTPS on port 80, anything else to serve over HTTP
  local port80_body
  if [[ "$1" == "redirect" ]]; then
    port80_body="    location / { return 301 https://${DOMAIN}\$request_uri; }"
  else
    port80_body="    location / {
$(proxy_block)
    }"
  fi

  local tls_block=""
  if [[ -n "$DOMAIN" && -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    tls_block="
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    client_max_body_size 10m;

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security \"max-age=31536000\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

    location / {
$(proxy_block)
    }
}"
  fi

  sudo tee /etc/nginx/sites-available/gmq >/dev/null <<CONF
map \$http_upgrade \$connection_upgrade {
    default upgrade;
    ''      close;
}
${tls_block}
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name ${DOMAIN:-_} ${DOMAIN:+www.$DOMAIN} _;
    client_max_body_size 10m;

    # Must stay reachable over plain HTTP for certificate renewal.
    location /.well-known/acme-challenge/ { root /var/www/html; }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;

${port80_body}
}
CONF
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo ln -sf /etc/nginx/sites-available/gmq /etc/nginx/sites-enabled/gmq
  sudo nginx -t
  sudo systemctl reload nginx
}

proxy_block() {
  cat <<'PROXY'
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
PROXY
}

sudo systemctl enable --now nginx
write_nginx_conf http

if [[ -n "$DOMAIN" ]]; then
  log "HTTPS for ${DOMAIN}"
  if [[ ! -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    # No --redirect: 443 may still be closed at the cloud firewall.
    sudo certbot --nginx --non-interactive --agree-tos \
      --register-unsafely-without-email \
      -d "${DOMAIN}" -d "www.${DOMAIN}" || echo "WARNING: certificate issuance failed; staying on HTTP."
  fi

  if [[ -d "/etc/letsencrypt/live/${DOMAIN}" ]]; then
    write_nginx_conf http   # rewrite our own config; certbot may have rewritten it
    if curl -fsS -o /dev/null -m 10 "https://${DOMAIN}/" 2>/dev/null; then
      write_nginx_conf redirect
      echo "443 reachable — HTTPS redirect enabled."
    else
      cat >&2 <<'WARN'

WARNING: the certificate is installed but port 443 is not reachable from the
public internet. Open inbound 443 in your cloud security group, then re-run
this script to enable the HTTP -> HTTPS redirect. Serving over HTTP until then.
WARN
    fi
  fi
fi

log "Done"
echo "  Local:  http://127.0.0.1:3000"
echo "  Public: ${SITE_URL}"
echo "  Logs:   journalctl -u gmq-web -f"
echo "  Deploy: ${APP_DIR}/scripts/ec2-deploy.sh"
echo "  Admin:  node scripts/set-admin.mjs create <username> <email>"
