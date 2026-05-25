-- Temporarily relax user_id constraints to unblock backend project creation
-- before frontend auth is wired. Will be re-tightened once auth flow is complete:
--   1. Re-add FK to auth.users(id)
--   2. Set user_id NOT NULL
--   3. Backfill any existing NULL rows with a real user_id or delete them

ALTER TABLE public.comic_projects
  DROP CONSTRAINT IF EXISTS comic_projects_user_id_fkey;

ALTER TABLE public.comic_projects
  ALTER COLUMN user_id DROP NOT NULL;
