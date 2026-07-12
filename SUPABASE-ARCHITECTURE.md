# Supabase Edge Function Architecture

## Overview

This document defines the Supabase edge function architecture for EG-Maps, including crew member synchronization, grants management, and observatory data operations.

## Database Schema

> **Note**: This schema was introspected from the live database on 2026-07-12. Tables not listed here (e.g. `crew_members`, `roles`, `user_roles`, `members`, `grants_audit`, `mining_processes`, `observatory_contributions`) do not exist in the current database.

### Table: `eg_intern_crew_members`
Crew member registry — stores all Earth Guardians crew members synced from Google Sheets.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| crew_id | uuid | YES | |
| full_name | text | YES | |
| email | text | YES | |
| phone | text | YES | |
| role | text | YES | |
| social | jsonb | YES | '{}'::jsonb |
| is_active | boolean | YES | true |
| joined_at | timestamptz | YES | |
| user_id | uuid | YES | |
| last_seen_at | timestamptz | YES | |
| created_at | timestamptz | YES | now() |
| _uid | text | YES | |
| exposure | text | NO | 'internal'::text |
| region_uid | text | YES | |
| source_spreadsheet_id | text | YES | |
| source_gid | integer | YES | |
| source_sheet_name | text | YES | |
| synced_at | timestamptz | YES | now() |
| first_name | text | YES | |
| last_name | text | YES | |
| preferred_language | text | YES | 'en'::text |
| phone_country | text | YES | |
| phone_number | text | YES | |
| address_country | text | YES | |
| address_line1 | text | YES | |
| address_line2 | text | YES | |
| city | text | YES | |
| state | text | YES | |
| zip_code | text | YES | |
| inspiration | text | YES | |
| training_interest | text | YES | |
| climate_experience | text | YES | |
| indigenous_status | text | YES | 'N/A'::text |
| tribal_nation | text | YES | |
| crew_type | text | YES | 'member'::text |
| is_leader | boolean | YES | false |
| referrer | text | YES | |
| notes | text | YES | |

**Constraints:**
- PK: `eg_intern_crew_members_pkey` (id)
- UNIQUE: `eg_intern_crew_members_email_key` (email)
- FK: `crew_id` → `eg_intern_crews(id)` ON DELETE CASCADE
- FK: `user_id` → `auth.users(id)` ON DELETE SET NULL

**RLS:** Service role only (ALL operations). Anonymous/anauthenticated users cannot access.

---

### Table: `eg_intern_crews`
Crew groups — stores crew metadata (location, contacts, stats).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| crew_name | text | NO | |
| town | text | YES | |
| country | text | YES | |
| region | text | YES | |
| latitude | numeric | YES | |
| longitude | numeric | YES | |
| projects | jsonb | YES | '[]'::jsonb |
| grants_received | jsonb | YES | '[]'::jsonb |
| notes | text | YES | |
| status | text | YES | 'active'::text |
| created_at | timestamptz | YES | now() |
| updated_at | timestamptz | YES | now() |
| region_continent | text | YES | |
| instagram | text | YES | |
| facebook | text | YES | |
| website_blog | text | YES | |
| exposure | text | NO | 'internal'::text |
| synced_at | timestamptz | YES | now() |

**Constraints:**
- PK: `eg_intern_crews_pkey` (id)
- CHECK: `status IN ('active', ...)`
- CHECK: `exposure IN ('internal', ...)`

**RLS:** Service role only (ALL operations).

---

### Table: `eg_public`
Public-facing crew data (subset of eg_intern_crews, published to the map).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| crew_name | text | NO | |
| town | text | YES | |
| country | text | YES | |
| region | text | YES | |
| latitude | numeric | YES | |
| longitude | numeric | YES | |
| status | text | YES | 'active'::text |
| updated_at | timestamptz | YES | now() |

**Constraints:**
- PK: `eg_public_pkey` (id)
- UNIQUE: `eg_public_crew_name_key` (crew_name)

**RLS:**
- `eg_public: anon select` — anyone can SELECT
- `eg_public: service role write` — service_role can ALL

---

### Table: `grants`
Grant opportunities — submitted by crew or scraped from external sources.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| title | text | NO | |
| description | text | NO | |
| location_name | text | NO | |
| latitude | numeric | NO | |
| longitude | numeric | NO | |
| category | text | NO | 'environment'::text |
| submitted_by | uuid | NO | |
| status | text | NO | 'pending'::text |
| reviewed_by | uuid | YES | |
| reviewed_at | timestamptz | YES | |
| rejection_reason | text | YES | |
| created_at | timestamptz | NO | now() |
| updated_at | timestamptz | NO | now() |
| source | text | YES | |
| funder | text | YES | ''::text |
| url | text | YES | ''::text |
| amount_max | text | YES | ''::text |
| amount_min | text | YES | ''::text |
| currency | text | YES | ''::text |
| country | text | YES | ''::text |
| grant_type | text | YES | 'general'::text |
| priority_score | integer | YES | 0 |
| hidden | boolean | YES | false |
| source_id | text | YES | |
| reviewed | boolean | YES | |

**Constraints:**
- PK: `grants_pkey` (id)
- CHECK: `category IN ('environment','social','art','education','health','socioenvironmental','sociocultural','artistic','community')`
- CHECK: `status IN ('pending','open','closed')`

**RLS:**
- `grants: public read open` — anyone can SELECT where status='open' AND hidden=false
- `grants: manager read all` — @earthguardians.org users can SELECT all
- `grants: manager update` — @earthguardians.org users can UPDATE
- `grants: authenticated insert` — authenticated users can INSERT
- `grants_insert_auth` — INSERT allowed only if submitted_by = auth.uid()
- `grants_select_auth` — authenticated users can SELECT
- `grants_update_own_pending` — users can UPDATE own grants with status='pending'

---

### Table: `scraped_grants`
Grants scraped from external sources (awaiting manager review).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| source_id | text | NO | |
| title | text | NO | |
| funder | text | NO | ''::text |
| source | text | NO | |
| url | text | NO | |
| description | text | NO | ''::text |
| deadline | text | NO | ''::text |
| amount_max | text | NO | ''::text |
| amount_min | text | NO | ''::text |
| currency | text | NO | ''::text |
| country | text | NO | ''::text |
| region | text | NO | ''::text |
| categories | text[] | YES | '{}'::text[] |
| language | text | NO | 'en'::text |
| relevance | integer | NO | 0 |
| status | text | NO | 'pending'::text |
| fetched_at | timestamptz | NO | now() |
| created_at | timestamptz | NO | now() |
| amount_usd | numeric | YES | |
| deadline_days | integer | YES | |
| viewed | boolean | YES | |
| reviewed | boolean | YES | false |

**Constraints:**
- PK: `scraped_grants_pkey` (id)
- CHECK: `status IN ('pending','open','closed','hidden')`

**RLS:**
- `scraped_grants: public read open` — anyone can SELECT where status != 'hidden'
- `scraped_grants: manager read all` — @earthguardians.org can SELECT all
- `scraped_grants: manager update` — @earthguardians.org can UPDATE
- `scraped_insert_anon` — anyone can INSERT
- `scraped_select_auth` — authenticated users can SELECT

---

### Table: `grant_decisions`
Audit log of manager decisions on grants.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| grant_id | uuid | NO | |
| manager_id | uuid | NO | |
| decision | text | NO | |
| notes | text | YES | |
| created_at | timestamptz | NO | now() |

**Constraints:**
- PK: `grant_decisions_pkey` (id)
- CHECK: `decision IN ('approved','rejected','closed','hidden','shown')`
- FK: `grant_id` → `grants(id)` ON DELETE CASCADE

**RLS:**
- `decisions_select_auth` — authenticated users can SELECT

---

### Table: `grant_votes`
Community voting on grants (1–8 stars, one vote per user per grant).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| grant_id | uuid | NO | |
| voter_id | uuid | NO | |
| stars | integer | NO | |
| created_at | timestamptz | NO | now() |

**Constraints:**
- PK: `grant_votes_pkey` (id)
- UNIQUE: `grant_votes_grant_id_voter_id_key` (grant_id, voter_id)
- FK: `grant_id` → `grants(id)` ON DELETE CASCADE
- CHECK: `stars BETWEEN 1 AND 8`

**RLS:**
- `votes_select_auth` — authenticated users can SELECT
- `votes_insert_update_own` — INSERT allowed only if voter_id = auth.uid()
- `votes_update_own` — UPDATE allowed only if voter_id = auth.uid()
- `votes_delete_own` — DELETE allowed only if voter_id = auth.uid()

---

### Table: `grant_comments`
User comments on grants.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| grant_id | text | NO | |
| user_id | uuid | YES | |
| email | text | NO | |
| author_name | text | YES | ''::text |
| content | text | NO | |
| created_at | timestamptz | YES | now() |

**Constraints:**
- PK: `grant_comments_pkey` (id)
- CHECK: `content` length/format constraint

**RLS:**
- `Comments: public read` — anyone can SELECT
- `Comments: auth insert` — authenticated users can INSERT (requires user_id = auth.uid())
- `Comments: own delete` — authenticated users can DELETE own comments
- `Comments: service role full access` — service_role can ALL

---

### Table: `grant_views`
View tracking for grants.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| grant_id | uuid | NO | |
| viewer_id | uuid | YES | |
| viewed_at | timestamptz | NO | now() |

**Constraints:**
- PK: `grant_views_pkey` (id)
- FK: `grant_id` → `grants(id)` ON DELETE CASCADE

**RLS:**
- `views_select_auth` — authenticated users can SELECT
- `views_insert_auth` — authenticated users can INSERT

---

### Table: `observatory_updates`
Community-submitted observatory updates (eco-cultural observations).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES | |
| user_email | text | YES | |
| user_name | text | YES | |
| update_type | text | NO | |
| description | text | NO | |
| location_name | text | YES | |
| lat | double precision | YES | |
| lng | double precision | YES | |
| photo_base64 | text[] | YES | '{}'::text[] |
| photo_count | integer | YES | |
| synced | boolean | YES | false |
| created_at | timestamptz | NO | now() |

**Constraints:**
- PK: `observatory_updates_pkey` (id)
- CHECK: `update_type IN (...)` — specific update types enforced

**RLS:**
- `updates_select_public` — anyone can SELECT
- `updates_insert_auth` — authenticated users can INSERT (user_id = auth.uid())
- `updates_update_own` — users can UPDATE own updates
- `updates_delete_own` — users can DELETE own updates

---

### Table: `vulcan_observatory`
Cultural agents data (synced from external sources for the observatory map).

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | text | NO | |
| type | text | NO | |
| name | text | NO | |
| source | text | NO | |
| external_id | text | YES | |
| latitude | double precision | NO | |
| longitude | double precision | NO | |
| single_url | text | YES | |
| status | text | YES | 'active'::text |
| synced_at | timestamptz | YES | now() |
| created_at | timestamptz | YES | now() |

**Constraints:**
- PK: `vulcan_observatory_pkey` (id)
- CHECK: `type IN (...)` validation
- CHECK: `latitude` range
- CHECK: `longitude` range

**RLS:**
- `Vulcan observatory: public read` — anyone can SELECT
- `Vulcan observatory: service role write` — service_role can ALL

---

### Table: `eg_sync_telemetry`
Sync job telemetry for Google Sheets imports.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| run_id | text | NO | |
| sheet_name | text | YES | |
| started_at | timestamptz | YES | |
| finished_at | timestamptz | YES | |
| duration_ms | integer | YES | |
| status | text | YES | |
| rows_total | integer | YES | 0 |
| rows_synced | integer | YES | 0 |
| rows_skipped | integer | YES | 0 |
| rows_errored | integer | YES | 0 |
| columns_created | text[] | YES | '{}'::text[] |
| tables_touched | text[] | YES | '{}'::text[] |
| errors | jsonb | YES | '[]'::jsonb |

**Constraints:**
- PK: `eg_sync_telemetry_pkey` (run_id)

**RLS:**
- `Service only` — open to all (no auth enforcement)

---

### Table: `alert_subscriptions`
User subscriptions for location-based alerts.

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES | |
| email | text | NO | |
| lat | double precision | NO | |
| lng | double precision | NO | |
| radius_km | double precision | NO | 45 |
| phase_filter | text[] | YES | '{}'::text[] |
| active | boolean | YES | true |
| created_at | timestamptz | NO | now() |

**RLS:**
- `subscriptions_select_own` — authenticated users can SELECT own
- `subscriptions_insert_auth` — authenticated users can INSERT
- `subscriptions_delete_own` — authenticated users can DELETE own

## Row Level Security (RLS) Policies

RLS policies are documented per-table in the Database Schema section above. The key principles are:

- **Service role** (`auth.role() = 'service_role'`) bypasses all RLS — used by Edge Functions via `getAdminClient()`
- **@earthguardians.org email domain** — manager access for grants tables (checked via JWT email claim)
- **`auth.uid()` ownership** — users can only modify their own records
- **Public tables** (`eg_public`, `vulcan_observatory`, `observatory_updates`) — open SELECT for anon users

## Edge Functions

All Edge Functions are deployed under project `lfyvociptzyhjtrxwhhf`. Source code is in `supabase/functions/<name>/`. The `_shared/` directory is not auto-deployed — each function must import from it via relative path.

### 1. `crew-sync`

**Purpose**: Verify crew membership, register new crew members, and sync crew data.

**Actions** (via URL query param `?action=`):
- `check` (default) — verify JWT and return crew member status from `eg_intern_crew_members`
- `register` — create new crew member record from sign-up form

**Imports**: `../_shared/auth.ts` for auth helpers + CORS headers.

**Key tables**: `eg_intern_crew_members`

### 2. `is-manager`

**Purpose**: Check if the authenticated user has a @earthguardians.org email (manager).

**Source**: `supabase/functions/is-manager/index.ts`

### 3. `grants`

**Purpose**: Unified grants CRUD — list, submit, manage, vote, leaderboard, comments.

**Actions** (via URL query param `?action=`):
- `list` — list grants (supports filters: status, source_table)
- `submit` — submit a new grant from a crew member
- `manage` — approve/reject/hide/show/close/edit/merge grants (manager-only)
- `vote` — upvote/downvote grants (authenticated users)
- `leaderboard` — ranked list of grants by priority_score
- `comment` — add/list/delete comments on grants

**Source**: `supabase/functions/grants/index.ts`

**Key tables**: `grants`, `scraped_grants`, `grant_decisions`, `grant_votes`, `grant_comments`

### 4. `crews-create`

**Purpose**: Create new crew member records from sign-up forms.

**Source**: `supabase/functions/crews-create/index.ts`

### 5. `register-pin`

**Purpose**: Register community pins and batch-sync cultural agents via service role.

**Source**: `supabase/functions/register-pin/index.ts`

## Deployment Scripts

### Initial Setup

```bash
#!/bin/bash
# deploy-supabase.sh

# Link to Supabase project
supabase link --project-ref <project-id>

# Run migrations
supabase db push

# Deploy edge functions
supabase functions deploy crew-sync
supabase functions deploy grants-submit
supabase functions deploy grants-review
supabase functions deploy observatory-contributions

# Set environment variables
supabase secrets set SUPABASE_URL=<url>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

### Scheduled Sync

```bash
# Add to crontab for daily sync
0 2 * * * supabase functions invoke crew-sync
```

## Migration from Static Data

### Step 1: Initial Import

```typescript
// scripts/import-crew-data.ts
import { createClient } from '@supabase/supabase-js'
import crewData from '../lib/crew-data.json'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function importData() {
  for (const crew of crewData.crews) {
    await supabase.from('crew_members').upsert({
      crew_id: crew.id,
      crew_name: crew.name,
      // ... map all fields
    }, { onConflict: 'crew_id' })
  }
}

importData()
```

### Step 2: Update App to Use Supabase

```typescript
// composables/useCrewData.ts
export function useCrewData() {
  const supabase = useSupabase()

  async function fetchCrews() {
    const { data, error } = await supabase
      .from('crew_members')
      .select('*')
      .eq('is_active', true)
    
    return data || []
  }

  async function updateCrew(id: string, updates: Partial<Crew>) {
    const { data, error } = await supabase
      .from('crew_members')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    return { data, error }
  }

  return { fetchCrews, updateCrew }
}
```

### Step 3: Remove Static Data

Once Supabase is fully integrated:

1. Remove `lib/crew-data.ts`
2. Update all imports to use `useCrewData()` composable
3. Add loading states and error handling
4. Implement offline fallback if needed

## Monitoring and Logging

### Database Metrics

```sql
-- Query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Recent slow queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Table bloat
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Observatory Contributions

```sql
ALTER TABLE observatory_contributions ENABLE ROW LEVEL SECURITY;

-- Public read access for verified contributions
CREATE POLICY "Public read verified" ON observatory_contributions
  FOR SELECT USING (verified = true);

-- Authenticated users can read all contributions
CREATE POLICY "Authenticated read all" ON observatory_contributions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert contributions
CREATE POLICY "Authenticated insert own" ON observatory_contributions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

-- Submitters can update their own unverified contributions
CREATE POLICY "Submitters update own unverified" ON observatory_contributions
  FOR UPDATE USING (
    submitted_by = auth.uid()
    AND verified = false
  );

-- Admins can verify and manage all contributions
CREATE POLICY "Admins full access" ON observatory_contributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name = 'admin'
    )
  );
```

### Edge Function Logging

```typescript
// supabase/functions/_shared/logger.ts
export function log(level: string, message: string, data?: any) {
  const timestamp = new Date().toISOString()
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  }))
}

export function info(message: string, data?: any) {
  log('INFO', message, data)
}

export function error(message: string, data?: any) {
  log('ERROR', message, data)
}
```

## Security Considerations

1. **RLS everywhere**: All tables have RLS enabled
2. **Audit logging**: All changes tracked in `*_audit` tables
3. **JWT verification**: All edge functions verify tokens
4. **Rate limiting**: Implement via Supabase Edge Function headers
5. **Input validation**: Server-side validation for all inputs
6. **File upload scanning**: Virus scan before storage
7. **Secrets management**: Use Supabase secrets, not env vars

## Performance Optimization

1. **Indexes**: Comprehensive indexes for common queries
2. **Connection pooling**: Use Supabase connection pool
3. **Caching**: Implement Redis for frequently accessed data
4. **Pagination**: Use cursor-based pagination for large datasets
5. **Batch operations**: Batch inserts/updates where possible
6. **Materialized views**: For complex aggregations