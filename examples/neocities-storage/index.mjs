import { withZapwebp, neocitiesAdapter, createPool } from '@zapwebp/storage';

const user = process.env.NEOCITIES_USER;
const password = process.env.NEOCITIES_PASSWORD;
const site = process.env.NEOCITIES_SITE || user;

if (!user || !password) {
  console.log('Notice: NEOCITIES_USER and NEOCITIES_PASSWORD are not set in environment.');
  console.log('Copy .env.example to .env and configure real credentials to upload.');
  process.exit(0);
}

const zap = withZapwebp(
  neocitiesAdapter({
    user,
    password,
    site,
  }),
  {
    targetFormat: 'webp',
    quality: 85,
    clean: true,
  }
);

const sampleSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><polygon points="50,15 90,85 10,85" fill="#8dc63f"/></svg>',
  'utf8'
);

console.log('Uploading images/logo.svg to Neocities...');
const result = await zap.upload('/', 'images/logo.svg', sampleSvg);
console.log('Upload result:', result);

// Neocities rate limit: 10 uploads/min
const pool = createPool(zap, {
  concurrency: 1,
  rateLimit: { maxPerInterval: 10, intervalMs: 60000 },
});

const batchResults = await pool.uploadMany('/', [
  { path: 'images/badge.svg', bytes: sampleSvg },
]);
console.log(`Uploaded ${batchResults.length} assets with rate-limited pool.`);
