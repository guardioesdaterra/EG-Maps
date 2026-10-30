#!/usr/bin/env bash
set -euo pipefail

# This helper is Bash-only. On Windows, use Git Bash or run the commands from
# README.md individually in PowerShell.
pnpm supabase:deploy

git add -A
if git diff --cached --quiet; then
  echo "No staged changes; nothing to commit or push."
  exit 0
fi

git commit -m "${COMMIT_MESSAGE:-chore: deploy updates}"
git push
