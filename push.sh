#!/usr/bin/env bash
set -euo pipefail

# Default flag state
DEPLOY_SUPABASE=false

# 1. Parse optional -s flag
while getopts "s" opt; do
    case "$opt" in
        s)
            DEPLOY_SUPABASE=true
            ;;
        *)
            echo "Usage: $0 [-s] [commit_message]"
            exit 1
            ;;
    esac
done

# 2. Remove parsed flags so $1 becomes your commit message
shift $((OPTIND - 1))

# 3. Use $1 as the commit message, falling back to a default if omitted
COMMIT_MSG="${1:-chore: deploy updates}"

# 4. Run Supabase deploy only if -s was passed
if [ "$DEPLOY_SUPABASE" = true ]; then
    echo "Running Supabase deploy..."
    pnpm supabase:deploy
fi

# 5. Stage, check for changes, commit, and push
git add -A

if git diff --cached --quiet; then
    echo "No staged changes; nothing to commit or push."
    exit 0
fi

git commit -m "$COMMIT_MSG"
git push
