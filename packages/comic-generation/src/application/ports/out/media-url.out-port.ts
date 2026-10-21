/**
 * Turns a storage key (e.g. `comics/<projectId>/covers/front.webp`) into a short-lived absolute URL that
 *  browsers AND external services (xAI fetches reference images) can GET. Replaces Supabase createSignedUrl(key, 3600).
 */
export interface MediaUrlPort { urlFor(key: string, ttlSeconds?: number): string }
