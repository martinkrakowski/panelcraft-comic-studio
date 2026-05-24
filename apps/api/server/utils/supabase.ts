import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables'
  );
}

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

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
    throw new Error(
      `Failed to generate signed URL for ${path}: ${signedUrlError?.message}`
    );
  }

  return { path, signedUrl: signedUrlData.signedUrl };
}

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
