#!/bin/sh
# Entry point for the agent image: boot conditional services (Postgres/Redis, if ENABLE_SERVICES=1) and
# the conditional inner Docker daemon (dind images only, if ENABLE_DOCKER=1), then run the session server
# in the foreground as PID 1's child.
set -e

/usr/local/bin/boot-services.sh
if [ -x /usr/local/bin/boot-docker.sh ]; then
  /usr/local/bin/boot-docker.sh
fi
exec node dist/index.js
