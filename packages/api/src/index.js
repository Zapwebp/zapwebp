'use strict';

const express = require('express');
const multer = require('multer');
const path = require('node:path');
const { convertImage, detectFormat, inspectImage, outputName, INPUT_FORMATS, OUTPUT_FORMATS } = require('@zapwebp/core');

function createApiRouter({ maxFileBytes = 4 * 1024 * 1024, maxBatchBytes = maxFileBytes, maxFiles = 20, maxWidth = 4096, maxResponseBytes = Number.POSITIVE_INFINITY } = {}) {
  const router = express.Router();
  router.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Expose-Headers': 'X-Zapwebp-Width, X-Zapwebp-Height, X-Zapwebp-Alpha-Preserved, Content-Disposition',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileBytes, files: maxFiles, fields: 10, fieldSize: 1024, parts: maxFiles + 10 },
    fileFilter: (_req, file, done) => INPUT_FORMATS.some((format) => {
      const extensions = format === 'jpeg' ? ['.jpg', '.jpeg'] : format === 'tiff' ? ['.tif', '.tiff'] : [`.${format}`];
      return extensions.includes(path.extname(file.originalname).toLowerCase());
    })
      ? done(null, true)
      : done(new Error(`Supported input formats are ${INPUT_FORMATS.join(', ')}.`)),
  });

  function parseOptions(body) {
    const parseInteger = (name, fallback, minimum, maximum) => {
      const raw = body[name];
      if (raw === undefined || raw === '') return fallback;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < minimum || value > maximum) throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
      return value;
    };
    const lossless = body.lossless;
    if (lossless !== undefined && lossless !== '' && lossless !== 'true' && lossless !== 'false') throw new Error('lossless must be true or false.');
    const stripMetadata = body.stripMetadata;
    if (stripMetadata !== undefined && stripMetadata !== '' && stripMetadata !== 'true' && stripMetadata !== 'false') throw new Error('stripMetadata must be true or false.');
    const to = String(body.to || 'webp').toLowerCase();
    if (!OUTPUT_FORMATS.includes(to)) throw new Error(`to must be one of ${OUTPUT_FORMATS.join(', ')}.`);
    const fit = body.fit || 'contain';
    if (!['contain', 'cover', 'fill', 'inside', 'outside'].includes(fit)) throw new Error('fit must be contain, cover, fill, inside, or outside.');
    const effort = parseInteger('effort', 4, 0, 9);
    return {
      to,
      width: body.width === undefined || body.width === '' ? undefined : parseInteger('width', undefined, 1, maxWidth),
      height: body.height === undefined || body.height === '' ? undefined : parseInteger('height', undefined, 1, maxWidth),
      fit,
      quality: parseInteger('quality', 85, 0, 100),
      lossless: lossless === 'true',
      effort,
      background: body.background || undefined,
      stripMetadata: stripMetadata !== 'false',
    };
  }

  function parseTargets(value) {
    const targets = (Array.isArray(value) ? value : String(value || 'webp').split(','))
      .map((target) => String(target).trim().toLowerCase()).filter(Boolean);
    if (!targets.length || targets.length > OUTPUT_FORMATS.length || targets.some((target) => !OUTPUT_FORMATS.includes(target))) {
      throw new Error(`targets must contain one or more of: ${OUTPUT_FORMATS.join(', ')}.`);
    }
    if (new Set(targets).size !== targets.length) throw new Error('targets must not contain duplicates.');
    return targets;
  }

  router.get('/health', (_req, res) => res.json({ ok: true, service: 'zapwebp', version: '1.1.0' }));
  router.post('/convert', upload.single('svg'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Attach an image in the `svg` form field.' });
    try {
      const inputFormat = detectFormat(req.file.buffer);
      const extension = path.extname(req.file.originalname).toLowerCase();
      const allowedExtensions = inputFormat === 'jpeg' ? ['.jpg', '.jpeg'] : inputFormat === 'tiff' ? ['.tif', '.tiff'] : [`.${inputFormat}`];
      if (!allowedExtensions.includes(extension)) throw new Error('The file extension does not match its image data.');
      const converted = await convertImage(req.file.buffer, parseOptions(req.body));
      if (converted.size > maxResponseBytes) return res.status(413).json({ error: 'Converted output is too large for this host response limit. Reduce the width or use a smaller SVG.' });
      const base = path.basename(req.file.originalname, path.extname(req.file.originalname)) || 'image';
      const filename = outputName(`${base}.input`, converted.format);
      res.set({
        'Content-Type': `image/${converted.format === 'jpeg' ? 'jpeg' : converted.format}`,
        'Content-Length': String(converted.size),
        'X-Zapwebp-Width': String(converted.width),
        'X-Zapwebp-Height': String(converted.height),
        'X-Zapwebp-Alpha-Preserved': String(converted.alphaPreserved),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store',
      }).send(converted.data);
    } catch (error) { res.status(400).json({ error: error.message || 'Conversion failed.' }); }
  });
  router.post('/inspect', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Attach an image file in the `file` form field.' });
    try {
      const details = await inspectImage(file.buffer);
      const recommendedTargets = details.hasAlpha
        ? [{ to: 'webp', reason: 'preserves transparency with compact output' }, { to: 'png', reason: 'lossless transparency fallback' }, { to: 'avif', reason: 'modern compact format with alpha support' }]
        : [{ to: 'avif', reason: 'compact photographic output' }, { to: 'webp', reason: 'broad modern web support' }, { to: 'jpeg', reason: 'widely compatible photographic output' }];
      res.json({
        ok: true,
        filename: file.originalname,
        ...details,
        recommendedTargets,
      });
    } catch (error) { res.status(400).json({ error: error.message || 'Inspection failed.' }); }
  });
  router.post('/batch', upload.array('files', maxFiles), async (req, res) => {
    if (!req.files?.length) return res.status(400).json({ error: 'Attach image files in the `files` form field.' });
    if (req.files.reduce((sum, file) => sum + file.size, 0) > maxBatchBytes) return res.status(413).json({ error: 'Batch upload limit exceeded.' });
    let options;
    let targets;
    try {
      targets = parseTargets(req.body.targets || req.body.to);
      options = parseOptions({ ...req.body, to: targets[0] });
    }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const results = [];
    let responseBytes = 0;
    for (const file of req.files) {
      try {
        const format = detectFormat(file.buffer);
        const extension = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = format === 'jpeg' ? ['.jpg', '.jpeg'] : format === 'tiff' ? ['.tif', '.tiff'] : [`.${format}`];
        if (!allowedExtensions.includes(extension)) throw new Error('The file extension does not match its image data.');
        for (const to of targets) {
          try {
            const converted = await convertImage(file.buffer, { ...options, to });
            const encodedBytes = Math.ceil(converted.size * 4 / 3);
            if (responseBytes + encodedBytes > maxResponseBytes) {
              results.push({ name: outputName(file.originalname, to), format: to, error: 'The converted batch exceeds the host response limit. Reduce the number of output formats, batch size, or image width.' });
              continue;
            }
            responseBytes += encodedBytes;
            results.push({ name: outputName(file.originalname, to), data: converted.data.toString('base64'), format: converted.format, size: converted.size, width: converted.width, height: converted.height, alphaPreserved: converted.alphaPreserved });
          } catch (error) {
            results.push({ name: outputName(file.originalname, to), format: to, error: error.message || 'Conversion failed.' });
          }
        }
      } catch (error) { results.push({ name: file.originalname.slice(0, 160), error: error.message || 'Conversion failed.' }); }
    }
    res.json({ results });
  });
  router.use((error, _req, res, _next) => {
    const status = error instanceof multer.MulterError ? error.code === 'LIMIT_FILE_SIZE' ? 413 : 400 : 400;
    res.status(status).json({ error: error.message || 'Upload failed.' });
  });
  return router;
}

module.exports = { createApiRouter };
