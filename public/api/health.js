module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({
    status: 'ok',
    app: 'Zapwebp Web',
    version: '2.11.1',
    timestamp: new Date().toISOString()
  });
};
