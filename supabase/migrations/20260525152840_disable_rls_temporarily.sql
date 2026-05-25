-- Temporarily disable RLS on comic_projects and storage while backend auth is being implemented
-- RLS will be re-enabled once frontend Supabase auth is wired up and user_id is properly passed through API

ALTER TABLE public.comic_projects DISABLE ROW LEVEL SECURITY;

-- Note: Storage RLS can remain as-is since the service role should bypass it
-- but disabling table RLS will unblock the backend for now
