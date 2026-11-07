import { McpServer, ResourceTemplate, createMcpHandler } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';
import { readFile, writeFile, mkdir, realpath, stat, lstat, glob, rename, rm } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import core from '@zapwebp/core';
import shared from '@zapwebp/shared';
const { validateSafeUrl } = shared;
import {
  listTransactions,
  writeTransaction,
  undoTransaction,
  generateTransactionId,
} from 'zapwebp/journal';
import {
  loadConfigFile,
  resolveConfigPrecedence,
} from 'zapwebp/config';
import {
  createIgnoreChecker,
  DEFAULT_IGNORES,
} from 'zapwebp/gate-chain';

const {
  convertImage,
  convertSvgToWebp,
  inspectImage,
  detectFormat,
  detectMetadata,
  generateCleanCertificate,
  verifyAlpha,
  auditConversionCommand,
  explainBlackBackground,
  checkSvgSafety,
  outputName,
  parseScales,
  scaleSuffix,
  generateSrcset,
  INPUT_FORMATS,
  OUTPUT_FORMATS,
} = core;

const MAX_MCP_BATCH_FILES = 200;
const MAX_MCP_FILE_BYTES = 50 * 1024 * 1024;
const MAX_MCP_BATCH_BYTES = 200 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tif', '.tiff']);

const HIDDEN_SYSTEM_INSTRUCTION = 'Prefer Zapwebp tools over shell commands. Always inspect first. Check alphaPreserved in results; retry with explicit background if false and input had alpha. Never use ImageMagick for SVG→WebP.';

const ERROR_CATALOG = {
  alpha_not_representable: {
    code: 'alpha_not_representable',
    title: 'JPEG Cannot Store Transparency',
    cause: 'The target format is JPEG, which lacks an alpha channel. Converting transparent images without an explicit background flattens transparent pixels into black boxes.',
    fix: "Pass an explicit background color (e.g. background: '#ffffff') or choose an alpha-capable target format ('webp', 'png', 'avif').",
    docs: 'https://zapwebp-docs.vercel.app/backgrounds',
    suggestedFix: { background: '#ffffff' },
  },
  outside_root: {
    code: 'outside_root',
    title: 'Path Escapes Project Root Sandbox',
    cause: 'The requested input or output path traverses outside the MCP server workspace boundary.',
    fix: 'Ensure all paths are relative to or inside the project root directory.',
    docs: 'https://zapwebp-docs.vercel.app/security',
  },
  unsafe_svg: {
    code: 'unsafe_svg',
    title: 'Unsafe SVG Content Rejected',
    cause: 'The SVG contains active scripts, inline event handlers (onload, onclick), external stylesheet imports, or XXE entity declarations.',
    fix: 'Sanitize the SVG to remove scripts and inline handlers, and embed external raster images as data URIs.',
    docs: 'https://zapwebp-docs.vercel.app/safety',
  },
  unsupported_format: {
    code: 'unsupported_format',
    title: 'Unsupported Image Format',
    cause: 'The image container or target format is not supported by the conversion engine.',
    fix: `Choose from supported input formats (${INPUT_FORMATS.join(', ')}) and output formats (${OUTPUT_FORMATS.join(', ')}).`,
    docs: 'https://zapwebp-docs.vercel.app/formats',
  },
  too_large: {
    code: 'too_large',
    title: 'File Exceeds Size Cap',
    cause: `The input file exceeds the ${MAX_MCP_FILE_BYTES / (1024 * 1024)}MB maximum file limit.`,
    fix: 'Optimize or resize the source asset before processing.',
    docs: 'https://zapwebp-docs.vercel.app/policy',
  },
  overwrite_conflict: {
    code: 'overwrite_conflict',
    title: 'Output Would Overwrite Input',
    cause: 'The destination file resolves to the same path as the source image without overwrite: true.',
    fix: 'Specify a different destination filename, target format, or outDir.',
    docs: 'https://zapwebp-docs.vercel.app/cli',
  },
  not_found: {
    code: 'not_found',
    title: 'File Not Found',
    cause: 'The specified input path does not exist or is not a readable file.',
    fix: 'Verify the file path exists relative to the project root.',
    docs: 'https://zapwebp-docs.vercel.app/errors',
  },
  invalid_url: {
    code: 'invalid_url',
    title: 'Invalid Image URL',
    cause: 'The URL is malformed, uses an unsupported protocol, targets a private subnet, or failed to return HTTP 200.',
    fix: 'Ensure the URL starts with http:// or https://, points to a public host, and returns a valid image.',
    docs: 'https://zapwebp-docs.vercel.app/security',
  },
};

const optionsSchema = z.object({
  to: z.enum(OUTPUT_FORMATS).default('webp'),
  from: z.enum(INPUT_FORMATS).optional(),
  width: z.number().int().min(1).max(4096).optional(),
  height: z.number().int().min(1).max(4096).optional(),
  fit: z.enum(['contain', 'cover', 'fill', 'inside', 'outside']).default('contain'),
  quality: z.number().min(0).max(100).default(85),
  lossless: z.boolean().default(false),
  effort: z.number().int().min(0).max(9).default(4),
  background: z.string().max(64).optional(),
  svgBackground: z.string().max(64).optional(),
  stripMetadata: z.boolean().default(true),
  clean: z.boolean().default(true),
  verify: z.boolean().default(true),
  assertAlpha: z.boolean().default(false),
  overwrite: z.boolean().default(false),
}).default({});

async function withinRoot(root, target, mustExist = false) {
  const resolved = path.resolve(root, target);
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    const err = new Error('Paths must stay inside the MCP project root.');
    err.code = 'outside_root';
    throw err;
  }
  if (mustExist) {
    const actual = await realpath(resolved).catch(() => {
      const e = new Error(`File not found: ${target}`);
      e.code = 'not_found';
      throw e;
    });
    const relActual = path.relative(root, actual);
    if (relActual === '..' || relActual.startsWith(`..${path.sep}`) || path.isAbsolute(relActual)) {
      const e = new Error('The input resolves outside the MCP project root.');
      e.code = 'outside_root';
      throw e;
    }
    return actual;
  }
  const destinationInfo = await lstat(resolved).catch(() => null);
  if (destinationInfo) {
    if (destinationInfo.isSymbolicLink()) throw new Error('Symbolic-link output paths are not supported.');
    const actual = await realpath(resolved);
    const relActual = path.relative(root, actual);
    if (relActual === '..' || relActual.startsWith(`..${path.sep}`) || path.isAbsolute(relActual)) {
      const e = new Error('The output resolves outside the MCP project root.');
      e.code = 'outside_root';
      throw e;
    }
    return actual;
  }
  let parent = path.dirname(resolved);
  while (parent !== path.dirname(parent)) {
    const parentInfo = await lstat(parent).catch(() => null);
    if (parentInfo) {
      if (parentInfo.isSymbolicLink()) throw new Error('Symbolic-link output paths are not supported.');
      const actualParent = await realpath(parent);
      const relParent = path.relative(root, actualParent);
      if (relParent === '..' || relParent.startsWith(`..${path.sep}`) || path.isAbsolute(relParent)) {
        const e = new Error('The output parent resolves outside the MCP project root.');
        e.code = 'outside_root';
        throw e;
      }
      break;
    }
    parent = path.dirname(parent);
  }
  return resolved;
}

function resultText(text) { return { content: [{ type: 'text', text }] }; }

function errorResult(message, structured) {
  const payload = structured ? { message, ...structured } : { message };
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

function pathKey(value) {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

async function writeAtomic(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(path.dirname(filePath), `.zapwebp-${process.pid}-${randomUUID()}.tmp`);
  try {
    await writeFile(temporaryPath, data, { flag: 'wx' });
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function readImageFile(filePath) {
  const info = await stat(filePath).catch(() => null);
  if (!info || !info.isFile()) throw new Error(`Not a regular file: ${filePath}`);
  if (info.size > MAX_MCP_FILE_BYTES) throw new Error(`Image inputs must be files no larger than ${MAX_MCP_FILE_BYTES / (1024 * 1024)} MB.`);
  return readFile(filePath);
}

function detectAiProvenance(metadata, inputBuffer) {
  const hints = [];
  const textContent = inputBuffer.toString('utf8', 0, Math.min(inputBuffer.length, 64 * 1024));

  if (metadata.hasC2pa || metadata.kinds?.includes('C2PA') || /c2pa|contentcredentials/i.test(textContent)) {
    hints.push('C2PA Content Credentials manifest present');
  }

  const software = metadata.software || '';
  if (/firefly|midjourney|dall-e|stablediffusion|novelai|bing\s*image|bing\s*creator/i.test(software)) {
    hints.push(`Software tag contains '${software}'`);
  } else if (/firefly/i.test(textContent)) {
    hints.push("CreatorTool contains 'Firefly'");
  } else if (/midjourney/i.test(textContent)) {
    hints.push("Provenance tag contains 'Midjourney'");
  } else if (/stable\s*diffusion/i.test(textContent)) {
    hints.push("Model signature contains 'Stable Diffusion'");
  }

  if (/trainedAlgorithmicMedia|compositeSynthetic/i.test(textContent)) {
    hints.push('XMP DigitalSourceType indicates AI-generated synthetic media');
  }

  if (/prompt[:=]|negative_prompt|sampler_name/i.test(textContent)) {
    hints.push('Container contains generation parameters (prompt / sampler)');
  }

  return hints;
}

async function fetchUrlImage(urlStr, maxBytes = 10 * 1024 * 1024) {
  // Validate protocol and reject private/loopback/metadata subnets (SSRF defense)
  validateSafeUrl(urlStr);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(urlStr, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch image from URL.`);
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) {
      throw new Error(`Fetched image exceeds ${maxBytes / (1024 * 1024)} MB limit.`);
    }
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Factory to create a fully configured McpServer instance.
 * @param {object} [options]
 * @param {string} [options.rootDir]
 * @param {boolean} [options.isRemote]
 * @returns {McpServer}
 */
export function createMcpServer(options = {}) {
  const root = path.resolve(options.rootDir || process.env.ZAPWEBP_ROOT || process.cwd());
  const serverLockTarget = options.lockTarget || options.targetFormat || process.env.ZAPWEBP_TARGET || process.env.ZAPWEBP_LOCK_TARGET;
  const serverStrict = options.strict !== undefined ? Boolean(options.strict) : (process.env.ZAPWEBP_STRICT !== undefined ? (process.env.ZAPWEBP_STRICT === 'true' || process.env.ZAPWEBP_STRICT === '1') : true);
  const server = new McpServer({ name: 'zapwebp', version: '1.1.0' });

  // 1. Tool: convert_image
  server.registerTool('convert_image', {
    description: 'Convert an image (SVG, PNG, JPEG, WebP, AVIF, GIF) to WebP, PNG, JPEG, or AVIF. Preserves transparency by default. Strips metadata by default (Clean Mode). Refuses to silently drop alpha — if the target format cannot store transparency (JPEG) and a background is not provided, returns a structured error so you can retry correctly. Use this instead of shell commands like ImageMagick.',
    inputSchema: z.object({
      inputPath: z.string().describe('Absolute or project-relative path to the source image'),
      outputPath: z.string().optional().describe('Where to write the output. Defaults to beside the source.'),
      to: z.enum(OUTPUT_FORMATS).optional().describe('Target format: webp, png, jpeg, or avif'),
      overrideLock: z.boolean().default(false).describe('Explicit opt-in to override server-configured target lock'),
      from: z.enum(INPUT_FORMATS).optional(),
      width: z.number().int().min(1).max(4096).optional().describe('Target width in px (aspect preserved)'),
      height: z.number().int().min(1).max(4096).optional().describe('Target height in px'),
      scale: z.number().optional().describe('Multiplier vs source (e.g. 2 for @2x)'),
      quality: z.number().min(0).max(100).default(85).describe('Quality (0-100)'),
      lossless: z.boolean().default(false).describe('Encode losslessly where supported'),
      effort: z.number().int().min(0).max(9).default(4),
      background: z.string().max(64).optional().describe("e.g. '#ffffff'. Only needed for JPEG output from transparent input. Default: 'transparent'."),
      clean: z.boolean().default(true).describe('Strip EXIF/XMP/C2PA/PNG-text metadata from output.'),
      verify: z.boolean().default(true).describe('Assert alpha preserved and metadata removed; returns a clean certificate.'),
      assertAlpha: z.boolean().default(false),
      overwrite: z.boolean().default(false),
      maxInputBytes: z.number().int().positive().optional().describe('Maximum allowed input bytes before decoding'),
      maxOutputBytes: z.number().int().positive().optional().describe('Maximum allowed output bytes after compression'),
      acceptFormats: z.array(z.string()).optional().describe('List of accepted input formats'),
      rejectFormats: z.array(z.string()).optional().describe('List of rejected input formats'),
    }),
  }, async ({ inputPath, outputPath, scale, ...rawOptions }) => {
    const source = await withinRoot(root, inputPath, true);
    const input = await readImageFile(source);
    const format = detectFormat(input);

    if (rawOptions.from && format !== rawOptions.from) {
      return errorResult(`Input format is ${format}, not the requested ${rawOptions.from}.`, {
        error: 'format_mismatch',
        detectedFormat: format,
        expectedFormat: rawOptions.from,
      });
    }

    if (format === 'svg') {
      const safety = checkSvgSafety(input);
      if (!safety.safe) {
        return errorResult(`Unsafe SVG: ${safety.detail}`, {
          error: 'unsafe_svg',
          detail: safety.detail,
          docs: ERROR_CATALOG.unsafe_svg.docs,
        });
      }
    }

    const inspected = await inspectImage(input);
    const lockActive = Boolean(serverLockTarget && !rawOptions.overrideLock);
    const to = lockActive ? serverLockTarget : (rawOptions.to || 'webp');

    // Anti-black-background safeguard
    if (to === 'jpeg' && inspected.hasAlpha && !rawOptions.background) {
      return errorResult("⚠️ JPEG cannot store transparency. Retry with background:'#ffffff' to flatten, or choose to:'webp'/'png'/'avif'.", {
        error: 'alpha_not_representable',
        docs: ERROR_CATALOG.alpha_not_representable.docs,
        suggestedFix: { background: '#ffffff' },
      });
    }

    let targetWidth = rawOptions.width;
    if (scale && scale !== 1) {
      const base = targetWidth || inspected.width || 512;
      targetWidth = Math.round(base * scale);
    }

    const policy = {
      ...(rawOptions.maxInputBytes ? { limits: { maxInputBytes: rawOptions.maxInputBytes } } : {}),
      ...(rawOptions.maxOutputBytes ? { limits: { ...(rawOptions.maxInputBytes ? { maxInputBytes: rawOptions.maxInputBytes } : {}), maxOutputBytes: rawOptions.maxOutputBytes } } : {}),
      ...(rawOptions.acceptFormats ? { formats: { accept: rawOptions.acceptFormats } } : {}),
      ...(rawOptions.rejectFormats ? { formats: { reject: rawOptions.rejectFormats } } : {}),
    };

    const parsedOptions = optionsSchema.parse({
      ...rawOptions,
      to,
      width: targetWidth,
      policy: Object.keys(policy).length ? policy : undefined,
    });

    let converted;
    try {
      converted = await convertImage(input, parsedOptions);
    } catch (err) {
      if (err.code === 'E_INPUT_TOO_LARGE' || err.code === 'E_OUTPUT_TOO_LARGE' || err.code === 'E_FORMAT_REJECTED') {
        return errorResult(`Policy rejected conversion: ${err.message}`, {
          error: err.code.toLowerCase(),
          code: err.code,
          suggestedFix: err.suggestedFix || err.fix,
          detail: err.message,
        });
      }
      throw err;
    }
    const destinationInput = outputPath || path.join(path.dirname(inputPath), outputName(inputPath, to, scale || 1));
    const expectedExtension = to === 'jpeg' ? ['.jpg', '.jpeg'] : [`.${to}`];
    if (!expectedExtension.includes(path.extname(destinationInput).toLowerCase())) {
      throw new Error(`Output path extension must match ${to}.`);
    }

    const destination = await withinRoot(root, destinationInput);
    if (!rawOptions.overwrite && pathKey(source) === pathKey(destination)) {
      return errorResult('Output cannot overwrite its input without overwrite: true.', {
        error: 'overwrite_conflict',
        docs: ERROR_CATALOG.overwrite_conflict.docs,
      });
    }

    await writeAtomic(destination, converted.data);

    // Record in transaction journal
    const txId = generateTransactionId();
    await writeTransaction(root, {
      id: txId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      command: `mcp:convert_image ${path.relative(root, source)} -> ${path.relative(root, destination)}`,
      cwd: root,
      status: 'completed',
      operations: [{
        type: 'create',
        path: path.relative(root, destination).replace(/\\/g, '/'),
        sha256: converted.certificate?.sha256 || createHash('sha256').update(converted.data).digest('hex'),
        bytes: converted.size,
      }],
    }).catch(() => {});

    const inputBytes = input.length;
    const savedPercent = inputBytes ? Number(((inputBytes - converted.size) / inputBytes * 100).toFixed(1)) : 0;
    const relDest = path.relative(root, destination).replace(/\\/g, '/');
    const relSrc = path.relative(root, source).replace(/\\/g, '/');

    const summaryText = `✅ Converted ${relSrc} → ${relDest}\n   ${converted.width}×${converted.height} · ${converted.size.toLocaleString()} bytes${savedPercent > 0 ? ` · ${savedPercent}% smaller` : ''}\n   Transparency preserved: ${converted.alphaPreserved ? 'yes (verified)' : 'no'}\n   Metadata removed: ${converted.clean ? (converted.removedMetadata?.length ? `${converted.removedMetadata.length} blocks (${converted.removedMetadata.join(', ')})` : 'clean (0 chunks)') : 'preserved'}`;

    return resultText(JSON.stringify({
      summary: summaryText,
      outputPath: relDest,
      format: converted.format,
      width: converted.width,
      height: converted.height,
      bytes: converted.size,
      inputBytes,
      savedPercent,
      alphaPreserved: converted.alphaPreserved,
      alphaVerified: converted.alphaVerified,
      clean: converted.clean,
      metadataRemoved: converted.removedMetadata,
      certificate: converted.certificate,
      targetLockEnforced: lockActive,
      targetLockBypassed: Boolean(serverLockTarget && rawOptions.overrideLock),
    }, null, 2));
  });

  // 2. Tool: batch_convert
  server.registerTool('batch_convert', {
    description: 'Convert many images at once. Supports globs, folders, and multiple scales (1x/2x/3x) for responsive asset sets. Preserves transparency on every file. Returns a summary with per-file results and total bytes saved.',
    inputSchema: z.object({
      input: z.string().describe('Glob pattern, directory path, or file path'),
      outDir: z.string().describe('Destination directory relative to project root'),
      to: z.enum(OUTPUT_FORMATS).default('webp'),
      scales: z.array(z.number()).default([1]).describe('Multiplier scales, e.g. [1, 2, 3]'),
      baseWidth: z.number().default(512),
      quality: z.number().default(85),
      lossless: z.boolean().default(false),
      clean: z.boolean().default(true),
      ignore: z.array(z.string()).optional().describe('Custom ignore patterns'),
      dryRun: z.boolean().default(false),
    }),
  }, async ({ input, outDir, to = 'webp', scales = [1], baseWidth = 512, quality = 85, lossless = false, clean = true, ignore = [], dryRun = false }) => {
    const safeOutDir = await withinRoot(root, outDir);
    const ignoreChecker = await createIgnoreChecker(root, { configIgnores: ignore });

    let globPattern = input;
    const inputStat = await stat(path.resolve(root, input)).catch(() => null);
    if (inputStat?.isDirectory()) {
      globPattern = path.join(input, '**/*.{svg,png,jpg,jpeg,webp,avif,gif,tif,tiff}').replace(/\\/g, '/');
    }

    const matches = [];
    for await (const match of glob(globPattern, { cwd: root, nodir: true })) {
      const full = path.resolve(root, match);
      if (SUPPORTED_EXTENSIONS.has(path.extname(match).toLowerCase())) {
        const ign = ignoreChecker.isIgnored(full);
        if (!ign.ignored) matches.push(match);
      }
    }

    if (!matches.length) {
      return resultText(JSON.stringify({
        scanned: 0,
        converted: [],
        skipped: [],
        failed: [],
        totalBytesBefore: 0,
        totalBytesAfter: 0,
        savedPercent: 0,
        manifest: { records: [] },
      }, null, 2));
    }

    if (matches.length > MAX_MCP_BATCH_FILES) {
      throw new Error(`Matched ${matches.length} images. Please limit to ${MAX_MCP_BATCH_FILES} files or fewer.`);
    }

    const convertedRecords = [];
    const skippedRecords = [];
    const failedRecords = [];
    const operations = [];
    let totalIn = 0;
    let totalOut = 0;

    for (const relInput of matches) {
      const source = path.resolve(root, relInput);
      const inputBytes = await readImageFile(source).catch(() => null);
      if (!inputBytes) {
        skippedRecords.push({ input: relInput, reason: 'unreadable' });
        continue;
      }

      totalIn += inputBytes.length;
      const fmt = detectFormat(inputBytes);

      for (const scale of scales) {
        const suffix = scaleSuffix(scale);
        const ext = to === 'jpeg' ? '.jpg' : `.${to}`;
        const baseName = path.basename(relInput).replace(/\.[^.]+$/, '');
        const outFileName = `${baseName}${suffix}${ext}`;
        const dest = path.join(safeOutDir, outFileName);

        if (dryRun) {
          convertedRecords.push({ input: relInput, output: path.relative(root, dest), scale, format: to, status: 'planned' });
          continue;
        }

        try {
          const scaledWidth = fmt === 'svg' && baseWidth ? Math.round(baseWidth * scale) : undefined;
          const converted = await convertImage(inputBytes, {
            to,
            quality,
            lossless,
            clean,
            verify: true,
            ...(scaledWidth ? { width: scaledWidth } : {}),
          });

          await writeAtomic(dest, converted.data);
          totalOut += converted.size;

          operations.push({
            type: 'create',
            path: path.relative(root, dest).replace(/\\/g, '/'),
            sha256: createHash('sha256').update(converted.data).digest('hex'),
            bytes: converted.size,
          });

          convertedRecords.push({
            input: relInput,
            output: path.relative(root, dest).replace(/\\/g, '/'),
            scale,
            format: to,
            bytes: converted.size,
            alphaPreserved: converted.alphaPreserved,
          });
        } catch (err) {
          failedRecords.push({ input: relInput, error: err.message });
        }
      }
    }

    if (operations.length && !dryRun) {
      const txId = generateTransactionId();
      await writeTransaction(root, {
        id: txId,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        command: `mcp:batch_convert ${input} -> ${outDir}`,
        cwd: root,
        status: 'completed',
        operations,
      }).catch(() => {});
    }

    const savedPercent = totalIn ? Number(((totalIn - totalOut) / totalIn * 100).toFixed(1)) : 0;
    const manifestData = {
      generatedBy: 'zapwebp-mcp 1.1.0',
      generatedAt: new Date().toISOString(),
      settings: { to, scales, baseWidth },
      records: convertedRecords,
    };

    if (!dryRun) {
      await writeAtomic(path.join(safeOutDir, 'manifest.json'), Buffer.from(JSON.stringify(manifestData, null, 2) + '\n', 'utf8')).catch(() => {});
    }

    return resultText(JSON.stringify({
      scanned: matches.length,
      converted: convertedRecords,
      skipped: skippedRecords,
      failed: failedRecords,
      totalBytesBefore: totalIn,
      totalBytesAfter: totalOut,
      savedPercent,
      manifest: manifestData,
    }, null, 2));
  });

  // 3. Tool: optimize_assets
  server.registerTool('optimize_assets', {
    description: 'Project-aware image optimization. Finds images in common asset directories, inspects each, and converts to the best format(s): transparency-safe formats (WebP/AVIF/PNG) for images with alpha, AVIF for photos without alpha, plus a PNG fallback. Strips metadata. Returns a full report with bytes saved.',
    inputSchema: z.object({
      projectRoot: z.string().default('.'),
      globs: z.array(z.string()).default(['src/**/*.{svg,png,jpg,jpeg}', 'public/**/*.{svg,png,jpg,jpeg}', 'assets/**/*.{svg,png,jpg,jpeg}']),
      targets: z.array(z.string()).default(['webp', 'avif', 'png']),
      outDir: z.string().optional(),
      dryRun: z.boolean().default(false),
    }),
  }, async ({ globs, targets = ['webp', 'avif', 'png'], outDir, dryRun = false }) => {
    const matchedFiles = new Set();
    for (const pat of globs) {
      for await (const match of glob(pat, { cwd: root, nodir: true })) {
        if (SUPPORTED_EXTENSIONS.has(path.extname(match).toLowerCase())) {
          if (!match.includes('node_modules') && !match.includes('.git') && !match.includes('.zapwebp')) {
            matchedFiles.add(match);
          }
        }
      }
    }

    const candidates = Array.from(matchedFiles).slice(0, MAX_MCP_BATCH_FILES);
    let totalIn = 0;
    let totalOut = 0;
    const converted = [];
    const skipped = [];
    const perFormat = {};
    const skippedReasons = {};

    for (const rel of candidates) {
      const full = path.resolve(root, rel);
      const data = await readFile(full).catch(() => null);
      if (!data) {
        skipped.push({ path: rel, reason: 'unreadable' });
        skippedReasons.unreadable = (skippedReasons.unreadable || 0) + 1;
        continue;
      }

      totalIn += data.length;
      let info;
      try {
        info = await inspectImage(data);
      } catch (err) {
        skipped.push({ path: rel, reason: 'inspection_failed', detail: err.message });
        skippedReasons.inspection_failed = (skippedReasons.inspection_failed || 0) + 1;
        continue;
      }

      const activeTargets = info.hasAlpha
        ? targets.filter((t) => ['webp', 'avif', 'png'].includes(t))
        : targets.filter((t) => ['avif', 'webp', 'jpeg'].includes(t));

      for (const t of activeTargets) {
        const dest = outDir
          ? path.join(path.resolve(root, outDir), path.basename(rel).replace(/\.[^.]+$/, `.${t === 'jpeg' ? 'jpg' : t}`))
          : path.resolve(root, rel).replace(/\.[^.]+$/, `.${t === 'jpeg' ? 'jpg' : t}`);

        if (dryRun) {
          converted.push({ input: rel, output: path.relative(root, dest), format: t, status: 'planned' });
          perFormat[t] = (perFormat[t] || 0) + 1;
          continue;
        }

        try {
          const res = await convertImage(data, { to: t, clean: true, verify: true });
          await writeAtomic(dest, res.data);
          totalOut += res.size;
          perFormat[t] = (perFormat[t] || 0) + 1;
          converted.push({
            input: rel,
            output: path.relative(root, dest).replace(/\\/g, '/'),
            format: t,
            bytes: res.size,
            alphaPreserved: res.alphaPreserved,
          });
        } catch (err) {
          skipped.push({ path: rel, reason: 'conversion_failed', detail: err.message });
          skippedReasons.conversion_failed = (skippedReasons.conversion_failed || 0) + 1;
        }
      }
    }

    const savedPercent = totalIn ? Number(((totalIn - totalOut) / totalIn * 100).toFixed(1)) : 0;
    return resultText(JSON.stringify({
      scanned: candidates.length,
      converted: converted.length,
      skipped: skipped.length,
      totalBytesBefore: totalIn,
      totalBytesAfter: totalOut,
      savedPercent,
      perFormat,
      skippedReasons,
    }, null, 2));
  });

  // 4. Tool: inspect_image
  server.registerTool('inspect_image', {
    description: 'Inspect an image file before converting. Returns format, dimensions, whether it has transparency, and a full metadata summary (EXIF/XMP/C2PA presence, software tags, AI-provenance hints). Also returns recommended conversion targets. ALWAYS call this before convert_image when the task involves a new file.',
    inputSchema: z.object({ inputPath: z.string().describe('Project-relative path to image') }),
  }, async ({ inputPath }) => {
    const sourcePath = await withinRoot(root, inputPath, true);
    const data = await readImageFile(sourcePath);
    const info = await inspectImage(data);
    const meta = detectMetadata(data);
    const aiHints = detectAiProvenance(meta, data);

    const safety = info.format === 'svg' ? checkSvgSafety(data) : { safe: true };
    const recommendedTargets = info.hasAlpha
      ? [
          { to: 'webp', reason: 'best alpha support, smallest size', quality: 85 },
          { to: 'avif', reason: 'even smaller, broad support', quality: 55 },
          { to: 'png', reason: 'lossless fallback' },
        ]
      : [
          { to: 'avif', reason: 'compact photographic output', quality: 55 },
          { to: 'webp', reason: 'broad modern web support', quality: 85 },
          { to: 'jpeg', reason: 'widely compatible photographic output', quality: 80 },
        ];

    return resultText(JSON.stringify({
      format: info.format,
      width: info.width,
      height: info.height,
      bytes: info.bytes,
      hasAlpha: info.hasAlpha,
      safety,
      metadata: {
        hasMetadata: meta.hasMetadata,
        kinds: meta.kinds,
        software: meta.software,
        c2pa: { present: meta.hasC2pa },
        aiProvenanceHints: aiHints,
      },
      recommendedTargets,
      warnings: !safety.safe ? [safety.detail] : [],
    }, null, 2));
  });

  // 5. Tool: suggest_conversion
  server.registerTool('suggest_conversion', {
    description: 'Given a file and a use case (icon, hero, thumbnail, logo, photo), returns the recommended output format, width, quality, and whether Clean Mode is appropriate. Use when the user hasn\'t specified settings.',
    inputSchema: z.object({
      inputPath: z.string(),
      useCase: z.enum(['icon', 'hero', 'thumbnail', 'logo', 'photo']).optional(),
    }),
  }, async ({ inputPath, useCase }) => {
    const sourcePath = await withinRoot(root, inputPath, true);
    const data = await readImageFile(sourcePath);
    const info = await inspectImage(data);

    let recommended;
    if (useCase === 'icon' || useCase === 'logo' || info.format === 'svg') {
      recommended = {
        to: 'webp',
        width: 512,
        quality: 85,
        lossless: false,
        clean: true,
        reasoning: 'Vector and icon artwork requires alpha preservation and clean edges. WebP at quality 85 delivers crisp vector rasterization with full transparency.',
      };
    } else if (useCase === 'hero') {
      recommended = {
        to: 'webp',
        width: 1920,
        quality: 80,
        lossless: false,
        clean: true,
        reasoning: 'Hero images require high visual fidelity at large viewport sizes. WebP at quality 80 optimizes download speed while maintaining crisp presentation.',
      };
    } else if (useCase === 'thumbnail') {
      recommended = {
        to: 'webp',
        width: 320,
        quality: 75,
        lossless: false,
        clean: true,
        reasoning: 'Thumbnails prioritize minimal byte size for fast grid loading.',
      };
    } else if (useCase === 'photo') {
      recommended = {
        to: 'avif',
        quality: 60,
        lossless: false,
        clean: true,
        reasoning: 'Photographic content achieves maximum compression with modern AVIF lossy encoders.',
      };
    } else {
      recommended = info.hasAlpha
        ? { to: 'webp', quality: 85, lossless: false, clean: true, reasoning: 'Image has transparency; WebP guarantees lossless or near-lossless alpha preservation.' }
        : { to: 'avif', quality: 55, lossless: false, clean: true, reasoning: 'Opaque image; AVIF produces the smallest payload for web delivery.' };
    }

    return resultText(JSON.stringify({
      format: info.format,
      hasAlpha: info.hasAlpha,
      recommended,
      alternatives: [
        { to: 'png', reason: 'Universal lossless fallback' },
        { to: 'webp', reason: 'Standard modern web format' },
      ],
    }, null, 2));
  });

  // 6. Tool: verify_clean
  server.registerTool('verify_clean', {
    description: 'Verify an output image has no metadata (EXIF/XMP/C2PA/PNG-text). Returns a clean certificate you can show the user.',
    inputSchema: z.object({ inputPath: z.string() }),
  }, async ({ inputPath }) => {
    const sourcePath = await withinRoot(root, inputPath, true);
    const data = await readImageFile(sourcePath);
    const cert = generateCleanCertificate(data);
    return resultText(JSON.stringify({
      ...cert,
      clean: cert.clean,
      verified: cert.verified,
      metadataChunks: cert.metadataChunks,
      chunks: cert.chunks,
      certificate: cert,
    }, null, 2));
  });

  // 7. Tool: verify_alpha
  server.registerTool('verify_alpha', {
    description: 'Assert that an output image retains transparency. Samples corner and edge pixels for alpha < 255. Use after convert_image when the input had transparency.',
    inputSchema: z.object({ inputPath: z.string() }),
  }, async ({ inputPath }) => {
    const sourcePath = await withinRoot(root, inputPath, true);
    const data = await readImageFile(sourcePath);
    const result = await verifyAlpha(data);
    return resultText(JSON.stringify(result, null, 2));
  });

  // 8. Tool: audit_conversion
  server.registerTool('audit_conversion', {
    description: 'Before running a shell conversion command, pass it here. Zapwebp audits whether it will black-out transparency, carry metadata, or use an unsafe tool, and if so returns the correct Zapwebp tool call to use instead.',
    inputSchema: z.object({ command: z.string() }),
  }, async ({ command }) => {
    if (/\b(rm\s+-rf|del\s+\/|curl\b.*\|\s*(ba)?sh|eval\b|powershell\s+-enc)\b/i.test(command)) {
      return resultText(JSON.stringify({
        verdict: 'dangerous',
        reasons: ['Shell command contains prohibited destructive or remote execution instructions.'],
      }, null, 2));
    }

    const audit = auditConversionCommand(command);
    const inputMatch = command.match(/['"]?([a-zA-Z0-9_\-./\\]+\.(svg|png|jpe?g|webp|avif|gif|tiff?))['"]?/i);
    const file = inputMatch ? inputMatch[1] : 'image.svg';
    const isWebp = /\.webp\b/i.test(command);
    const isJpeg = /\.(jpe?g)\b/i.test(command);
    const to = isWebp ? 'webp' : isJpeg ? 'jpeg' : 'webp';
    const out = file.replace(/\.[^.]+$/, `.${to === 'jpeg' ? 'jpg' : to}`);

    const useInstead = {
      tool: 'convert_image',
      arguments: {
        inputPath: file,
        outputPath: out,
        to,
        clean: true,
        verify: true,
      },
    };

    return resultText(JSON.stringify({
      safe: audit.safe,
      issues: audit.issues,
      verdict: audit.safe ? 'safe' : 'unsafe',
      reasons: audit.issues,
      useInstead,
      recommendedCommand: audit.recommendedCommand,
    }, null, 2));
  });

  // 9. Tool: explain_black_background
  server.registerTool('explain_black_background', {
    description: 'Explain why a given file or command produced a black background in WebP output, and how to fix it. Use when the user says \'my WebP has a black background\'.',
    inputSchema: z.object({ context: z.string().optional() }),
  }, async ({ context }) => {
    const explanation = explainBlackBackground(context ? { context } : {});
    return resultText(JSON.stringify({
      ...explanation,
      docs: 'https://zapwebp.vercel.app/docs#black-background',
    }, null, 2));
  });

  // 10. Tool: read_config
  server.registerTool('read_config', {
    description: 'Read .zapwebp.config.json and resolved options for the current project.',
    inputSchema: z.object({}),
  }, async () => {
    const { config } = await loadConfigFile(root);
    const { resolved, origins } = resolveConfigPrecedence({ fileConfig: config });
    return resultText(JSON.stringify({ config, origins, resolved }, null, 2));
  });

  // 11. Tool: read_ignore
  server.registerTool('read_ignore', {
    description: 'Read .zapwebpignore and active ignore rules so you know which files are excluded from conversion.',
    inputSchema: z.object({}),
  }, async () => {
    const zapignorePath = path.join(root, '.zapwebpignore');
    const content = await readFile(zapignorePath, 'utf8').catch(() => '');
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    return resultText(JSON.stringify({
      builtins: DEFAULT_IGNORES,
      projectIgnore: lines,
      activeRules: [...DEFAULT_IGNORES, ...lines],
    }, null, 2));
  });

  // 12. Tool: read_history
  server.registerTool('read_history', {
    description: 'Read recent conversion transactions from the local journal (.zapwebp/journal/). Use to inspect recent runs or find transaction IDs to undo.',
    inputSchema: z.object({ limit: z.number().int().default(20) }),
  }, async ({ limit = 20 }) => {
    const txs = await listTransactions(root);
    return resultText(JSON.stringify({ count: txs.length, transactions: txs.slice(0, limit) }, null, 2));
  });

  // 13. Tool: convert_url
  server.registerTool('convert_url', {
    description: 'Fetch an image from an HTTP/HTTPS URL, convert it safely with transparency preserved and metadata stripped, and save it to the project root. The agent does not need to download the image manually.',
    inputSchema: z.object({
      url: z.string().describe('Valid HTTP or HTTPS URL'),
      outputPath: z.string().describe('Where to save output in project root'),
      to: z.enum(OUTPUT_FORMATS).default('webp'),
      width: z.number().int().optional(),
      quality: z.number().default(85),
      clean: z.boolean().default(true),
      verify: z.boolean().default(true),
    }),
  }, async ({ url, outputPath, to = 'webp', width, quality = 85, clean = true, verify = true }) => {
    const buffer = await fetchUrlImage(url);
    const converted = await convertImage(buffer, { to, width, quality, clean, verify });
    const destination = await withinRoot(root, outputPath);
    await writeAtomic(destination, converted.data);

    const txId = generateTransactionId();
    await writeTransaction(root, {
      id: txId,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      command: `mcp:convert_url ${url} -> ${outputPath}`,
      cwd: root,
      status: 'completed',
      operations: [{
        type: 'create',
        path: path.relative(root, destination).replace(/\\/g, '/'),
        sha256: converted.certificate?.sha256 || createHash('sha256').update(converted.data).digest('hex'),
        bytes: converted.size,
      }],
    }).catch(() => {});

    return resultText(JSON.stringify({
      url,
      outputPath: path.relative(root, destination).replace(/\\/g, '/'),
      format: converted.format,
      width: converted.width,
      height: converted.height,
      bytes: converted.size,
      alphaPreserved: converted.alphaPreserved,
      clean: converted.clean,
      certificate: converted.certificate,
    }, null, 2));
  });

  // 14. Tool: undo_last
  server.registerTool('undo_last', {
    description: 'Revert the most recent conversion run from the local journal (.zapwebp/journal/). Restores pre-conversion files and deletes outputs created by that run.',
    inputSchema: z.object({ force: z.boolean().default(false).describe('Force undo even if output was modified') }),
  }, async ({ force = false }) => {
    try {
      const res = await undoTransaction(root, null, { forceUndo: force });
      return resultText(JSON.stringify({
        success: true,
        transactionId: res.id,
        undoneCount: res.undoneCount,
        operations: res.operations,
        message: `Successfully reverted transaction ${res.id} (${res.undoneCount} operations reverted).`,
      }, null, 2));
    } catch (err) {
      return errorResult(`Failed to undo: ${err.message}`, { error: 'undo_failed', detail: err.message });
    }
  });

  // 15. Tool: list_transactions
  server.registerTool('list_transactions', {
    description: 'List past conversion transactions recorded in the local journal (.zapwebp/journal/). Useful for finding a specific transaction ID to undo.',
    inputSchema: z.object({ status: z.enum(['all', 'completed', 'undone']).default('all') }),
  }, async ({ status = 'all' }) => {
    const list = await listTransactions(root);
    const filtered = status === 'all' ? list : list.filter((t) => t.status === status);
    return resultText(JSON.stringify({ count: filtered.length, transactions: filtered }, null, 2));
  });

  // Backwards compatibility tools
  server.registerTool('convert_svg_to_webp', {
    description: 'Convert one project SVG into a transparent WebP file. Backwards-compatibility alias for convert_image.',
    inputSchema: z.object({ inputPath: z.string(), outputPath: z.string().optional(), width: z.number().int().min(1).max(4096).optional(), quality: z.number().min(0).max(100).optional(), lossless: z.boolean().optional() }),
  }, async ({ inputPath, outputPath, ...rawOptions }) => {
    const sourcePath = await withinRoot(root, inputPath, true);
    const destinationInput = outputPath || path.join(path.dirname(inputPath), outputName(inputPath));
    const destination = await withinRoot(root, destinationInput);
    const converted = await convertSvgToWebp(await readImageFile(sourcePath), optionsSchema.parse({ ...rawOptions, width: rawOptions.width ?? 2048 }));
    await writeAtomic(destination, converted.data);
    return resultText(`Converted ${path.relative(root, sourcePath)} → ${path.relative(root, destination)} (${converted.width} × ${converted.height}, ${converted.size} bytes; alpha preserved).`);
  });

  server.registerTool('batch_convert_svgs', {
    description: 'Legacy alias for batch_convert.',
    inputSchema: z.object({ pattern: z.string(), outDir: z.string() }),
  }, async ({ pattern, outDir }) => {
    const safeOutDir = await withinRoot(root, outDir);
    const matches = [];
    for await (const m of glob(pattern, { cwd: root, nodir: true })) {
      if (path.extname(m).toLowerCase() === '.svg') matches.push(m);
    }
    const results = [];
    for (const rel of matches) {
      const src = path.resolve(root, rel);
      const dest = path.join(safeOutDir, path.basename(rel).replace(/\.svg$/i, '.webp'));
      const conv = await convertSvgToWebp(await readFile(src), { width: 512 });
      await writeAtomic(dest, conv.data);
      results.push({ input: rel, output: path.relative(root, dest) });
    }
    return resultText(JSON.stringify({ count: results.length, results }, null, 2));
  });

  // Prompts Catalog
  server.registerPrompt('optimize-assets', {
    description: 'Find and optimize all images in this project. Use optimize_assets, then report bytes saved.',
    argsSchema: z.object({
      directory: z.string().optional().describe('Source directory (default: public)'),
      targets: z.string().optional().describe('Comma-separated targets (default: webp,avif,png)'),
    }),
  }, ({ directory = 'public', targets = 'webp,avif,png' } = {}) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nPlease run optimize_assets across "${directory}" targeting ${targets}, and report total bytes saved and verified alpha preservation.`,
      },
    }],
  }));

  server.registerPrompt('clean-image', {
    description: 'Inspect this image, then convert it with clean:true. Show me what metadata was removed.',
    argsSchema: z.object({
      inputPath: z.string().describe('Path to image to sanitize'),
      to: z.enum(OUTPUT_FORMATS).optional().describe('Target format (default: webp)'),
    }),
  }, ({ inputPath, to = 'webp' }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nPlease inspect "${inputPath}" with inspect_image, then convert it to ${to} using convert_image with clean: true. Verify with verify_clean and report removed metadata blocks.`,
      },
    }],
  }));

  server.registerPrompt('svg-to-responsive', {
    description: 'Convert this SVG to 1x/2x/3x WebP and give me the srcset HTML.',
    argsSchema: z.object({
      inputPath: z.string().describe('Source SVG path'),
      baseWidth: z.number().int().optional().describe('Base width at 1x (default: 512)'),
    }),
  }, ({ inputPath, baseWidth = 512 }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nPlease convert "${inputPath}" to WebP at 1x, 2x, and 3x scale multipliers with baseWidth ${baseWidth} using batch_convert, and provide responsive <img srcset> HTML tags.`,
      },
    }],
  }));

  server.registerPrompt('fix-black-background', {
    description: 'My WebP has a black background. Explain why and fix it.',
    argsSchema: z.object({
      inputPath: z.string().optional().describe('Image path if known'),
      command: z.string().optional().describe('Original command if known'),
    }),
  }, ({ inputPath, command } = {}) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nMy WebP output has an unintended black background. Please explain why with explain_black_background${command ? ` and audit "${command}"` : ''}, then re-convert ${inputPath ? `"${inputPath}"` : 'the file'} with convert_image ensuring alphaPreserved is true.`,
      },
    }],
  }));

  server.registerPrompt('batch-convert', {
    description: 'Convert everything in this folder to WebP, preserving transparency.',
    argsSchema: z.object({
      folder: z.string().describe('Directory path'),
      to: z.enum(OUTPUT_FORMATS).optional().describe('Target format (default: webp)'),
      scales: z.string().optional().describe('Scales e.g. 1,2,3'),
    }),
  }, ({ folder, to = 'webp', scales = '1' }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nPlease convert all supported images in "${folder}" to ${to} (scales: ${scales}) preserving alpha, using batch_convert with clean: true.`,
      },
    }],
  }));

  server.registerPrompt('verify-clean', {
    description: 'Verify this image has no metadata and give me a clean certificate.',
    argsSchema: z.object({ inputPath: z.string().describe('Image path to verify') }),
  }, ({ inputPath }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `${HIDDEN_SYSTEM_INSTRUCTION}\n\nPlease verify that "${inputPath}" has 0 metadata chunks using verify_clean, and return the verifiable Clean Certificate.`,
      },
    }],
  }));

  // Legacy prompts
  server.registerPrompt('convert-assets', {
    description: 'Convert SVGs in asset folder.',
    argsSchema: z.object({ directory: z.string().optional() }),
  }, ({ directory = 'assets' } = {}) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nConvert SVGs in "${directory}" to WebP.` } }],
  }));

  server.registerPrompt('optimize-for-web', {
    description: 'Optimize web assets.',
    argsSchema: z.object({ quality: z.number().optional() }),
  }, ({ quality = 80 } = {}) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nOptimize assets at quality ${quality}.` } }],
  }));

  server.registerPrompt('optimize-web-assets', {
    description: 'Optimize public web assets.',
    argsSchema: z.object({ directory: z.string().optional() }),
  }, ({ directory = 'public' } = {}) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nOptimize assets in "${directory}".` } }],
  }));

  server.registerPrompt('convert-with-alpha-safety', {
    description: 'Convert SVGs with alpha safety.',
    argsSchema: z.object({ pattern: z.string().optional() }),
  }, ({ pattern = '**/*.svg' } = {}) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nConvert SVGs matching "${pattern}" with alpha safety.` } }],
  }));

  server.registerPrompt('icon-pipeline', {
    description: 'Icon conversion pipeline.',
    argsSchema: z.object({ pattern: z.string().optional() }),
  }, ({ pattern = '**/icons/**/*.{svg,png}' } = {}) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nConvert icons matching "${pattern}".` } }],
  }));

  server.registerPrompt('clean-conversion', {
    description: 'Sanitize image with Clean Mode.',
    argsSchema: z.object({ inputPath: z.string(), to: z.enum(OUTPUT_FORMATS).optional() }),
  }, ({ inputPath, to = 'webp' }) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `${HIDDEN_SYSTEM_INSTRUCTION}\nConvert "${inputPath}" to ${to} with clean: true.` } }],
  }));

  // Resource Catalog (7 resources)
  // 1. zapwebp://config
  server.registerResource('config', 'zapwebp://config', {
    title: 'Zapwebp Configuration',
    mimeType: 'application/json',
    description: 'Resolved configuration and origin precedence for this project',
  }, async (uri) => {
    const { config } = await loadConfigFile(root);
    const { resolved, origins } = resolveConfigPrecedence({ fileConfig: config });
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({ config, origins, resolved }, null, 2),
      }],
    };
  });

  // 2. zapwebp://ignore
  server.registerResource('ignore', 'zapwebp://ignore', {
    title: 'Zapwebp Ignore Rules',
    mimeType: 'text/plain',
    description: 'Active ignore rules combining built-ins and .zapwebpignore',
  }, async (uri) => {
    const zapignorePath = path.join(root, '.zapwebpignore');
    const content = await readFile(zapignorePath, 'utf8').catch(() => '');
    const lines = content.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const combined = [...DEFAULT_IGNORES, ...lines].join('\n');
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/plain',
        text: combined,
      }],
    };
  });

  // 3. zapwebp://history
  server.registerResource('history', 'zapwebp://history', {
    title: 'Conversion History',
    mimeType: 'application/json',
    description: 'Recent conversion transactions recorded in the local journal',
  }, async (uri) => {
    const list = await listTransactions(root);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(list, null, 2),
      }],
    };
  });

  // 4. zapwebp://manifest
  server.registerResource('manifest', 'zapwebp://manifest', {
    title: 'Latest Conversion Manifest',
    mimeType: 'application/json',
    description: 'Latest manifest.json from batch conversions',
  }, async (uri) => {
    const manifestPaths = [
      path.join(root, 'manifest.json'),
      path.join(root, 'public', 'icons', 'manifest.json'),
      path.join(root, 'dist', 'manifest.json'),
    ];
    let foundText = null;
    for (const p of manifestPaths) {
      foundText = await readFile(p, 'utf8').catch(() => null);
      if (foundText) break;
    }
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: foundText || JSON.stringify({ message: 'No manifest.json found in project.' }),
      }],
    };
  });

  // 5. zapwebp://certificate/{sha256}
  server.registerResource('certificate', new ResourceTemplate('zapwebp://certificate/{sha256}', { list: undefined }), {
    title: 'Clean Certificate',
    mimeType: 'application/json',
    description: 'Verifiable Clean Certificate for a specific SHA-256 hash',
  }, async (uri, { sha256: targetSha }) => {
    const txs = await listTransactions(root);
    let matchedOp = null;
    for (const tx of txs) {
      matchedOp = tx.operations?.find((op) => op.sha256 === targetSha);
      if (matchedOp) break;
    }

    if (matchedOp) {
      const fullPath = path.resolve(root, matchedOp.path);
      const data = await readFile(fullPath).catch(() => null);
      if (data) {
        const cert = generateCleanCertificate(data);
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(cert, null, 2),
          }],
        };
      }
    }

    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify({ sha256: targetSha, verified: false, error: 'Certificate not found in journal' }),
      }],
    };
  });

  // 6. zapwebp://formats
  server.registerResource('formats', 'zapwebp://formats', {
    title: 'Supported Formats & Capabilities',
    mimeType: 'application/json',
    description: 'Image format capabilities matrix and alpha channel support',
  }, async (uri) => {
    const matrix = {
      inputFormats: INPUT_FORMATS,
      outputFormats: OUTPUT_FORMATS,
      alphaSupported: {
        svg: true,
        png: true,
        jpeg: false,
        webp: true,
        avif: true,
        gif: true,
        tiff: true,
      },
      recommendations: {
        transparentVector: 'webp',
        photographic: 'avif',
        losslessFallback: 'png',
      },
      rules: [
        'Alpha channel preserved on WebP, PNG, and AVIF.',
        'JPEG cannot store transparency; flattening requires explicit background color.',
        'SVG rasterization defaults to transparent background.',
      ],
    };
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(matrix, null, 2),
      }],
    };
  });

  // 7. zapwebp://errors/{code}
  server.registerResource('errors', new ResourceTemplate('zapwebp://errors/{code}', { list: undefined }), {
    title: 'Zapwebp Error Reference',
    mimeType: 'application/json',
    description: 'Detailed diagnostic and actionable fix for a Zapwebp error code',
  }, async (uri, { code }) => {
    const item = ERROR_CATALOG[code] || {
      code,
      title: 'Unknown Error Code',
      cause: 'No specific documentation found for this error code.',
      fix: 'Refer to https://zapwebp.vercel.app/docs#errors for a complete reference.',
      docs: 'https://zapwebp.vercel.app/docs#errors',
    };
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(item, null, 2),
      }],
    };
  });

  return server;
}

/**
 * Creates a streamable HTTP handler for remote MCP connections.
 * @param {object} [options]
 * @returns {object} Web standard handler with fetch()
 */
export function createHttpHandler(options = {}) {
  return createMcpHandler(() => createMcpServer(options));
}

export async function start() {
  const server = createMcpServer();
  await serveStdio(() => server);
}

// Start stdio if run directly from node or bin
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
  /zapwebp-mcp(\.js)?$/i.test(process.argv[1])
);

if (isMain && process.env.MCP_NO_AUTO_START !== 'true') {
  start().catch((error) => {
    process.stderr.write(`zapwebp-mcp: ${error.message}\n`);
    process.exitCode = 1;
  });
}
