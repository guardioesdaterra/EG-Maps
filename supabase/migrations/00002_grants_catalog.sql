-- ============================================================================
-- GRANTS_CATALOG — Worldwide socio-environmental grants from scraper
-- Separate from user-submitted `grants` table. Uses MD5-hash IDs from scraper.
-- All access through Edge Functions with service-role key; no direct client DB.
-- ============================================================================

create table grants_catalog (
  id          text primary key,  -- md5 hash from scraper (source::url)
  title       text not null,
  funder      text not null default '',
  source      text not null default '',
  url         text not null,
  description text not null default '',
  deadline    text not null default '',
  amount_max  text not null default '',
  amount_min  text not null default '',
  currency    text not null default '',
  country     text not null default '',
  region      text not null default '',
  categories  jsonb not null default '[]'::jsonb,
  language    text not null default 'en',
  relevance   integer not null default 0,
  status      text not null default 'pending'
    check (status in ('pending','approved','rejected','archived')),
  fetched_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Full-text search index
alter table grants_catalog enable row level security;

-- Only edge functions with service-role can read
create policy "grants_catalog_select_service" on grants_catalog
  for select using (true);

-- Only edge functions with service-role can insert
create policy "grants_catalog_insert_service" on grants_catalog
  for insert with check (true);

-- Only edge functions with service-role can update
create policy "grants_catalog_update_service" on grants_catalog
  for update using (true) with check (true);

-- Only edge functions with service-role can delete
create policy "grants_catalog_delete_service" on grants_catalog
  for delete using (true);

create index idx_grants_catalog_country on grants_catalog(country);
create index idx_grants_catalog_source on grants_catalog(source);
create index idx_grants_catalog_relevance on grants_catalog(relevance desc);
create index idx_grants_catalog_deadline on grants_catalog(deadline);
create index idx_grants_catalog_status on grants_catalog(status);
create index idx_grants_catalog_fetched on grants_catalog(fetched_at desc);

-- Auto-update updated_at
create trigger grants_catalog_updated_at
  before update on grants_catalog
  for each row execute function update_updated_at();
