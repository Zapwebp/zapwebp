'use strict';

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

    async write(bucket, path, bytes, opts = {}) {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(path, bytes, {
          contentType: opts.contentType,
          cacheControl: opts.cacheControl,
          upsert: opts.upsert ?? false,
        });

      if (error) {
        const err = new Error(`E_STORAGE: Supabase upload failed for "${path}": ${error.message || error}`);
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

    async read(bucket, path) {
      const { data, error } = await client.storage.from(bucket).download(path);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase download failed for "${path}": ${error.message || error}`);
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

    async delete(bucket, path) {
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase delete failed for "${path}": ${error.message || error}`);
        err.originalError = error;
        throw err;
      }
    },

    async exists(bucket, path) {
      try {
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
      const { data, error } = await client.storage.from(bucket).list(prefix);
      if (error) {
        const err = new Error(`E_STORAGE: Supabase list failed for "${prefix}": ${error.message || error}`);
        err.originalError = error;
        throw err;
      }
      return (data || []).map((f) => (prefix ? `${prefix}/${f.name}` : f.name));
    },
  };
}

module.exports = {
  supabaseAdapter,
};
