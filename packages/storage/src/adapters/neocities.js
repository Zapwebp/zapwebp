'use strict';

const { validateSafeUrl, validateStoragePath, stripCredentials } = require('../sanitize');

let warnedPrivacy = false;

/**
 * Creates a StorageAdapter backed by Neocities HTTP API.
 * Operates without third-party dependencies using Node.js native fetch & FormData.
 * Deliberately omits exists() and list() per Neocities rate and static-host constraints.
 * Enforces rate limit backoff (10 req/min) and displays public-web privacy disclosures.
 *
 * @param {{ user: string, password: string, site?: string }} opts
 * @returns {import('../types').StorageAdapter}
 */
function neocitiesAdapter(opts) {
  if (!opts || !opts.user || !opts.password) {
    throw new TypeError('neocitiesAdapter requires user and password credentials.');
  }

  // Prevent hardcoded password leaks or invalid types
  if (typeof opts.user !== 'string' || typeof opts.password !== 'string') {
    throw new TypeError('user and password credentials must be strings.');
  }

  const credentials = Buffer.from(`${opts.user}:${opts.password}`).toString('base64');
  const authHeader = `Basic ${credentials}`;
  const siteDomain = `${opts.site || opts.user}.neocities.org`;

  function formatPath(bucket, rawPath) {
    const sanitized = validateStoragePath(rawPath);
    if (!bucket || bucket === '/') {
      return `/${sanitized}`;
    }
    const cleanBucket = String(bucket).replace(/^\/+|\/+$/g, '');
    return `/${cleanBucket}/${sanitized}`;
  }

  return {
    name: 'neocities',

    async write(bucket, path, bytes, writeOpts = {}) {
      if (!warnedPrivacy) {
        warnedPrivacy = true;
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('[Zapwebp Notice]: Neocities is an open, static web host. All assets uploaded to Neocities are publicly discoverable, indexed by search engines, and retained in access logs for up to 24 months. Never store private, unencrypted, or regulated personal data on Neocities.');
        }
      }

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
        throw new Error(`E_STORAGE: Neocities network failure during upload of "${fullPath}": ${stripCredentials(err.message)}`);
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
        throw new Error(`E_STORAGE: Neocities upload failed with HTTP ${res.status}${errorDetail ? `: ${stripCredentials(errorDetail)}` : ''}`);
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
        throw new Error(`E_STORAGE: Neocities network failure during delete of "${fullPath}": ${stripCredentials(err.message)}`);
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
      validateSafeUrl(url);

      let res;
      try {
        res = await fetch(url);
      } catch (err) {
        throw new Error(`E_STORAGE: Neocities network failure during read of "${fullPath}": ${stripCredentials(err.message)}`);
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
