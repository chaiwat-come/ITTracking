#!/bin/sh
# Container start-up: sync the database schema, create the accounts, then start the server.
set -e

n=0
until npx prisma db push --skip-generate --accept-data-loss; do
  n=$((n + 1))
  if [ "$n" -ge 10 ]; then
    echo "Database is not reachable - giving up"
    exit 1
  fi
  echo "Database not ready yet - retrying in 3s ($n/10)"
  sleep 3
done

if [ "$DEMO_MODE" = "true" ]; then
  node scripts/seed-demo.js
else
  node scripts/seed-admin.js
fi

exec node server.js
