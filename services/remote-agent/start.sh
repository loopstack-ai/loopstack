#!/bin/sh
set -e

# Start PostgreSQL
su - postgres -c "pg_ctlcluster $(pg_lsclusters -h | awk '{print $1}') main start"

# Wait for PostgreSQL to accept connections
until su - postgres -c "pg_isready" > /dev/null 2>&1; do
  sleep 0.5
done

# Set postgres password to match app-template default
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'admin';\""

# Start Redis
redis-server --daemonize yes

# Start agent (which starts NestJS via PM2), then stream PM2 logs to container stdout
node dist/index.js &
AGENT_PID=$!

# Give PM2 a moment to start, then stream its logs
sleep 3
pm2 logs --raw &

# Wait for the agent process
wait $AGENT_PID
