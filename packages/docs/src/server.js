'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/**
 * Starts a zero-dependency static documentation server.
 *
 * @param {object} options
 * @param {string} [options.dir='dist'] - Directory to serve
 * @param {number} [options.port=3000] - Port number
 * @param {string} [options.host='localhost'] - Host address
 * @returns {Promise<{ server: http.Server, url: string, close: () => Promise<void> }>}
 */
function serveDocs(options = {}) {
  const rootDir = path.resolve(process.cwd(), options.dir || 'dist');
  const port = options.port || 3000;
  const host = options.host || 'localhost';

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Normalize request path
      const parsedUrl = new URL(req.url, `http://${host}:${port}`);
      let pathname = decodeURIComponent(parsedUrl.pathname);

      if (pathname === '/') {
        pathname = '/index.html';
      }

      let filePath = path.join(rootDir, pathname);

      // Clean URL and Directory Index resolution
      if (fs.existsSync(filePath)) {
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            const dirIndex = path.join(filePath, 'index.html');
            if (fs.existsSync(dirIndex)) {
              filePath = dirIndex;
            }
          }
        } catch {}
      } else {
        // Try .html extension: /cli -> /cli.html
        const withHtml = `${filePath}.html`;
        if (fs.existsSync(withHtml)) {
          filePath = withHtml;
        }
      }

      // Security check: path traversal
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          // Fallback to 404
          const notFoundPath = path.join(rootDir, '404.html');
          if (fs.existsSync(notFoundPath)) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            fs.createReadStream(notFoundPath).pipe(res);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found\n');
          }
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
          'Content-Type': mime,
          'Content-Length': stats.size,
          'Cache-Control': 'no-cache',
        });

        fs.createReadStream(filePath).pipe(res);
      });
    });

    server.on('error', (err) => {
      reject(err);
    });

    server.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      resolve({
        server,
        url,
        close: () =>
          new Promise((res) => {
            server.close(() => res());
          }),
      });
    });
  });
}

module.exports = {
  serveDocs,
  MIME_TYPES,
};
