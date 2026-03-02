#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

npx giget@latest github:loopstack-ai/loopstack/frontend/studio studio --force

npx giget@latest github:loopstack-ai/loopstack/templates/app-template backend --force
cd backend && bash scripts/setup.sh

# Install studio and root dependencies (backend installed via app-template setup)
cd "$PROJECT_DIR/studio" && npm install
cd "$PROJECT_DIR" && npm install

echo ""
echo "✅ Loopstack project created successfully!"
echo ""
echo "──────────────────────────────────────────────────"
echo ""
echo "Start:            👉 cd $(basename "$PROJECT_DIR") && npm run start"
echo ""
echo "Loopstack Studio: http://localhost:5173"
echo "Backend API:      http://localhost:8000"
echo ""
echo "──────────────────────────────────────────────────"
