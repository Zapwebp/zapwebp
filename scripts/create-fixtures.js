'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const coreRequire = createRequire(path.resolve(__dirname, '../packages/core/src/index.js'));
const sharp = coreRequire('sharp');
const { encodeIco } = require('../packages/format-ico/src/write');

const fixturesDir = path.resolve(__dirname, '../test/fixtures');

async function createFixtures() {
  const dirs = [
    path.join(fixturesDir, 'svg'),
    path.join(fixturesDir, 'png'),
    path.join(fixturesDir, 'jpg'),
    path.join(fixturesDir, 'ico'),
    path.join(fixturesDir, 'edge-cases'),
  ];

  for (const d of dirs) {
    fs.mkdirSync(d, { recursive: true });
  }

  // --- SVG Fixtures ---
  const tablerHome = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
  <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'svg/tabler-home.svg'), tablerHome, 'utf8');

  const lucideMenu = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="4" x2="20" y1="12" y2="12" />
  <line x1="4" x2="20" y1="6" y2="6" />
  <line x1="4" x2="20" y1="18" y2="18" />
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'svg/lucide-menu.svg'), lucideMenu, 'utf8');

  const simpleGithub = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#24292e">
  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'svg/simple-icons-github.svg'), simpleGithub, 'utf8');

  const logoWordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="400" viewBox="0 0 1000 400">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
  </defs>
  <rect width="1000" height="400" rx="24" fill="url(#grad)" />
  <text x="500" y="230" font-family="system-ui, sans-serif" font-size="96" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-2">ZAPWEBP</text>
  <text x="500" y="300" font-family="system-ui, sans-serif" font-size="28" font-weight="500" fill="#a7f3d0" text-anchor="middle">DROP. CONVERT. DONE.</text>
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'svg/logo-wordmark.svg'), logoWordmark, 'utf8');

  const diagram = `<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1500" viewBox="0 0 2000 1500">
  <rect width="2000" height="1500" fill="#0d1117" />
  <rect x="200" y="200" width="400" height="250" rx="16" fill="#161b22" stroke="#30363d" stroke-width="4" />
  <text x="400" y="340" font-family="monospace" font-size="32" fill="#58a6ff" text-anchor="middle">Client Layer</text>
  <line x1="600" y1="325" x2="900" y2="325" stroke="#8b949e" stroke-width="6" stroke-dasharray="8 8" />
  <rect x="900" y="200" width="500" height="250" rx="16" fill="#161b22" stroke="#10b981" stroke-width="4" />
  <text x="1150" y="340" font-family="monospace" font-size="32" fill="#10b981" text-anchor="middle">Zapwebp Core Engine</text>
  <line x1="1150" y1="450" x2="1150" y2="750" stroke="#8b949e" stroke-width="6" />
  <rect x="900" y="750" width="500" height="250" rx="16" fill="#161b22" stroke="#30363d" stroke-width="4" />
  <text x="1150" y="890" font-family="monospace" font-size="32" fill="#7ee787" text-anchor="middle">Deterministic Alpha</text>
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'svg/diagram.svg'), diagram, 'utf8');

  // --- PNG Fixtures ---
  // 1. material-icon-24.png (24x24 transparent RGBA)
  await sharp(Buffer.from(tablerHome))
    .resize(24, 24)
    .png()
    .toFile(path.join(fixturesDir, 'png/material-icon-24.png'));

  // 2. material-icon-512.png (512x512 transparent RGBA)
  await sharp(Buffer.from(tablerHome))
    .resize(512, 512)
    .png()
    .toFile(path.join(fixturesDir, 'png/material-icon-512.png'));

  // 3. screenshot-1080p.png (1920x1080 dense image)
  await sharp(Buffer.from(diagram))
    .resize(1920, 1080, { fit: 'fill' })
    .png({ compressionLevel: 8 })
    .toFile(path.join(fixturesDir, 'png/screenshot-1080p.png'));

  // 4. ai-generated.png
  await sharp(Buffer.from(logoWordmark))
    .resize(1024, 1024, { fit: 'cover' })
    .png()
    .toFile(path.join(fixturesDir, 'png/ai-generated.png'));

  // --- JPG Fixtures ---
  // 1. unsplash-thumb.jpg (400x400)
  await sharp({
    create: {
      width: 400,
      height: 400,
      channels: 3,
      background: { r: 52, g: 152, b: 219 },
    },
  })
    .composite([
      {
        input: await sharp(Buffer.from(tablerHome)).resize(200, 200).png().toBuffer(),
        top: 100,
        left: 100,
      },
    ])
    .jpeg({ quality: 85 })
    .toFile(path.join(fixturesDir, 'jpg/unsplash-thumb.jpg'));

  // 2. unsplash-hero.jpg (1920x1080)
  await sharp({
    create: {
      width: 1920,
      height: 1080,
      channels: 3,
      background: { r: 30, g: 41, b: 59 },
    },
  })
    .composite([
      {
        input: await sharp(Buffer.from(logoWordmark)).resize(800, 320).png().toBuffer(),
        top: 380,
        left: 560,
      },
    ])
    .jpeg({ quality: 90 })
    .toFile(path.join(fixturesDir, 'jpg/unsplash-hero.jpg'));

  // 3. phone-gps.jpg (4032x3024)
  await sharp({
    create: {
      width: 4032,
      height: 3024,
      channels: 3,
      background: { r: 15, g: 23, b: 42 },
    },
  })
    .jpeg({ quality: 75 })
    .toFile(path.join(fixturesDir, 'jpg/phone-gps.jpg'));

  // --- ICO Fixtures ---
  // 1. github-favicon.ico (16, 32, 48)
  const ghIco = await encodeIco(Buffer.from(simpleGithub), { sizes: [16, 32, 48] });
  fs.writeFileSync(path.join(fixturesDir, 'ico/github-favicon.ico'), ghIco);

  // 2. high-res.ico (256)
  const highResIco = await encodeIco(Buffer.from(tablerHome), { sizes: [16, 32, 48, 64, 128, 256] });
  fs.writeFileSync(path.join(fixturesDir, 'ico/high-res.ico'), highResIco);

  // --- Edge Cases ---
  // 1. empty.svg (0 bytes)
  fs.writeFileSync(path.join(fixturesDir, 'edge-cases/empty.svg'), Buffer.alloc(0));

  // 2. corrupt.png (truncated PNG header bytes without chunks)
  fs.writeFileSync(
    path.join(fixturesDir, 'edge-cases/corrupt.png'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
  );

  // 3. script-injection.svg (contains malicious active script)
  const scriptSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red" />
  <script type="text/javascript">alert('xss');</script>
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'edge-cases/script-injection.svg'), scriptSvg, 'utf8');

  // 4. billion-laughs.svg (XXE attack pattern)
  const xxeSvg = `<?xml version="1.0"?>
<!DOCTYPE lolz [
  <!ENTITY lol "lol">
  <!ENTITY lol1 "&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;&lol;">
  <!ENTITY lol2 "&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;&lol1;">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <text>&lol2;</text>
</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'edge-cases/billion-laughs.svg'), xxeSvg, 'utf8');

  // 5. huge.svg (complex SVG with many paths)
  let hugeContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">\n`;
  for (let i = 0; i < 2000; i++) {
    const x = (i * 37) % 980;
    const y = (i * 53) % 980;
    hugeContent += `  <circle cx="${x}" cy="${y}" r="3" fill="#10b981" opacity="0.8"/>\n`;
  }
  hugeContent += `</svg>`;
  fs.writeFileSync(path.join(fixturesDir, 'edge-cases/huge.svg'), hugeContent, 'utf8');

  console.log('✓ All real-world test fixtures created successfully in test/fixtures/');
}

createFixtures().catch((err) => {
  console.error('Failed to create fixtures:', err);
  process.exit(1);
});
