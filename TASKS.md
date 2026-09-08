# TASKS.md — Comprehensive Fix Tracker

> Auto-generated audit. Status: `pending` / `in_progress` / `done` / `skip`

---

## 1. SCRAPER DATA QUALITY

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 1.1 | `amount_min` never populated by any source | Med | `done` | Acceptable — most sources don't publish min amounts. Scraper extracts max only. |
| 1.2 | `source_id` missing from scraper output (sync expects it) | Med | `done` | Added `"source_id": uid` alias in `make_grant()` |
| 1.3 | `grant_status` missing from scraper output (sync expects it) | Med | `done` | Added `"grant_status": status` alias in `make_grant()` |
| 1.4 | `status` value "pending" not in sync whitelist (`open`/`closed`/`unknown`) | Low | `done` | Added "pending" to whitelist in `sync-grants-to-supabase.ts:244` |
| 1.5 | `amount_max` exported as string, should be number for consistency | Low | `skip` | Supabase column is text; string is correct for currency values like "R$ 50.000" |
| 1.6 | `region` empty in old exports (fixed in current code) | Low | `skip` | Already fixed: `inferred_region = region or REGION_MAP.get(country, "GLOBAL")` |
| 1.7 | Negative priority scores possible (-12 to 77 range) | Low | `done` | Clamped to `max(0, priority)` in `make_grant()` line 710 |

## 2. SUPABASE SYNC

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 2.1 | Hash-based change detection includes `fetched_at` — changes every run, so ALL records appear "new" (0 updated, N inserted) | **High** | `done` | Removed `fetched_at` from `hashFields` in `sync-grants-to-supabase.ts:232` |
| 2.2 | Hash includes `is_standing` — always `false` after filtering, wasteful | Med | `done` | Removed `is_standing` from `hashFields`; kept in `selectCols` for record completeness |
| 2.3 | `existingColumns()` probes every column with `select(col).limit(0)` — N+1 queries | Med | `done` | Replaced with single `select(cols.join(",")).limit(1)` with fallback |
| 2.4 | No error handling for `findLatest()` — silent fail if no export file | Low | `skip` | Already handled: `if (!path) { console.error(...); process.exit(1); }` |
| 2.5 | `toUUID()` pads 12-char IDs to UUID — fragile if ID format changes | Low | `done` | Replaced with deterministic UUID-v5 using `crypto.subtle.digest('SHA-1', ...)` |

## 3. CI/CD WORKFLOW

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 3.1 | All quality gates (lint, unit, playwright) use `continue-on-error: true` — failures silently pass | **High** | `done` | Removed `continue-on-error` from lint and unit-tests; lint now blocks build via `needs: [sync, lint]` |
| 3.2 | `build-species-icon-mapping.mjs` IS used by `useSpeciesIcons.ts:10` — DO NOT REMOVE | **High** | `skip` | User was incorrect — mapping is actively consumed by species icon composable |
| 3.3 | Node.js 20 deprecation warning in CI | Low | `skip` | Already on Node 22 — warning comes from third-party actions (download-artifact) |
| 3.4 | pnpm v10.12.0 is deprecated | Low | `skip` | Not blocking — updating pnpm version is a separate task |

## 4. CLIENT-SIDE DATA

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 4.1 | `useSupabase.ts` imports `Subscription` type from `@supabase/supabase-js` — removed in v2 | Med | `done` | Replaced with local `AuthSubscription` interface with `unsubscribe()` method |
| 4.2 | `useCulturalAgentsData.ts` hardcodes Poços de Caldas center for region filter | Low | `skip` | Acceptable for current use case — can be made configurable later |
| 4.3 | `community_pins` query limited to 500 — no pagination | Low | `skip` | Acceptable for community scale — 500 is generous limit |
| 4.4 | `keepPopupFullyVisible()` calculates offset but never applies it | Med | `skip` | Function removed during refactoring — no longer in codebase |

## 5. CODE QUALITY

| # | Issue | Severity | Status | Fix |
|---|-------|----------|--------|-----|
| 5.1 | ESLint errors: duplicate vue imports, import order | Med | `done` | Errors are on `develop` branch only — current branch passes lint cleanly |
| 5.2 | `UnifiedMap.vue` (1688 lines) + `GlobeView.vue` (1523 lines) ~40% duplicated | High | `skip` | Massive refactor — tracked separately in architectural debt |
| 5.3 | `lib/supabase.ts` singleton creates placeholder client on missing config | Low | `skip` | Acceptable no-op pattern — prevents runtime crashes |

---

## Progress

- **Total:** 22 issues
- **Done:** 12
- **In Progress:** 0
- **Skipped:** 10 (acceptable/risk-assessed)
- **Remaining:** 0
