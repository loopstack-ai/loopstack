#!/bin/bash
set -e

# SAFETY: Disable any push operations
git() {
    if [[ "$1" == "push" ]]; then
        echo "BLOCKED: git push is disabled in this script"
        return 1
    fi
    command git "$@"
}

# Configuration: Add your subprojects here
# Format: "repo_url|target_path|branch"
SUBPROJECTS=(
  "git@github.com:loopstack-ai/cli.git|packages/cli-module|main"
)

# Base branch to create feature branches from
BASE_BRANCH="main"

# Temp directory for cloning
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

CREATED_BRANCHES=()

echo "=========================================="
echo "Will create separate branches from: $BASE_BRANCH"
echo "=========================================="
echo ""

for entry in "${SUBPROJECTS[@]}"; do
    IFS='|' read -r repo_url target_path branch <<< "$entry"

    repo_name=$(basename "$repo_url" .git)
    temp_repo="$TEMP_DIR/$repo_name"
    feature_branch="merge/$repo_name"

    echo ""
    echo "=========================================="
    echo "Processing: $repo_name"
    echo "  URL: $repo_url"
    echo "  Target path: $target_path"
    echo "  Branch: $branch"
    echo "  Feature branch: $feature_branch"
    echo "=========================================="

    # Step 1: Create a fresh branch from base
    command git checkout "$BASE_BRANCH"
    command git checkout -b "$feature_branch"

    # Step 2: Remove existing submodule or directory if it exists
    if [ -f ".gitmodules" ] && grep -q "$target_path" .gitmodules 2>/dev/null; then
        echo "Removing existing submodule at $target_path..."
        command git submodule deinit -f "$target_path" || true
        command git rm -f "$target_path" || true
        rm -rf ".git/modules/$target_path" || true
        command git commit -m "Remove submodule: $target_path" || true
    elif [ -d "$target_path" ]; then
        echo "Removing existing directory at $target_path..."
        command git rm -rf "$target_path"
        command git commit -m "Remove directory: $target_path"
    fi

    # Step 3: Clone the repo
    echo "Cloning $repo_url..."
    command git clone --single-branch --branch "$branch" "$repo_url" "$temp_repo"

    # Step 4: Rewrite history to subdirectory
    echo "Rewriting history to $target_path..."
    cd "$temp_repo"
    git filter-repo --to-subdirectory-filter "$target_path" --force
    cd - > /dev/null

    # Step 5: Add as remote and merge
    echo "Merging into branch $feature_branch..."
    command git remote add "$repo_name" "$temp_repo"
    command git fetch "$repo_name"
    command git merge "$repo_name/$branch" --allow-unrelated-histories --no-edit \
        -m "Merge $repo_name into $target_path with full history"

    # Step 6: Clean up remote
    command git remote remove "$repo_name"

    CREATED_BRANCHES+=("$feature_branch")

    echo "✓ Completed: $repo_name -> $feature_branch"
done

# Return to base branch
command git checkout "$BASE_BRANCH"

echo ""
echo "=========================================="
echo "All subprojects processed!"
echo ""
echo "NOTHING HAS BEEN PUSHED."
echo ""
echo "Created branches:"
for b in "${CREATED_BRANCHES[@]}"; do
    echo "  - $b"
done
echo ""
echo "To review a branch:"
echo "  git log main..<branch-name> --oneline"
echo "  git diff main..<branch-name> --stat"
echo ""
echo "To merge into main one at a time:"
echo "  git checkout main"
echo "  git merge merge/project-a"
echo "  # review, test, etc."
echo "  git merge merge/project-b"
echo "  # ..."
echo ""
echo "To delete a branch if you don't want it:"
echo "  git branch -D <branch-name>"
echo "=========================================="