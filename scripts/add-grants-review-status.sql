-- scripts/add-grants-review-status.sql
-- @why 2026-09-17 status-model reset — RUN MANUALLY in the Supabase dashboard
--   SQL editor (service role). The sandbox CLI cannot hold a direct DB
--   session, so this file is the canonical one-shot script.
--
-- NEW MODEL — two independent axes, two separate columns:
--   1. Temporal state  → status:        open / closed  (+ hidden quarantine)
--   2. Review workflow → review_status: pending / approved (grants table only)
--
-- RULE: "pending" exists ONLY for manager manual inserts. Scraped grants are
-- NEVER pending — the fixed sync layer normalizes unknown/dateless to open.

-- ── 0. Inspect before (privileged counts; anon is RLS-restricted) ──
SELECT status, count(*) AS n
  FROM scraped_grants
 GROUP BY status
 ORDER BY n DESC;
-- Expected pre-reset: open ~4931, hidden ~546, pending ~119, closed ~74.

-- ── 1. Full wipe — CI repopulates fresh (2h cron / push run, new mapping) ──
DELETE FROM scraped_grants;
-- NOTE: grants table (manager manual inserts) is left untouched.
-- NOTE: grant_comments keeps 1 test row referencing a deleted id; harmless
-- (detail modal queries per grant_id, orphans never render). Delete it only
-- if you want zero residue:
--   DELETE FROM grant_comments WHERE grant_id NOT IN (SELECT id FROM scraped_grants);

-- ── 2. grants (manager manual inserts): separate review column ──
ALTER TABLE public.grants
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'grants_review_status_check'
  ) THEN
    ALTER TABLE public.grants
      ADD CONSTRAINT grants_review_status_check
      CHECK (review_status IN ('pending', 'approved'));
  END IF;
END $$;

-- Backfill: rows already acted upon (open/closed) count as approved.
UPDATE public.grants
  SET review_status = 'approved'
  WHERE status IN ('open', 'closed') AND review_status = 'pending';

COMMENT ON COLUMN public.grants.review_status IS
  'Manual-insert review workflow (pending/approved), independent from temporal status (open/closed). Scraped grants never use this column.';

-- ── 3. Enforce the new model on scraped_grants: pending can never be written ──
-- WARNING: after this, any writer sending status=pending (old sync code, or
-- the edge `show` action) FAILS LOUDLY instead of silently polluting. That is
-- intentional — it forces the sibling-repo edge fix (see §5). The fixed sync
-- in this repo (d121920+) only writes open/closed.
ALTER TABLE public.scraped_grants
  DROP CONSTRAINT IF EXISTS scraped_grants_status_check;

ALTER TABLE public.scraped_grants
  ADD CONSTRAINT scraped_grants_status_check
  CHECK (status IN ('open', 'closed', 'hidden'));

COMMENT ON COLUMN public.scraped_grants.status IS
  'Temporal state for scraped grants: open/closed (+hidden manager quarantine). NEVER pending — pending belongs to grants.review_status (manager manual inserts only).';

-- ── 4. Verify ──
SELECT status, count(*) AS n
  FROM scraped_grants
 GROUP BY status
 ORDER BY n DESC;
-- Expect: 0 rows (empty until the CI sync-push repopulates).

SELECT column_name, data_type, column_default
  FROM information_schema.columns
 WHERE table_name = 'grants' AND column_name = 'review_status';
-- Expect: 1 row (text, default 'pending').

SELECT conname, pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conname IN ('grants_review_status_check', 'scraped_grants_status_check');
-- Expect: 2 rows.

-- ── 5. Sibling-repo edge-function changes (NOT in this repo) ──
-- grants edge function must be updated to honor the split:
--   action=create  → INSERT INTO grants (...) WITH review_status='pending'
--   action=approve → SET review_status='approved' (keep temporal status as-is)
--   action=list    → manual-grant listings filter on review_status, not status
--   action=stats   → count review_status=pending separately from status=open
--   scraped action=show (un-hide) → restore status=open/closed (temporal),
--     NEVER status=pending (now rejected by §3 CHECK — update edge first).
