#!/usr/bin/env bash
set -euo pipefail

# Fast-forward `develop` to `main` after a release.
# If `develop` is ahead of `main`, open (or reuse) a PR so devs notice.
#
# Required env: GH_TOKEN (with `pull-requests: write` on the calling job).

AHEAD=$(git rev-list --count origin/main..origin/develop)

if [ "$AHEAD" -eq 0 ]; then
  echo "develop has no extra commits — resetting to main"
  git push origin origin/main:refs/heads/develop --force
  exit 0
fi

echo "::warning::develop is $AHEAD commit(s) ahead of main — auto fast-forward skipped. Opening sync PR."

EXISTING=$(gh pr list --base develop --head main --state open --json number --jq '.[0].number')
if [ -n "$EXISTING" ]; then
  echo "Sync PR already open: #$EXISTING — skipping create."
  exit 0
fi

gh pr create \
  --base develop \
  --head main \
  --title "chore: sync main → develop (auto fast-forward failed)" \
  --body "The post-release sync job could not fast-forward \`develop\` to \`main\` because \`develop\` is $AHEAD commit(s) ahead.

Merge this PR to bring the latest release commits from \`main\` into \`develop\`."
