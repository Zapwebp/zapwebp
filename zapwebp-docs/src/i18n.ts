export interface LocaleInfo {
  code: string;
  name: string;
  native: string;
}

export const SUPPORTED_LOCALES: LocaleInfo[] = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'tl', name: 'Tagalog', native: 'Tagalog' },
];

const STORAGE_KEY = 'zapwebp_docs_lang';

const catalog: Record<string, Record<string, string>> = {
  en: {
    'header.search_placeholder': 'Search documentation...',
    'header.search_kbd': 'Ctrl K',
    'header.converter': 'Web Converter',
    'header.theme_toggle': 'Toggle Dark / Light Mode',
    'header.language': 'Language',
    'header.contribute_translation': 'Contribute a translation',
    'sidebar.filter_placeholder': 'Filter navigation...',
    'sidebar.llms_context': 'LLMs Context (llms.txt)',
    'sidebar.quick_search': 'Quick search',
    'toc.on_this_page': 'On this page',
    'toc.back_to_top': 'Back to top',
    'toc.view_source': 'View raw .md',
    'scope.covers': 'Covers',
    'scope.excludes': 'Excludes',
    'scope.applies': 'Applies to',
    'code.copy': 'Copy',
    'code.copied': 'Copied!',
    'pagination.prev': 'Previous',
    'pagination.next': 'Next',
    'footer.view_markdown': 'View raw Markdown (.md)',
    'footer.github_issues': 'Report issue on GitHub',
    'footer.contribute_trans': 'Contribute a translation',
    'footer.copyright': 'Zapwebp Documentation · Transparency-Safe Image Engine',
    'cat.Core': 'Core',
    'cat.Plugins': 'Plugins',
    'cat.Developers': 'Developers',
    'cat.Platform': 'Platform',
    'title.Overview': 'Overview',
    'title.Convert': 'Convert',
    'title.CLI': 'CLI',
    'title.MCP Agent': 'MCP Agent',
    'title.Clean': 'Clean',
    'title.Target Lock': 'Target Lock',
    'title.Backgrounds': 'Backgrounds',
    'title.Policy': 'Policy Engine',
    'title.Formats': 'Formats',
    'title.Safety': 'Safety',
    'title.Errors': 'Errors',
    'title.Vite Plugin': 'Vite Plugin',
    'title.Next.js Plugin': 'Next.js Plugin',
    'title.GitHub Action': 'GitHub Action',
    'title.Storage Adapters': 'Storage Adapters',
    'title.VS Code Extension': 'VS Code Extension',
    'title.Laravel Package': 'Laravel Package',
    'title.Lens CLI': 'Lens CLI',
    'title.Crop Plugin': 'Crop Plugin',
    'title.Developers Overview': 'Developers Overview',
    'title.Plugin SDK': 'Plugin SDK',
    'title.UI Kit': 'UI Kit',
    'title.Core SDK': 'Core SDK',
    'title.UI SDK': 'UI SDK',
    'title.CLI SDK': 'CLI SDK',
    'title.Storage SDK': 'Storage SDK',
    'title.Edge SDK': 'Edge SDK',
    'title.REST API': 'REST API',
    'title.About': 'About',
    'title.Privacy Policy': 'Privacy Policy',
    'title.Terms of Service': 'Terms of Service',
    'title.Security': 'Security',
    'title.Code of Conduct': 'Code of Conduct',
    'title.Contributing': 'Contributing',
    'title.Translators': 'Translators',
  },
  tl: {
    'header.search_placeholder': 'Maghanap sa dokumentasyon...',
    'header.search_kbd': 'Ctrl K',
    'header.converter': 'Pang-convert sa Web',
    'header.theme_toggle': 'Palitan ang Tema (Madilim / Maliwanag)',
    'header.language': 'Wika',
    'header.contribute_translation': 'Mag-ambag ng salin',
    'sidebar.filter_placeholder': 'I-filter ang mga paksa...',
    'sidebar.llms_context': 'Konteksto para sa LLMs (llms.txt)',
    'sidebar.quick_search': 'Mabilisang hanap',
    'toc.on_this_page': 'Sa pahinang ito',
    'toc.back_to_top': 'Bumalik sa itaas',
    'toc.view_source': 'Tingnan ang raw .md',
    'scope.covers': 'Sinasaklaw',
    'scope.excludes': 'Hindi Saklaw',
    'scope.applies': 'Nalalapat sa',
    'code.copy': 'Kopyahin',
    'code.copied': 'Nakopya na!',
    'pagination.prev': 'Nakaraan',
    'pagination.next': 'Susunod',
    'footer.view_markdown': 'Tingnan ang raw Markdown (.md)',
    'footer.github_issues': 'Mag-ulat ng isyu sa GitHub',
    'footer.contribute_trans': 'Mag-ambag ng salin',
    'footer.copyright': 'Dokumentasyon ng Zapwebp · Transparency-Safe Image Engine',
    'cat.Core': 'Pangunahin',
    'cat.Plugins': 'Mga Plugin',
    'cat.Developers': 'Mga Developer',
    'cat.Platform': 'Plataporma',
    'title.Overview': 'Pangkalahatang-ideya',
    'title.Convert': 'I-convert',
    'title.CLI': 'Terminal (CLI)',
    'title.MCP Agent': 'Ahente ng MCP',
    'title.Clean': 'Malinis (Clean)',
    'title.Target Lock': 'Target Lock (Pag-lock ng Format)',
    'title.Backgrounds': 'Mga Background (Preserbasyon ng Likuran)',
    'title.Policy': 'Patakaran ng Conversion (Policy Engine)',
    'title.Formats': 'Mga Format',
    'title.Safety': 'Kaligtasan',
    'title.Errors': 'Mga Error',
    'title.Vite Plugin': 'Plugin para sa Vite',
    'title.Next.js Plugin': 'Plugin para sa Next.js',
    'title.GitHub Action': 'Aksyon sa GitHub',
    'title.Storage Adapters': 'Mga Storage Adapter',
    'title.VS Code Extension': 'Extension para sa VS Code',
    'title.Laravel Package': 'Package para sa Laravel',
    'title.Lens CLI': 'Lens CLI (Pagsusuri)',
    'title.Crop Plugin': 'Plugin sa Pag-crop',
    'title.Developers Overview': 'Pangkalahatang-ideya ng Developer',
    'title.Plugin SDK': 'SDK ng Plugin',
    'title.UI Kit': 'UI Kit (Error & Upload)',
    'title.Core SDK': 'Core SDK',
    'title.UI SDK': 'UI SDK',
    'title.CLI SDK': 'CLI SDK',
    'title.Storage SDK': 'Storage SDK',
    'title.Edge SDK': 'Edge SDK',
    'title.REST API': 'REST API',
    'title.About': 'Tungkol sa Zapwebp',
    'title.Privacy Policy': 'Patakaran sa Privacy',
    'title.Terms of Service': 'Mga Tuntunin sa Paggamit',
    'title.Security': 'Kaligtasan sa Seguridad (Security)',
    'title.Code of Conduct': 'Alituntunin ng Pagkilos (Code of Conduct)',
    'title.Contributing': 'Pag-ambag (Contributing)',
    'title.Translators': 'Mga Tagasalin (Translators)',
  }
};

let activeLocale = (() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && (saved === 'en' || saved === 'tl')) return saved;
  if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('tl')) return 'tl';
  return 'en';
})();

const listeners: Array<(locale: string) => void> = [];

export function getLocale(): string {
  return activeLocale;
}

export function setLocale(locale: string): void {
  if (!catalog[locale]) return;
  activeLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
    document.documentElement.setAttribute('lang', locale);
  } catch (_) {}
  listeners.forEach((fn) => fn(locale));
}

export function getLocales(): LocaleInfo[] {
  return SUPPORTED_LOCALES;
}

/**
 * Open extensibility: allows community translations to register dynamically
 */
export function registerLocale(info: LocaleInfo, strings: Record<string, string>): void {
  if (!info || !info.code || !strings) return;
  if (!SUPPORTED_LOCALES.some((l) => l.code === info.code)) {
    SUPPORTED_LOCALES.push(info);
  }
  catalog[info.code] = { ...(catalog[info.code] || {}), ...strings };
}

export function onLocaleChange(fn: (locale: string) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let str = catalog[activeLocale]?.[key] ?? catalog.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return str;
}
