-- scripts/grants-manual-inserted-links.sql
-- @why ONE-SHOT migration — RUN MANUALLY in the Supabase dashboard SQL editor
--   (service role). The sandbox CLI cannot hold a direct DB session, so this
--   file is the canonical single script.
--
-- WHAT IT DOES (all idempotent — safe to re-run):
--   A. scraped_grants: ADD source_link + grant_link + manual_inserted
--      (the scraper has emitted source_link/grant_link since v2.6 and the sync
--      layer already sends them, but the live table never got the columns —
--      every upsert has been silently dropping both links).
--   B. scraped_grants: DROP reviewed / reviewed_at / review_notes / viewed
--      (dead review apparatus — replaced by manual_inserted).
--   C. grants (manager table): ADD source_link + grant_link + manual_inserted,
--      backfill manual_inserted=true (every existing row is manager-created),
--      DROP the review workflow (review_status + CHECK constraint, reviewed,
--      reviewed_by, reviewed_at, rejection_reason). Manual inserts are
--      auto-approved: visibility is driven by temporal status (open/closed /
--      hidden) + manual_inserted origin flag, no pending queue.
--   D. Indexes + column comments + verification SELECTs.
--
-- POST-RUN (sibling repo, NOT here): the grants edge function still
-- references review_status (create→pending, approve→approved, list/stats
-- filters). Update it to stop writing review_status and set
-- manual_inserted=true on create. Until then, edge create/approve calls will
-- ERROR on the dropped column (fail-loud is intentional).
--
-- RLS NOTE: if any policy on these tables references the dropped columns,
-- every access to the table will start erroring after §3/§4. §0 lists
-- suspect policies — fix them before/in the same session.

BEGIN;

-- ── §0. Inspect before ──────────────────────────────────────────
-- Live columns on both tables:
SELECT table_name, column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('scraped_grants', 'grants')
   AND column_name IN ('source_link', 'grant_link', 'manual_inserted',
                       'reviewed', 'reviewed_by', 'reviewed_at',
                       'review_notes', 'review_status', 'rejection_reason',
                       'viewed', 'status')
 ORDER BY table_name, column_name;

-- Suspect RLS policies referencing dropped columns (expect 0 rows;
-- if any row appears, rewrite that policy BEFORE committing §3/§4):
SELECT schemaname, tablename, policyname, cmd,
       qual::text AS using_expr, with_check::text AS with_check_expr
  FROM pg_policies
 WHERE schemaname = 'public'
   AND tablename IN ('scraped_grants', 'grants')
   AND (COALESCE(qual::text, '') || ' ' || COALESCE(with_check::text, ''))
       ~ '(review_status|reviewed|review_notes|rejection_reason|viewed)';

-- ── §1. scraped_grants: add the three columns ───────────────────
ALTER TABLE public.scraped_grants
  ADD COLUMN IF NOT EXISTS source_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grant_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_inserted boolean NOT NULL DEFAULT false;

-- ── §2. scraped_grants: backfill ────────────────────────────────
-- url = grant_link || source_link, so a pre-migration row's url IS its
-- best-known source_link. grant_link stays '' (unknown split — honest).
UPDATE public.scraped_grants
   SET source_link = url
 WHERE source_link = '' AND url <> '';
-- Heuristic: rows whose source smells manual are manager inserts.
UPDATE public.scraped_grants
   SET manual_inserted = true
 WHERE source ILIKE 'manual%' OR source ILIKE 'manager%';

-- ── §3. scraped_grants: drop the dead review apparatus ──────────
ALTER TABLE public.scraped_grants
  DROP COLUMN IF EXISTS review_notes,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS reviewed,
  DROP COLUMN IF EXISTS viewed;

-- ── §4. grants (manager table): add links + origin flag ─────────
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS source_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grant_link text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS manual_inserted boolean NOT NULL DEFAULT false;

-- Every pre-migration row in grants/ is manager-created → auto-approved.
UPDATE public.grants
   SET manual_inserted = true
 WHERE manual_inserted = false;

UPDATE public.grants
   SET source_link = url
 WHERE source_link = '' AND url IS NOT NULL AND url <> '';

-- ── §4b. grants: drop the review workflow ───────────────────────
ALTER TABLE public.grants
  DROP CONSTRAINT IF EXISTS grants_review_status_check;

ALTER TABLE public.grants
  DROP COLUMN IF EXISTS review_status,
  DROP COLUMN IF EXISTS reviewed,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS rejection_reason;

-- ── §5. Indexes + comments ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scraped_grants_manual
  ON public.scraped_grants (manual_inserted);
CREATE INDEX IF NOT EXISTS idx_scraped_grants_grant_link
  ON public.scraped_grants (grant_link);
CREATE INDEX IF NOT EXISTS idx_grants_manual
  ON public.grants (manual_inserted);

COMMENT ON COLUMN public.scraped_grants.source_link IS
  'Aggregator page the record was scraped from (v2.6 dual-link model). url = grant_link when mined, else source_link.';
COMMENT ON COLUMN public.scraped_grants.grant_link IS
  'Funder/official call URL mined from post HTML ("" when none). Homepage-only funder URLs are valid since v2.7.';
COMMENT ON COLUMN public.scraped_grants.manual_inserted IS
  'Origin flag: true = manager manual insert (auto-approved, no review queue). Replaces reviewed/review_notes/review_status.';
COMMENT ON COLUMN public.grants.manual_inserted IS
  'Origin flag: true = manager manual insert (auto-approved). The pending/approved review_status workflow was removed; visibility is driven by temporal status (open/closed/hidden).';

-- ── §6. Verify ──────────────────────────────────────────────────
-- Expect: source_link + grant_link + manual_inserted present, review* gone.
SELECT table_name, column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('scraped_grants', 'grants')
   AND column_name IN ('source_link', 'grant_link', 'manual_inserted',
                       'reviewed', 'reviewed_by', 'reviewed_at',
                       'review_notes', 'review_status', 'rejection_reason',
                       'viewed')
 ORDER BY table_name, column_name;

-- Expect: grant_link/source_link populated wherever url existed.
SELECT count(*) AS total,
       count(NULLIF(source_link, '')) AS with_source_link,
       count(NULLIF(grant_link, '')) AS with_grant_link,
       count(*) FILTER (WHERE manual_inserted) AS manual_rows
  FROM public.scraped_grants;

SELECT count(*) AS total,
       count(*) FILTER (WHERE manual_inserted) AS manual_rows
  FROM public.grants;

COMMIT;
