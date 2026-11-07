export interface DocRoute {
  path: string;
  file: string;
  title: string;
  category: 'Core' | 'Plugins' | 'Developers' | 'Platform';
  description: string;
  badge?: string;
  keywords: string[];
}

export const DOC_ROUTES: DocRoute[] = [
  // Core
  {
    path: '/docs',
    file: 'index',
    title: 'Overview',
    category: 'Core',
    description: 'High-performance transparency-safe image conversion across web, CLI, MCP, and REST API.',
    keywords: ['quick start', 'surfaces', 'principles', 'what it does', 'overview', 'introduction']
  },
  {
    path: '/convert',
    file: 'convert',
    title: 'Convert',
    category: 'Core',
    description: 'In-memory client-side browser conversion with instant drag-and-drop and batch ZIP bundles.',
    keywords: ['browser', 'drag and drop', 'zip', 'in-memory', 'webp', 'avif', 'png', 'svg']
  },
  {
    path: '/cli',
    file: 'cli',
    title: 'CLI',
    category: 'Core',
    badge: 'v1.1.0',
    description: 'Terminal executable: single/batch conversion, multipliers, undo/redo journals, and CI checks.',
    keywords: ['zap', 'zapwebp', 'terminal', 'undo', 'redo', 'scale', 'multiplier', 'flags', 'subcommands']
  },
  {
    path: '/mcp',
    file: 'mcp',
    title: 'MCP Agent',
    category: 'Core',
    badge: 'AI',
    description: 'Model Context Protocol server: 15 tools, 6 prompts, and 7 resources for AI coding agents.',
    keywords: ['model context protocol', 'ai agent', 'tools', 'prompts', 'resources', 'stdio', 'streamable http']
  },
  {
    path: '/clean',
    file: 'clean',
    title: 'Clean',
    category: 'Core',
    description: 'Zero-trust metadata scrubbing: strips EXIF, GPS, camera serials, and privacy identifiers.',
    keywords: ['metadata', 'exif', 'gps', 'privacy', 'strip', 'clean mode', 'zero-trust']
  },
  {
    path: '/lock-target',
    file: 'lock-target',
    title: 'Target Lock',
    category: 'Core',
    badge: 'v2.0',
    description: 'Many-to-one ingestion gateway enforcing canonical target formats with strict and best-effort contracts.',
    keywords: ['target lock', 'many-to-one', 'ingestion', 'strict', 'edge', 'storage', 'canonical format', 'lock']
  },
  {
    path: '/backgrounds',
    file: 'backgrounds',
    title: 'Backgrounds',
    category: 'Core',
    badge: 'v2.0',
    description: 'Guaranteed three background states: transparent preservation, opaque respect, and deterministic flattening.',
    keywords: ['background', 'transparency', 'flatten', 'alpha', 'jpeg', 'white background', 'respecter']
  },
  {
    path: '/policy',
    file: 'policy',
    title: 'Policy',
    category: 'Core',
    badge: 'v2.0',
    description: 'Unified conversion policy: lossy/lossless modes, per-format quality overrides, byte limits, and format allowlists.',
    keywords: ['policy', 'conversion policy', 'quality', 'compression', 'limits', 'maxInputBytes', 'maxOutputBytes', 'allowlist', 'formats']
  },
  {
    path: '/formats',
    file: 'formats',
    title: 'Formats',
    category: 'Core',
    description: 'Comprehensive format registry and alpha preservation matrix across SVG, WebP, PNG, JPEG, AVIF.',
    keywords: ['transparency matrix', 'alpha channel', 'svg', 'webp', 'avif', 'png', 'jpeg', 'tiff', 'gif']
  },
  {
    path: '/safety',
    file: 'safety',
    title: 'Safety',
    category: 'Core',
    description: 'Guarantees preventing transparent-to-opaque loss, SVG entity expansion, and corrupt headers.',
    keywords: ['alpha preservation', 'black background bug', 'svg security', 'zero-byte', 'bounds']
  },
  {
    path: '/errors',
    file: 'errors',
    title: 'Errors',
    category: 'Core',
    description: 'Standard machine-readable error catalog with root cause explanations and actionable fixes.',
    keywords: ['error codes', 'troubleshooting', 'unsupported_format', 'alpha_not_representable', 'fix']
  },

  // Plugins
  {
    path: '/plugins/vite',
    file: 'plugins/vite',
    title: 'Vite Plugin',
    category: 'Plugins',
    description: 'Build-time asset pipeline plugin for Vite: optimizes images and generates responsive srcsets.',
    keywords: ['vite', 'vite plugin', 'build', 'bundler', 'srcset', 'rollup']
  },
  {
    path: '/plugins/next',
    file: 'plugins/next',
    title: 'Next.js Plugin',
    category: 'Plugins',
    description: 'Integrates Zapwebp conversion into Next.js applications and static site exports.',
    keywords: ['next.js', 'react', 'next plugin', 'static generation', 'app router']
  },
  {
    path: '/plugins/github-action',
    file: 'plugins/github-action',
    title: 'GitHub Action',
    category: 'Plugins',
    description: 'Automated CI/CD GitHub Action: converts staged assets and enforces strict size limits.',
    keywords: ['github action', 'ci/cd', 'workflow', 'automation', 'staged assets']
  },
  {
    path: '/plugins/storage',
    file: 'plugins/storage',
    title: 'Storage Adapters',
    category: 'Plugins',
    description: 'First-party cloud adapters for Supabase, Firebase, and Neocities with pre-upload conversion.',
    keywords: ['storage', 'supabase', 'firebase', 'neocities', 'upload', 'cascading delete']
  },
  {
    path: '/plugins/vscode',
    file: 'plugins/vscode',
    title: 'VS Code Extension',
    category: 'Plugins',
    badge: 'Open VSX',
    description: 'Direct in-editor image conversion, retina multipliers (@1x/@2x/@3x), and local WASM execution.',
    keywords: ['vscode', 'open vsx', 'extension', 'retina', 'wasm', 'editor']
  },
  {
    path: '/plugins/laravel',
    file: 'plugins/laravel',
    title: 'Laravel Package',
    category: 'Plugins',
    badge: 'PHP',
    description: 'Official Laravel bridge: Zap facade, SafeImage validation rule, and ConvertUploads middleware.',
    keywords: ['laravel', 'php', 'composer', 'facade', 'middleware', 'validation']
  },
  {
    path: '/plugins/lens',
    file: 'plugins/lens',
    title: 'Lens CLI',
    category: 'Plugins',
    description: 'Read-only image inspection, visual difference analysis, and alpha channel verification CLI.',
    keywords: ['lens', 'inspect', 'diff', 'alpha', 'psnr', 'ssim', 'diagnostics']
  },
  {
    path: '/plugins/crop',
    file: 'plugins/crop',
    title: 'Crop Plugin',
    category: 'Plugins',
    badge: 'Transform',
    description: 'Auto-crop with aspect ratios and face detection, manual coordinates, cover/contain fits, and pipeline composition.',
    keywords: ['crop', 'aspect ratio', 'gravity', 'face detection', 'transform', 'contain', 'avatar']
  },

  // Developers
  {
    path: '/developers',
    file: 'developers',
    title: 'Developers Overview',
    category: 'Developers',
    description: 'Scaffolding generator create-zapwebp and developer SDK: safeDecode, mocks, and lifecycle hooks.',
    keywords: ['sdk', 'plugin sdk', 'developer', 'safeDecode', 'create-zapwebp', 'extensibility']
  },
  {
    path: '/sdk/core',
    file: 'sdk/core',
    title: 'Core SDK',
    category: 'Developers',
    badge: 'Engine',
    description: 'Core engine API: convertImage, convertSvgToWebp, alpha assertions, and stream pipelines.',
    keywords: ['core sdk', 'api', 'convertImage', 'transparency', 'engine', 'node.js']
  },
  {
    path: '/sdk/plugin',
    file: 'sdk/plugin',
    title: 'Plugin SDK',
    category: 'Developers',
    description: 'Standard framework for authoring first-party and community Zapwebp plugins and lifecycle hooks.',
    keywords: ['plugin sdk', 'definePlugin', 'hooks', 'lifecycle', 'mock']
  },
  {
    path: '/ui',
    file: 'ui',
    title: 'UI Kit',
    category: 'Developers',
    badge: 'v2.2',
    description: 'Framework-agnostic error mapping, upload dropzones, custom elements, and presets for React, Vue, Svelte, Blade.',
    keywords: ['ui kit', 'dropzone', 'toast', 'banner', 'modal', 'error card', 'react', 'vue', 'svelte', 'blade', 'custom elements']
  },
  {
    path: '/sdk/ui',
    file: 'sdk/ui',
    title: 'UI SDK',
    category: 'Developers',
    description: 'Zero-dependency dropzones, cockpit bar controls, and accessible comparison dialog components.',
    keywords: ['ui sdk', 'components', 'dropzone', 'cockpit', 'preview modal', 'wcag']
  },
  {
    path: '/sdk/cli',
    file: 'sdk/cli',
    title: 'CLI SDK',
    category: 'Developers',
    description: 'Programmatic invocation of the Zapwebp command-line runner, flags, and undo journals.',
    keywords: ['cli sdk', 'binary', 'runner', 'journal', 'arguments']
  },
  {
    path: '/sdk/storage',
    file: 'sdk/storage',
    title: 'Storage SDK',
    category: 'Developers',
    description: 'Cloud adapter interfaces for Supabase, Firebase, and Neocities with cascading deletion.',
    keywords: ['storage sdk', 'cloud', 'supabase', 'firebase', 'neocities']
  },
  {
    path: '/sdk/edge',
    file: 'sdk/edge',
    title: 'Edge SDK',
    category: 'Developers',
    badge: 'Edge',
    description: 'Zero-dependency streaming request handlers for Cloudflare Workers, Vercel Edge, and Deno.',
    keywords: ['edge sdk', 'workers', 'vercel edge', 'streaming', 'deno', 'serverless']
  },
  {
    path: '/api',
    file: 'api',
    title: 'REST API',
    category: 'Developers',
    description: 'Stateless HTTP API endpoints: /health, /inspect, /convert, and /batch multipart conversion.',
    keywords: ['rest api', 'http', 'endpoints', 'post /convert', 'batch', 'stateless']
  },

  // Platform
  {
    path: '/about',
    file: 'about',
    title: 'About',
    category: 'Platform',
    description: 'Enterprise architecture philosophy, product doctrine, open source maintainers, and mission.',
    keywords: ['about', 'doctrine', 'philosophy', 'enterprise architecture', 'maintainers']
  },
  {
    path: '/privacy',
    file: 'privacy',
    title: 'Privacy Policy',
    category: 'Platform',
    description: 'Zero telemetry, zero cloud asset storage, memory-only execution, and privacy commitments.',
    keywords: ['privacy', 'zero telemetry', 'local-first', 'no tracking', 'compliance']
  },
  {
    path: '/terms',
    file: 'terms',
    title: 'Terms of Service',
    category: 'Platform',
    description: 'MIT License terms, warranty disclaimers, usage guidelines, and liability limitations.',
    keywords: ['terms', 'license', 'mit', 'legal', 'warranty']
  },
  {
    path: '/security',
    file: 'security',
    title: 'Security',
    category: 'Platform',
    description: 'Security architecture, coordinated vulnerability disclosure, supported versions, and defensive boundaries.',
    keywords: ['security', 'vulnerability', 'reporting', 'disclosure', 'cve', 'xxe', 'ssrf']
  },
  {
    path: '/code-of-conduct',
    file: 'code-of-conduct',
    title: 'Code of Conduct',
    category: 'Platform',
    description: 'Contributor Covenant standards, welcoming community pledge, and enforcement responsibilities.',
    keywords: ['code of conduct', 'contributor covenant', 'community', 'inclusion', 'pledge']
  },
  {
    path: '/contributing',
    file: 'contributing',
    title: 'Contributing',
    category: 'Platform',
    description: 'Contribution guidelines, development workflow, testing requirements, and PR checklist.',
    keywords: ['contributing', 'development', 'workflow', 'tests', 'architecture rules', 'pull request']
  },
  {
    path: '/translators',
    file: 'translators',
    title: 'Translators',
    category: 'Platform',
    description: 'Internationalization standards, translation catalog layout, and recognized community translators directory.',
    keywords: ['translators', 'i18n', 'localization', 'tagalog', 'locales', 'contribute translation']
  }
];

export const ROUTE_MAP: Record<string, DocRoute> = {};
DOC_ROUTES.forEach((r) => {
  ROUTE_MAP[r.path] = r;
});
// Root alias
ROUTE_MAP['/'] = DOC_ROUTES[0];

// Sitemap canonical URL aliases (Ecosystem & Tools, Guides & Formats, Developer SDKs, Open Platform)
if (ROUTE_MAP['/plugins/vscode']) ROUTE_MAP['/vscode'] = ROUTE_MAP['/plugins/vscode'];
if (ROUTE_MAP['/docs']) ROUTE_MAP['/getting-started'] = ROUTE_MAP['/docs'];
if (ROUTE_MAP['/safety']) ROUTE_MAP['/transparency'] = ROUTE_MAP['/safety'];
if (ROUTE_MAP['/clean']) ROUTE_MAP['/clean-mode'] = ROUTE_MAP['/clean'];
if (ROUTE_MAP['/cli']) ROUTE_MAP['/multipliers'] = ROUTE_MAP['/cli'];
if (ROUTE_MAP['/sdk/core']) ROUTE_MAP['/sdk'] = ROUTE_MAP['/sdk/core'];
if (ROUTE_MAP['/plugins/vite']) ROUTE_MAP['/vite'] = ROUTE_MAP['/plugins/vite'];
if (ROUTE_MAP['/plugins/next']) ROUTE_MAP['/next'] = ROUTE_MAP['/plugins/next'];
if (ROUTE_MAP['/plugins/storage']) ROUTE_MAP['/storage'] = ROUTE_MAP['/plugins/storage'];
if (ROUTE_MAP['/plugins/github-action']) ROUTE_MAP['/github-action'] = ROUTE_MAP['/plugins/github-action'];

