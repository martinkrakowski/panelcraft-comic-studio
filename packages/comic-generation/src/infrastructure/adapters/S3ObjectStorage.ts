import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type {
  ObjectStoragePort,
  StoredObject,
} from '../../application/ports/out/object-storage.out-port.js';

export interface S3ObjectStorageOptions {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

const DELETE_BATCH_SIZE = 1000;

type SdkError = Error & {
  $metadata?: { httpStatusCode?: number };
  statusCode?: number;
};

function isSdkError(err: unknown): err is SdkError {
  return err instanceof Error;
}

function hasHttpStatus(err: SdkError, status: number): boolean {
  return err.$metadata?.httpStatusCode === status || err.statusCode === status;
}

/**
 * S3-compatible object storage adapter (OCI Object Storage, MinIO, AWS S3).
 *
 * Implements ObjectStoragePort on top of `@aws-sdk/client-s3`. The browser
 * will never talk to this adapter directly (OCI has no bucket CORS) — a later
 * lane adds an API route that streams objects.
 */
export class S3ObjectStorage implements ObjectStoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(options: S3ObjectStorageOptions) {
    this.bucket = options.bucket;
    this.client = new S3Client({
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle,
      // SDK >= 3.729 sends CRC checksums (aws-chunked for streams) by default; OCI and other
      // non-AWS S3 services reject that ("AWS chunked encoding not supported").
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }

  /**
   * Build an adapter from environment variables. Throws a clear error naming
   * the first missing variable (never its value).
   */
  static fromEnv(env: NodeJS.ProcessEnv = process.env): S3ObjectStorage {
    const missing = [
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
    ].find((name) => !env[name]);
    if (missing) {
      throw new Error(`Missing ${missing} environment variable`);
    }

    const forcePathStyle =
      env.S3_FORCE_PATH_STYLE === undefined ||
      env.S3_FORCE_PATH_STYLE.toLowerCase() === 'true';

    return new S3ObjectStorage({
      endpoint: env.S3_ENDPOINT!,
      region: env.S3_REGION!,
      bucket: env.S3_BUCKET!,
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      forcePathStyle,
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    // No IfNoneMatch: an existing object under the same key is silently
    // replaced (upsert:true semantics).
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async putNew(key: string, body: Buffer, contentType: string): Promise<void> {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          IfNoneMatch: '*',
        })
      );
    } catch (err) {
      if (isSdkError(err) && hasHttpStatus(err, 412)) {
        throw new Error(`Object already exists at key "${key}"`);
      }
      throw err;
    }
  }

  async get(key: string): Promise<StoredObject | null> {
    let response;
    try {
      response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch (err) {
      if (
        isSdkError(err) &&
        (err.name === 'NoSuchKey' || hasHttpStatus(err, 404))
      ) {
        return null;
      }
      throw err;
    }

    const byteArray = response.Body
      ? await response.Body.transformToByteArray()
      : new Uint8Array();
    return {
      body: Buffer.from(byteArray),
      contentType: response.ContentType ?? 'application/octet-stream',
      contentLength: response.ContentLength ?? byteArray.byteLength,
      etag: response.ETag,
    };
  }

  async remove(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
      const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
      const output = await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: batch.map((key) => ({ Key: key })) },
        })
      );

      const fatal = (output.Errors ?? []).filter(
        (error) => error.Code !== 'NoSuchKey' && error.Code !== 'NotFound'
      );
      if (fatal.length > 0) {
        throw new Error(
          `Failed to delete ${fatal.length} object(s) from bucket "${this.bucket}": ` +
            fatal.map((error) => error.Message ?? error.Code).join('; ')
        );
      }
    }
  }

  async listKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const output = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      for (const object of output.Contents ?? []) {
        if (object.Key) keys.push(object.Key);
      }

      continuationToken = output.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }
}
