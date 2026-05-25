-- Scope the service-role storage policy to the comics bucket so it cannot
-- read or write objects in unrelated buckets (e.g. an avatars bucket added
-- later). The previous policy granted service_role unconditional access to
-- every row in storage.objects.

DROP POLICY IF EXISTS "Service role can access storage" ON storage.objects;
CREATE POLICY "Service role can access storage" ON storage.objects
  FOR ALL
  USING (auth.role() = 'service_role' AND bucket_id = 'comics')
  WITH CHECK (auth.role() = 'service_role' AND bucket_id = 'comics');
