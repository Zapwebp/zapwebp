'use strict';

/**
 * Creates a StorageAdapter backed by Neocities HTTP API.
 * Operates without third-party dependencies using Node.js native fetch & FormData.
 * Deliberately omits exists() and list() per Neocities rate and static-host constraints.
 * @param {{ user: string, password: string, site?: string }} opts
 * @returns {import('../types').StorageAdapter}
 */
function neocitiesAdapter(opts) {
  if (!opts || !opts.user || !opts.password) {
    throw new TypeError('neocitiesAdapter requires user and password credentials.');
  }

  const credentials = Buffer.from(`${opts.user}:${opts.password}`).toString('base64');
  const authHeader = `Basic ${credentials}`;
  const siteDomain = `${opts.site || opts.user}.neocities.org`;

  function formatPath(bucket, path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    if (!bucket || bucket === '/') {
      return `/${cleanPath}`;
    }
    const cleanBucket = String(bucket).replace(/^\/+|\/+$/g, '');
    return `/${cleanBucket}/${cleanPath}`;
  }

  return {
    name: 'neocities',

    async write(bucket, path, bytes, writeOpts = {}) {
      const fullPath = formatPath(bucket, path);
      const filename = fullPath.split('/').pop() || 'asset.webp';
      const form = new FormData();
      const blob = new Blob([bytes], { type: writeOpts.contentType || 'image/webp' });

      form.append(fullPath, blob, filename);

      let res;
      try {
        res = await fetch('https://neocities.org/api/upload', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: form,
        });
      } catch (err) {
        throw new Error(`E_STORAGE: Neocities network failure during upload of "${fullPath}": ${err.message}`);
      }

      if (res.status === 401) {
        throw new Error('E_AUTH: Neocities authentication failed. Check user and password credentials.');
      }
      if (res.status === 429) {
        throw new Error('E_RATE_LIMIT: Neocities rate limit exceeded (10 requests/minute max).');
      }
      if (!res.ok) {
        let errorDetail = '';
        try {
          const json = await res.json();
          errorDetail = json.message || '';
        } catch {
          // Ignore JSON parse error on non-OK response
        }
        throw new Error(`E_STORAGE: Neocities upload failed with HTTP ${res.status}${errorDetail ? `: ${errorDetail}` : ''}`);
      }

      return {
        path: fullPath,
        bytes: bytes.byteLength || bytes.length,
        publicUrl: `https://${siteDomain}${fullPath}`,
      };
    },

    async delete(bucket, path) {
      const fullPath = formatPath(bucket, path);
      const form = new FormData();
      form.append('filenames[]', fullPath);

      let res;
      try {
        res = await fetch('https://neocities.org/api/delete', {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: form,
        });
      } catch (err) {
        throw new Error(`E_STORAGE: Neocities network failure during delete of "${fullPath}": ${err.message}`);
      }

      if (res.status === 401) {
        throw new Error('E_AUTH: Neocities authentication failed. Check user and password credentials.');
      }
      if (res.status === 429) {
        throw new Error('E_RATE_LIMIT: Neocities rate limit exceeded.');
      }
      if (!res.ok) {
        throw new Error(`E_STORAGE: Neocities delete failed with HTTP ${res.status}`);
      }
    },

    async read(bucket, path) {
      const fullPath = formatPath(bucket, path);
      const url = `https://${siteDomain}${fullPath}`;

      let res;
      try {
        res = await fetch(url);
      } catch (err) {
        throw new Error(`E_STORAGE: Neocities network failure during read of "${fullPath}": ${err.message}`);
      }

      if (res.status === 404) {
        throw new Error(`E_STORAGE: Neocities file not found: "${fullPath}"`);
      }
      if (!res.ok) {
        throw new Error(`E_STORAGE: Neocities read failed with HTTP ${res.status}`);
      }

      const ab = await res.arrayBuffer();
      return new Uint8Array(ab);
    },
  };
}

module.exports = {
  neocitiesAdapter,
};
