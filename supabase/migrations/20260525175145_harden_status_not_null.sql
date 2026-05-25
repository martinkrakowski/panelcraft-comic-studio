-- Harden the status column on comic_projects.
-- The remote schema had `status text DEFAULT 'pending_creation'` without
-- NOT NULL, so any rows inserted before the default was added (or via paths
-- that bypassed the default) could carry NULL status. The previous schema
-- improvements migration assumed the column would always exist with NOT NULL,
-- but ADD COLUMN IF NOT EXISTS is a no-op when the column already exists —
-- leaving the NOT NULL constraint never applied on this schema.

-- 1. Backfill any NULL rows to the documented default.
UPDATE public.comic_projects
   SET status = 'pending_creation'
 WHERE status IS NULL;

-- 2. Enforce NOT NULL going forward.
ALTER TABLE public.comic_projects
  ALTER COLUMN status SET NOT NULL;
