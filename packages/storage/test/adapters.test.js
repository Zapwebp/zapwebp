'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  supabaseAdapter,
  firebaseAdapter,
  firebaseAdminAdapter,
  neocitiesAdapter,
} = require('../src');

// ---------------------------------------------------------------------------
// 1. Supabase Adapter Tests
// ---------------------------------------------------------------------------

test('Adapters: supabaseAdapter validates client shape', () => {
  assert.throws(() => supabaseAdapter(null), /SupabaseClient/);
  assert.throws(() => supabaseAdapter({}), /SupabaseClient/);
});

test('Adapters: supabaseAdapter executes write, read, delete, exists, and list', async () => {
  const store = new Map();

  const mockClient = {
    storage: {
      from(bucket) {
        return {
          async upload(path, bytes, opts) {
            store.set(`${bucket}:${path}`, bytes);
            return { data: { path }, error: null };
          },
          async download(path) {
            const data = store.get(`${bucket}:${path}`);
            if (!data) return { data: null, error: new Error('Not found') };
            return {
              data: {
                async arrayBuffer() {
                  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
                },
              },
              error: null,
            };
          },
          async remove(paths) {
            for (const p of paths) {
              store.delete(`${bucket}:${p}`);
            }
            return { data: paths, error: null };
          },
          async list(prefix, opts) {
            const results = [];
            for (const key of store.keys()) {
              const [b, p] = key.split(':');
              if (b === bucket) {
                const name = p.split('/').pop();
                if (!opts?.search || name === opts.search) {
                  results.push({ name });
                }
              }
            }
            return { data: results, error: null };
          },
          getPublicUrl(path) {
            return { data: { publicUrl: `https://supabase.co/storage/v1/${bucket}/${path}` } };
          },
        };
      },
    },
  };

  const adapter = supabaseAdapter(mockClient);
  assert.equal(adapter.name, 'supabase');

  // 1. write
  const testBytes = Buffer.from('supabase-payload');
  const writeRes = await adapter.write('avatars', 'user.webp', testBytes, {
    contentType: 'image/webp',
    cacheControl: 'max-age=3600',
  });
  assert.equal(writeRes.path, 'user.webp');
  assert.equal(writeRes.bytes, testBytes.length);
  assert.equal(writeRes.publicUrl, 'https://supabase.co/storage/v1/avatars/user.webp');

  // 2. exists
  const exists = await adapter.exists('avatars', 'user.webp');
  assert.equal(exists, true);

  // 3. read
  const readBytes = await adapter.read('avatars', 'user.webp');
  assert.deepEqual(readBytes, new Uint8Array(testBytes));

  // 4. list
  const list = await adapter.list('avatars', '');
  assert.ok(list.includes('user.webp'));

  // 5. delete
  await adapter.delete('avatars', 'user.webp');
  const existsAfter = await adapter.exists('avatars', 'user.webp');
  assert.equal(existsAfter, false);
});

// ---------------------------------------------------------------------------
// 2. Firebase Client Adapter Tests (Modular SDK)
// ---------------------------------------------------------------------------

test('Adapters: firebaseAdapter validates storage instance', () => {
  assert.throws(() => firebaseAdapter(null), /FirebaseStorage/);
});

test('Adapters: firebaseAdapter executes modular client SDK functions', async () => {
  const store = new Map();
  const mockStorage = { app: 'mock-app' };

  const mockSdk = {
    ref(storage, fullPath) {
      return { storage, fullPath };
    },
    async uploadBytes(fileRef, bytes, metadata) {
      store.set(fileRef.fullPath, bytes);
      return {
        metadata: { size: bytes.length, ...metadata },
      };
    },
    async getBytes(fileRef) {
      const data = store.get(fileRef.fullPath);
      if (!data) throw new Error('Not found');
      return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    },
    async deleteObject(fileRef) {
      store.delete(fileRef.fullPath);
    },
    async getDownloadURL(fileRef) {
      return `https://firebasestorage.googleapis.com/v0/b/${fileRef.fullPath}`;
    },
    async listAll(folderRef) {
      const items = [];
      for (const key of store.keys()) {
        if (key.startsWith(folderRef.fullPath)) {
          items.push({ fullPath: key });
        }
      }
      return { items };
    },
  };

  const adapter = firebaseAdapter(mockStorage, mockSdk);
  assert.equal(adapter.name, 'firebase');

  const testBytes = Buffer.from('firebase-payload');
  const writeRes = await adapter.write('my-bucket', 'photos/cat.webp', testBytes, {
    contentType: 'image/webp',
  });
  assert.equal(writeRes.path, 'photos/cat.webp');
  assert.equal(writeRes.bytes, testBytes.length);
  assert.ok(writeRes.publicUrl.includes('photos/cat.webp'));

  // exists
  const exists = await adapter.exists('my-bucket', 'photos/cat.webp');
  assert.equal(exists, true);

  // read
  const readBytes = await adapter.read('my-bucket', 'photos/cat.webp');
  assert.deepEqual(readBytes, new Uint8Array(testBytes));

  // list
  const list = await adapter.list('my-bucket', 'photos');
  assert.ok(list.includes('my-bucket/photos/cat.webp'));

  // delete
  await adapter.delete('my-bucket', 'photos/cat.webp');
  const existsAfter = await adapter.exists('my-bucket', 'photos/cat.webp');
  assert.equal(existsAfter, false);
});

// ---------------------------------------------------------------------------
// 3. Firebase Admin Adapter Tests
// ---------------------------------------------------------------------------

test('Adapters: firebaseAdminAdapter executes bucket and file operations', async () => {
  const store = new Map();

  const mockAdminStorage = {
    bucket(bucketName) {
      return {
        file(path) {
          return {
            async save(buf, opts) {
              store.set(`${bucketName}:${path}`, buf);
            },
            async download() {
              const data = store.get(`${bucketName}:${path}`);
              if (!data) throw new Error('Not found');
              return [data];
            },
            async delete(opts) {
              store.delete(`${bucketName}:${path}`);
            },
            async exists() {
              return [store.has(`${bucketName}:${path}`)];
            },
            publicUrl() {
              return `https://storage.googleapis.com/${bucketName}/${path}`;
            },
          };
        },
        async getFiles(opts) {
          const files = [];
          for (const key of store.keys()) {
            const [b, p] = key.split(':');
            if (b === bucketName && (!opts.prefix || p.startsWith(opts.prefix))) {
              files.push({ name: p });
            }
          }
          return [files];
        },
      };
    },
  };

  // Automatically detects storage.bucket
  const adapter = firebaseAdapter(mockAdminStorage);
  assert.equal(adapter.name, 'firebase');

  const testBytes = Buffer.from('admin-payload');
  const writeRes = await adapter.write('assets', 'banner.webp', testBytes, {
    contentType: 'image/webp',
  });
  assert.equal(writeRes.path, 'banner.webp');
  assert.equal(writeRes.publicUrl, 'https://storage.googleapis.com/assets/banner.webp');

  const exists = await adapter.exists('assets', 'banner.webp');
  assert.equal(exists, true);

  const readBytes = await adapter.read('assets', 'banner.webp');
  assert.deepEqual(readBytes, new Uint8Array(testBytes));

  const list = await adapter.list('assets', '');
  assert.ok(list.includes('banner.webp'));

  await adapter.delete('assets', 'banner.webp');
  const existsAfter = await adapter.exists('assets', 'banner.webp');
  assert.equal(existsAfter, false);
});

// ---------------------------------------------------------------------------
// 4. Neocities Adapter Tests
// ---------------------------------------------------------------------------

test('Adapters: neocitiesAdapter validates credentials', () => {
  assert.throws(() => neocitiesAdapter(null), /credentials/);
  assert.throws(() => neocitiesAdapter({ user: 'foo' }), /credentials/);
});

test('Adapters: neocitiesAdapter handles upload, read, and delete via fetch', async () => {
  const originalFetch = global.fetch;
  const requests = [];

  global.fetch = async (url, options = {}) => {
    requests.push({ url, options });

    if (url === 'https://neocities.org/api/upload') {
      return {
        ok: true,
        status: 200,
        async json() { return { result: 'success' }; },
      };
    }

    if (url === 'https://neocities.org/api/delete') {
      return {
        ok: true,
        status: 200,
        async json() { return { result: 'success' }; },
      };
    }

    if (url.includes('neocities.org/')) {
      return {
        ok: true,
        status: 200,
        async arrayBuffer() {
          return Buffer.from('site-content').buffer;
        },
      };
    }

    return { ok: false, status: 404 };
  };

  try {
    const adapter = neocitiesAdapter({
      user: 'mysite',
      password: 'secretpassword',
    });

    assert.equal(adapter.name, 'neocities');
    // Verify exists and list are omitted by design
    assert.equal(adapter.exists, undefined);
    assert.equal(adapter.list, undefined);

    // 1. write
    const testBytes = Buffer.from('neocities-img');
    const writeRes = await adapter.write('/', 'icons/logo.webp', testBytes, {
      contentType: 'image/webp',
    });
    assert.equal(writeRes.path, '/icons/logo.webp');
    assert.equal(writeRes.publicUrl, 'https://mysite.neocities.org/icons/logo.webp');
    assert.equal(requests[0].url, 'https://neocities.org/api/upload');
    assert.ok(requests[0].options.headers.Authorization.startsWith('Basic '));

    // 2. read
    const readBytes = await adapter.read('/', 'icons/logo.webp');
    assert.ok(readBytes.length > 0);

    // 3. delete
    await adapter.delete('/', 'icons/logo.webp');
    assert.equal(requests[requests.length - 1].url, 'https://neocities.org/api/delete');
  } finally {
    global.fetch = originalFetch;
  }
});

test('Adapters: neocitiesAdapter maps HTTP 429 to E_RATE_LIMIT and 401 to E_AUTH', async () => {
  const originalFetch = global.fetch;

  try {
    const adapter = neocitiesAdapter({ user: 'u', password: 'p' });

    // 429 Rate limit test
    global.fetch = async () => ({
      ok: false,
      status: 429,
      async json() { return { message: 'Too many requests' }; },
    });
    await assert.rejects(
      () => adapter.write('/', 'test.webp', Buffer.from('x')),
      /E_RATE_LIMIT/,
    );

    // 401 Auth test
    global.fetch = async () => ({
      ok: false,
      status: 401,
      async json() { return { message: 'Unauthorized' }; },
    });
    await assert.rejects(
      () => adapter.write('/', 'test.webp', Buffer.from('x')),
      /E_AUTH/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
