import { beforeEach, describe, expect, it } from 'vitest';
import type { ObjectStoragePort } from '../../../application/ports/out/object-storage.out-port.js';

export interface ObjectStorageContractOptions {
  /** Number of objects to create for the listKeys pagination test. */
  paginationCount?: number;
  /** Prefix for every key this contract touches (use a random per-run prefix). */
  keyPrefix?: string;
}

/**
 * Shared behavioural contract for ObjectStoragePort implementations. Run it
 * against the in-memory fake and the real S3 adapter with the same assertions.
 */
export function objectStorageContractTests(
  label: string,
  createPort: () => ObjectStoragePort,
  options: ObjectStorageContractOptions = {}
): void {
  const paginationCount = options.paginationCount ?? 3;
  const prefix = options.keyPrefix ?? 'contract';

  describe(label, () => {
    let port: ObjectStoragePort;

    beforeEach(() => {
      port = createPort();
    });

    it('round-trips bytes and contentType via putNew/get', async () => {
      const key = `${prefix}/roundtrip`;
      const body = Buffer.from('hello object storage');

      await port.putNew(key, body, 'image/webp');

      const object = await port.get(key);
      expect(object).not.toBeNull();
      expect(object!.contentType).toBe('image/webp');
      expect(object!.contentLength).toBe(body.length);
      expect(object!.body.equals(body)).toBe(true);
    });

    it('rejects putNew on an existing key', async () => {
      const key = `${prefix}/existing`;
      await port.putNew(key, Buffer.from('first'), 'text/plain');

      await expect(
        port.putNew(key, Buffer.from('second'), 'text/plain')
      ).rejects.toThrow();
    });

    it('returns null for a missing key', async () => {
      await expect(port.get(`${prefix}/missing`)).resolves.toBeNull();
    });

    // The S3 suite creates 1005 objects here (to prove pagination past the
    // 1000-key page boundary), so creation runs concurrently in batches and
    // the test gets an explicit timeout well above the 5s default.
    it(
      'lists keys under a prefix, paginating internally',
      async () => {
        const subPrefix = `${prefix}/list`;
        const keys = Array.from({ length: paginationCount }, (_, i) => {
          return `${subPrefix}/${String(i).padStart(4, '0')}.webp`;
        });

        const batchSize = 50;
        for (let start = 0; start < keys.length; start += batchSize) {
          const batch = keys.slice(start, start + batchSize);
          await Promise.all(
            batch.map((key, offset) => {
              return port.putNew(
                key,
                Buffer.from(`img-${start + offset}`),
                'image/webp'
              );
            })
          );
        }

        const listed = await port.listKeys(subPrefix);
        expect(listed).toHaveLength(paginationCount);
        for (const key of keys) {
          expect(listed).toContain(key);
        }

        // Listing respects the prefix boundary.
        await expect(port.listKeys(`${prefix}/other`)).resolves.toEqual([]);
      },
      60_000
    );

    it('removes keys and ignores missing keys', async () => {
      const keyA = `${prefix}/rm/a`;
      const keyB = `${prefix}/rm/b`;
      await port.putNew(keyA, Buffer.from('a'), 'text/plain');
      await port.putNew(keyB, Buffer.from('b'), 'text/plain');

      await port.remove([keyA, keyB, `${prefix}/rm/missing`]);

      await expect(port.get(keyA)).resolves.toBeNull();
      await expect(port.get(keyB)).resolves.toBeNull();
    });
  });
}
