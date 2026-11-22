'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const vscode = require('vscode');
const { convertBuffer, checkLock, ZapError } = require('../core');
const { readConfig, readWorkspaceLockConfig } = require('../config');
const { showSuccess, showError } = require('../ui/toast');
const { statusBar } = require('../ui/status-bar');

const SUPPORTED_INPUT_EXTENSIONS = ['svg', 'png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'tif', 'tiff', 'ico', 'cur'];

/**
 * Ensures user has given explicit consent to delete original files.
 * @param {vscode.ExtensionContext} [context]
 * @returns {Promise<boolean>}
 */
async function ensureDeleteConsent(context) {
  if (context && context.globalState) {
    const consented = context.globalState.get('zapwebp.deleteOriginalConsented');
    if (consented) return true;
  }

  const choice = await vscode.window.showWarningMessage(
    'Zapwebp will delete original image files after conversion.\n\nDeleted files are safely backed up to .zapwebp/backups/ for 30 days and can be restored using the "Zapwebp: Undo Last Conversion" command.',
    { modal: true },
    'Enable Deletion',
    'Cancel'
  );

  if (choice === 'Enable Deletion') {
    if (context && context.globalState) {
      await context.globalState.update('zapwebp.deleteOriginalConsented', true);
    }
    return true;
  }

  return false;
}

/**
 * Derives a sibling URI with the new file extension in the same directory.
 * @param {vscode.Uri} uri - Source file URI.
 * @param {string} ext - Target extension (e.g. 'webp', 'png', 'avif', 'jpeg').
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
 * Resolves conversion target URIs from command context, active editor, or open dialog.
 * @param {vscode.Uri} [uri]
 * @param {vscode.Uri[]} [uris]
 * @returns {Promise<vscode.Uri[]>}
 */
async function resolveTargets(uri, uris) {
  if (Array.isArray(uris) && uris.length > 0) return uris;
  if (uri) return [uri];

  if (vscode.window.activeTextEditor?.document?.uri) {
    const activeUri = vscode.window.activeTextEditor.document.uri;
    const ext = activeUri.path.split('.').pop()?.toLowerCase();
    if (SUPPORTED_INPUT_EXTENSIONS.includes(ext)) {
      return [activeUri];
    }
  }

  const selected = await vscode.window.showOpenDialog({
    canSelectMany: true,
    filters: { Images: SUPPORTED_INPUT_EXTENSIONS },
  });

  return selected && selected.length > 0 ? selected : [];
}

/**
 * Prompts user for target ICO sizes via QuickPick or custom entry.
 * @param {string} [defaultPreset='default']
 * @returns {Promise<number[]|null>}
 */
async function promptIcoSizes(defaultPreset = 'default') {
  const choice = await vscode.window.showQuickPick(
    [
      { label: 'Default Suite', sizes: [16, 32, 48, 64, 128, 256], description: '16×16, 32×32, 48×48, 64×64, 128×128, 256×256 (Recommended)' },
      { label: 'Favicon Suite', sizes: [16, 32, 48], description: '16×16, 32×32, 48×48' },
      { label: 'Windows App', sizes: [16, 32, 48, 256], description: '16×16, 32×32, 48×48, 256×256' },
      { label: 'High-Resolution', sizes: [64, 128, 256, 512], description: '64×64, 128×128, 256×256, 512×512' },
      { label: 'Custom Sizes...', sizes: 'custom', description: 'Enter custom pixel dimensions' },
    ],
    { placeHolder: 'Select ICO icon sizes' }
  );
  if (!choice) return null;
  if (choice.sizes === 'custom') {
    const custom = await vscode.window.showInputBox({
      prompt: 'Enter comma-separated icon sizes (e.g. 16, 32, 48, 128):',
      placeHolder: '16, 32, 48, 64, 128, 256',
    });
    if (!custom) return null;
    return custom
      .split(',')
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n >= 8 && n <= 512);
  }
  return choice.sizes;
}

/**
 * Executes batch conversion to a specified target format.
 * @param {vscode.Uri[]} targets
 * @param {'webp'|'png'|'avif'|'jpeg'|'ico'|'cur'} targetFormat
 * @param {object} [options]
 * @param {vscode.ExtensionContext} [context]
 */
async function executeBatchConvert(targets, targetFormat = 'webp', options = {}, context = null) {
  if (!targets || targets.length === 0) return;

  const config = readConfig();
  const format = targetFormat || config.outputExtension || 'webp';
  let background = options.background;

  if (format === 'jpeg' && !background) {
    background = '#ffffff';
  }

  // Workspace Target Lock Policy Check
  const lockConfig = await readWorkspaceLockConfig(targets[0]);
  if (config.targetLockEnabled && lockConfig.exists) {
    statusBar.setTargetLock(lockConfig.targetFormat);
    if (lockConfig.acceptFormats && !lockConfig.acceptFormats.includes(format.toLowerCase())) {
      const err = new ZapError(
        'E_FORMAT_REJECTED',
        `Target format "${format}" is rejected by workspace Target Lock policy (allowed: ${lockConfig.acceptFormats.join(', ')}).`
      );
      showError(targets[0], err);
      return;
    }
  }

  let totalSaved = 0;
  let count = 0;
  let lastDetails = null;

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Zapwebp (${format.toUpperCase()})`,
      cancellable: false,
    },
    async (progress) => {
      for (const fileUri of targets) {
        const filename = fileUri.path.split('/').pop();
        progress.report({ message: filename });

        try {
          const outUri = siblingUri(fileUri, format);
          if (outUri.path === fileUri.path) {
            throw new Error(`Output (${format}) cannot overwrite its input source file.`);
          }

          const bytes = await vscode.workspace.fs.readFile(fileUri);

          // Lock verification check: skip redundant conversions
          try {
            const existingOutBytes = await vscode.workspace.fs.readFile(outUri);
            const lockCheck = checkLock(
              existingOutBytes,
              bytes,
              { to: format, quality: config.quality, clean: config.clean, background },
              options.lock
            );
            if (lockCheck.skipped) {
              statusBar.log(`[Lock] Skipped ${filename} (already converted with matching options)`);
              continue;
            }
          } catch {}

          const convertOpts = {
            ...options,
            background,
            acceptFormats: config.targetLockEnabled && lockConfig.exists ? lockConfig.acceptFormats : undefined,
          };

          const out = await convertBuffer(
            bytes,
            format,
            config.baseWidth,
            config.quality,
            config.clean,
            background,
            convertOpts
          );

          if (Array.isArray(out)) {
            // Extracted multiple frames (from ICO / CUR extractAll)
            const parentDir = fileUri.path.substring(0, fileUri.path.lastIndexOf('/'));
            const baseName = filename.replace(/\.[^.]+$/, '');
            let totalOutBytes = 0;
            for (const frame of out) {
              const frameFilename = `${baseName}-${frame.width}x${frame.height}.${format === 'jpeg' ? 'jpg' : format}`;
              const frameUri = fileUri.with({ path: `${parentDir}/${frameFilename}` });
              await vscode.workspace.fs.writeFile(frameUri, frame.data);
              totalOutBytes += frame.data.byteLength;
            }
            const saved = bytes.byteLength - totalOutBytes;
            totalSaved += Math.max(0, saved);
            count++;
            lastDetails = {
              filename: `${baseName} (${out.length} sizes)`,
              sourceSize: bytes.byteLength,
              outputSize: totalOutBytes,
            };
            statusBar.log(`Extracted ${filename} -> ${out.length} files (${totalOutBytes} bytes)`);
          } else {
            await vscode.workspace.fs.writeFile(outUri, out);
            const saved = bytes.byteLength - out.byteLength;
            totalSaved += Math.max(0, saved);
            count++;

            // Lifecycle: Original file deletion after conversion if enabled and consented
            if (config.deleteOriginalAfterConversion) {
              const hasConsent = await ensureDeleteConsent(context);
              if (hasConsent) {
                const wsFolder = vscode.workspace.getWorkspaceFolder ? vscode.workspace.getWorkspaceFolder(fileUri) : null;
                const rootDir = wsFolder ? wsFolder.uri.fsPath : path.dirname(fileUri.fsPath);
                const relPath = path.relative(rootDir, fileUri.fsPath).replace(/\\/g, '/');
                const ts = new Date().toISOString().replace(/[:.]/g, '-');
                const backupRel = path.join('.zapwebp', 'backups', ts, relPath);
                const backupFull = path.resolve(rootDir, backupRel);
                const backupUri = vscode.Uri.file(backupFull);

                await vscode.workspace.fs.writeFile(backupUri, bytes);
                const writtenBytes = await vscode.workspace.fs.readFile(backupUri);
                const origHash = crypto.createHash('sha256').update(bytes).digest('hex');
                const backupHash = crypto.createHash('sha256').update(writtenBytes).digest('hex');

                if (origHash === backupHash) {
                  await vscode.workspace.fs.delete(fileUri, { useTrash: true });
                  statusBar.log(`Deleted original ${filename} (backed up to ${backupRel})`);
                } else {
                  statusBar.log(`Backup hash mismatch for ${filename}. Source file was not deleted.`);
                }
              }
            }

            lastDetails = {
              filename: outUri.path.split('/').pop(),
              sourceSize: bytes.byteLength,
              outputSize: out.byteLength,
            };

            statusBar.log(`Converted ${filename} -> ${lastDetails.filename} (${out.byteLength} bytes)`);
          }
        } catch (err) {
          statusBar.log(`Error converting ${filename}: ${err.message}`);
          showError(fileUri, err);
        }
      }
    }
  );

  if (count > 0) {
    statusBar.increment(count, totalSaved);
    showSuccess(count, totalSaved, lastDetails);
  }
}

/**
 * Registers all conversion commands in the extension context.
 * @param {vscode.ExtensionContext} context
 */
function registerConvertCommand(context) {
  // 1. Default Convert (Zap to WebP)
  const cmdConvert = vscode.commands.registerCommand('zapwebp.convert', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    const config = readConfig();
    await executeBatchConvert(targets, config.outputExtension || 'webp', {}, context);
  });

  // 2. Direct to PNG
  const cmdPng = vscode.commands.registerCommand('zapwebp.convertToPng', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    await executeBatchConvert(targets, 'png', {}, context);
  });

  // 3. Direct to AVIF
  const cmdAvif = vscode.commands.registerCommand('zapwebp.convertToAvif', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    await executeBatchConvert(targets, 'avif', {}, context);
  });

  // 4. Direct to JPEG (with optional background prompt)
  const cmdJpeg = vscode.commands.registerCommand('zapwebp.convertToJpeg', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    const bg = await vscode.window.showInputBox({
      prompt: 'JPEG cannot store transparency. Flatten background color:',
      value: '#ffffff',
      placeHolder: '#ffffff',
    });
    if (bg === undefined) return; // User cancelled

    await executeBatchConvert(targets, 'jpeg', { background: bg || '#ffffff' }, context);
  });

  // 5. Interactive Format Prompt (QuickPick)
  const cmdPrompt = vscode.commands.registerCommand('zapwebp.convertPrompt', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    const picked = await vscode.window.showQuickPick(
      [
        {
          label: '$(zap) WebP',
          description: 'Recommended • High compression, alpha transparency preserved',
          format: 'webp',
        },
        {
          label: '$(file-media) PNG',
          description: 'Lossless • Perfect alpha retention, maximum compatibility',
          format: 'png',
        },
        {
          label: '$(sparkle) AVIF',
          description: 'Next-Gen • Extreme compression, modern web standard',
          format: 'avif',
        },
        {
          label: '$(file-binary) JPEG',
          description: 'Photographic • Universal compatibility (flattens transparency)',
          format: 'jpeg',
        },
      ],
      {
        placeHolder: 'Select target format for image conversion',
      }
    );

    if (!picked) return;

    let background;
    if (picked.format === 'jpeg') {
      background = await vscode.window.showInputBox({
        prompt: 'JPEG cannot store transparency. Flatten background color:',
        value: '#ffffff',
        placeHolder: '#ffffff',
      });
      if (background === undefined) return;
    }

    await executeBatchConvert(targets, picked.format, { background }, context);
  });

  // 6. Direct to ICO
  const cmdIco = vscode.commands.registerCommand('zapwebp.convertToIco', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;
    const config = readConfig();
    const icoSizes = await promptIcoSizes(config.icoPreset);
    if (!icoSizes) return;
    await executeBatchConvert(targets, 'ico', { sizes: icoSizes }, context);
  });

  // 7. Compressor (Target Bytes Optimization)
  const cmdCompress = vscode.commands.registerCommand('zapwebp.convertCompress', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    const rawTarget = await vscode.window.showInputBox({
      prompt: 'Enter target maximum file size (e.g. 500 KB, 1.5 MB, 250 KB):',
      placeHolder: '500 KB',
      validateInput: (val) => {
        try {
          const compLib = require('@zapwebp/compressor');
          compLib.parseTargetBytes(val);
          return null;
        } catch {
          return 'Please enter a valid size, e.g. "500 KB" or "1.5 MB".';
        }
      },
    });
    if (!rawTarget) return;

    const formatPick = await vscode.window.showQuickPick(
      [
        { label: 'WebP', format: 'webp', description: 'Recommended • High quality and compression' },
        { label: 'AVIF', format: 'avif', description: 'Next-Gen • Highest compression' },
        { label: 'JPEG', format: 'jpeg', description: 'Photographic' },
      ],
      { placeHolder: 'Select target format for compressed image' }
    );
    if (!formatPick) return;

    await executeBatchConvert(targets, formatPick.format, { targetBytes: rawTarget }, context);
  });

  // 8. Convert with Options (Crop, Ratio, Quality, Sizing)
  const cmdWithOptions = vscode.commands.registerCommand('zapwebp.convertWithOptions', async (uri, uris) => {
    const targets = await resolveTargets(uri, uris);
    if (targets.length === 0) return;

    // Step 1: Format
    const formatPick = await vscode.window.showQuickPick(
      [
        { label: 'WebP', format: 'webp', description: 'Recommended • High compatibility & compression' },
        { label: 'PNG', format: 'png', description: 'Lossless with alpha' },
        { label: 'AVIF', format: 'avif', description: 'Next-Gen extreme compression' },
        { label: 'JPEG', format: 'jpeg', description: 'Universal photographic (flattens alpha)' },
        { label: 'ICO', format: 'ico', description: 'Windows icon container' },
      ],
      { placeHolder: 'Step 1/3: Select target format' }
    );
    if (!formatPick) return;

    // Step 2: Crop & Aspect Ratio
    const cropPick = await vscode.window.showQuickPick(
      [
        { label: 'None', crop: null, description: 'Keep original aspect ratio' },
        { label: 'Avatar (1:1)', crop: 'avatar', description: 'Square profile / avatar crop' },
        { label: 'Thumbnail (16:9)', crop: 'thumbnail', description: 'Standard video / landscape thumbnail' },
        { label: 'Banner (21:9)', crop: 'banner', description: 'Ultra-wide header banner' },
        { label: 'Product (4:5)', crop: 'product', description: 'E-commerce portrait display' },
        { label: 'Story (9:16)', crop: 'story', description: 'Vertical full-screen story' },
        { label: 'Custom Aspect Ratio...', crop: 'custom', description: 'Enter specific ratio like 4:3' },
      ],
      { placeHolder: 'Step 2/3: Select crop and aspect ratio' }
    );
    if (!cropPick) return;

    let resolvedCrop = cropPick.crop;
    if (resolvedCrop === 'custom') {
      const customRatio = await vscode.window.showInputBox({
        prompt: 'Enter aspect ratio (e.g. 4:3, 16:10, 2:1):',
        placeHolder: '4:3',
      });
      if (!customRatio) return;
      resolvedCrop = { mode: 'auto', aspectRatio: customRatio };
    }

    // Step 3: Background & Specific options
    let background;
    if (formatPick.format === 'jpeg') {
      background = await vscode.window.showInputBox({
        prompt: 'JPEG flattens transparency. Background color:',
        value: '#ffffff',
      });
      if (background === undefined) return;
    }

    let icoSizes;
    if (formatPick.format === 'ico') {
      icoSizes = await promptIcoSizes();
      if (!icoSizes) return;
    }

    await executeBatchConvert(
      targets,
      formatPick.format,
      { crop: resolvedCrop, background, sizes: icoSizes },
      context
    );
  });

  // 9. Undo Command (Restores backed-up original files)
  const cmdUndo = vscode.commands.registerCommand('zapwebp.undo', async () => {
    const wsFolders = vscode.workspace.workspaceFolders;
    if (!wsFolders || wsFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace open to perform undo.');
      return;
    }
    const rootDir = wsFolders[0].uri.fsPath;
    const backupsDir = path.join(rootDir, '.zapwebp', 'backups');

    try {
      const fsSync = require('node:fs');
      if (!fsSync.existsSync(backupsDir)) {
        vscode.window.showInformationMessage('No backups found in .zapwebp/backups/.');
        return;
      }

      const sessions = fsSync.readdirSync(backupsDir).sort().reverse();
      if (sessions.length === 0) {
        vscode.window.showInformationMessage('No conversion backups found to restore.');
        return;
      }

      const latestSession = sessions[0];
      const sessionPath = path.join(backupsDir, latestSession);
      const files = [];

      function collectFiles(dir) {
        for (const entry of fsSync.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) collectFiles(full);
          else files.push(full);
        }
      }
      collectFiles(sessionPath);

      let restoredCount = 0;
      for (const bFile of files) {
        const rel = path.relative(sessionPath, bFile);
        const restoreTarget = path.join(rootDir, rel);
        fsSync.mkdirSync(path.dirname(restoreTarget), { recursive: true });
        fsSync.copyFileSync(bFile, restoreTarget);
        restoredCount++;
      }

      vscode.window.showInformationMessage(`Zapwebp: Restored ${restoredCount} original file(s) from backup (${latestSession}).`);
    } catch (err) {
      vscode.window.showErrorMessage(`Zapwebp Undo failed: ${err.message}`);
    }
  });

  context.subscriptions.push(cmdConvert);
  context.subscriptions.push(cmdPng);
  context.subscriptions.push(cmdAvif);
  context.subscriptions.push(cmdJpeg);
  context.subscriptions.push(cmdPrompt);
  context.subscriptions.push(cmdIco);
  context.subscriptions.push(cmdCompress);
  context.subscriptions.push(cmdWithOptions);
  context.subscriptions.push(cmdUndo);
}

module.exports = {
  registerConvertCommand,
  executeBatchConvert,
  resolveTargets,
  siblingUri,
  promptIcoSizes,
  SUPPORTED_INPUT_EXTENSIONS,
};
