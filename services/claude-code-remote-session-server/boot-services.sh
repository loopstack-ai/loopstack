#!/bin/sh
# Conditionally boot Postgres + Redis inside the container so a coding agent (or the app-runner image)
# can start the application for a manual test. No-op unless ENABLE_SERVICES=1. The services are always
# local, blank, and die with the container — never shared, never persisted.
set -e

if [ "$ENABLE_SERVICES" != "1" ]; then
  exit 0
fi

echo "[boot-services] starting postgres + redis"

# apt installs a version-specific `main` cluster; pg_lsclusters -h prints its version in column 1.
CLUSTER=$(pg_lsclusters -h | awk '{print $1}')
su - postgres -c "pg_ctlcluster ${CLUSTER} main start"
until su - postgres -c "pg_isready" >/dev/null 2>&1; do sleep 0.5; done
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'admin';\""

DB_NAME="${POSTGRES_DB:-app}"
su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || createdb '${DB_NAME}'"

redis-server --daemonize yes

echo "[boot-services] postgres (db=${DB_NAME}) + redis ready"
