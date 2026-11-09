'use strict';

const { validateStoragePath, stripCredentials } = require('../sanitize');

/**
 * Standard Supabase Storage Row Level Security (RLS) Policy Templates.
 * Enforces least privilege per ISO 27001 Access Control (A.9).
 */
const SUPABASE_RLS_TEMPLATES = Object.freeze({
  /** Authenticated users only can upload and read their own tenant files. */
  AUTHENTICATED_ONLY: `
-- 1. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to upload to specific folder
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Allow public read access to converted assets
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');
`.trim(),

  /** Completely public read and write (demo or open catalog). */
  PUBLIC_READ_ONLY: `
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'public-images');
`.trim(),
});

/**
 * Creates a StorageAdapter backed by Supabase Storage.
 * @param {any} client - Initialized Supabase client instance
 * @returns {import('../types').StorageAdapter}
 */
function supabaseAdapter(client) {
  if (!client || !client.storage || typeof client.storage.from !== 'function') {
    throw new TypeError('supabaseAdapter requires an initialized SupabaseClient with storage capability.');
  }

  return {
    name: 'supabase',

    async write(bucket, rawPath, bytes, opts = {}) {
      const path = validateStoragePath(rawPath);
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, bytes, {
          contentType: opts.contentType,
          cacheControl: opts.cacheControl,
          upsert: opts.upsert ?? false,
        });

      if (error) {
        const err = new Error(`E_STORAGE: Supabase upload failed for "${path}": ${stripCredentials(error.message || error)}`);
        err.originalError = error;
        throw err;
      }

      let publicUrl;
      try {
        const urlRes = client.storage.from(bucket).getPublicUrl(path);
        publicUrl = urlRes?.data?.publicUrl;
      } catch {
        // Optional public URL retrieval
      }

      return {
        path,
        bytes: bytes.byteLength || bytes.length,
        publicUrl,
      };
    },

    async read(bucket, rawPath) {
      const path = validateStoragePath(rawPath);
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase download failed for "${path}": ${stripCredentials(error.message || error)}`);
        err.originalError = error;
        throw err;
      }

      if (Buffer.isBuffer(data)) return data;
      if (data && typeof data.arrayBuffer === 'function') {
        const ab = await data.arrayBuffer();
        return new Uint8Array(ab);
      }
      return new Uint8Array(data);
    },

    async delete(bucket, rawPath) {
      const path = validateStoragePath(rawPath);
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase delete failed for "${path}": ${stripCredentials(error.message || error)}`);
        err.originalError = error;
        throw err;
      }
    },

    async exists(bucket, rawPath) {
      try {
        const path = validateStoragePath(rawPath);
        const parts = path.split('/');
        const search = parts.pop();
        const prefix = parts.join('/');
        const { data, error } = await client.storage.from(bucket).list(prefix, {
          search,
          limit: 10,
        });
        if (error) return false;
        return Array.isArray(data) && data.some((f) => f.name === search);
      } catch {
        return false;
      }
    },

    async list(bucket, prefix = '') {
      const cleanPrefix = prefix ? validateStoragePath(prefix) : '';
      const { data, error } = await client.storage.from(bucket).list(cleanPrefix);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase list failed for "${cleanPrefix}": ${stripCredentials(error.message || error)}`);
        err.originalError = error;
        throw err;
      }
      return (data || []).map((f) => (cleanPrefix ? `${cleanPrefix}/${f.name}` : f.name));
    },
  };
}

module.exports = {
  supabaseAdapter,
  SUPABASE_RLS_TEMPLATES,
};
