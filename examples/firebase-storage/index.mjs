import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { withZapwebp, firebaseAdapter, createPool } from '@zapwebp/storage';

const apiKey = process.env.FIREBASE_API_KEY;
if (!apiKey) {
  console.log('Notice: FIREBASE_API_KEY is not set in environment.');
  console.log('Copy .env.example to .env and configure real credentials to upload.');
  process.exit(0);
}

const app = initializeApp({
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
});

const storage = getStorage(app);
const zap = withZapwebp(firebaseAdapter(storage), {
  targetFormat: 'webp',
  quality: 85,
  clean: true,
});

const sampleSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" rx="20" fill="#8dc63f"/></svg>',
  'utf8'
);

console.log('Uploading products/hero.svg to Firebase Storage...');
const result = await zap.upload('products', 'hero.svg', sampleSvg);
console.log('Upload result:', result);

const pool = createPool(zap, { concurrency: 4 });
const batchResults = await pool.uploadMany('products', [
  { path: 'banner.svg', bytes: sampleSvg },
]);
console.log(`Batch upload finished with ${batchResults.length} assets.`);
