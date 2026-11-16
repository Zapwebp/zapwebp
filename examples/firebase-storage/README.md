# Firebase Storage with Zapwebp Starter

Runnable starter template for converting images before upload to Firebase Storage with `@zapwebp/storage`.

## Prerequisites

1. A Firebase project with Firebase Storage enabled.
2. Node.js 18+.

## Quick Start

1. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
2. Fill in your Firebase web app configuration.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the upload script:
   ```bash
   npm start
   ```

## Production Security Rules

Ensure your Firebase Storage Security Rules protect write boundaries:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{file} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024;
    }
  }
}
```
