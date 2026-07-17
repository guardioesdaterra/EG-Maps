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

### `scraped_grants` (1,464 rows)

Auto-scraped grant opportunities from 60+ sources.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `source_id` | `text` | NO | |
| `title` | `text` | NO | |
| `funder` | `text` | NO | `''` |
| `source` | `text` | NO | |
| `url` | `text` | NO | |
| `description` | `text` | NO | `''` |
| `deadline` | `text` | NO | `''` |
| `amount_max` | `text` | NO | `''` |
| `amount_min` | `text` | NO | `''` |
| `currency` | `text` | NO | `''` |
| `country` | `text` | NO | `''` |
| `region` | `text` | NO | `''` |
| `categories` | `text[]` | YES | `{}` |
| `language` | `text` | NO | `'en'` |
| `relevance` | `integer` | NO | `0` |
| `status` | `text` | NO | `'pending'` |
| `fetched_at` | `timestamp with tz` | NO | `now()` |
| `created_at` | `timestamp with tz` | NO | `now()` |
| `amount_usd` | `numeric` | YES | |
| `deadline_days` | `integer` | YES | |
| `viewed` | `boolean` | YES | |
| `reviewed` | `boolean` | YES | `false` |

Indexes: PK on `id`; Unique on `(source_id, source)`; B-tree on `country`, `deadline`, `fetched_at`, `relevance`, `status`

---

### `grants` (2 rows)

Approved/created grants (promoted from `scraped_grants` or user-submitted).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | `uuid` | NO | `gen_random_uuid()` |
| `title` | `text` | NO | |
| `description` | `text` | NO | |
| `location_name` | `text` | NO | |
| `latitude` | `numeric` | NO | |
| `longitude` | `numeric` | NO | |
| `category` | `text` | NO | `'environment'` |
| `submitted_by` | `uuid` | NO | |
| `status` | `text` | NO | `'pending'` |
| `reviewed_by` | `uuid` | YES | |
| `reviewed_at` | `timestamp with tz` | YES | |
| `rejection_reason` | `text` | YES | |
| `created_at` | `timestamp with tz` | NO | `now()` |
| `updated_at` | `timestamp with tz` | NO | `now()` |
| `source` | `text` | YES | |
| `funder` | `text` | YES | `''` |
| `url` | `text` | YES | `''` |
| `amount_max` | `text` | YES | `''` |
| `amount_min` | `text` | YES | `''` |
| `currency` | `text` | YES | `''` |
| `country` | `text` | YES | `''` |
| `grant_type` | `text` | YES | `'general'` |
| `priority_score` | `integer` | YES | `0` |
| `hidden` | `boolean` | YES | `false` |
| `source_id` | `text` | YES | |
| `reviewed` | `boolean` | YES | |
| `deadline` | `text` | YES | `''` |
| `categories` | `text[]` | YES | `{}` |
| `amount_usd` | `numeric` | YES | |
| `highlights` | `text[]` | YES | `{}` |
| `urgency` | `text` | YES | |
| `deadline_days` | `integer` | YES | |
| `region` | `text` | YES | `''` |

Trigger: `grants_updated_at` → `update_updated_at()` on UPDATE

---

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
| `scraped_grants` | Limited | Yes | Anon (scraper) | - | Yes |
| `grants` | Limited | Own | Own (pending) | Own (pending) | Yes |
| `community_pins` | Yes | Own | Own | Own | Yes |
| `eg_intern_crew_members` | - | Own | - | Own | Yes |
| `grant_comments` | Yes | Own | Own | Own | Yes |
| `grant_votes` | Yes | Own | Own | Own | Yes |
| `grant_decisions` | Yes | - | - | - | Yes |

## Edge Functions

See `docs/API.md` for function endpoints, payloads, and responses.
