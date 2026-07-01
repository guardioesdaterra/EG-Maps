-- Drop unused tables: scraped_views, scraped_votes, grant_views, grant_votes, alert_subscriptions
-- These have 0 rows and no functional code paths that write to them.

DROP TABLE IF EXISTS scraped_views;
DROP TABLE IF EXISTS scraped_votes;
DROP TABLE IF EXISTS grant_views;
DROP TABLE IF EXISTS grant_votes;
DROP TABLE IF EXISTS alert_subscriptions;
