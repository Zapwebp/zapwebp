const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { convertImage, convertSvgToWebp, INPUT_FORMATS } = require('@zapwebp/core');
const { createApiRouter } = require('@zapwebp/api');
const { DEFAULT_PORT, MAX_DIMENSION: MAX_ALLOWED_WIDTH } = require('@zapwebp/shared');

const app = express();

app.use((req, res, next) => {
  // 1. Explicit query parameter passed by Vercel rewrite rules
  const parsed = new URL(req.url, 'http://localhost');
  const zapUrl = parsed.searchParams.get('__zap_url');
  if (zapUrl) {
    parsed.searchParams.delete('__zap_url');
    const remaining = parsed.searchParams.toString();
    req.url = zapUrl + (remaining ? `?${remaining}` : '');
    return next();
  }

  // 2. Check headers passed by proxies / Vercel (excluding literal /server.js)
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-url'] || req.headers['x-rewrite-url'];
  if (forwarded && forwarded !== '/server.js') {
    req.url = forwarded;
    return next();
  }

  // 3. If req.url starts with /server.js, strip the script name
  if (req.url === '/server.js') {
    req.url = '/';
  } else if (req.url.startsWith('/server.js/')) {
    req.url = req.url.slice(10);
  } else if (req.url.startsWith('/server.js?')) {
    req.url = '/' + req.url.slice(10);
  }

  next();
});
const MEBIBYTE = 1024 * 1024;
const IS_VERCEL = process.env.VERCEL === '1';
const DEFAULT_MAX_FILE_BYTES = IS_VERCEL ? 4 * MEBIBYTE : 5 * MEBIBYTE;

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

const port = readPositiveInteger('PORT', DEFAULT_PORT);
if (port > 65535) throw new Error('PORT must not exceed 65535.');
const maxFileBytes = readPositiveInteger('MAX_FILE_BYTES', DEFAULT_MAX_FILE_BYTES);
const maxBatchBytes = readPositiveInteger('MAX_BATCH_BYTES', IS_VERCEL ? 4 * MEBIBYTE : maxFileBytes * 20);
const maxResponseBytes = IS_VERCEL ? 3 * MEBIBYTE : Number.POSITIVE_INFINITY;
const maxWidth = Math.min(readPositiveInteger('MAX_WIDTH', MAX_ALLOWED_WIDTH), MAX_ALLOWED_WIDTH);
if (maxWidth < 512) throw new Error('MAX_WIDTH must be at least 512.');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxFileBytes, files: 20, fields: 5, fieldSize: 1024, parts: 25 },
  fileFilter: (_req, file, done) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isSupported = INPUT_FORMATS.some((fmt) => {
      const allowed = fmt === 'jpeg' ? ['.jpg', '.jpeg'] : fmt === 'tiff' ? ['.tif', '.tiff'] : [`.${fmt}`];
      return allowed.includes(ext);
    });
    if (!isSupported) {
      return done(new Error(`Supported formats: ${INPUT_FORMATS.join(', ')}.`));
    }
    done(null, true);
  },
});

const fs = require('node:fs');
const contentDir = path.join(__dirname, 'content');

// Raw markdown endpoints for agentic-ready docs
app.get('/:page.md', (req, res, next) => {
  const filePath = path.join(contentDir, `${req.params.page}.md`);
  if (fs.existsSync(filePath)) {
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.sendFile(filePath);
  }
  next();
});

app.get('/plugins/:page.md', (req, res, next) => {
  const filePath = path.join(contentDir, 'plugins', `${req.params.page}.md`);
  if (fs.existsSync(filePath)) {
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.sendFile(filePath);
  }
  next();
});

app.get('/sdk/:page.md', (req, res, next) => {
  const filePath = path.join(contentDir, 'sdk', `${req.params.page}.md`);
  if (fs.existsSync(filePath)) {
    res.set('Content-Type', 'text/markdown; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    return res.sendFile(filePath);
  }
  next();
});

app.get('/feed.xml', (_req, res) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Zapwebp Changelog</title>
    <link>https://zapwebp.vercel.app</link>
    <description>Universal transparency-safe image conversion engine releases and updates</description>
    <language>en-us</language>
    <lastBuildDate>Wed, 04 Nov 2026 12:00:00 GMT</lastBuildDate>
    <atom:link href="https://zapwebp.vercel.app/feed.xml" rel="self" type="application/rss+xml"/>
    <item>
      <title>Zapwebp 2.1.0 — SDKs, Open VSX Registry, and Live Re-conversion</title>
      <link>https://zapwebp-docs.vercel.app/docs</link>
      <guid>https://zapwebp.vercel.app/changelog#2.1.0</guid>
      <pubDate>Wed, 04 Nov 2026 12:00:00 GMT</pubDate>
      <description>Added agentic SDK documentation, Open VSX extension namespace, non-destructive image queues, reactive live in-place re-conversion, and interactive split preview modal.</description>
    </item>
    <item>
      <title>Zapwebp 2.0.0 — Target Lock and Background Respecter</title>
      <link>https://zapwebp-docs.vercel.app/lock-target</link>
      <guid>https://zapwebp.vercel.app/changelog#2.0.0</guid>
      <pubDate>Mon, 03 Nov 2026 12:00:00 GMT</pubDate>
      <description>Strict and best-effort target locking contracts, three deterministic background states, and Edge runtime integration.</description>
    </item>
  </channel>
</rss>`;
  res.send(rssXml);
});

app.use('/content', express.static(contentDir));
app.use('/locales', express.static(path.join(__dirname, 'locales')));

app.get(['/ai-catalog.json', '/.well-known/ai-catalog.json'], (_req, res) => {
  const catalogPath = path.join(__dirname, 'public', 'ai-catalog.json');
  if (fs.existsSync(catalogPath)) {
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    });
    return res.sendFile(catalogPath);
  }
  res.status(404).json({ error: 'E_NOT_FOUND', message: 'ai-catalog.json not found' });
});

app.use('/tokens.css', (_req, res) => {
  res.set('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public', 'tokens.css'));
});

// Documentation shell routes (Kite SPA)
const DOCS_ROUTES = [
  '/docs',
  '/convert',
  '/cli',
  '/mcp',
  '/clean',
  '/formats',
  '/safety',
  '/errors',
  '/api',
  '/developers',
  '/about',
  '/privacy',
  '/terms',
  '/security',
  '/code-of-conduct',
  '/contributing',
  '/translators',
  '/plugins/vite',
  '/plugins/next',
  '/plugins/github-action',
  '/plugins/storage',
  '/plugins/vscode',
  '/plugins/laravel',
  '/plugins/lens',
  '/plugins/crop',
  '/sdk/core',
  '/sdk/plugin',
  '/ui',
  '/sdk/ui',
  '/sdk/cli',
  '/sdk/storage',
  '/sdk/edge',
];

app.get(['/docs', '/docs/*'], (req, res) => {
  const sub = req.params[0] ? `/${req.params[0]}` : '/';
  res.redirect(301, `https://zapwebp-docs.vercel.app${sub}`);
});

app.get(DOCS_ROUTES, (req, res) => {
  res.redirect(301, `https://zapwebp-docs.vercel.app${req.path}`);
});

// Dedicated landing routes (SEO) and root converter
const LANDING_ROUTES = [
  '/',
  '/svg-to-webp',
  '/png-to-webp',
  '/jpg-to-webp',
  '/webp-to-png',
  '/svg-to-png',
  '/png-to-avif',
  '/avif-to-webp',
];

app.get(LANDING_ROUTES, (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
    },
  })
);

app.get('/api/config', (_req, res) => {
  res.json({ maxFileBytes, maxBatchBytes, maxFiles: 20, maxWidth });
});

// Remote Streamable HTTP MCP endpoint for AI chatbots & cloud agents
let mcpHandlerInstance = null;
app.all('/mcp', async (req, res, next) => {
  try {
    if (!mcpHandlerInstance) {
      const { createHttpHandler } = await import('@zapwebp/mcp');
      mcpHandlerInstance = createHttpHandler({ rootDir: path.resolve(__dirname), isRemote: true });
    }
    const url = `${req.protocol}://${req.get('host') || 'localhost'}${req.originalUrl || req.url}`;
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    await new Promise((resolve) => req.on('end', resolve));
    const rawBody = chunks.length ? Buffer.concat(chunks) : undefined;

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : rawBody,
    });
    const webRes = await mcpHandlerInstance.fetch(webReq);
    res.status(webRes.status);
    for (const [k, v] of webRes.headers.entries()) {
      res.setHeader(k, v);
    }
    const bytes = await webRes.arrayBuffer();
    res.send(Buffer.from(bytes));
  } catch (err) {
    next(err);
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'zapwebp', version: '1.1.0' });
});

app.get('/api', (_req, res) => {
  res.redirect(301, '/api/v1');
});

app.all(['/api/convert', '/api/inspect', '/api/batch', '/api/health'], (req, res, next) => {
  req.url = req.url.replace(/^\/api\//, '/api/v1/');
  next();
});

app.use('/api/v1', createApiRouter({ maxFileBytes, maxBatchBytes, maxFiles: 20, maxWidth, maxResponseBytes }));

app.post('/api/convert', upload.array('files', 20), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Choose at least one SVG file.' });
  const uploadBytes = req.files.reduce((total, file) => total + file.size, 0);
  if (uploadBytes > maxBatchBytes) {
    return res.status(413).json({ error: `This batch exceeds the ${Math.floor(maxBatchBytes / MEBIBYTE)} MB total upload limit.` });
  }

  const parsedWidth = Number.parseInt(req.body.width, 10);
  const requestedWidth = Number.isFinite(parsedWidth) ? parsedWidth : 2048;
  const width = Math.min(Math.max(requestedWidth, 512), maxWidth);
  const parsedQuality = Number.parseInt(req.body.quality, 10);
  const quality = Math.min(Math.max(Number.isFinite(parsedQuality) ? parsedQuality : 85, 1), 100);
  const lossless = req.body.lossless === 'true';

  const target = String(req.body.to || 'webp').toLowerCase();
  let responseBytes = 0;
  const results = [];
  for (const file of req.files) {
    try {
      const converted = await convertImage(file.buffer, {
        to: target,
        width,
        quality,
        lossless,
        background: req.body.background || undefined,
      });
      const output = converted.data;
      if (responseBytes + output.length > maxResponseBytes) {
        results.push({ name: file.originalname.slice(0, 160), error: 'The converted batch is too large to return in one response. Reduce the batch size or output width.' });
        continue;
      }
      responseBytes += output.length;
      const base = (path.basename(file.originalname, path.extname(file.originalname)) || 'image').slice(0, 150);
      const ext = target === 'jpeg' ? 'jpg' : target;
      results.push({
        name: `${base}.${ext}`,
        data: output.toString('base64'),
        size: output.length,
        width: converted.width,
        height: converted.height,
        alphaPreserved: converted.alphaPreserved,
      });
    } catch (error) {
      results.push({ name: file.originalname.slice(0, 160), error: error.message || 'Conversion failed.' });
    }
  }

  res.json({ results });
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/api') {
    return res.status(404).json({
      error: 'E_NOT_FOUND',
      message: `Endpoint "${req.method} ${req.path}" was not found.`,
      endpoints: {
        health: 'GET /api/v1/health',
        convert: 'POST /api/v1/convert',
        inspect: 'POST /api/v1/inspect',
        batch: 'POST /api/v1/batch',
      },
      docs: 'https://zapwebp-docs.vercel.app/api',
    });
  }
  const html404 = path.join(__dirname, 'public', '404.html');
  if (fs.existsSync(html404)) {
    return res.status(404).sendFile(html404);
  }
  next();
});

app.use((error, _req, res, _next) => {
  const status = error instanceof multer.MulterError
    ? error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    : 400;
  res.status(status).json({ error: error.message || 'Upload failed.' });
});

if (require.main === module) {
  app.listen(port, () => console.log(`Zapwebp listening on http://localhost:${port}`));
}

module.exports = app;
