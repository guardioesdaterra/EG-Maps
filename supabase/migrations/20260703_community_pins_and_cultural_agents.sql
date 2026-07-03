-- ============================================================
-- Vulcan Observatory: Community Pins + Cultural Agents tables
-- Run this migration in Supabase SQL Editor or via CLI
-- ============================================================

-- 1. Community pins — user-submitted locations on the Vulcan Observatory map
CREATE TABLE IF NOT EXISTS community_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  pin_type TEXT NOT NULL CHECK (pin_type IN (
    'cultural_agent',
    'cultural_avenue',
    'show_event',
    'action',
    'point_of_attention'
  )),
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  source_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_pins_status ON community_pins(status);
CREATE INDEX IF NOT EXISTS idx_community_pins_user ON community_pins(user_id);
CREATE INDEX IF NOT EXISTS idx_community_pins_location ON community_pins(latitude, longitude);

-- RLS policies
ALTER TABLE community_pins ENABLE ROW LEVEL SECURITY;

-- Anyone can read approved pins
CREATE POLICY "Community pins: public read approved"
  ON community_pins FOR SELECT
  USING (status = 'approved');

-- Authenticated users can insert their own pins
CREATE POLICY "Community pins: authenticated insert"
  ON community_pins FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own pins
CREATE POLICY "Community pins: owner update"
  ON community_pins FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own pins
CREATE POLICY "Community pins: owner delete"
  ON community_pins FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Cultural agents — synced from external APIs (Mapa Cultura, Floresta Ativista)
CREATE TABLE IF NOT EXISTS cultural_agents (
  id TEXT PRIMARY KEY,  -- e.g. "mapa-12345" or "fa-678"
  name TEXT NOT NULL,
  agent_type TEXT,
  source TEXT NOT NULL CHECK (source IN ('mapa_cultura', 'floresta_ativista')),
  external_id TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  single_url TEXT,
  status TEXT DEFAULT 'active',
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cultural_agents_source ON cultural_agents(source);
CREATE INDEX IF NOT EXISTS idx_cultural_agents_location ON cultural_agents(latitude, longitude);

-- RLS: public read for everyone (synced public data)
ALTER TABLE cultural_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cultural agents: public read"
  ON cultural_agents FOR SELECT
  USING (true);

-- Only service role can write (via sync script)
CREATE POLICY "Cultural agents: service role write"
  ON cultural_agents FOR ALL
  USING (auth.role() = 'service_role');


-- 3. View: combined approved pins + cultural agents for map rendering
CREATE OR REPLACE VIEW vulcan_map_agents AS
  SELECT
    id::TEXT,
    name,
    pin_type AS agent_type,
    'community' AS source,
    NULL::TEXT AS external_id,
    latitude,
    longitude,
    NULL::TEXT AS single_url,
    status,
    created_at
  FROM community_pins
  WHERE status = 'approved'

  UNION ALL

  SELECT
    id,
    name,
    agent_type,
    source,
    external_id,
    latitude,
    longitude,
    single_url,
    status,
    created_at
  FROM cultural_agents
  WHERE status = 'active';
