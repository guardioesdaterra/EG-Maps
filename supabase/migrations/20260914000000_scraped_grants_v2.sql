-- ═══════════════════════════════════════════════════════════════════
-- scraped_grants v2 — align table with scraper output (scripts/grants.py)
--                     + sync tool (scripts/sync-grants-to-supabase.ts)
--
-- Context (audited 2026-09-14 on prod lfyvociptzyhjtrxwhhf, 5,472 rows):
--   • The scraper/sync emit 12 columns that DO NOT EXIST in the table, so
--     `existingColumns()` silently drops them every run: grant_types,
--     grant_status, content_hash, quality_score, url_status,
--     url_status_code, url_checked_at, last_seen_at, deadline_date,
--     review_notes, reviewed_at, is_standing.
--   • Dead/legacy columns (kept for backward compat with the edge function
--     + app, only COMMENTed as deprecated): viewed, location_name,
--     latitude, longitude, category (singular).
--   • 45% of rows have neither deadline nor amount; ~478 rss:Mongabay rows
--     are news articles, not grants; job postings + CFPs slipped through;
--     ~100+ rows carry amount-parser garbage ("in 2026", "ch 2027", "th .").
--
-- Safety: every statement is idempotent (IF NOT EXISTS / DO guards), the
-- quarantine UPDATEs only touch never-reviewed open/pending rows and are
-- reversible (status + review_notes record the reason), and no FK points
-- INTO scraped_grants (verified via pg_constraint), so no cascade risk.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Missing columns emitted by grants.py / sync tool ─────────────
ALTER TABLE public.scraped_grants
  ADD COLUMN IF NOT EXISTS grant_types      text[]                   DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS grant_status     text                     DEFAULT 'unknown'::text,
  ADD COLUMN IF NOT EXISTS content_hash     text,
  ADD COLUMN IF NOT EXISTS quality_score    integer                  DEFAULT 0       NOT NULL,
  ADD COLUMN IF NOT EXISTS url_status       text                     DEFAULT 'unchecked'::text NOT NULL,
  ADD COLUMN IF NOT EXISTS url_status_code  integer,
  ADD COLUMN IF NOT EXISTS url_checked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at     timestamptz              DEFAULT now()   NOT NULL,
  ADD COLUMN IF NOT EXISTS deadline_date    date,
  ADD COLUMN IF NOT EXISTS review_notes     text                     DEFAULT ''::text NOT NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS is_standing      boolean                  DEFAULT false   NOT NULL;

-- ── 2. Value guards (DO blocks: no IF NOT EXISTS for constraints) ────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scraped_grants_grant_status_check') THEN
    ALTER TABLE public.scraped_grants
      ADD CONSTRAINT scraped_grants_grant_status_check
      CHECK (grant_status IN ('open', 'closed', 'unknown'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scraped_grants_url_status_check') THEN
    ALTER TABLE public.scraped_grants
      ADD CONSTRAINT scraped_grants_url_status_check
      CHECK (url_status IN ('ok', 'broken', 'login_wall', 'timeout', 'blocked', 'unchecked'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scraped_grants_quality_score_range') THEN
    ALTER TABLE public.scraped_grants
      ADD CONSTRAINT scraped_grants_quality_score_range
      CHECK (quality_score >= 0 AND quality_score <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scraped_grants_relevance_range') THEN
    ALTER TABLE public.scraped_grants
      ADD CONSTRAINT scraped_grants_relevance_range
      CHECK (relevance >= 0 AND relevance <= 100);
  END IF;
END $$;

-- ── 3. Backfill new columns from existing data ───────────────────────
-- Temporal alias: open/closed pass through, everything else → unknown
-- (mirrors sync-grants-to-supabase.ts).
UPDATE public.scraped_grants
   SET grant_status = CASE WHEN status = 'open' THEN 'open'
                           WHEN status = 'closed' THEN 'closed'
                           ELSE 'unknown' END
 WHERE grant_status IS NULL OR grant_status NOT IN ('open', 'closed', 'unknown');

-- Real date for sorting/filtering (deadline is free text).
UPDATE public.scraped_grants
   SET deadline_date = substring(deadline from '^(\d{4}-\d{2}-\d{2})')::date
 WHERE deadline_date IS NULL
   AND deadline ~ '^\d{4}-\d{2}-\d{2}';

-- Dedupe hash, same shape as make_grant(): normalized title + normalized URL.
-- (SQL approximation: lowercased, punctuation stripped, fragment + trailing
-- slashes removed. Documented as approximate — informational + index assist.)
UPDATE public.scraped_grants
   SET content_hash = md5(
         left(regexp_replace(lower(title), '[^\w\s]', '', 'g'), 80)
         || '::' ||
         regexp_replace(split_part(url, '#', 1), '/+$', '')
       )
 WHERE content_hash IS NULL;

-- Quality heuristic until the next sync overwrites with the exact score:
-- min(relevance,40) + 15 w/ deadline + 15 w/ amount, capped at 100.
UPDATE public.scraped_grants
   SET quality_score = LEAST(
         LEAST(relevance, 40)
         + CASE WHEN deadline <> '' THEN 15 ELSE 0 END
         + CASE WHEN amount_max <> '' THEN 15 ELSE 0 END, 100)
 WHERE quality_score = 0;

UPDATE public.scraped_grants
   SET last_seen_at = fetched_at
 WHERE last_seen_at IS NULL;

-- ── 4. Amount-parser garbage cleanup (pre-_is_plausible_amount rows) ──
-- Conservative: only wipe fragments with NO currency marker at all
-- ("in 2026", "ch 2027", "th .", "us 12", bare "20000000") — anything a
-- human could mistake for money keeps its value. Magnitude words
-- (million/lakh/crore/万/億) are exempt. Sync hash-detection will see the
-- change as an update, not an insert — no row multiplication.
UPDATE public.scraped_grants
   SET amount_max = '',
       review_notes = CASE WHEN review_notes = ''
                           THEN 'amount cleaned 2026-09: parser fragment, no currency marker'
                           ELSE review_notes || ' | amount cleaned 2026-09' END
 WHERE amount_max <> ''
   AND amount_max NOT ILIKE '%million%'
   AND amount_max NOT ILIKE '%milh_o%'
   AND amount_max NOT ILIKE '%thousand%'
   AND amount_max NOT ILIKE '%lakh%'
   AND amount_max NOT ILIKE '%crore%'
   AND amount_max NOT LIKE '%万%'
   AND amount_max NOT LIKE '%億%'
   AND amount_max !~ '\$|€|£|¥|₹|₩|฿|R\$|USD|EUR|GBP|JPY|INR|KRW|CNY|THB|IDR|MYR|PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK|PLN|CZK|BRL';

UPDATE public.scraped_grants
   SET amount_min = '',
       review_notes = CASE WHEN review_notes = ''
                           THEN 'amount cleaned 2026-09: parser fragment, no currency marker'
                           ELSE review_notes || ' | amount cleaned 2026-09' END
 WHERE amount_min <> ''
   AND amount_min NOT ILIKE '%million%'
   AND amount_min NOT ILIKE '%milh_o%'
   AND amount_min NOT ILIKE '%thousand%'
   AND amount_min NOT ILIKE '%lakh%'
   AND amount_min NOT ILIKE '%crore%'
   AND amount_min NOT LIKE '%万%'
   AND amount_min NOT LIKE '%億%'
   AND amount_min !~ '\$|€|£|¥|₹|₩|฿|R\$|USD|EUR|GBP|JPY|INR|KRW|CNY|THB|IDR|MYR|PHP|SGD|CAD|AUD|NZD|CHF|SEK|NOK|DKK|PLN|CZK|BRL';

-- ── 5. Reversible auto-quarantine of confirmed non-grants ────────────
-- Only never-reviewed open/pending rows. Managers can restore (status was
-- open/pending, reason is in review_notes). News + jobs + CFPs are the
-- three confirmed pollution sources from the 2026-09 audit.
UPDATE public.scraped_grants
   SET status = 'hidden',
       review_notes = CASE WHEN review_notes = ''
                           THEN 'auto-quarantine 2026-09: news article, not a grant (source rss:Mongabay)'
                           ELSE review_notes || ' | auto-quarantine 2026-09: news article' END
 WHERE source = 'rss:Mongabay'
   AND (reviewed IS NOT TRUE)
   AND status IN ('open', 'pending');

UPDATE public.scraped_grants
   SET status = 'hidden',
       review_notes = CASE WHEN review_notes = ''
                           THEN 'auto-quarantine 2026-09: job posting, not a grant'
                           ELSE review_notes || ' | auto-quarantine 2026-09: job posting' END
 WHERE (reviewed IS NOT TRUE)
   AND status IN ('open', 'pending')
   AND (title ILIKE '%hiring%'
     OR title ILIKE '%career opportunit%'
     OR title ILIKE '%job opportunit%'
     OR title ILIKE '%vacanc%'
     OR title ILIKE '%we are hiring%'
     OR title ILIKE '%is hiring%');

UPDATE public.scraped_grants
   SET status = 'hidden',
       review_notes = CASE WHEN review_notes = ''
                           THEN 'auto-quarantine 2026-09: call for papers / conference, not a grant'
                           ELSE review_notes || ' | auto-quarantine 2026-09: call for papers' END
 WHERE (reviewed IS NOT TRUE)
   AND status IN ('open', 'pending')
   AND title ILIKE '%call for papers%';

-- ── 6. Indexes for the review queue + public listing ─────────────────
CREATE INDEX IF NOT EXISTS idx_scraped_grant_status
  ON public.scraped_grants (grant_status);
CREATE INDEX IF NOT EXISTS idx_scraped_quality
  ON public.scraped_grants (quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_deadline_date
  ON public.scraped_grants (deadline_date);
CREATE INDEX IF NOT EXISTS idx_scraped_content_hash
  ON public.scraped_grants (content_hash);
CREATE INDEX IF NOT EXISTS idx_scraped_url_status
  ON public.scraped_grants (url_status);
CREATE INDEX IF NOT EXISTS idx_scraped_status_priority
  ON public.scraped_grants (status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_last_seen
  ON public.scraped_grants (last_seen_at DESC);

-- ── 7. Auto-maintain updated_at (grants table already has this trigger) ─
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'scraped_grants_updated_at') THEN
    CREATE TRIGGER scraped_grants_updated_at
      BEFORE UPDATE ON public.scraped_grants
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ── 8. Document deprecated legacy columns (kept for compat) ──────────
COMMENT ON COLUMN public.scraped_grants.viewed IS
  'DEPRECATED v2: never written by scraper/sync/app. Use reviewed + status instead. Kept for edge-function SELECT * compat.';
COMMENT ON COLUMN public.scraped_grants.location_name IS
  'DEPRECATED v2: scraper never fills geo fields on scraped rows. Use country/region. Kept for compat.';
COMMENT ON COLUMN public.scraped_grants.latitude IS
  'DEPRECATED v2: scraper never fills geo fields on scraped rows. Kept for compat.';
COMMENT ON COLUMN public.scraped_grants.longitude IS
  'DEPRECATED v2: scraper never fills geo fields on scraped rows. Kept for compat.';
COMMENT ON COLUMN public.scraped_grants.category IS
  'DEPRECATED v2: singular legacy field (default environment). Use grant_type + grant_types + categories. Kept for compat.';
COMMENT ON COLUMN public.scraped_grants.content_hash IS
  'Dedupe hash: md5(normalized title + normalized url). SQL-backfilled rows are approximate; fresh syncs write the exact Python value.';
COMMENT ON COLUMN public.scraped_grants.quality_score IS
  'Composite 0-100: min(relevance,40)+min(signals,30)+15 deadline+15 amount. Written by grants.py, enforced 0-100.';
COMMENT ON COLUMN public.scraped_grants.url_status IS
  'URL health from verify_grant_urls(): ok/broken/login_wall/timeout/blocked/unchecked.';
COMMENT ON COLUMN public.scraped_grants.deadline_date IS
  'Real date parsed from free-text deadline. NULL = rolling/unknown. Use for sorting/filtering, not deadline text.';
