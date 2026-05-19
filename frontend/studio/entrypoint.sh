#!/bin/sh
set -e

API_URL="${VITE_API_URL:-http://localhost:3000}"

# Inject runtime config into index.html before the first <script> tag
sed -i "s|<script|<script>window.__LOOPSTACK_CONFIG__={apiUrl:\"${API_URL}\"};</script><script|" dist/index.html

exec serve -s dist -l 3000
