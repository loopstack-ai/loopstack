#!/bin/sh
# Entry point for the app-runner image: boot Postgres/Redis, start the application in the background,
# then run the session server in the foreground so /health and the workspace routes (file-explorer, git)
# stay available while a human tests the app.
set -e

ENABLE_SERVICES=1
export ENABLE_SERVICES
/usr/local/bin/boot-services.sh

if [ -n "$APP_RUN_CMD" ]; then
  echo "[app-runner] starting app: $APP_RUN_CMD"
  (cd "$WORKSPACE_ROOT" && sh -c "$APP_RUN_CMD") &
else
  echo "[app-runner] no APP_RUN_CMD set — nothing to run"
fi

exec node dist/index.js
