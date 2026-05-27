-- Widen the status CHECK constraint to admit the cover regeneration HITL
-- lifecycle phases. The existing constraint already covers the original
-- six statuses plus the extend and final-composition pipelines (see
-- 20260526120000_add_composed_image_url.sql); this migration appends
-- `regenerating_cover` and `pending_review_cover` so the worker and
-- submitReview branches can persist them without Postgres rejecting the
-- write.

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
    'pending_review_final'::text,
    'regenerating_cover'::text,
    'pending_review_cover'::text
  ]));
