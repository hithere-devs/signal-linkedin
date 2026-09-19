#!/bin/bash
set -euxo pipefail
exec > /var/log/mutefeed-bootstrap.log 2>&1

if ! swapon --show | grep -q swapfile; then
  fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=1024
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx rsync ca-certificates curl gnupg certbot python3-certbot-nginx

install -d /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
apt-get update -y
apt-get install -y nodejs

mkdir -p /var/www/mutefeed /opt/mutefeed/server
chown -R ubuntu:ubuntu /var/www/mutefeed /opt/mutefeed

install -m 0644 /dev/null /var/www/mutefeed/index.html
cat > /var/www/mutefeed/index.html <<'HTML'
<!doctype html><title>Mute Feed</title><p>Mute Feed is coming up.</p>
HTML

cat > /etc/nginx/sites-available/mutefeed <<'NGINX'
limit_req_zone $binary_remote_addr zone=score:10m rate=10r/s;

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name mutefeed.lol www.mutefeed.lol _;

    root /var/www/mutefeed;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;

    location = /api/score {
        limit_req zone=score burst=20 nodelay;
        proxy_pass http://127.0.0.1:8787/api/score;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 30s;
    }

    location = /api/health {
        proxy_pass http://127.0.0.1:8787/api/health;
        proxy_http_version 1.1;
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
NGINX

ln -sfn /etc/nginx/sites-available/mutefeed /etc/nginx/sites-enabled/mutefeed
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

cat > /usr/local/bin/mutefeed-issue-cert <<'CERT'
#!/bin/bash
set -euo pipefail
IP="$(curl -fsS --max-time 5 http://checkip.amazonaws.com || true)"
ROOT="$(dig +short mutefeed.lol A | tail -n1 || true)"
WWW="$(dig +short www.mutefeed.lol A | tail -n1 || true)"
if [ -z "$IP" ] || [ -z "$ROOT" ]; then
  echo "DNS not ready yet"
  exit 1
fi
if [ "$ROOT" != "$IP" ]; then
  echo "mutefeed.lol points at $ROOT, instance is $IP"
  exit 1
fi
certbot --nginx -d mutefeed.lol -d www.mutefeed.lol --non-interactive --agree-tos --register-unsafely-without-email --redirect
CERT
chmod +x /usr/local/bin/mutefeed-issue-cert

touch /opt/mutefeed/bootstrap.done
chown ubuntu:ubuntu /opt/mutefeed/bootstrap.done
