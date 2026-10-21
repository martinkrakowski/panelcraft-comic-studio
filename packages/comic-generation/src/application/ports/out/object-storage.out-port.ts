/**
 * Outbound port for object storage (currently Supabase Storage; target is
 * OCI Object Storage via its S3-compatible API).
 *
 * Implement this interface to swap between object storage backends without
 * touching domain or application code. The port mirrors every operation the
 * comic workflow uses today:
 *   - upload with `upsert: false` semantics (putNew)
 *   - read-by-path (get)
 *   - recursive delete of all objects under a project prefix (listKeys + remove)
 */
export interface StoredObject {
  body: Buffer;
  contentType: string;
  contentLength: number;
  etag?: string;
}

export interface ObjectStoragePort {
  /** Fails if the key exists (Supabase used upsert:false). */
  putNew(key: string, body: Buffer, contentType: string): Promise<void>;

  /** null when missing */
  get(key: string): Promise<StoredObject | null>;

  /** Missing keys are not an error; batches of ≤1000. */
  remove(keys: string[]): Promise<void>;

  /** All keys under prefix, paginated internally. */
  listKeys(prefix: string): Promise<string[]>;
}
