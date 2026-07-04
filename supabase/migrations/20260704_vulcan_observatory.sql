-- ============================================================
-- Vulcan Observatory: unified cultural agents + community pins
-- ============================================================

CREATE TABLE IF NOT EXISTS vulcan_observatory (
  id TEXT PRIMARY KEY,            -- e.g. "minc-12345" or "midia_ninja-678"
  type TEXT NOT NULL CHECK (type IN (
    'cultural_agent',
    'cultural_avenue',
    'show_event',
    'action',
    'point_of_attention'
  )),
  name TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('minc', 'midia_ninja')),
  external_id TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90 AND latitude <= 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180 AND longitude <= 180),
  single_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vulcan_type ON vulcan_observatory(type);
CREATE INDEX IF NOT EXISTS idx_vulcan_source ON vulcan_observatory(source);
CREATE INDEX IF NOT EXISTS idx_vulcan_location ON vulcan_observatory(latitude, longitude);

-- RLS: public read for everyone (synced public data)
ALTER TABLE vulcan_observatory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vulcan observatory: public read"
  ON vulcan_observatory FOR SELECT
  USING (true);

-- Only service role can write (via sync script)
CREATE POLICY "Vulcan observatory: service role write"
  ON vulcan_observatory FOR ALL
  USING (auth.role() = 'service_role');
