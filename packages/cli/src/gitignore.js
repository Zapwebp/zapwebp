import { readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const BLOCK_START = '# >>> zapwebp >>>';
const BLOCK_END = '# <<< zapwebp <<<';

/**
 * Checks if the current project directory is inside a Git repository.
 * @param {string} rootDir
 * @returns {Promise<boolean>}
 */
export async function isGitRepo(rootDir) {
  let curr = path.resolve(rootDir);
  while (true) {
    const gitDir = path.join(curr, '.git');
    const info = await stat(gitDir).catch(() => null);
    if (info) return true;
    const parent = path.dirname(curr);
    if (parent === curr) return false;
    curr = parent;
  }
}

/**
 * Reads existing .gitignore content.
 * @param {string} rootDir
 * @returns {Promise<{ exists: boolean, content: string }>}
 */
export async function readGitignore(rootDir) {
  const filePath = path.join(rootDir, '.gitignore');
  try {
    const content = await readFile(filePath, 'utf8');
    return { exists: true, content };
  } catch {
    return { exists: false, content: '' };
  }
}

/**
 * Extracts paths inside the zapwebp marker block.
 * @param {string} content
 * @returns {string[]}
 */
export function extractBlockPaths(content) {
  const startIdx = content.indexOf(BLOCK_START);
  const endIdx = content.indexOf(BLOCK_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];

  const blockText = content.slice(startIdx + BLOCK_START.length, endIdx);
  return blockText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/**
 * Idempotently updates the zapwebp marker block in .gitignore.
 * @param {string} rootDir
 * @param {string[]} pathsToIgnore
 * @param {object} [options]
 * @returns {Promise<{ updated: boolean, paths: string[] }>}
 */
export async function updateGitignoreBlock(rootDir, pathsToIgnore, options = {}) {
  const gitignorePath = path.join(rootDir, '.gitignore');
  const { exists, content } = await readGitignore(rootDir);

  const normalizedPaths = [...new Set(
    pathsToIgnore
      .map((p) => p.trim().replace(/\\/g, '/'))
      .map((p) => (p.endsWith('/') || path.extname(p) ? p : `${p}/`))
      .filter(Boolean),
  )];

  const blockLines = [
    BLOCK_START,
    '# Converted image outputs — regenerate with `zap`',
    ...normalizedPaths.filter((p) => !p.startsWith('.zapwebp')),
    '# Reversible conversion journal — machine-local, do not commit',
    ...normalizedPaths.filter((p) => p.startsWith('.zapwebp')),
    BLOCK_END,
  ];
  const newBlock = blockLines.join('\n');

  let newContent;
  const startIdx = content.indexOf(BLOCK_START);
  const endIdx = content.indexOf(BLOCK_END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = content.slice(0, startIdx).trimEnd();
    const after = content.slice(endIdx + BLOCK_END.length).trimStart();
    newContent = (before ? before + '\n\n' : '') + newBlock + (after ? '\n\n' + after : '\n');
  } else {
    newContent = (content.trimEnd() ? content.trimEnd() + '\n\n' : '') + newBlock + '\n';
  }

  if (newContent !== content) {
    await writeFile(gitignorePath, newContent, 'utf8');
    return { updated: true, paths: normalizedPaths };
  }

  return { updated: false, paths: normalizedPaths };
}

/**
 * Automates gitignore synchronization based on configuration and CLI flags.
 * @param {string} rootDir
 * @param {object} settings
 * @returns {Promise<{ applied: boolean, paths?: string[] }>}
 */
export async function syncGitignore(rootDir, settings = {}) {
  const { outDir, commitOutputs = false, gitignoreMode = 'auto' } = settings;

  if (gitignoreMode === 'never' || gitignoreMode === 'off') {
    return { applied: false };
  }

  const insideGit = await isGitRepo(rootDir);
  if (!insideGit && gitignoreMode !== 'always') {
    return { applied: false };
  }

  const { content } = await readGitignore(rootDir);
  const existingBlockPaths = extractBlockPaths(content);
  const pathsToIgnore = new Set(existingBlockPaths);

  // Journal is always ignored
  pathsToIgnore.add('.zapwebp/');

  // Output directory is ignored unless developer explicitly passes --commit-outputs
  if (outDir && !commitOutputs) {
    const relOut = path.relative(rootDir, path.resolve(rootDir, outDir)).replace(/\\/g, '/');
    if (relOut && relOut !== '.') {
      pathsToIgnore.add(relOut.endsWith('/') ? relOut : `${relOut}/`);
    }
  }

  const res = await updateGitignoreBlock(rootDir, Array.from(pathsToIgnore));
  return { applied: res.updated, paths: res.paths };
}

