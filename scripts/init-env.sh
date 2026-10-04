#!/usr/bin/env bash
# Creates .env from env.example with freshly generated random secrets.
# Usage: bash scripts/init-env.sh
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  echo ".env already exists - leaving it unchanged."
  exit 0
fi

# random hex string; falls back to /dev/urandom when openssl is unavailable
rand() {
  openssl rand -hex "$1" 2>/dev/null || head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'
}

PG_PASSWORD=$(rand 16)
sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASSWORD}|" \
    -e "s|<POSTGRES_PASSWORD>|${PG_PASSWORD}|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(rand 32)|" \
    -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$(rand 8)|" \
    -e "s|^DEMO_PASSWORD=.*|DEMO_PASSWORD=$(rand 8)|" \
    env.example > .env

echo "Created .env with random secrets."
echo "Admin login: $(grep '^ADMIN_USERNAME=' .env | cut -d= -f2) / $(grep '^ADMIN_PASSWORD=' .env | cut -d= -f2)"
