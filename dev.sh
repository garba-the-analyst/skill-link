#!/usr/bin/env bash
# dev.sh — starts everything needed for local development in one go:
# the local Postgres container, the backend, and the frontend.
#
# Run with: bash dev.sh   (or: npm run dev, from the repo root)
# Stop with: Ctrl+C — this cleans up both dev servers when you do.
set -e

echo "==> Checking for local Postgres..."
if command -v docker &> /dev/null && docker info &> /dev/null; then
  if docker ps --format '{{.Names}}' | grep -q '^skilllink-postgres$'; then
    echo "    skilllink-postgres is already running."
  elif docker ps -a --format '{{.Names}}' | grep -q '^skilllink-postgres$'; then
    echo "    Starting existing skilllink-postgres container..."
    docker start skilllink-postgres > /dev/null
  else
    echo "    Creating skilllink-postgres container (host port 5433)..."
    docker run --name skilllink-postgres \
      -e POSTGRES_USER=skilllink -e POSTGRES_PASSWORD=skilllink -e POSTGRES_DB=skilllink \
      -p 5433:5432 -d postgres > /dev/null
    echo "    Waiting a few seconds for it to accept connections..."
    sleep 3
  fi
else
  echo "    Docker isn't running or isn't installed — skipping."
  echo "    Make sure DATABASE_URL in skilllink-backend/.env points at a database"
  echo "    you've started some other way, or this will fail to connect."
fi

echo
echo "==> Starting backend (http://localhost:3000) and frontend (http://localhost:5173)"
echo "    Press Ctrl+C to stop both."
echo

# Kill both background jobs (and their child processes) when this script
# exits for any reason, including Ctrl+C — otherwise they'd keep running
# in the background after you close this terminal.
trap 'echo; echo "Stopping..."; kill 0' EXIT INT TERM

(cd skilllink-backend && npm run start:dev 2>&1 | sed 's/^/[backend]  /') &
(cd skilllink-frontend && npm run dev 2>&1 | sed 's/^/[frontend] /') &

wait
