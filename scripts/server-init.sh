#!/usr/bin/env bash
# Aravow first-boot hardening + Docker install for Contabo Cloud VPS 4 (Ubuntu 24.04).
# Run ONCE as root over SSH:  bash scripts/server-init.sh
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Run as root." >&2; exit 1; fi

echo "==> Updating system…"
apt-get update -y
apt-get upgrade -y

echo "==> Creating deploy user…"
if ! id deploy >/dev/null 2>&1; then adduser --disabled-password --gecos "" deploy; fi
usermod -aG sudo,docker deploy 2>/dev/null || usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh && chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys && chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo "==> Installing Docker…"
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git ufw fail2ban
  systemctl enable --now docker
fi
usermod -aG docker deploy || true

echo "==> Configuring firewall (22/80/443 only)…"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Hardening SSH (key-only, no root password login)…"
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak.$(date +%F) || true
sed -i -E 's/^#?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i -E 's/^#?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i -E 's/^#?ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd

echo "==> Done. Next:"
echo "    1) Add your SSH key: ssh-copy-id deploy@185.218.125.40  (from your PC)"
echo "    2) Reconnect as deploy and clone the repo."
