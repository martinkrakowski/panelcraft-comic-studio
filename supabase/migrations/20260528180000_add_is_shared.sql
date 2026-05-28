-- "Share It" feature: a comic project can be shared so every authenticated
-- user can view it. Ownership/edit rights are unchanged — only the owner can
-- edit, delete, or toggle sharing. Visibility is enforced in application code
-- (the backend uses the service-role client, which bypasses RLS).

ALTER TABLE public.comic_projects
  ADD COLUMN IF NOT EXISTS is_shared boolean NOT NULL DEFAULT false;

-- Partial index for the shared feed — only indexes the (small) shared subset.
CREATE INDEX IF NOT EXISTS comic_projects_is_shared
  ON public.comic_projects (is_shared)
  WHERE is_shared = true;
