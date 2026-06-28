# Supabase Architecture — EG-Maps

## Stack

| Layer | Tech |
|-------|------|
| Client SDK | `@supabase/supabase-js` v2 (browser only) |
| Auth | Google OAuth (`@earthguardians.org` = manager) |
| DB | PostgreSQL via Supabase |
| Business Logic | Edge Functions (Deno) |
| RLS | Row Level Security on every table |

**Rule: All DB access goes through Edge Functions. Zero direct client→DB.**

---

## Database Schema

```sql
-- Crew members (synced from local crew-data.ts email list)
create table crews (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  region text not null default '',
  role text not null default 'member' check (role in ('member','manager')),
  created_at timestamptz not null default now()
);

-- Worldwide socio-environmental grants
create table grants (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  location_name text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  category text not null default 'environment' check (category in ('environment','social','art','education','health')),
  submitted_by uuid not null references crews(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references crews(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

-- Audit trail for manager decisions
create table grant_decisions (
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references grants(id) on delete cascade,
  manager_id uuid not null references crews(id),
  decision text not null check (decision in ('approved','rejected')),
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_grants_status on grants(status);
create index idx_grants_submitted by on grants(submitted_by);
create index idx_crews_email on crews(email);
```

---

## Row Level Security

```sql
alter table crews enable row level security;
alter table grants enable row level security;
alter table grant_decisions enable row level security;

-- Crews: any logged-in user can read; only self can update
create policy "crews_select" on crews for select using (auth.role() = 'authenticated');
create policy "crews_update_self" on crews for update using (id = auth.uid());

-- Grants: any logged-in user can read; only own pending grants can update
create policy "grants_select" on grants for select using (auth.role() = 'authenticated');
create policy "grants_insert" on grants for insert with check (submitted_by = auth.uid());
create policy "grants_update_own" on grants for update using (
  submitted_by = auth.uid() AND status = 'pending'
);

-- Decisions: managers only
create policy "decisions_manager" on grant_decisions
  for all using (
    exists (select 1 from crews where id = auth.uid() and role = 'manager')
  );

-- Managers can update any grant status
create policy "grants_manager_update" on grants for update using (
  exists (select 1 from crews where id = auth.uid() and role = 'manager')
);
```

---

## Google OAuth Flow

### 1. Supabase Dashboard
- Authentication → Providers → Google → Enable
- Client ID + Secret from Google Cloud Console
- Redirect URL: `https://<ref>.supabase.co/auth/v1/callback`

### 2. Client Login
```ts
const supabase = createClient(url, key)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + '/auth/callback',
    queryParams: { hd: 'earthguardians.org' }  // restrict to org domain
  }
})
```

### 3. Callback (`/auth/callback`)
```ts
// Exchange code for session
await supabase.auth.exchangeCodeForSession(code)

// Get user email
const { data: { user } } = await supabase.auth.getUser()

// Call Edge Function to upsert into crews table
await supabase.functions.invoke('crew-sync', {
  body: { email: user.email, name: user.user_metadata.full_name }
})
```

### 4. Role Detection
- `@earthguardians.org` email → **manager** (can approve/reject grants)
- Any other email → **member** (can submit grants, view status)

---

## Edge Functions

**All DB operations go through Edge Functions. Client never touches DB directly.**

### `crew-sync` — Register/login crew member
```
POST /functions/v1/crew-sync
Body: { email, name }
→ Upserts into crews table
→ Returns { id, role, name, region }
```
- Auth: user JWT (validates logged-in user)
- Checks if email exists in local crew database
- If not found → rejects registration

### `grants-list` — List grants
```
GET /functions/v1/grants-list?status=pending&page=1
→ Returns { grants: [...], total: number }
```
- Auth: user JWT
- Any logged-in user can read
- Filter by status, paginated

### `grants-submit` — Submit new grant
```
POST /functions/v1/grants-submit
Body: { title, description, location_name, latitude, longitude, category }
→ Creates grant with status=pending
→ Returns { grant: {...} }
```
- Auth: user JWT
- submitted_by = auth.uid()

### `grants-review` — Manager approves/rejects
```
POST /functions/v1/grants-review
Body: { grant_id, decision: 'approved'|'rejected', notes? }
→ Updates grant status
→ Creates decision record
→ Returns { grant: {...} }
```
- Auth: user JWT
- Verifies role = 'manager'
- Creates audit trail in grant_decisions

### `grants-stats` — Public statistics
```
GET /functions/v1/grants-stats
→ Returns { pending, approved, rejected, total }
```
- Auth: none (public endpoint)

---

## Edge Function Example: `grants-submit`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { title, description, location_name, latitude, longitude, category } = body

  // Validate required fields
  if (!title || !description || !location_name || latitude == null || longitude == null) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // Insert via service client (bypasses RLS for insert, but we set submitted_by = user)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data, error } = await admin.from('grants').insert({
    title,
    description,
    location_name,
    latitude,
    longitude,
    category: category || 'environment',
    submitted_by: user.id,
    status: 'pending'
  }).select().single()

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 })

  return new Response(JSON.stringify({ grant: data }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

---

## Client-Side Usage

### Composable: `useSupabaseAuth`
```ts
// composables/useSupabaseAuth.ts
export function useSupabaseAuth() {
  const client = useSupabaseClient()  // from @nuxtjs/supabase
  const user = useSupabaseUser()

  const isManager = computed(() =>
    user.value?.email?.endsWith('@earthguardians.org') ?? false
  )

  async function signIn() {
    await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        queryParams: { hd: 'earthguardians.org' }
      }
    })
  }

  async function signOut() {
    await client.auth.signOut()
    navigateTo('/')
  }

  return { user, isManager, signIn, signOut }
}
```

### Composable: `useGrants`
```ts
// composables/useGrants.ts
export function useGrants() {
  const client = useSupabaseClient()

  async function listGrants(status?: string, page = 1) {
    const { data, error } = await client.functions.invoke('grants-list', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    return { data, error }
  }

  async function submitGrant(grant: GrantInput) {
    const { data, error } = await client.functions.invoke('grants-submit', {
      body: grant
    })
    return { data, error }
  }

  async function reviewGrant(grantId: string, decision: 'approved' | 'rejected', notes?: string) {
    const { data, error } = await client.functions.invoke('grants-review', {
      body: { grant_id: grantId, decision, notes }
    })
    return { data, error }
  }

  return { listGrants, submitGrant, reviewGrant }
}
```

---

## Deployment

### Supabase CLI
```bash
supabase init
supabase db push                    # Apply migrations
supabase functions deploy           # Deploy all Edge Functions
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

### Nuxt (client)
```bash
# .env
NUXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=<anon-key>
```

---

## Security Checklist

- [x] All DB access through Edge Functions (never direct)
- [x] RLS enabled on all tables
- [x] Google OAuth restricted to `@earthguardians.org` domain via `hd` param
- [x] Manager role verified server-side in Edge Functions
- [x] Service role key only in Edge Functions (never exposed to client)
- [x] JWT validation on every Edge Function call
- [x] Audit trail for all grant decisions (grant_decisions table)
- [x] Email validation against local crew database
