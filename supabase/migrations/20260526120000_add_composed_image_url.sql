-- Persist the AI-rendered final composition image URL and widen the
-- status CHECK constraint to admit the lifecycle phases that exist in
-- code but were never reflected in the schema.
--
-- Why both in one migration:
--  - `composed_image_url` is the new column the AI composition pipeline
--    writes to. The compose-final-page worker stages a single bitmap of
--    the whole comic page to Supabase Storage and persists the path here
--    so /view can sign it on read.
--  - The original `status` CHECK constraint only allowed the wizard-era
--    statuses. The post-completion extend pipeline (`extending`,
--    `pending_review_extend`) and the new final-composition pipeline
--    (`composing`, `pending_review_final`) emit values outside that set,
--    so every save attempt with one of them is rejected by Postgres and
--    surfaces as a 500 on the API.
--
-- A discrete column (rather than packing the URL into a jsonb blob)
-- keeps reads cheap for the dashboard / detail endpoints and makes it
-- easy to track which projects have completed final composition.

ALTER TABLE public.comic_projects
  ADD COLUMN IF NOT EXISTS composed_image_url text;

ALTER TABLE public.comic_projects
  DROP CONSTRAINT IF EXISTS comic_projects_status_check;

ALTER TABLE public.comic_projects
  ADD CONSTRAINT comic_projects_status_check
  CHECK (status = ANY (ARRAY[
    'pending_creation'::text,
    'processing'::text,
    'pending_layout'::text,
    'pending_review'::text,
    'completed'::text,
    'failed'::text,
    'extending'::text,
    'pending_review_extend'::text,
    'composing'::text,
    'pending_review_final'::text
  ]));
