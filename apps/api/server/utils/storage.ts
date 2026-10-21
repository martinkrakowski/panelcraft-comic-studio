import { createLogger } from '@panelcraft/shared';
import {
  S3ObjectStorage,
  type ObjectStoragePort,
} from '@panelcraft/comic-generation';
import { getMediaUrls } from './media-urls.js';

const logger = createLogger('storage');

let storage: ObjectStoragePort | null = null;

/** Singleton S3-compatible object storage built from the environment. */
export function getStorage(): ObjectStoragePort {
  if (!storage) {
    storage = S3ObjectStorage.fromEnv();
  }
  return storage;
}

/** Test hook: replace or clear the singleton storage. */
export function setStorageForTests(next: ObjectStoragePort | null): void {
  storage = next;
}

/**
 * Upload bytes under `key` (failing if the key already exists) and return the
 * storage path plus a freshly-signed media URL.
 *
 * If signing fails, the uploaded object is removed before rethrowing — the
 * same compensation the legacy storage helper performed.
 */
export async function uploadNew(
  key: string,
  file: Buffer,
  contentType = 'image/webp'
): Promise<{ path: string; signedUrl: string }> {
  const s = getStorage();
  await s.putNew(key, file, contentType);
  try {
    const signedUrl = getMediaUrls().urlFor(key);
    return { path: key, signedUrl };
  } catch (err) {
    try {
      await s.remove([key]);
    } catch (cleanupErr) {
      logger.error(
        `Failed to clean up orphaned object at ${key}`,
        cleanupErr instanceof Error ? cleanupErr : new Error(String(cleanupErr))
      );
    }
    throw err;
  }
}

/**
 * Convert a storage path to a freshly-signed short-lived media URL, mirroring
 * the legacy `toSignedUrlIfPath` semantics: null/empty → null; an existing
 * http(s) URL is returned unchanged; otherwise sign, logging a warning and
 * returning null when signing fails.
 */
export async function toSignedUrlIfPath(
  value: string | null | undefined
): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  try {
    return getMediaUrls().urlFor(value);
  } catch (err) {
    logger.warn(
      `Failed to sign storage path ${value}: ${err instanceof Error ? err.message : String(err)}`
    );
    return null;
  }
}
