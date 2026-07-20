#!/usr/bin/env bash
# Packs the local @loopstack packages into local-packages/ so the Docker image build
# installs the working tree instead of the published registry versions.
#
# Usage (packages must be built first — `npm run build` in the loopstack repo):
#   ./scripts/pack-local-packages.sh
#   docker build -t acceptance-test-agent:latest .
#
# Without tarballs in local-packages/, the image build falls back to the npm registry.
set -euo pipefail

cd "$(dirname "$0")/.."
LOOPSTACK_ROOT="$(cd ../.. && pwd)"
OUT_DIR="$PWD/local-packages"

# Dependency-ordered: contracts → common → core → auth/api → loopstack-module
PACKAGES=(contracts common core auth api loopstack-module)

rm -f "$OUT_DIR"/*.tgz
for pkg in "${PACKAGES[@]}"; do
  pkg_dir="$LOOPSTACK_ROOT/packages/$pkg"
  if [ ! -d "$pkg_dir/dist" ]; then
    echo "ERROR: $pkg_dir/dist missing — run 'npm run build' in the loopstack repo first." >&2
    exit 1
  fi
  echo "Packing @loopstack/$pkg…"
  (cd "$pkg_dir" && npm pack --silent --pack-destination "$OUT_DIR" > /dev/null)
done

echo "Done: $(ls "$OUT_DIR"/*.tgz | wc -l) tarballs in local-packages/"
