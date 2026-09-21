-- scripts/restore-crew-pins-tables.sql
-- OPT-IN restore for tables dropped in the DB consolidation.
-- Run in Supabase Dashboard → SQL Editor ONLY if you want crew-member
-- registration (crew-sync register / crews-create) and community pins
-- (register-pin) working again. The edge functions self-adapt to these
-- tables via column introspection — no function changes needed after restore.
--
-- If you do NOT run this, those endpoints answer 503 with a clear
-- "currently unavailable" message instead of 500s.

-- ── Crew members ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.eg_intern_crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  first_name TEXT,
  last_name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  role TEXT NOT NULL DEFAULT 'member',
  crew_type TEXT NOT NULL DEFAULT 'member',
  is_leader BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  user_id UUID,
  age INTEGER,
  phone_country TEXT,
  phone_number TEXT,
  address_country TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  inspiration TEXT,
  training_interest TEXT,
  climate_experience TEXT,
  indigenous_status TEXT,
  tribal_nation TEXT,
  referrer TEXT,
  notes TEXT,
  joined_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS eg_intern_crew_members_email_uniq
  ON public.eg_intern_crew_members (lower(email));
CREATE INDEX IF NOT EXISTS eg_intern_crew_members_user_id_idx
  ON public.eg_intern_crew_members (user_id);

-- ── Community pins ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pin_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS community_pins_user_created_idx
  ON public.community_pins (user_id, created_at DESC);

-- NOTE: edge functions use the service_role key (bypasses RLS), so no
-- policies are required for the app flows. Do NOT enable RLS without
-- adding service_role-bypass policies or the functions will break.
