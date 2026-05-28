-- Re-enable Row Level Security on comic_projects.
--
-- RLS was disabled in 20260525152840_disable_rls_temporarily.sql to unblock
-- backend development before frontend auth was wired, and was never reverted.
-- The required policies already exist ("Service role full access" scoped by
-- auth.role(), plus per-user SELECT/INSERT/UPDATE/DELETE on auth.uid() = user_id),
-- so enabling RLS simply makes them enforcing again.
--
-- The backend accesses this table exclusively via the service-role client, which
-- bypasses RLS, and the frontend never queries it directly, so this has no
-- functional impact on the app. It clears the rls_disabled_in_public and
-- policy_exists_rls_disabled security advisors.

ALTER TABLE public.comic_projects ENABLE ROW LEVEL SECURITY;
