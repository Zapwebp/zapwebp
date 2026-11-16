import { createClient } from '@supabase/supabase-js';
import { withZapwebp, supabaseAdapter, createPool } from '@zapwebp/storage';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const bucket = process.env.SUPABASE_BUCKET || 'zapwebp-assets';

if (!url || !key) {
  console.log('Notice: SUPABASE_URL and SUPABASE_ANON_KEY are not set in environment.');
  console.log('Copy .env.example to .env and configure real credentials to upload.');
  process.exit(0);
}

const supabase = createClient(url, key);
const zap = withZapwebp(supabaseAdapter(supabase), {
  targetFormat: 'webp',
  quality: 85,
  clean: true,
});

// Sample SVG asset
const sampleSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#8dc63f"/></svg>',
  'utf8'
);

console.log(`Uploading logo.svg to ${bucket}...`);
const result = await zap.upload(bucket, 'logo.svg', sampleSvg);
console.log('Upload completed:', result);

// Batch pool example
const pool = createPool(zap, { concurrency: 4 });
const batchResults = await pool.uploadMany(bucket, [
  { path: 'batch/icon1.svg', bytes: sampleSvg },
  { path: 'batch/icon2.svg', bytes: sampleSvg },
]);
console.log(`Uploaded ${batchResults.length} assets with pool.`);
