#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

npm install

echo ""
echo "✅ Loopstack module created successfully!"
echo ""
echo "──────────────────────────────────────────────────"
echo ""
echo "Build:            👉 cd $(basename "$PROJECT_DIR") && npm run build"
echo "Test:             👉 cd $(basename "$PROJECT_DIR") && npm run test"
echo ""
echo "──────────────────────────────────────────────────"
