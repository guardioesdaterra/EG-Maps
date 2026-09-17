-- scripts/add-grants-review-status.sql
-- @why 2026-09-17 status-model reset, part 2/2 (part 1 = fresh scraped_grants
--   wipe + sync mapping fix in this repo).
--
-- NEW MODEL — two independent axes, two separate columns:
--   1. Temporal state  → status:        open / closed  (+ hidden quarantine)
--   2. Review workflow → review_status: pending / approved
--
-- RULE: "pending" exists ONLY for manager manual inserts (grants table).
-- Scraped grants (scraped_grants) are NEVER pending — the sync layer
-- normalizes unknown/dateless scrapes to status=open.
--
-- HOW TO APPLY: paste into the Supabase dashboard SQL editor, or
--   npx supabase db push   (from the repo that holds supabase/migrations,
--   with this file copied under supabase/migrations/ as
--   <timestamp>_grants_review_status.sql)
-- Requires service-role / postgres privileges (anon RLS cannot DDL).

-- ── 1. grants (manager manual inserts): separate review column ──
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

-- ── 2. scraped_grants: document the temporal vocabulary (no DDL change) ──
COMMENT ON COLUMN public.scraped_grants.status IS
  'Temporal state for scraped grants: open/closed (+hidden manager quarantine). NEVER pending — pending belongs to grants.review_status (manager manual inserts only).';

-- ── 3. scraped_grants reset (ONE-SHOT, already executed 2026-09-17) ──
-- The pre-v2.4 legacy rows (119 pending, 74 closed, 64 expired-but-open,
-- plus all remaining open rows) were hard-deleted via the REST API and the
-- table repopulates fresh from the CI scrape (cron every 2h) using the fixed
-- sync mapping (unknown→open, pending never written). Do NOT re-run a blanket
-- DELETE here: post-reset, status=closed rows are legitimate manager actions
-- (edge close/hide) and must be preserved.

-- ── 4. Sibling-repo edge-function changes (NOT in this repo) ──
-- grants edge function must be updated to honor the split:
--   action=create  → INSERT INTO grants (...) WITH review_status='pending'
--   action=approve → SET review_status='approved' (keep temporal status as-is)
--   action=list    → manual-grant listings filter on review_status, not status
--   action=stats   → count review_status=pending separately from status=open
--   scraped action=show (un-hide) → restore status=open/closed (temporal),
--     NEVER status=pending — pending is manual-inserts only. Until the edge
--     is updated, avoid show on scraped_grants or re-hide will need cleanup.
