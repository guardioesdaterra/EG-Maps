# API Reference

## Supabase Edge Functions

Five edge functions are deployed on Supabase. All use the service role key for database operations.

### `crew-sync`

**Endpoint:** `POST /functions/v1/crew-sync?action=check|register`

| Action | Auth | Description |
|--------|------|-------------|
| `check` | JWT | Verify crew membership from email |
| `register` | JWT | Register new crew member |

**Register payload:**

```json
{
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "crew_type": "member|leader|leader_with_group",
  "preferred_language": "en",
  "age": 25,
  "phone_country": "+55",
  "phone_number": "1199999999",
  "address_country": "Brazil",
  "address_line1": "Rua A, 123",
  "city": "Sao Paulo",
  "state": "SP",
  "zip_code": "01000-000",
  "inspiration": "I want to help",
  "training_interest": "yes",
  "climate_experience": "Some experience",
  "indigenous_status": "No",
  "tribal_nation": "",
  "referrer": "friend",
  "notes": "Any notes"
}
```

**Responses:** `201 Created` (new), `200 OK` (reactivated), `409 Conflict` (already active)

---

### `crews-create`

**Endpoint:** `POST /functions/v1/crews-create`

Standalone crew registration. No authentication required. Same payload as `crew-sync` register.

**Responses:** Same as `crew-sync` register.

---

### `grants`

**Endpoint:** `POST /functions/v1/grants`

Central grants API over the single merged `grants` table. Actions: `list`, `create`, `submit`, `manage` (approve/close/hide/show/reject/edit/merge/expire), `vote`, `comment`, `leaderboard`, `stats`. No review queue — manual inserts are auto-approved (`manual_inserted=true`); temporal state lives only in `status` (open/closed/expired/hidden); action URL is `grant_link` → `source_link` (no `url` column).

| Action | Auth | Description |
|--------|------|-------------|
| `list` | Manager (list), Anyone (leaderboard/vote/comment paths) | List grants with filters |
| `create` | JWT (manager) | Create a new grant (auto-approved) |
| `submit` | JWT | Crew-submitted grant (auto-approved) |
| `manage` | JWT (manager) | approve/close/hide/show/reject/edit/merge/expire |
| `comment` | JWT | Add comment to grant |
| `vote` | JWT | Vote on grant |
| `leaderboard` | JWT | Ranked grants with vote aggregates |
| `stats` | JWT (manager) | Grant statistics (open/closed/expired/hidden/manual) |

**Manage payload:**

```json
{
  "grant_id": "uuid",
  "action": "approve",
  "notes": "Looks good"
}
```

---

### `register-pin`

**Endpoint:** `POST /functions/v1/register-pin`

Two routes based on payload shape:

| Route | Auth | Description |
|-------|------|-------------|
| `{ agents: [...] }` | `x-sync-key` header | Batch sync cultural agents to `vulcan_observatory` |
| `{ pin_type, name, latitude, longitude, ... }` | JWT | Submit a community pin |

**Community pin payload:**

```json
{
  "pin_type": "cultural_agent|cultural_avenue|show_event|action|point_of_attention",
  "name": "Location name (min 2 chars)",
  "description": "Optional description",
  "latitude": -23.5,
  "longitude": -46.6,
  "source_url": "https://example.com"
}
```

Rate limit: 10 pins per user per day.

---

### `is-manager`

**Endpoint:** `POST /functions/v1/is-manager`

Checks if the authenticated user has a `@earthguardians.org` email.

**Response:**

```json
{
  "isManager": true,
  "email": "user@earthguardians.org",
  "aud": "authenticated",
  "role": "authenticated"
}
```

---

## Supabase Database

See `docs/DATABASE.md` for table schemas, indexes, and RLS policies.
