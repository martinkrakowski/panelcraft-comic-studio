import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { MediaUrlPort } from '@panelcraft/comic-generation';

/**
 * Keys allowed to be signed or served by the media route. A key must live
 * under `comics/`, have at least two segments, and contain no `..` segment
 * (no path traversal).
 */
const KEY_PATTERN = /^comics\/[A-Za-z0-9_-]+(\/[A-Za-z0-9_.-]+)+$/;

const DEFAULT_TTL_SECONDS = 3600;
const MAX_TTL_SECONDS = 86400;
const SIGNING_DOMAIN = 'panelcraft-media-url-v1';

/** Whether a storage key may be signed or served. */
export function isMediaKeyAllowed(key: string): boolean {
  if (!KEY_PATTERN.test(key)) return false;
  return !key.split('/').includes('..');
}

function base64UrlHmac(secret: Buffer | string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

/** Derive the per-domain signing key from the configured secret. */
function deriveSigningKey(secret: Buffer | string): Buffer {
  return createHmac('sha256', secret).update(SIGNING_DOMAIN).digest();
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface HmacMediaUrlSignerOptions {
  /** Public base URL, e.g. `https://api.example.com`. Trailing slash trimmed. */
  baseUrl: string;
  /** Signing secret (raw string or bytes). */
  secret: string | Buffer;
  /** Injectable clock (unix seconds) for tests. Defaults to `Date.now()`. */
  now?: number | (() => number);
}

/**
 * HMAC-SHA256 signed media URL signer implementing `MediaUrlPort`.
 *
 * Produces absolute URLs of the shape
 *   `${base}/api/media/<key>?exp=<unix seconds>&sig=<base64url HMAC-SHA256>`
 * where each segment of `<key>` is `encodeURIComponent`-encoded and `/`
 * separators are preserved. The API itself serves the bytes (OCI Object
 * Storage has no bucket CORS), so links must be absolute — xAI fetches
 * reference images from them.
 */
export class HmacMediaUrlSigner implements MediaUrlPort {
  private readonly baseUrl: string;
  private readonly secret: string | Buffer;
  private readonly now: () => number;

  constructor(options: HmacMediaUrlSignerOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.secret = options.secret;
    this.now =
      typeof options.now === 'function'
        ? options.now
        : typeof options.now === 'number'
          ? () => options.now as number
          : () => Math.floor(Date.now() / 1000);
  }

  /** Sign a storage key into an absolute, short-lived media URL. */
  urlFor(key: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
    if (!isMediaKeyAllowed(key)) {
      throw new Error(`Media key not allowed: ${key}`);
    }
    if (
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < 1 ||
      ttlSeconds > MAX_TTL_SECONDS
    ) {
      throw new Error(
        `ttlSeconds must be an integer in 1..${MAX_TTL_SECONDS}`
      );
    }

    const signingKey = deriveSigningKey(this.secret);
    const exp = this.now() + ttlSeconds;
    const sig = base64UrlHmac(signingKey, `${key}\n${exp}`);
    const encoded = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');

    return `${this.baseUrl}/api/media/${encoded}?exp=${exp}&sig=${sig}`;
  }

  /**
   * Verify a signed media link. Returns a status string; callers map it to
   * HTTP responses (e.g. all non-ok auth failures → 403).
   */
  verify(
    key: string,
    exp: string,
    sig: string
  ): 'ok' | 'expired' | 'bad-signature' | 'bad-key' {
    if (!isMediaKeyAllowed(key)) return 'bad-key';
    // exp must be an integer string; anything else can never match a valid sig.
    if (!/^[0-9]+$/.test(exp)) return 'bad-signature';

    const signingKey = deriveSigningKey(this.secret);
    const expected = base64UrlHmac(signingKey, `${key}\n${exp}`);
    if (!safeEqual(expected, sig)) return 'bad-signature';

    if (Number(exp) <= this.now()) return 'expired';
    return 'ok';
  }
}

let mediaUrls: HmacMediaUrlSigner | null = null;

/**
 * Singleton media-URL signer built from the environment. The base URL is
 * `MEDIA_PUBLIC_BASE_URL` falling back to `APP_BASE_URL`; the signing secret
 * is `SESSION_SECRET` falling back to `JWT_SECRET`, or a random per-process
 * 32-byte key when neither is set (links then only work within this process).
 */
export function getMediaUrls(): HmacMediaUrlSigner {
  if (!mediaUrls) {
    const base =
      process.env.MEDIA_PUBLIC_BASE_URL ?? process.env.APP_BASE_URL;
    if (!base) {
      throw new Error(
        'Missing MEDIA_PUBLIC_BASE_URL or APP_BASE_URL environment variable'
      );
    }
    const secret =
      process.env.SESSION_SECRET ||
      process.env.JWT_SECRET ||
      randomBytes(32).toString('hex');
    mediaUrls = new HmacMediaUrlSigner({ baseUrl: base, secret });
  }
  return mediaUrls;
}

/** Test hook: replace or clear the singleton signer. */
export function setMediaUrlsForTests(next: HmacMediaUrlSigner | null): void {
  mediaUrls = next;
}
