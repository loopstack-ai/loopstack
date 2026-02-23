#!/bin/bash

# Configuration
API_URL="http://localhost:8000/api-json"
API_CLIENT_PATH="../../frontend/api-client"

# Generate with incremented version
openapi-generator-cli generate \
  -i $API_URL \
  -g typescript-axios \
  -o $API_CLIENT_PATH \
  -c openapi-generator-config.json
