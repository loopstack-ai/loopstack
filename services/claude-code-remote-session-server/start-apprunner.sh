#!/bin/sh
# Entry point for the app-runner image: boot Postgres/Redis, then run the session server in the
# foreground. The application itself is launched by the Engineer workflow via the /exec/stream endpoint
# (so its boot log streams live and the workflow holds a handle to stop it) — not from this script.
set -e

ENABLE_SERVICES=1
export ENABLE_SERVICES
/usr/local/bin/boot-services.sh

exec node dist/index.js
