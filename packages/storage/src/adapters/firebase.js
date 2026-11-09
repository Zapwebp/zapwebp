'use strict';

const { validateStoragePath, stripCredentials } = require('../sanitize');

/**
 * Standard Firebase Storage Security Rules Templates.
 * Enforces least privilege per ISO 27001 Access Control (A.9).
 */
const FIREBASE_RULES_TEMPLATES = Object.freeze({
  AUTHENTICATED_ONLY: `
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                   && request.resource.size < 5 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
    }
  }
}
`.trim(),
});

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

    async write(bucket, rawPath, bytes, opts = {}) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.uploadBytes !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage writes.');
      }

      const path = validateStoragePath(rawPath);
      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      let snapshot;
      try {
        snapshot = await modularSdk.uploadBytes(fileRef, bytes, {
          contentType: opts.contentType,
          cacheControl: opts.cacheControl,
        });
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase upload failed for "${path}": ${stripCredentials(err.message || err)}`);
      }

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

    async read(bucket, rawPath) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.getBytes !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage reads.');
      }
      const path = validateStoragePath(rawPath);
      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      try {
        const ab = await modularSdk.getBytes(fileRef);
        return new Uint8Array(ab);
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase download failed for "${path}": ${stripCredentials(err.message || err)}`);
      }
    },

    async delete(bucket, rawPath) {
      if (!modularSdk || typeof modularSdk.ref !== 'function' || typeof modularSdk.deleteObject !== 'function') {
        throw new Error('E_STORAGE: firebase/storage modular SDK functions are required for client storage deletes.');
      }
      const path = validateStoragePath(rawPath);
      const fileRef = modularSdk.ref(storage, `${bucket}/${path}`);
      try {
        await modularSdk.deleteObject(fileRef);
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase delete failed for "${path}": ${stripCredentials(err.message || err)}`);
      }
    },

    async exists(bucket, rawPath) {
      if (!modularSdk || typeof modularSdk.ref !== 'function') return false;
      try {
        const path = validateStoragePath(rawPath);
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
      const cleanPrefix = prefix ? validateStoragePath(prefix) : '';
      const folderRef = modularSdk.ref(storage, `${bucket}/${cleanPrefix}`);
      try {
        const res = await modularSdk.listAll(folderRef);
        return (res.items || []).map((i) => i.fullPath || i.name);
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase list failed for "${cleanPrefix}": ${stripCredentials(err.message || err)}`);
      }
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

    async write(bucketName, rawPath, bytes, opts = {}) {
      const path = validateStoragePath(rawPath);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);

      try {
        await file.save(buffer, {
          contentType: opts.contentType,
          metadata: {
            cacheControl: opts.cacheControl,
          },
          resumable: false,
        });
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase Admin upload failed for "${path}": ${stripCredentials(err.message || err)}`);
      }

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

    async read(bucketName, rawPath) {
      const path = validateStoragePath(rawPath);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      try {
        const [buffer] = await file.download();
        return new Uint8Array(buffer);
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase Admin download failed for "${path}": ${stripCredentials(err.message || err)}`);
      }
    },

    async delete(bucketName, rawPath) {
      const path = validateStoragePath(rawPath);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      try {
        await file.delete({ ignoreNotFound: true });
      } catch (err) {
        if (err.code !== 404) {
          throw new Error(`E_STORAGE: Firebase Admin delete failed for "${path}": ${stripCredentials(err.message || err)}`);
        }
      }
    },

    async exists(bucketName, rawPath) {
      const path = validateStoragePath(rawPath);
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(path);
      try {
        const [exists] = await file.exists();
        return Boolean(exists);
      } catch {
        return false;
      }
    },

    async list(bucketName, prefix = '') {
      const cleanPrefix = prefix ? validateStoragePath(prefix) : '';
      const bucket = storage.bucket(bucketName);
      try {
        const [files] = await bucket.getFiles({ prefix: cleanPrefix });
        return (files || []).map((f) => f.name);
      } catch (err) {
        throw new Error(`E_STORAGE: Firebase Admin list failed for "${cleanPrefix}": ${stripCredentials(err.message || err)}`);
      }
    },
  };
}

module.exports = {
  firebaseAdapter,
  firebaseAdminAdapter,
  FIREBASE_RULES_TEMPLATES,
};
