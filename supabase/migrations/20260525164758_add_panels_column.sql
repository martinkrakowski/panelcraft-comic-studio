-- Persist the panels array on comic_projects.
-- The workflow generates panels during execution; without a column for them,
-- they would be lost between worker invocations and the UI would always see
-- an empty panels list.

ALTER TABLE public.comic_projects
  ADD COLUMN IF NOT EXISTS panels jsonb NOT NULL DEFAULT '[]'::jsonb;
