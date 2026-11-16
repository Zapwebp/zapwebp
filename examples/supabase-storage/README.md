# Supabase Storage with Zapwebp Starter

Runnable starter template for converting images before upload to Supabase Storage with `@zapwebp/storage`.

## Prerequisites

1. A Supabase project and storage bucket (e.g., `zapwebp-assets`).
2. Node.js 18+.

## Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Fill in your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the upload script:
   ```bash
   npm start
   ```

## Production RLS Setup

Ensure your bucket has Row Level Security (RLS) policies set in Supabase SQL editor:

```sql
CREATE POLICY "Public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'zapwebp-assets');

CREATE POLICY "Auth write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'zapwebp-assets'
    AND auth.role() = 'authenticated'
  );
```
