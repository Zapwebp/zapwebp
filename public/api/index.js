module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).json({
    status: 'ok',
    name: 'Zapwebp Web Service',
    version: '2.11.1',
    execution: 'client-side-wasm',
    privacy: 'zero-telemetry-local-memory',
    message: 'Zapwebp web converter operates 100% locally in your browser memory via Web Workers and HTML5 Canvas. Your image files never leave your device.',
    endpoints: {
      webApp: 'https://zapwebp.vercel.app',
      docs: 'https://zapwebp-docs.vercel.app',
      apiDocs: 'https://zapwebp-docs.vercel.app/api',
      cliDocs: 'https://zapwebp-docs.vercel.app/cli',
      github: 'https://github.com/Zapwebp'
    }
  });
};
