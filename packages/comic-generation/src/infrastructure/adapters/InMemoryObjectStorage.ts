import type {
  ObjectStoragePort,
  StoredObject,
} from '../../application/ports/out/object-storage.out-port.js';

/**
 * In-memory ObjectStoragePort implementation for tests. It mirrors the
 * behavioural contract of the real S3 adapter (putNew rejects existing keys,
 * get returns null for missing keys, remove ignores missing keys).
 */
export class InMemoryObjectStorage implements ObjectStoragePort {
  private readonly objects = new Map<string, StoredObject>();

  async putNew(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.objects.has(key)) {
      throw new Error(`Object already exists at key "${key}"`);
    }
    this.objects.set(key, {
      body,
      contentType,
      contentLength: body.length,
    });
  }

  async get(key: string): Promise<StoredObject | null> {
    const existing = this.objects.get(key);
    if (!existing) return null;
    return {
      body: existing.body,
      contentType: existing.contentType,
      contentLength: existing.contentLength,
      etag: existing.etag,
    };
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.objects.delete(key);
    }
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.objects.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  }
}
