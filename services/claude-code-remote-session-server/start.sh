#!/bin/sh
# Entry point for the agent image: boot conditional services (Postgres/Redis, if ENABLE_SERVICES=1),
# then run the session server in the foreground as PID 1's child.
set -e

/usr/local/bin/boot-services.sh
exec node dist/index.js
