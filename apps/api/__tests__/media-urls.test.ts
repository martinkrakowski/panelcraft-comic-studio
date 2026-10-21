import { describe, it, expect } from 'vitest';
import { HmacMediaUrlSigner } from '../server/utils/media-urls.js';

const BASE_URL = 'http://localhost:3001';
const SECRET = 'test-secret';
const KEY = 'comics/p1/panels/01.webp';

function makeSigner(now = 1000) {
  return new HmacMediaUrlSigner({ baseUrl: BASE_URL, secret: SECRET, now });
}

describe('HmacMediaUrlSigner', () => {
  it('signs a key into an absolute URL and verifies it', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const parsed = new URL(url);

    expect(parsed.origin).toBe(BASE_URL);
    expect(parsed.pathname).toBe('/api/media/comics/p1/panels/01.webp');

    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;
    expect(exp).toBe(String(1000 + 3600));
    expect(sig).toMatch(/^[A-Za-z0-9_-]+$/);

    expect(signer.verify(KEY, exp, sig)).toBe('ok');
  });

  it('expires links when the injected clock passes the expiry', () => {
    const signer = makeSigner(1000);
    const url = signer.urlFor(KEY, 3600);
    const parsed = new URL(url);
    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;

    // Same secret/signature, but the clock has advanced past expiry.
    const later = makeSigner(5000);
    expect(later.verify(KEY, exp, sig)).toBe('expired');
  });

  it('rejects a tampered key', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const parsed = new URL(url);
    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;

    expect(
      signer.verify('comics/p1/panels/02.webp', exp, sig)
    ).toBe('bad-signature');
  });

  it('rejects a tampered expiry', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const parsed = new URL(url);
    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;

    expect(signer.verify(KEY, String(Number(exp) + 1), sig)).toBe(
      'bad-signature'
    );
  });

  it('rejects a tampered signature', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const parsed = new URL(url);
    const exp = parsed.searchParams.get('exp')!;
    const sig = parsed.searchParams.get('sig')!;

    const flipped = sig.endsWith('A') ? sig.slice(0, -1) + 'B' : sig.slice(0, -1) + 'A';
    expect(signer.verify(KEY, exp, flipped)).toBe('bad-signature');
  });

  it('rejects a non-integer expiry', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const sig = new URL(url).searchParams.get('sig')!;
    expect(signer.verify(KEY, '12.5', sig)).toBe('bad-signature');
  });

  it.each([
    'comics/../x',
    'other/a.webp',
    'comics/a',
    'comics/a/b/../c',
    '',
  ])('throws for disallowed key %s', (key) => {
    const signer = makeSigner();
    expect(() => signer.urlFor(key)).toThrow();
  });

  it('trims a trailing slash from the base URL', () => {
    const signer = new HmacMediaUrlSigner({
      baseUrl: 'http://example.com/',
      secret: SECRET,
      now: 1000,
    });
    const url = signer.urlFor(KEY);
    expect(url.startsWith('http://example.com/api/media/')).toBe(true);
    expect(url).not.toContain('//api/media');
  });

  it('encodes each path segment separately and preserves separators', () => {
    const signer = makeSigner();
    const url = signer.urlFor(KEY);
    const path = new URL(url).pathname;
    expect(path.startsWith('/api/media/')).toBe(true);
    const encoded = path.slice('/api/media/'.length);
    const decoded = encoded
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
    expect(decoded).toBe(KEY);
  });

  it('validates ttl bounds', () => {
    const signer = makeSigner();
    expect(() => signer.urlFor(KEY, 0)).toThrow();
    expect(() => signer.urlFor(KEY, 86401)).toThrow();
    expect(() => signer.urlFor(KEY, -5)).toThrow();
    expect(() => signer.urlFor(KEY, 1.5)).toThrow();
    expect(() => signer.urlFor(KEY, 86400)).not.toThrow();
  });
});
