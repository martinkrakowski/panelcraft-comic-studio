-- =============================================================================
-- Schema improvements: timestamptz, updated_at trigger, status column +
-- constraint, storage RLS policies, panel_count constraint, UPDATE WITH CHECK
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Change timestamp columns to timestamptz
--    Existing values are interpreted as UTC (safe — Supabase runs in UTC).
-- -----------------------------------------------------------------------------
ALTER TABLE public.comic_projects
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';

ALTER TABLE public.langgraph_checkpoints
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC';


-- -----------------------------------------------------------------------------
-- 2. updated_at trigger — fires on every UPDATE, sets updated_at to NOW()
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER comic_projects_set_updated_at
  BEFORE UPDATE ON public.comic_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. status column + CHECK constraint
--    ADD COLUMN IF NOT EXISTS is safe to run even if the column was added
--    manually; the NOT NULL + DEFAULT ensures every existing row gets a value.
-- -----------------------------------------------------------------------------
ALTER TABLE public.comic_projects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_creation';

ALTER TABLE public.comic_projects
  ADD CONSTRAINT comic_projects_status_check
  CHECK (status IN (
    'pending_creation',
    'processing',
    'pending_layout',
    'pending_review',
    'completed',
    'failed'
  ));


-- -----------------------------------------------------------------------------
-- 4. panel_count CHECK constraint (1–24 panels)
-- -----------------------------------------------------------------------------
ALTER TABLE public.comic_projects
  ADD CONSTRAINT comic_projects_panel_count_check
  CHECK (panel_count BETWEEN 1 AND 24);


-- -----------------------------------------------------------------------------
-- 5. Fix UPDATE RLS policy — add WITH CHECK to prevent user_id reassignment
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update own projects" ON public.comic_projects;

CREATE POLICY "Users can update own projects" ON public.comic_projects
  FOR UPDATE
  USING     (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- -----------------------------------------------------------------------------
-- 6. Storage RLS policies for the 'comics' bucket
--
--    Upload paths within the bucket follow this pattern:
--      comics/{projectId}/references/{timestamp}-{id}.webp
--      comics/{projectId}/mood-boards/{timestamp}-{id}.webp
--      comics/{projectId}/covers/front.webp
--
--    storage.foldername(name) splits on '/' and returns a 1-based array:
--      [1] = 'comics'   (literal subfolder prefix — matches bucket name)
--      [2] = projectId  (UUID of the comic_projects row)
--
--    Policies cross-check [2] against comic_projects.id to confirm ownership.
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own project assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own project" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own project assets" ON storage.objects;

CREATE POLICY "Users can read own project assets" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'comics'
    AND EXISTS (
      SELECT 1 FROM public.comic_projects
      WHERE comic_projects.id::text = (storage.foldername(name))[2]
        AND comic_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload to own project" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'comics'
    AND EXISTS (
      SELECT 1 FROM public.comic_projects
      WHERE comic_projects.id::text = (storage.foldername(name))[2]
        AND comic_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own project assets" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'comics'
    AND EXISTS (
      SELECT 1 FROM public.comic_projects
      WHERE comic_projects.id::text = (storage.foldername(name))[2]
        AND comic_projects.user_id = auth.uid()
    )
  );
