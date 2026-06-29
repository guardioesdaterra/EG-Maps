# Supabase Architecture — EG-Maps

## Stack

| Layer | Tech |
|-------|------|
| Client SDK | `@supabase/supabase-js` v2 (via `@nuxtjs/supabase`) |
| Auth | Google OAuth (`@earthguardians.org` = manager) |
| DB | PostgreSQL via Supabase |
| Business Logic | Edge Functions (Deno) |
| RLS | Row Level Security on every table |
| Photos | Base64 in DB, compressed on Edge Function |

**Rule: All DB access goes through Edge Functions. Zero direct client→DB.**

---

## Project Structure

```
supabase/
├── config.toml                          # Supabase project config
├── migrations/
│   └── 00001_initial_schema.sql         # All tables + RLS + indexes
└── functions/
    ├── _shared/
    │   ├── auth.ts                      # Auth helpers, CORS, admin client
    │   └── image-compress.ts            # Image compression utility
    ├── crew-sync/index.ts               # Register/login crew member
    ├── grants-list/index.ts             # List grants (paginated)
    ├── grants-submit/index.ts           # Submit new grant
    ├── grants-review/index.ts           # Manager approve/reject
    ├── grants-stats/index.ts            # Public statistics
    ├── observatory-submit/index.ts      # Submit community update (with image compression)
    ├── observatory-list/index.ts        # List community updates
    └── observatory-delete/index.ts      # Delete own update
```

---

## Database Schema

### Tables

| Table | Purpose | Photos |
|-------|---------|--------|
| `crews` | Crew member registry (email → role) | — |
| `grants` | Submitted grants with status workflow | — |
| `grant_decisions` | Manager audit trail | — |
| `observatory_updates` | Community monitoring contributions | `photo_base64 TEXT[]` — compressed base64 |
| `alert_subscriptions` | Area-based mining alert subscriptions | — |

### Key Design: Photo Storage

Photos are stored as **compressed base64** directly in PostgreSQL:

- Client uploads raw base64 data URLs (up to 10MB each)
- Edge Function (`observatory-submit`) compresses to ~50-80KB per photo
- Compression: resize to max 800px width, JPEG quality 60, strip metadata
- Storage: `TEXT[]` column in `observatory_updates.photo_base64`
- Total per contribution: ~400KB-1MB (5 compressed photos + metadata)
- **No S3/Storage buckets** — zero additional cost

### RLS Policies

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `crews` | Authenticated | — | Self only | — |
| `grants` | Authenticated | Auth (own) | Own pending + Manager | — |
| `grant_decisions` | Authenticated | Manager | — | — |
| `observatory_updates` | Public | Auth (own) | Own | Own + Manager |
| `alert_subscriptions` | Own | Auth (own) | — | Own |

---

## Google OAuth Flow

### 1. Supabase Dashboard
- Authentication → Providers → Google → Enable
- Client ID + Secret from Google Cloud Console
- Redirect URL: `https://<ref>.supabase.co/auth/v1/callback`

### 2. Client Login (`useSupabaseAuth.ts`)
```ts
await client.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + '/auth/callback',
    queryParams: { hd: 'earthguardians.org' }
  }
})
```

### 3. Callback (`/auth/callback`)
```ts
await client.auth.exchangeCodeForSession(code)
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

### `grants-list` — List grants
```
GET /functions/v1/grants-list?status=pending&page=1
→ Returns { grants: [...], total: number }
```

### `grants-submit` — Submit new grant
```
POST /functions/v1/grants-submit
Body: { title, description, location_name, latitude, longitude, category }
→ Creates grant with status=pending
→ Returns { grant: {...} }
```

### `grants-review` — Manager approves/rejects
```
POST /functions/v1/grants-review
Body: { grant_id, decision: 'approved'|'rejected', notes? }
→ Updates grant status
→ Creates decision record
→ Returns { grant: {...} }
```

### `grants-stats` — Public statistics
```
GET /functions/v1/grants-stats
→ Returns { pending, approved, rejected, total }
```

### `observatory-submit` — Submit community update (with image compression)
```
POST /functions/v1/observatory-submit
Body: { update_type, description, location_name?, lat?, lng?, photos: string[] }
→ Validates and compresses photos (max 5, 10MB raw each)
→ Compression: resize to 800px, JPEG quality 60
→ Inserts into observatory_updates table
→ Returns { update: {...} }
```

### `observatory-list` — List community updates
```
GET /functions/v1/observatory-list?page=1&limit=50&type=contamination&photos=true
→ Returns { updates: [...], total: number }
```

### `observatory-delete` — Delete own update
```
POST /functions/v1/observatory-delete
Body: { update_id }
→ Deletes own update (or manager can delete any)
→ Returns { success: true }
```

---

## Client-Side Usage

### Composable: `useSupabaseAuth`
```ts
const { user, isManager, signIn, signOut } = useSupabaseAuth()
```

### Composable: `useGrants`
```ts
const { listGrants, submitGrant, reviewGrant, getStats } = useGrants()
```

### Composable: `useObservatoryUpdates`
```ts
const { submitUpdate, fetchUpdates, deleteUpdate, getLocalUpdates } = useObservatoryUpdates()

// Submit with automatic compression + sync
const result = await submitUpdate({
  update_type: 'contamination',
  description: 'Water pollution observed...',
  photos: [base64DataUrl1, base64DataUrl2],
})
// result.synced = true (if logged in and cloud sync succeeded)
// result.synced = false (saved locally only)
```

---

## Deployment

### Prerequisites
1. Create Supabase project at https://supabase.com
2. Enable Google OAuth provider
3. Set environment variables

### Supabase CLI
```bash
# Initialize (already done)
npx supabase init

# Link to remote project
npx supabase link --project-ref lfyvociptzyhjtrxwhhf

# Apply migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy crew-sync
npx supabase functions deploy grants-list
npx supabase functions deploy grants-submit
npx supabase functions deploy grants-review
npx supabase functions deploy grants-stats
npx supabase functions deploy observatory-submit
npx supabase functions deploy observatory-list
npx supabase functions deploy observatory-delete

# Set secrets
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
```

### Nuxt (client)
```bash
# .env
NUXT_PUBLIC_SUPABASE_URL=https://lfyvociptzyhjtrxwhhf.supabase.co
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
- [x] Photo compression on Edge Function (reduces DB storage by 95%)
- [x] Photo size validation (max 5 photos, 10MB raw each)
- [x] Offline-first: localStorage fallback when network unavailable
