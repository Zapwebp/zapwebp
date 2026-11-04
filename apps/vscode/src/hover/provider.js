'use strict';

const vscode = require('vscode');
const { convertBuffer } = require('../core');
const { readConfig } = require('../config');

/**
 * Creates an SVG data URI displaying a checkerboard background under the converted image.
 * This guarantees transparency is immediately visible in the editor hover tooltip.
 * @param {string} base64Data
 * @param {string} mimeType
 * @returns {string}
 */
function createCheckerboardDataUri(base64Data, mimeType) {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">',
    '  <defs>',
    '    <pattern id="zap-checker" width="16" height="16" patternUnits="userSpaceOnUse">',
    '      <rect width="8" height="8" fill="#d1d5db" />',
    '      <rect x="8" width="8" height="8" fill="#f3f4f6" />',
    '      <rect y="8" width="8" height="8" fill="#f3f4f6" />',
    '      <rect x="8" y="8" width="8" height="8" fill="#d1d5db" />',
    '    </pattern>',
    '  </defs>',
    '  <rect width="100%" height="100%" fill="url(#zap-checker)" rx="6" />',
    `  <image href="data:${mimeType};base64,${base64Data}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" />`,
    '</svg>',
  ].join('');

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Registers the HoverProvider for image files in the VS Code editor.
 * @param {vscode.ExtensionContext} context
 */
function registerHoverProvider(context) {
  const provider = vscode.languages.registerHoverProvider(
    { pattern: '**/*.{svg,png,jpg,jpeg}' },
    {
      async provideHover(document) {
        const config = readConfig();
        try {
          const bytes = await vscode.workspace.fs.readFile(document.uri);
          const out = await convertBuffer(
            bytes,
            config.outputExtension,
            config.baseWidth,
            config.quality,
            config.clean
          );

          const b64 = Buffer.from(out).toString('base64');
          const mime = `image/${config.outputExtension}`;
          const previewUri = createCheckerboardDataUri(b64, mime);

          const md = new vscode.MarkdownString();
          md.supportHtml = true;
          md.isTrusted = true;
          md.appendMarkdown('**Zapwebp preview**\n\n');
          md.appendMarkdown(`![preview](${previewUri})\n\n`);
          md.appendMarkdown(`Size: ${out.byteLength.toLocaleString()} bytes • Format: ${config.outputExtension.toUpperCase()}`);

          return new vscode.Hover(md);
        } catch {
          return null;
        }
      },
    }
  );

  context.subscriptions.push(provider);
}

module.exports = {
  registerHoverProvider,
  createCheckerboardDataUri,
};
