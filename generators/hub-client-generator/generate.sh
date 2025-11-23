#!/bin/bash

# Configuration
API_URL="http://localhost:8002/api-json"
API_CLIENT_PATH="../../frontend/hub-client"

# Get current version and increment patch
CURRENT_VERSION=$(node -p "require('$API_CLIENT_PATH/package.json').version" 2>/dev/null || echo "0.0.0")
NEW_VERSION=$(node -p "
  const v = '$CURRENT_VERSION'.split('.');
  v[2] = parseInt(v[2]) + 1;
  v.join('.');
")

# Generate with incremented version
openapi-generator-cli generate \
  -i $API_URL \
  -g typescript-axios \
  -o $API_CLIENT_PATH \
  -c openapi-generator-config.json \
  --additional-properties=npmVersion=$NEW_VERSION