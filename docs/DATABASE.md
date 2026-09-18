# Database Schema

Project: `lfyvociptzyhjtrxwhhf`
Tables: 13

## Tables

### `vulcan_observatory` (1,973 rows)

Cultural agents / community pins displayed as map markers.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | `text` | NO | PK |
| `type` | `text` | NO | Always `cultural_agent` |
| `name` | `text` | NO | Agent/venue name |
| `source` | `text` | NO | `minc` or `midia_ninja` |
| `external_id` | `text` | YES | Source-specific ID |
| `latitude` | `double precision` | NO | |
| `longitude` | `double precision` | NO | |
| `single_url` | `text` | YES | External profile URL |
| `status` | `text` | YES | Default `active` |
| `synced_at` | `timestamp with tz` | YES | |
| `created_at` | `timestamp with tz` | YES | |

Indexes: PK on `id`; B-tree on `(latitude, longitude)`, `source`, `type`

---

### `grants` (merged — ex-`scraped_grants`, repopulated by CI scrape)

Single grants table: the old manager-only `grants` table was deleted and
`scraped_grants` renamed to `grants`. One temporal column — `status`
(`open`/`closed`/`expired`/`hidden`) — one text `deadline`, and the v2.6
dual-link pair (`grant_link` = funder page, `source_link` = aggregator page;
**no `url` column** — action URL is `grant_link || source_link`). No review
queue: manual inserts are auto-approved via `manual_inserted=true`. Removed
columns: `url`, `is_standing`, `grant_status`, `deadline_days`,
`deadline_date`, `reviewed/*`, `review_notes`, `review_status`,
`rejection_reason`, `hidden`, `viewed`. Client fetches from Supabase, never
from repo fixtures. Edge logic lives in `supabase/functions/grants/index.ts`.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `source_id` | `text` | YES | scraper uid (`md5(source::url)[:12]`) — natural key with `source` |
| `title` | `text` | YES | |
| `funder` | `text` | NO | `''` |
| `source` | `text` | YES | scraper key (`fundsforngos`, `ycjf`, `manager`, `crew`…) |
| `description` | `text` | NO | `''` |
| `deadline` | `text` | NO | `''` — single deadline column (ISO date or `''` when rolling) |
| `amount_max` | `text` | NO | `''` (raw fragment) |
| `amount_min` | `text` | NO | `''` |
| `currency` | `text` | NO | `''` |
| `country` | `text` | NO | `''` (`GLOBAL` when worldwide) |
| `region` | `text` | NO | `''` |
| `categories` | `text[]` | YES | `{}` |
| `language` | `text` | NO | `'en'` |
| `relevance` | `integer` | NO | `0` |
| `status` | `text` | NO | `'open'` — the ONLY state column: open/closed/expired/hidden |
| `fetched_at` | `timestamp with tz` | NO | `now()` |
| `created_at` | `timestamp with tz` | NO | `now()` |
| `updated_at` | `timestamp with tz` | YES | `now()` (auto via trigger) |
| `amount_usd` | `numeric` | YES | parsed approx. USD |
| `location_name` | `text` | NO | `''` (manager/crew rows) |
| `latitude` / `longitude` | `numeric` | YES | manager/crew rows |
| `category` | `text` | NO | `'environment'` (manager/crew rows) |
| `grant_type` | `text` | NO | `'general'` |
| `grant_types` | `text[]` | YES | `{}` |
| `highlights` | `text[]` | YES | `{}` |
| `urgency` | `text` | YES | urgent/soon/distant/unknown/expired |
| `priority_score` | `integer` | NO | `0` |
| `content_hash` | `text` | YES | dedupe hash |
| `quality_score` | `integer` | NO | `0` — composite 0-100 |
| `url_status` | `text` | NO | `'unchecked'` — ok/broken/login_wall/timeout/blocked/unchecked |
| `url_status_code` | `integer` | YES | |
| `url_checked_at` | `timestamp with tz` | YES | |
| `last_seen_at` | `timestamp with tz` | NO | `now()` |
| `source_link` | `text` | NO | `''` — aggregator page scraped |
| `grant_link` | `text` | NO | `''` — funder/official call URL (homepage-valid since v2.7) |
| `manual_inserted` | `boolean` | NO | `false` — true = manager manual insert (auto-approved) |

Schema history: `supabase/migrations/20260914000000_scraped_grants_v2.sql`
(v2 columns), `supabase/migrations/20260918000000_scraped_grants_links.sql`
(dual-link pair), `scripts/grants-manual-inserted-links.sql`
(`manual_inserted` + review-apparatus removal), then the manual merge
(delete old `grants`, rename `scraped_grants`→`grants`, drop
`url`/`is_standing`/`grant_status`/`deadline_days`/`deadline_date`).

Indexes: PK on `id`; UNIQUE on `(source_id, source)` (sync natural key);
B-tree on `source`, `status`, `country`, `relevance`, `deadline`,
`fetched_at`, `(status, priority_score)`, `quality_score`, `content_hash`,
`url_status`, `last_seen_at`, `manual_inserted`, `grant_link`.

---

*The old manager-only `grants` table and its `review_status` workflow were
deleted in the merge — one `grants` table now (see above), edge logic in
`supabase/functions/grants/index.ts`. `submitted_by` survives on
crew/manager rows. `scripts/add-grants-review-status.sql` is history only.*

### `eg_intern_crew_members` (9 rows)

Crew membership records (active after cleanup).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `user_id` | `uuid` | FK to auth.users |
| `email` | `text` | Unique |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `full_name` | `text` | |
| `role` | `text` | `crew_lead` or `member` |
| `crew_type` | `text` | `leader`, `leader_with_group`, or `member` |
| `is_leader` | `boolean` | |
| `is_active` | `boolean` | |
| `preferred_language` | `text` | |
| `age` | `integer` | |
| `phone_country` | `text` | |
| `phone_number` | `text` | |
| `address_country` | `text` | |
| `address_line1` | `text` | |
| `address_line2` | `text` | |
| `city` | `text` | |
| `state` | `text` | |
| `zip_code` | `text` | |
| `inspiration` | `text` | |
| `training_interest` | `text` | |
| `climate_experience` | `text` | |
| `indigenous_status` | `text` | |
| `tribal_nation` | `text` | |
| `referrer` | `text` | |
| `notes` | `text` | |
| `joined_at` | `timestamp` | |
| `last_seen_at` | `timestamp` | |
| `updated_at` | `timestamp` | |

---

### Other Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `eg_intern_crews` | 246 | Intern crews synced from Google Sheets |
| `eg_sync_telemetry` | 96 | Sheet sync run history |
| `eg_public` | 36 | Public crew directory |
| `grant_decisions` | 3 | Manager review decisions |
| `grant_comments` | 1 | Comments on grants |
| `grant_votes` | 1 | Star ratings (1-8) |
| `grant_views` | 0 | View tracking |
| `observatory_updates` | 0 | Community-submitted updates |
| `alert_subscriptions` | 0 | Alert subscriptions |

## RLS Policies

| Table | Public Read | Auth Read | Auth Insert | Auth Update | Manager Full |
|-------|-------------|-----------|-------------|-------------|--------------|
| `vulcan_observatory` | Yes | Yes | - | - | Yes |
| `grants` | Limited | Yes | Anon (scraper sync) | - | Yes |
| `community_pins` | Yes | Own | Own | Own | Yes |
| `eg_intern_crew_members` | - | Own | - | Own | Yes |
| `grant_comments` | Yes | Own | Own | Own | Yes |
| `grant_votes` | Yes | Own | Own | Own | Yes |
| `grant_decisions` | Yes | - | - | - | Yes |

## Edge Functions

See `docs/API.md` for function endpoints, payloads, and responses.
