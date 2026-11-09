'use strict';

/**
 * Creates a StorageAdapter backed by Firebase Client or Admin Storage.
 * Supports modular Firebase v9+ client SDK functions and firebase-admin/storage instances.
 * @param {any} storage - FirebaseStorage client or Firebase Admin storage instance
 * @param {object} [sdk] - Optional explicit firebase/storage modular functions { ref, uploadBytes, getBytes, deleteObject, getDownloadURL, listAll }
 * @returns {import('../types').StorageAdapter}
 */
function firebaseAdapter(storage, sdk) {
  if (!storage) {
    throw new TypeError('firebaseAdapter requires an initialized FirebaseStorage instance.');
  }

  // Detect Firebase Admin SDK (storage.bucket method)
  if (typeof storage.bucket === 'function') {
    return firebaseAdminAdapter(storage);
  }

  let modularSdk = sdk;
  if (!modularSdk) {
    try {
      // eslint-disable-next-line global-require
      modularSdk = require('firebase/storage');
    } catch {
      // SDK not globally resolvable; checked on invocation
    }
  }

  return {
    name: 'firebase',

    async write(bucket, path, bytes, opts = {}) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.uploadBytes !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage writes.');
      }

      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      const snapshot = await modularSdk.uploadBytes(fileRef, bytes, {
        contentType: opts.contentType,
        cacheControl: opts.cacheControl,
      });

      let publicUrl;
      if (typeof modularSdk.getDownloadURL === 'function') {
        try {
          publicUrl = await modularSdk.getDownloadURL(fileRef);
        } catch {
          // Public URL generation optional
        }
      }

      return {
        path,
        bytes: snapshot?.metadata?.size ?? bytes.byteLength ?? bytes.length,
        publicUrl,
      };
    },

    async read(bucket, path) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.getBytes !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage reads.');
      }
      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      const ab = await modularSdk.getBytes(fileRef);
      return new Uint8Array(ab);
    },

    async delete(bucket, path) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.deleteObject !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage deletes.');
      }
      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      await modularSdk.deleteObject(fileRef);
    },

    async exists(bucket, path) {
      if (!modularSdk || typeof modularSdk.ref !== 'function') return false;
      try {
        const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
        if (typeof modularSdk.getBytes === 'function') {
          await modularSdk.getBytes(fileRef, 1);
          return true;
        }
        if (typeof modularSdk.getDownloadURL === 'function') {
          await modularSdk.getDownloadURL(fileRef);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    async list(bucket, prefix = '') {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.listAll !== 'function') {
        return [];
      }
      const folderRef = modularSdk.ref(storage, `${bucket}/${prefix}`);
      const res = await modularSdk.listAll(folderRef);
      return (res.items || []).map((i) => i.fullPath || i.name);
    },
  };
}

/**
 * Creates a StorageAdapter backed by firebase-admin/storage (server-side).
 * @param {any} storage - Initialized getStorage() from firebase-admin/storage
 * @returns {import('../types').StorageAdapter}
 */
function firebaseAdminAdapter(storage) {
  if (!storage || typeof storage.bucket !== 'function') {
    throw new TypeError('firebaseAdminAdapter requires an initialized firebase-admin/storage instance.');
  }

  return {
    name: 'firebase',

    async write(bucketName, path, bytes, opts = {}) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

      await file.save(buffer, {
        contentType: opts.contentType,
        metadata: {
          cacheControl: opts.cacheControl,
        },
        resumable: false,
      });

      let publicUrl;
      try {
        publicUrl = typeof file.publicUrl === 'function' ? file.publicUrl() : undefined;
      } catch {
        // Optional
      }

      return {
        path,
        bytes: buffer.length,
        publicUrl,
      };
    },

    async read(bucketName, path) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      const [buffer] = await file.download();
      return new Uint8Array(buffer);
    },

    async delete(bucketName, path) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (err) {
        if (err.code !== 404) throw err;
      }
    },

    async exists(bucketName, path) {
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      const [exists] = await file.exists();
      return Boolean(exists);
    },

    async list(bucketName, prefix = '') {
      const bucket = storage.bucket(bucketName);
      const [files] = await bucket.getFiles({ prefix });
      return (files || []).map((f) => f.name);
    },
  };
}

module.exports = {
  firebaseAdapter,
  firebaseAdminAdapter,
};
