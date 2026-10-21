import { describe, it, expect, vi } from 'vitest';
import {
  InMemoryObjectStorage,
  type MediaUrlPort,
} from '@panelcraft/comic-generation';
import {
  loadPanelImage,
  toReferenceUrl,
} from '../server/workers/comic-worker.js';

const KEY = 'comics/p1/panels/01.webp';

const MEDIA_URLS: MediaUrlPort = {
  urlFor: (key: string) => `https://media.test/${key}`,
};

describe('comic worker storage-facing helpers', () => {
  it('returns stored bytes for a storage key', async () => {
    const storage = new InMemoryObjectStorage();
    const bytes = Buffer.from('panel-bytes');
    await storage.put(KEY, bytes, 'image/webp');

    const result = await loadPanelImage(KEY, storage);

    expect(result.equals(bytes)).toBe(true);
  });

  it('throws a [Worker] error when a storage key is missing', async () => {
    const storage = new InMemoryObjectStorage();

    await expect(loadPanelImage(KEY, storage)).rejects.toThrow(/\[Worker\]/);
  });

  it('routes http(s) values through the supplied fetcher', async () => {
    const storage = new InMemoryObjectStorage();
    const url = 'https://cdn.example.com/panels/1.png';
    const bytes = Buffer.from('fetched-bytes');
    const fetcher = vi.fn(async () => new Response(bytes));

    const result = await loadPanelImage(url, storage, fetcher);

    expect(result.equals(bytes)).toBe(true);
    expect(fetcher).toHaveBeenCalledWith(url, 0);
  });

  it('signs a storage path into a media reference URL', () => {
    expect(toReferenceUrl(KEY, MEDIA_URLS)).toBe(
      `https://media.test/${KEY}`
    );
  });

  it('passes http(s) URLs through unchanged as reference URLs', () => {
    const url = 'https://cdn.example.com/covers/front.webp';
    expect(toReferenceUrl(url, MEDIA_URLS)).toBe(url);
  });
});
