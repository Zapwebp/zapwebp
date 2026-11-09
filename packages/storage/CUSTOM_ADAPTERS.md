# Building Custom Storage Adapters

Covers: Implementing the `@zapwebp/storage` `StorageAdapter` interface for cloud providers (AWS S3, Cloudflare R2, Google Cloud Storage, MinIO, Azure Blob).  
Does not cover: Local filesystem storage (see `@zapwebp/core`) or database blob storage.  
Applies to: `@zapwebp/storage` ^1.1.0 and `@zapwebp/plugin-sdk` ^1.1.0.

---

## Overview

`@zapwebp/storage` decouples image conversion from cloud upload targets through a single unified contract: `StorageAdapter`. 

When you wrap an adapter with `withZapwebp(adapter, options)`, Zapwebp intercepts every upload:
1. Validates the source image (rejecting corrupt files, remote entity injections, and script payloads).
2. Converts the image in memory to the target format (default: WebP) preserving alpha transparency.
3. Generates all configured Retina multipliers (`1x`, `2x`, `3x`).
4. Sanitizes EXIF, XMP, and C2PA metadata chunks.
5. Delegates the final upload of the converted buffers to the adapter's `write()` method.

The original file never touches your storage bucket unless `keepOriginal: true` is explicitly configured.

---

## The Contract

Every storage adapter must implement the `StorageAdapter` TypeScript interface exported by `@zapwebp/storage`:

```typescript
import type { StorageAdapter, WriteOptions, WriteResult } from '@zapwebp/storage';

export interface StorageAdapter {
  /** Unique provider identifier for diagnostics and error reporting. */
  readonly name: string;

  /** Write bytes to the bucket. Required. */
  write(
    bucket: string,
    path: string,
    bytes: Uint8Array,
    opts: WriteOptions,
  ): Promise<WriteResult>;

  /** Read bytes from the bucket. Required. */
  read(bucket: string, path: string): Promise<Uint8Array>;

  /** Delete a file from the bucket. Required. */
  delete(bucket: string, path: string): Promise<void>;

  /** Check if a file exists. Optional — enables idempotency checks. */
  exists?(bucket: string, path: string): Promise<boolean>;

  /** List file keys under a prefix. Optional — enables sync and cleanup. */
  list?(bucket: string, prefix: string): Promise<string[]>;
}

export interface WriteOptions {
  /** Target MIME type (e.g. 'image/webp', 'image/avif', 'application/json'). */
  contentType: string;
  /** Cache-Control header string (e.g. 'public, max-age=31536000, immutable'). */
  cacheControl?: string;
  /** Whether to overwrite existing destination files. Default: true. */
  upsert?: boolean;
}

export interface WriteResult {
  /** Normalized destination path within the bucket. */
  path: string;
  /** Total bytes written to the storage target. */
  bytes: number;
  /** Optional public HTTP/HTTPS URL to the uploaded asset. */
  publicUrl?: string;
}
```

---

## Working Implementation: Custom AWS S3 Adapter

Below is a complete, production-ready adapter for AWS S3 (compatible with Cloudflare R2 and MinIO) using the official `@aws-sdk/client-s3`:

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import type { StorageAdapter, WriteOptions, WriteResult } from '@zapwebp/storage';

export interface S3AdapterOptions {
  client: S3Client;
  /** Optional custom public domain (e.g. "https://cdn.example.com"). */
  publicUrlPrefix?: string;
}

/**
 * Creates a Zapwebp StorageAdapter backed by AWS S3 or S3-compatible APIs.
 */
export function s3Adapter(options: S3AdapterOptions): StorageAdapter {
  const { client, publicUrlPrefix } = options;

  return {
    name: 's3',

    async write(bucket: string, key: string, bytes: Uint8Array, opts: WriteOptions): Promise<WriteResult> {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: bytes,
          ContentType: opts.contentType,
          CacheControl: opts.cacheControl || 'public, max-age=31536000, immutable',
        })
      );

      const publicUrl = publicUrlPrefix
        ? `${publicUrlPrefix.replace(/\/$/, '')}/${key}`
        : undefined;

      return {
        path: key,
        bytes: bytes.byteLength,
        publicUrl,
      };
    },

    async read(bucket: string, key: string): Promise<Uint8Array> {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        throw new Error(`S3 GetObject returned empty body for key: ${key}`);
      }

      return response.Body.transformToByteArray();
    },

    async delete(bucket: string, key: string): Promise<void> {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    },

    async exists(bucket: string, key: string): Promise<boolean> {
      try {
        await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );
        return true;
      } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
          return false;
        }
        throw err;
      }
    },

    async list(bucket: string, prefix: string): Promise<string[]> {
      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
        })
      );

      return (response.Contents || []).map((obj) => obj.Key || '').filter(Boolean);
    },
  };
}
```

---

## Usage with withZapwebp

```typescript
import { S3Client } from '@aws-sdk/client-s3';
import { withZapwebp } from '@zapwebp/storage';
import { s3Adapter } from './s3-adapter';

const s3 = new S3Client({ region: 'us-east-1' });

const zap = withZapwebp(
  s3Adapter({ client: s3, publicUrlPrefix: 'https://cdn.example.com' }),
  {
    to: 'webp',
    scale: [1, 2],
    baseWidth: 600,
    quality: 80,
  }
);

// Intercepts and uploads avatar@1x.webp and avatar@2x.webp
await zap.upload('my-bucket', 'avatars/user-123.png', fileBuffer);
```

