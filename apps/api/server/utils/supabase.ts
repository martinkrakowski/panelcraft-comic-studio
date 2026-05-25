import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('supabase');

let serviceClient: SupabaseClient | null = null;

/**
 * Returns the singleton Supabase client backed by the service-role key.
 *
 * Use this for all backend storage and database operations — it bypasses
 * row-level security and can upload, delete, and sign URLs on behalf of
 * any user. Must never be exposed to the browser.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!serviceClient) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url) throw new Error('Missing SUPABASE_URL environment variable');
    if (!key)
      throw new Error(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable. ' +
          'The backend requires the service-role key to perform privileged storage ' +
          'operations (uploads, deletions, signed URL generation). Do not ship the ' +
          'anon key in its place.'
      );
    serviceClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

/**
 * Returns a fresh (unauthenticated) Supabase client backed by the anon key.
 *
 * Creates a new client instance on each call with session persistence disabled.
 * Use when you need row-level security semantics or plan to attach an end-user
 * JWT to a specific request. Falls back to throwing if the anon key is not
 * configured.
 */
export function getSupabaseAnonClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url) throw new Error('Missing SUPABASE_URL environment variable');
  if (!anonKey)
    throw new Error(
      'Missing SUPABASE_ANON_KEY environment variable; required for anon client'
    );
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Upload a buffer to a Supabase Storage bucket and return a 1-hour signed URL.
 *
 * Uses the service-role client so the upload succeeds regardless of RLS
 * policy on the storage bucket. The `upsert: false` flag prevents
 * accidentally overwriting an existing object at the same path.
 *
 * @throws when the upload or signed-URL request fails
 */
export async function uploadToStorage(
  bucket: string,
  path: string,
  file: Buffer,
  contentType = 'image/webp'
): Promise<{ path: string; signedUrl: string }> {
  const supabase = getSupabaseClient();

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload file to ${path}: ${uploadError.message}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (signedUrlError || !signedUrlData) {
    // Compensation: clean up the orphaned uploaded object before rethrowing
    try {
      await supabase.storage.from(bucket).remove([path]);
    } catch (cleanupErr) {
      logger.error(
        `Failed to clean up orphaned object at ${path}`,
        cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr))
      );
    }
    throw new Error(
      `Failed to generate signed URL for ${path}: ${signedUrlError?.message}`
    );
  }

  return { path, signedUrl: signedUrlData.signedUrl };
}

/**
 * Generate a 1-hour signed URL for an existing object in a Supabase Storage bucket.
 *
 * @throws when the signed-URL request fails
 */
export async function getSignedUrl(
  bucket: string,
  path: string
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600);

  if (error || !data) {
    throw new Error(`Failed to get signed URL for ${path}: ${error?.message}`);
  }
  return data.signedUrl;
}
