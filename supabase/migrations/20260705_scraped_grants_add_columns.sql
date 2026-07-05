-- Add missing columns to scraped_grants for grant scoring/sorting
ALTER TABLE scraped_grants ADD COLUMN IF NOT EXISTS amount_usd NUMERIC;
ALTER TABLE scraped_grants ADD COLUMN IF NOT EXISTS deadline_days INTEGER;
