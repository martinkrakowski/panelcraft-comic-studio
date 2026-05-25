-- Grant CRUD permissions to service_role and authenticated for app tables.
-- These are NOT granted automatically when tables are created via SQL/migrations
-- (only when created via the Supabase dashboard). Without these, even with RLS
-- disabled or with a permissive policy, queries fail with "permission denied".

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comic_projects TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comic_projects TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.langgraph_checkpoints TO service_role;
