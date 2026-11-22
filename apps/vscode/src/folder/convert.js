'use strict';

const vscode = require('vscode');
const { convertBuffer, convertScalesBuffer, checkLock } = require('../core');
const { readConfig } = require('../config');

/**
 * Derives a sibling URI with the specified extension in the same directory.
 * @param {vscode.Uri} uri
 * @param {string} ext
 * @returns {vscode.Uri}
 */
function siblingUri(uri, ext) {
  const normalizedExt = ext === 'jpeg' ? 'jpg' : ext.replace(/^\./, '');
  const parts = uri.path.split('/');
  const filename = parts.pop();
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  parts.push(`${base}.${normalizedExt}`);
  return uri.with({ path: parts.join('/') });
}

/**
 * Executes batch conversion for a scanned folder based on per-format configurations.
 * @param {import('./scan').ScanResult} scanResult
 * @param {Array<{ sourceFormat: string, targetFormat: string, scales?: boolean, background?: string }>} configs
 * @param {object} [options]
 * @param {import('../config').ZapwebpConfig} [options.config]
 * @returns {Promise<{
 *   total: number,
 *   converted: number,
 *   failed: number,
 *   skipped: number,
 *   bytesIn: number,
 *   bytesOut: number,
 *   savedBytes: number,
 *   convertedFiles: Array<{ name: string, target: string, sourceSize: number, outputSize: number, saved: number }>,
 *   failedFiles: Array<{ name: string, error: string }>,
 *   skippedFiles: Array<{ name: string, ext: string, reason: string }>
 * }>}
 */
async function convertFolder(scanResult, configs, options = {}) {
  const config = options.config || readConfig();
  const configMap = new Map();

  for (const cfg of configs) {
    if (cfg && cfg.targetFormat && cfg.targetFormat !== 'skip') {
      configMap.set(cfg.sourceFormat.toLowerCase(), cfg);
    }
  }

  // Filter scan items to only formats configured for conversion
  const filesToConvert = scanResult.files.filter((f) => configMap.has(f.format.toLowerCase()));

  const convertedFiles = [];
  const failedFiles = [];
  let totalBytesIn = 0;
  let totalBytesOut = 0;

  if (filesToConvert.length === 0) {
    return {
      total: 0,
      converted: 0,
      failed: 0,
      skipped: scanResult.skipped.length,
      bytesIn: 0,
      bytesOut: 0,
      savedBytes: 0,
      convertedFiles,
      failedFiles,
      skippedFiles: scanResult.skipped,
    };
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Zap Folder',
      cancellable: true,
    },
    async (progress, token) => {
      let index = 0;
      const total = filesToConvert.length;

      for (const file of filesToConvert) {
        if (token && token.isCancellationRequested) {
          break;
        }

        index++;
        progress.report({
          message: `${index}/${total}: ${file.name}`,
          increment: (1 / total) * 100,
        });

        const cfg = configMap.get(file.format.toLowerCase());
        const targetFormat = cfg.targetFormat || 'webp';
        const useScales = Boolean(cfg.scales && file.format === 'svg');
        const bg = cfg.background || (targetFormat === 'jpeg' ? '#ffffff' : undefined);

        try {
          const inBytes = await vscode.workspace.fs.readFile(file.uri);
          const inSize = inBytes.byteLength;
          totalBytesIn += inSize;

          if (useScales) {
            const scaleResults = await convertScalesBuffer(
              inBytes,
              file.name,
              config.baseWidth,
              config.quality,
              config.clean,
              targetFormat,
              bg
            );

            let fileOutBytes = 0;
            const parentDir = file.uri.path.substring(0, file.uri.path.lastIndexOf('/'));

            for (const res of scaleResults) {
              const outPath = `${parentDir}/${res.filename}`;
              if (outPath === file.uri.path) {
                throw new Error(`Scale output (${res.filename}) cannot overwrite input source.`);
              }
              const outUri = file.uri.with({ path: outPath });
              await vscode.workspace.fs.writeFile(outUri, res.data);
              fileOutBytes += res.data.byteLength;
            }

            totalBytesOut += fileOutBytes;
            convertedFiles.push({
              name: file.name,
              target: `${targetFormat} (@1x, @2x, @3x)`,
              sourceSize: inSize,
              outputSize: fileOutBytes,
              saved: Math.max(0, inSize - fileOutBytes),
            });
          } else {
            const outUri = siblingUri(file.uri, targetFormat);
            if (outUri.path === file.uri.path) {
              throw new Error(`Output (${targetFormat}) cannot overwrite input source.`);
            }

            // Lock skip check
            try {
              const existingOutBytes = await vscode.workspace.fs.readFile(outUri);
              const lockCheck = checkLock(
                existingOutBytes,
                inBytes,
                { to: targetFormat, quality: config.quality, clean: config.clean, background: bg }
              );
              if (lockCheck.skipped) {
                continue;
              }
            } catch {}

            const outData = await convertBuffer(
              inBytes,
              targetFormat,
              config.baseWidth,
              config.quality,
              config.clean,
              bg
            );

            if (Array.isArray(outData)) {
              const parentDir = file.uri.path.substring(0, file.uri.path.lastIndexOf('/'));
              const baseName = file.name.replace(/\.[^.]+$/, '');
              let fileOutBytes = 0;
              for (const frame of outData) {
                const frameFilename = `${baseName}-${frame.width}x${frame.height}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`;
                const frameUri = file.uri.with({ path: `${parentDir}/${frameFilename}` });
                await vscode.workspace.fs.writeFile(frameUri, frame.data);
                fileOutBytes += frame.data.byteLength;
              }
              totalBytesOut += fileOutBytes;
              convertedFiles.push({
                name: file.name,
                target: `${targetFormat} (${outData.length} sizes)`,
                sourceSize: inSize,
                outputSize: fileOutBytes,
                saved: Math.max(0, inSize - fileOutBytes),
              });
            } else {
              const outSize = outData.byteLength;
              await vscode.workspace.fs.writeFile(outUri, outData);
              totalBytesOut += outSize;

              convertedFiles.push({
                name: file.name,
                target: targetFormat,
                sourceSize: inSize,
                outputSize: outSize,
                saved: Math.max(0, inSize - outSize),
              });
            }
          }
        } catch (err) {
          failedFiles.push({
            name: file.name,
            error: err && err.message ? err.message : String(err),
          });
        }
      }
    }
  );

  return {
    total: filesToConvert.length,
    converted: convertedFiles.length,
    failed: failedFiles.length,
    skipped: scanResult.skipped.length,
    bytesIn: totalBytesIn,
    bytesOut: totalBytesOut,
    savedBytes: Math.max(0, totalBytesIn - totalBytesOut),
    convertedFiles,
    failedFiles,
    skippedFiles: scanResult.skipped,
  };
}

module.exports = {
  convertFolder,
  siblingUri,
};
