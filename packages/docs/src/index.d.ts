export interface DocsAuthor {
  name: string;
  url?: string;
  email?: string;
}

export interface DocsContentConfig {
  dir?: string;
  extensions?: string[];
  ignore?: string[];
  resolvedDir?: string;
}

export interface DocsOutputConfig {
  dir?: string;
  html?: boolean;
  markdown?: boolean;
  llmsTxt?: boolean;
  sitemap?: boolean;
  robots?: boolean;
  agentJson?: boolean;
  searchIndex?: boolean;
  resolvedDir?: string;
}

export interface DocsThemeConfig {
  tokens?: string;
  docsCss?: string;
  logo?: string;
  font?: string;
  accentColor?: string;
  github?: string;
  customCss?: string;
}

export interface DocsNavItem {
  title: string;
  path: string;
  children?: DocsNavItem[];
}

export interface DocsConfig {
  title?: string;
  tagline?: string;
  description?: string;
  url?: string;
  author?: DocsAuthor;
  content?: DocsContentConfig;
  output?: DocsOutputConfig;
  theme?: DocsThemeConfig;
  navigation?: DocsNavItem[];
  footer?: {
    copyright?: string;
    license?: string;
  };
}

export interface HeadingItem {
  level: number;
  text: string;
  id: string;
}

export interface ExtractedMetadata {
  title: string;
  description: string;
  headings: HeadingItem[];
  frontmatter: Record<string, any>;
  scope: {
    covers?: string;
    doesNotCover?: string;
    appliesTo?: string;
  };
  body: string;
}

export interface BuildResult {
  success: boolean;
  pageCount: number;
  distDir: string;
  durationMs: number;
  pages: Array<{
    title: string;
    route: string;
    markdown: string;
  }>;
}

export function loadConfig(
  configOrPath?: string | Record<string, any>,
  cliOverrides?: Record<string, any>,
  cwd?: string
): DocsConfig;

export function parseFrontmatter(text: string): {
  data: Record<string, any>;
  content: string;
};

export function extractMetadata(
  rawSource: string,
  fallbackSlug?: string
): ExtractedMetadata;

export function slugify(text: string): string;

export function renderMarkdown(markdown: string, options?: Record<string, any>): string;

export function renderPageHtml(params: {
  title: string;
  description: string;
  contentHtml: string;
  routePath: string;
  markdownPath: string;
  headings?: HeadingItem[];
  prevPage?: { title: string; path: string } | null;
  nextPage?: { title: string; path: string } | null;
  config: DocsConfig;
}): string;

export function generateLlmsTxt(
  pages: Array<{ title: string; description: string; path: string; markdownPath: string }>,
  config: DocsConfig
): string;

export function generateLlmsFullTxt(
  pages: Array<{ title: string; body: string; path: string }>,
  config: DocsConfig
): string;

export function generateSitemap(
  pages: Array<{ path: string; priority?: number }>,
  config: DocsConfig
): string;

export function generateRobotsTxt(config: DocsConfig): string;

export function generateAgentJson(
  pages: Array<{
    title: string;
    description?: string;
    path: string;
    markdownPath: string;
    headings?: HeadingItem[];
  }>,
  config: DocsConfig
): string;

export function generateSearchIndex(
  pages: Array<{
    title: string;
    description?: string;
    path: string;
    headings?: Array<{ text: string; id: string }>;
    body: string;
  }>
): string;

export function buildDocs(
  configOrPath?: string | Record<string, any>,
  cliOverrides?: Record<string, any>,
  cwd?: string
): Promise<BuildResult>;

export function serveDocs(options?: {
  dir?: string;
  port?: number;
  host?: string;
}): Promise<{
  server: any;
  url: string;
  close: () => Promise<void>;
}>;

export function initDocs(
  targetDir?: string,
  options?: { force?: boolean }
): {
  configCreated: boolean;
  contentCreated: boolean;
  configPath: string;
  indexPath: string;
};

export const DEFAULT_CONFIG: DocsConfig;
export default buildDocs;
