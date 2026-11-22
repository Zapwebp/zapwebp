'use strict';

const vscode = require('vscode');
const { getRealFormat } = require('../format');
const { buildMenu } = require('../menu');
const { rememberPreference, getPreferredTarget } = require('../history');
const { readConfig, readWorkspaceLockConfig } = require('../config');
const { convertBuffer, convertScalesBuffer, checkLock, ZapError } = require('../core');
const { promptIcoSizes } = require('./convert');
const { formatBytes, showSuccess, showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

/**
 * Prompts user for ICO extraction options.
 * @param {vscode.Uri} uri
 * @returns {Promise<{ action: 'largest'|'all'|'specific', size?: number }|null>}
 */
async function promptIcoExtraction(uri) {
  const choice = await vscode.window.showQuickPick(
    [
      { label: 'Largest size', action: 'largest', description: 'Extract single highest-resolution frame' },
      { label: 'All sizes as separate files', action: 'all', description: 'Extract every icon resolution into separate files' },
      { label: 'Specific size...', action: 'specific', description: 'Choose specific resolution from container' },
    ],
    { placeHolder: 'Extract from ICO' }
  );
  if (!choice) return null;
  if (choice.action === 'specific') {
    let sizeChoices = [16, 32, 48, 64, 128, 256];
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const icoLib = require('@zapwebp/format-ico');
      if (icoLib && typeof icoLib.parseIco === 'function') {
        const parsed = icoLib.parseIco(bytes);
        if (parsed.entries?.length) {
          sizeChoices = parsed.entries.map((e) => e.width);
        }
      }
    } catch {}
    const pickedSize = await vscode.window.showQuickPick(
      Array.from(new Set(sizeChoices)).map((s) => ({ label: `${s}×${s}`, size: s })),
      { placeHolder: 'Select size to extract' }
    );
    if (!pickedSize) return null;
    return { action: 'specific', size: pickedSize.size };
  }
  return { action: choice.action };
}

/**
 * Derives output URI with target extension and optional scale multiplier suffix.
 * @param {vscode.Uri} sourceUri
 * @param {string} targetExt
 * @param {number} [multiplier=1]
 * @returns {vscode.Uri}
 */
function buildOutputUri(sourceUri, targetExt, multiplier = 1) {
  const normExt = targetExt === 'jpeg' ? 'jpg' : targetExt.replace(/^\./, '');
  const parts = sourceUri.path.split('/');
  const filename = parts.pop() || 'image';
  const dotIndex = filename.lastIndexOf('.');
  const base = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
  const suffix = multiplier && multiplier > 1 ? `@${multiplier}x` : '';
  parts.push(`${base}${suffix}.${normExt}`);
  return sourceUri.with({ path: parts.join('/') });
}

/**
 * Resolves conversion target URIs from command context, active editor, or open dialog.
 * @param {vscode.Uri} [uri]
 * @param {vscode.Uri[]} [uris]
 * @returns {Promise<vscode.Uri[]>}
 */
async function resolveSelections(uri, uris) {
  if (Array.isArray(uris) && uris.length > 0) return uris;
  if (uri && uri.path) return [uri];

  if (vscode.window.activeTextEditor?.document?.uri) {
    return [vscode.window.activeTextEditor.document.uri];
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    canSelectFiles: true,
    canSelectFolders: false,
    title: 'Select Images to Zap',
  });

  return selected && selected.length > 0 ? selected : [];
}

/**
 * Executes file conversions with progress reporting and cancellation support.
 * @param {Array<{ uri: vscode.Uri, sourceFormat: string, target: string, multipliers?: number[] }>} tasks
 * @param {import('../config').ZapwebpConfig} config
 * @returns {Promise<{ converted: number, failed: number, bytesIn: number, bytesOut: number, savedBytes: number, lastDetails: any }>}
 */
async function executeZapTasks(tasks, config) {
  let converted = 0;
  let failed = 0;
  let bytesIn = 0;
  let bytesOut = 0;
  let lastDetails = null;

  // Workspace Target Lock check
  if (tasks.length > 0) {
    const lockConfig = await readWorkspaceLockConfig(tasks[0].uri);
    if (config.targetLockEnabled && lockConfig.exists) {
      statusBar.setTargetLock(lockConfig.targetFormat);
      for (const t of tasks) {
        if (lockConfig.acceptFormats && !lockConfig.acceptFormats.includes(t.target.toLowerCase())) {
          const err = new ZapError(
            'E_FORMAT_REJECTED',
            `Target format "${t.target}" is rejected by workspace Target Lock policy (allowed: ${lockConfig.acceptFormats.join(', ')}).`
          );
          showError(t.uri, err);
          return { converted: 0, failed: tasks.length, bytesIn: 0, bytesOut: 0, savedBytes: 0, lastDetails: null };
        }
      }
    }
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Zapwebp',
      cancellable: true,
    },
    async (progress, token) => {
      let index = 0;
      const total = tasks.length;

      for (const task of tasks) {
        if (token && token.isCancellationRequested) break;

        index++;
        const filename = task.uri.path.split('/').pop();
        progress.report({
          message: `${index}/${total}: ${filename} → ${task.target.toUpperCase()}`,
          increment: (1 / total) * 100,
        });

        const bg = task.target === 'jpeg' ? '#ffffff' : undefined;

        try {
          const inBytes = await vscode.workspace.fs.readFile(task.uri);
          const inSize = inBytes.byteLength;
          bytesIn += inSize;

          if (Array.isArray(task.multipliers) && task.multipliers.length > 1) {
            const scaleResults = await convertScalesBuffer(
              inBytes,
              filename,
              config.baseWidth,
              config.quality,
              config.clean,
              task.target,
              bg
            );

            let taskOutSize = 0;
            const parentDir = task.uri.path.substring(0, task.uri.path.lastIndexOf('/'));

            for (const res of scaleResults) {
              const outPath = `${parentDir}/${res.filename}`;
              if (outPath === task.uri.path) {
                throw new Error(`Output file cannot overwrite input source.`);
              }
              const outUri = task.uri.with({ path: outPath });
              await vscode.workspace.fs.writeFile(outUri, res.data);
              taskOutSize += res.data.byteLength;
            }

            bytesOut += taskOutSize;
            converted++;
            lastDetails = {
              filename,
              sourceSize: inSize,
              outputSize: taskOutSize,
              target: `${task.target} (@1x, @2x, @3x)`,
            };
          } else {
            const outUri = buildOutputUri(task.uri, task.target, 1);
            if (outUri.path === task.uri.path) {
              throw new Error(`Output (${task.target}) cannot overwrite input source.`);
            }

            // Lock skip check: avoid re-converting files with matching fingerprint
            try {
              const existingOutBytes = await vscode.workspace.fs.readFile(outUri);
              const lockCheck = checkLock(
                existingOutBytes,
                inBytes,
                { to: task.target, quality: config.quality, clean: config.clean, background: bg }
              );
              if (lockCheck.skipped) {
                statusBar.log(`[Lock] Skipped ${filename} (already converted with matching options)`);
                continue;
              }
            } catch {}

            const outData = await convertBuffer(
              inBytes,
              task.target,
              config.baseWidth,
              config.quality,
              config.clean,
              bg,
              {
                sizes: task.sizes,
                crop: task.crop,
                targetBytes: task.targetBytes,
                extractAll: task.extractAll,
                extractSize: task.extractSize,
              }
            );

            if (Array.isArray(outData)) {
              // Multi-frame extraction (ICO / CUR)
              const parentDir = task.uri.path.substring(0, task.uri.path.lastIndexOf('/'));
              const baseName = filename.replace(/\.[^.]+$/, '');
              let taskOutSize = 0;
              for (const frame of outData) {
                const frameFilename = `${baseName}-${frame.width}x${frame.height}.${task.target === 'jpeg' ? 'jpg' : task.target}`;
                const frameUri = task.uri.with({ path: `${parentDir}/${frameFilename}` });
                await vscode.workspace.fs.writeFile(frameUri, frame.data);
                taskOutSize += frame.data.byteLength;
              }
              bytesOut += taskOutSize;
              converted++;
              lastDetails = {
                filename: `${baseName} (${outData.length} sizes)`,
                sourceSize: inSize,
                outputSize: taskOutSize,
                target: task.target,
              };
            } else {
              const outSize = outData.byteLength;
              await vscode.workspace.fs.writeFile(outUri, outData);

              bytesOut += outSize;
              converted++;
              lastDetails = {
                filename,
                sourceSize: inSize,
                outputSize: outSize,
                target: task.target,
              };
            }
          }
        } catch (err) {
          failed++;
          showError(task.uri, err);
          statusBar.log(`[Error] Failed to zap ${filename}: ${err.message}`);
        }
      }
    }
  );

  return {
    converted,
    failed,
    bytesIn,
    bytesOut,
    savedBytes: Math.max(0, bytesIn - bytesOut),
    lastDetails,
  };
}

/**
 * Handles the context-aware "Zap" command for single and multi-file selections.
 * @param {vscode.ExtensionContext} context
 * @param {vscode.Uri} [uri]
 * @param {vscode.Uri[]} [uris]
 */
async function handleZapCommand(context, uri, uris) {
  const selections = await resolveSelections(uri, uris);
  if (selections.length === 0) {
    vscode.window.showErrorMessage('No file selected.');
    return;
  }

  const config = readConfig();
  const lockConfig = await readWorkspaceLockConfig(selections[0]);
  if (config.targetLockEnabled && lockConfig.exists) {
    statusBar.setTargetLock(lockConfig.targetFormat);
  }

  // 1. Detect source formats using magic byte inspection
  const formatEntries = await Promise.all(
    selections.map(async (fileUri) => {
      const format = await getRealFormat(fileUri);
      return { uri: fileUri, format };
    })
  );

  const unknownFiles = formatEntries.filter((e) => !e.format);
  if (unknownFiles.length === formatEntries.length) {
    vscode.window.showErrorMessage('Could not detect file format.');
    return;
  }

  const validEntries = formatEntries.filter((e) => Boolean(e.format));
  const uniqueFormats = Array.from(new Set(validEntries.map((e) => e.format.toLowerCase())));

  let tasks = [];

  // 2. Handle Multi-Select with Mixed Formats
  if (uniqueFormats.length > 1) {
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: 'Zap all to WebP (convert everything)',
          description: 'Convert every selected file to WebP',
          action: 'all-webp',
        },
        {
          label: 'Zap each to its own format (skip same-format)',
          description: 'Use the preferred/default target for each file type',
          action: 'preferred',
        },
        {
          label: 'Cancel',
          description: 'Abort conversion',
          action: 'cancel',
        },
      ],
      {
        placeHolder: `Multiple formats selected (${uniqueFormats.join(', ').toUpperCase()}). Choose conversion mode:`,
      }
    );

    if (!choice || choice.action === 'cancel') return;

    if (choice.action === 'all-webp') {
      tasks = validEntries
        .filter((e) => e.format.toLowerCase() !== 'webp')
        .map((e) => ({
          uri: e.uri,
          sourceFormat: e.format,
          target: 'webp',
        }));
    } else if (choice.action === 'preferred') {
      tasks = validEntries
        .map((e) => {
          const preferred =
            (config.rememberLastChoice && getPreferredTarget(context, e.format)) ||
            config.defaultTargets[e.format.toLowerCase()] ||
            'webp';
          return {
            uri: e.uri,
            sourceFormat: e.format,
            target: preferred,
          };
        })
        .filter((t) => t.sourceFormat.toLowerCase() !== t.target.toLowerCase());
    }
  } else {
    // 3. Single Format flow (Single file or multi-select of identical format)
    const sourceFormat = uniqueFormats[0];
    const preferredTarget = config.rememberLastChoice ? getPreferredTarget(context, sourceFormat) : null;
    const defaultTarget = (config.targetLockEnabled && lockConfig.exists && lockConfig.targetFormat)
      ? lockConfig.targetFormat
      : (config.defaultTargets[sourceFormat] || 'webp');

    const menu = buildMenu(sourceFormat, {
      defaultTarget,
      preferredTarget,
      showMultipliersForPng: config.showMultipliersForPng,
    });

    if (menu.length === 0) {
      vscode.window.showInformationMessage(`No available conversion targets for ${sourceFormat.toUpperCase()}.`);
      return;
    }

    const firstFileName = validEntries[0].uri.path.split('/').pop();
    const placeHolder =
      validEntries.length === 1
        ? `Zap ${firstFileName} (${sourceFormat.toUpperCase()}) — choose target format:`
        : `Selected ${validEntries.length} ${sourceFormat.toUpperCase()} file(s) — choose target format:`;

    const selected = await vscode.window.showQuickPick(
      menu.map((item) => ({
        label: item.label,
        description: item.description,
        item,
      })),
      { placeHolder }
    );

    if (!selected) return; // User cancelled

    const choice = selected.item;

    let icoSizes = null;
    if (choice.target === 'ico') {
      icoSizes = await promptIcoSizes(config.icoPreset);
      if (!icoSizes) return;
    }

    let extractAll = false;
    let extractSize = null;
    if (sourceFormat === 'ico' || sourceFormat === 'cur') {
      const extractChoice = await promptIcoExtraction(validEntries[0].uri);
      if (!extractChoice) return;
      if (extractChoice.action === 'all') {
        extractAll = true;
      } else if (extractChoice.action === 'specific') {
        extractSize = extractChoice.size;
      }
    }

    // Remember user preference if not multi-scale
    if (config.rememberLastChoice && !choice.multipliers) {
      rememberPreference(context, {
        sourceFormat,
        targetFormat: choice.target,
        multipliers: choice.multipliers,
      });
    }

    tasks = validEntries.map((e) => ({
      uri: e.uri,
      sourceFormat,
      target: choice.target,
      multipliers: choice.multipliers,
      sizes: icoSizes,
      extractAll,
      extractSize,
    }));
  }

  if (tasks.length === 0) {
    vscode.window.showInformationMessage('No files to convert (target formats match sources).');
    return;
  }

  // 4. Run conversion tasks
  const result = await executeZapTasks(tasks, config);

  // 5. Update Status Bar & Feedback
  if (result.converted > 0) {
    statusBar.increment(result.converted, result.savedBytes);
    showSuccess(result.converted, result.savedBytes, result.converted === 1 ? result.lastDetails : undefined);
    statusBar.log(
      `[Success] Zapped ${result.converted} file(s) (${formatBytes(result.bytesIn)} → ${formatBytes(result.bytesOut)}, saved ${formatBytes(result.savedBytes)})`
    );
  }

  return result;
}

/**
 * Registers `zapwebp.zap` in VS Code context.
 * @param {vscode.ExtensionContext} context
 */
function registerZapCommand(context) {
  const zapCmd = vscode.commands.registerCommand('zapwebp.zap', async (uri, uris) => {
    return handleZapCommand(context, uri, uris);
  });
  context.subscriptions.push(zapCmd);
}

module.exports = {
  registerZapCommand,
  handleZapCommand,
  buildOutputUri,
  resolveSelections,
};
