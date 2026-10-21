import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe } from 'vitest';
import { S3ObjectStorage } from '../S3ObjectStorage';
import { objectStorageContractTests } from './objectStorageContract';

const endpoint = process.env.TEST_S3_ENDPOINT;
const bucket = process.env.TEST_S3_BUCKET;
const accessKeyId = process.env.TEST_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.TEST_S3_SECRET_ACCESS_KEY;

const suite = endpoint ? describe : describe.skip;

suite('S3ObjectStorage', () => {
  // Unique prefix per process so concurrent runs never collide.
  const runPrefix = `vitest/${randomUUID()}`;

  let storage: S3ObjectStorage;

  beforeEach(() => {
    storage = new S3ObjectStorage({
      endpoint: endpoint!,
      region: 'us-east-1',
      bucket: bucket!,
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
      forcePathStyle: true,
    });
  });

  afterAll(async () => {
    // Best-effort cleanup of everything this suite created.
    try {
      const keys = await storage.listKeys(runPrefix);
      if (keys.length > 0) {
        await storage.remove(keys);
      }
    } catch {
      // Cleanup is best-effort; never fail the suite on it.
    }
  });

  objectStorageContractTests('contract', () => storage, {
    paginationCount: 1005,
    keyPrefix: runPrefix,
  });
});
