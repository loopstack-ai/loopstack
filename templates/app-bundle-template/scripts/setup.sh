#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

npx giget@latest github:loopstack-ai/loopstack/frontend/loopstack-studio studio --force

npx giget@latest github:loopstack-ai/loopstack/templates/app-template backend --force
cd backend && npm run setup
