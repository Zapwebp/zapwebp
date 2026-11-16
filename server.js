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

  // 2. Check headers passed by proxies / Vercel (excluding literal /server.js and /api/index.js)
  const forwarded = req.headers['x-forwarded-uri'] || req.headers['x-original-url'] || req.headers['x-rewrite-url'];
  if (forwarded && forwarded !== '/server.js' && forwarded !== '/api/index.js') {
    req.url = forwarded;
    return next();
  }

  // 3. If req.url starts with /server.js or /api/index.js, strip the script name
  if (req.url === '/server.js' || req.url === '/api/index.js') {
    req.url = '/';
  } else if (req.url.startsWith('/server.js/')) {
    req.url = req.url.slice(10);
  } else if (req.url.startsWith('/api/index.js/')) {
    req.url = req.url.slice(13);
  } else if (req.url.startsWith('/server.js?')) {
    req.url = '/' + req.url.slice(10);
  } else if (req.url.startsWith('/api/index.js?')) {
    req.url = '/' + req.url.slice(13);
  }

  next();
});

// Security Headers & Zero Telemetry Guard
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
  const safeName = path.basename(req.params.page);
  const resolved = path.resolve(contentDir, `${safeName}.md`);
  if (!resolved.startsWith(contentDir) || !fs.existsSync(resolved)) {
    return next();
  }
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return res.sendFile(resolved);
});

app.get('/plugins/:page.md', (req, res, next) => {
  const safeName = path.basename(req.params.page);
  const pluginsDir = path.join(contentDir, 'plugins');
  const resolved = path.resolve(pluginsDir, `${safeName}.md`);
  if (!resolved.startsWith(pluginsDir) || !fs.existsSync(resolved)) {
    return next();
  }
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return res.sendFile(resolved);
});

app.get('/sdk/:page.md', (req, res, next) => {
  const safeName = path.basename(req.params.page);
  const sdkDir = path.join(contentDir, 'sdk');
  const resolved = path.resolve(sdkDir, `${safeName}.md`);
  if (!resolved.startsWith(sdkDir) || !fs.existsSync(resolved)) {
    return next();
  }
  res.set('Content-Type', 'text/markdown; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  return res.sendFile(resolved);
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
  '/lock-target',
  '/backgrounds',
  '/policy',
  '/smart',
  '/smart-optimization',
  '/lossless',
  '/lossless-mode',
  '/reports',
  '/carbon',
  '/performance-reports',
  '/ai-integration',
  '/ai-pipeline',
  '/scaffolding',
  '/faq',
  '/stability',
  '/performance',
  '/reliability',
  '/reliability-masterplan',
  '/freeze',
  '/plugins/vite',
  '/plugins/next',
  '/plugins/github-action',
  '/plugins/storage',
  '/storage',
  '/storage/supabase',
  '/storage/firebase',
  '/storage/neocities',
  '/plugins/vscode',
  '/plugins/laravel',
  '/plugins/lens',
  '/plugins/crop',
  '/plugins/format-ico',
  '/plugins/compressor',
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
const ROUTE_SEO = {
  '/': {
    title: 'Zapwebp Converter — Fast & Free Online WebP & Image Converter',
    description: 'Zapwebp Converter: Free, fast, in-browser WebP and image converter with 100% privacy and zero server uploads. Convert SVG, PNG, JPG, and AVIF preserving transparency.',
    canonical: 'https://zapwebp.vercel.app/',
    h1: 'Zapwebp Converter — Free WebP &amp; Image Converter',
    heroTagline: '<strong>Zapwebp Converter</strong> (also known as <em>Zap Webp Converter</em>) is the fastest, 100% private in-browser image and WebP converter. Convert SVG, PNG, JPG, AVIF, and GIF to WebP with guaranteed transparency preservation and zero server uploads.',
  },
  '/png-to-webp': {
    title: 'PNG to WebP Converter — Fast, Free & Transparency-Safe | Zapwebp',
    description: 'Convert PNG to WebP online for free with Zapwebp Converter. Preserves 100% alpha transparency, compresses file size up to 80%, with zero server uploads.',
    canonical: 'https://zapwebp.vercel.app/png-to-webp',
    h1: 'PNG to WebP Converter',
    heroTagline: 'Convert PNG images to modern WebP format with 100% alpha transparency preservation and zero server uploads. Drop your PNGs below for instant conversion.',
  },
  '/svg-to-webp': {
    title: 'SVG to WebP Converter — Crisp Vector to WebP | Zapwebp',
    description: 'Convert SVG vector graphics to WebP online for free. Retains crisp lines, alpha transparency, and renders locally with zero server tracking.',
    canonical: 'https://zapwebp.vercel.app/svg-to-webp',
    h1: 'SVG to WebP Converter',
    heroTagline: 'Convert SVG vectors to high-performance WebP images with subpixel precision and full alpha channel retention.',
  },
  '/jpg-to-webp': {
    title: 'JPG to WebP Converter — High-Efficiency Image Compression | Zapwebp',
    description: 'Convert JPG / JPEG to WebP online for free. Cut image weight up to 80% without visible quality loss. Instant 100% in-browser conversion.',
    canonical: 'https://zapwebp.vercel.app/jpg-to-webp',
    h1: 'JPG to WebP Converter',
    heroTagline: 'Convert JPG and JPEG photos to WebP format. Drastically reduce page load times and save bandwidth with zero quality loss.',
  },
  '/webp-to-png': {
    title: 'WebP to PNG Converter — Lossless Transparency Extraction | Zapwebp',
    description: 'Convert WebP to PNG online for free. Recover full transparent PNGs from WebP files with zero data loss and 100% client-side privacy.',
    canonical: 'https://zapwebp.vercel.app/webp-to-png',
    h1: 'WebP to PNG Converter',
    heroTagline: 'Convert WebP files back to universal PNG format with lossless alpha channel preservation. Runs entirely in your browser.',
  },
  '/svg-to-png': {
    title: 'SVG to PNG Converter — High-Resolution Rasterizer | Zapwebp',
    description: 'Convert SVG to PNG online for free with custom widths and crisp rasterization. 100% in-browser memory execution.',
    canonical: 'https://zapwebp.vercel.app/svg-to-png',
    h1: 'SVG to PNG Converter',
    heroTagline: 'Rasterize vector SVG files into transparent high-resolution PNGs with customizable scaling up to 4096px.',
  },
  '/png-to-avif': {
    title: 'PNG to AVIF Converter — Next-Gen Image Compression | Zapwebp',
    description: 'Convert PNG to AVIF online for free with next-gen compression and full transparency support. Instant local conversion in your browser.',
    canonical: 'https://zapwebp.vercel.app/png-to-avif',
    h1: 'PNG to AVIF Converter',
    heroTagline: 'Convert PNG images to cutting-edge AVIF format for up to 50% smaller files than WebP with full alpha transparency.',
  },
  '/avif-to-webp': {
    title: 'AVIF to WebP Converter — Universal Browser Compatibility | Zapwebp',
    description: 'Convert AVIF to WebP online for free for maximum browser compatibility with guaranteed alpha preservation.',
    canonical: 'https://zapwebp.vercel.app/avif-to-webp',
    h1: 'AVIF to WebP Converter',
    heroTagline: 'Convert AVIF images into universally supported WebP format with guaranteed alpha transparency preservation.',
  },
  '/reports': {
    title: 'Zapwebp Performance Reports — Bandwidth & Latency Analytics | Zapwebp',
    description: 'View aggregate conversion statistics, bandwidth savings, compression ratios, and speed benchmarks across your image library.',
    canonical: 'https://zapwebp.vercel.app/reports',
    h1: 'Zapwebp Performance Reports',
    heroTagline: 'Auditable bandwidth savings, latency benchmarks, and conversion performance metrics computed locally.',
  },
};

const LANDING_ROUTES = Object.keys(ROUTE_SEO);

let cachedIndexHtml = null;
function getRenderedIndex(pathname) {
  if (!cachedIndexHtml) {
    cachedIndexHtml = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  }
  const meta = ROUTE_SEO[pathname] || ROUTE_SEO['/'];
  return cachedIndexHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${meta.title}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"/, `<meta name="description" content="${meta.description}"`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"/, `<link rel="canonical" href="${meta.canonical}"`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"/, `<meta property="og:title" content="${meta.title}"`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"/, `<meta property="og:description" content="${meta.description}"`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"/, `<meta property="og:url" content="${meta.canonical}"`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"/, `<meta name="twitter:title" content="${meta.title}"`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"/, `<meta name="twitter:description" content="${meta.description}"`)
    .replace(/<h1 class="hero-title"[^>]*>[\s\S]*?<\/h1>/, `<h1 class="hero-title" style="font-size: 2.25rem; font-weight: 800; letter-spacing: -0.025em; margin: 0 0 0.5rem 0; color: var(--text-primary, #ffffff);">${meta.h1}</h1>`)
    .replace(/<p class="hero-tagline"[^>]*>[\s\S]*?<\/p>/, `<p class="hero-tagline" style="font-size: 1.05rem; color: var(--text-secondary, #94a3b8); margin: 0 auto 0.75rem auto; max-width: 680px; line-height: 1.5;">${meta.heroTagline}</p>`);
}

app.get(LANDING_ROUTES, (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('html').send(getRenderedIndex(req.path));
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
