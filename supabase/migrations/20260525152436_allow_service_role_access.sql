-- Allow service role to access all projects and storage
-- Service role bypasses user_id checks for backend operations
-- Authenticated users can only see/modify their own projects

-- Add service role access policy for comic_projects
DROP POLICY IF EXISTS "Service role full access" ON public.comic_projects;
CREATE POLICY "Service role full access" ON public.comic_projects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Add service role access policy for storage
DROP POLICY IF EXISTS "Service role can access storage" ON storage.objects;
CREATE POLICY "Service role can access storage" ON storage.objects
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
