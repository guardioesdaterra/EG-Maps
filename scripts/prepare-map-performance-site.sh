#!/usr/bin/env bash
set -euo pipefail

ROOT_OUTPUT=".output"
ROOT_PUBLIC="$ROOT_OUTPUT/public"
SITE_DIR="${MAP_PERF_SITE_DIR:-/tmp/egmaps-map-performance-site}"
BACKUP_DIR="$(mktemp -d /tmp/egmaps-root-build.XXXXXX)"

if [[ ! -f "$ROOT_PUBLIC/index.html" || ! -f "$ROOT_PUBLIC/active-crews/index.html" ]]; then
  pnpm build
fi

rm -rf "$SITE_DIR"
mkdir -p "$SITE_DIR/EG-Maps"
cp -a "$ROOT_PUBLIC/." "$SITE_DIR/"
mv "$ROOT_OUTPUT" "$BACKUP_DIR/output"

restore_root_build() {
  if [[ -d "$BACKUP_DIR/output" ]]; then
    rm -rf "$ROOT_OUTPUT"
    mv "$BACKUP_DIR/output" "$ROOT_OUTPUT"
  fi
  rm -rf "$BACKUP_DIR"
}
trap restore_root_build EXIT INT TERM

env NUXT_APP_BASE_URL=/EG-Maps/ pnpm build
cp -a .output/public/. "$SITE_DIR/EG-Maps/"
restore_root_build
trap - EXIT INT TERM

export MAP_PERF_SITE_DIR="$SITE_DIR"
pnpm exec playwright test --config=playwright.performance.config.ts
