'use strict';

/**
 * Zapwebp Web Application Controller
 * High-performance, zero-tracking, transparency-safe image conversion engine.
 */

const SUPPORTED_EXTENSIONS = new Set(['.svg', '.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.tif', '.tiff']);

// DOM References
const fileInput = document.querySelector('#file-input');
const dropzone = document.querySelector('#dropzone');
const idleGlyph = document.querySelector('#idle-glyph');
const convertingState = document.querySelector('#converting-state');
const currentThumbnail = document.querySelector('#current-thumbnail');
const resultsContainer = document.querySelector('#results');
const qualitySlider = document.querySelector('#quality');
const qualityDisplay = document.querySelector('#quality-display');
const cleanToggle = document.querySelector('#clean-toggle');
const losslessToggle = document.querySelector('#lossless-toggle');
const formatPills = document.querySelectorAll('.fmt-select-btn');
const scaleButtons = document.querySelectorAll('.scale-btn');
const themeToggleBtn = document.querySelector('#theme-toggle-btn');
const cockpitToggleBtn = document.querySelector('#cockpit-toggle-btn');
const cockpitAdvancedControls = document.querySelector('#cockpit-advanced-controls');

// Background color picker for JPEG flattening
const bgItem = document.getElementById('bar-bg-item');
const bgPicker = document.getElementById('bg-color-picker');
const bgHexLabel = document.getElementById('bg-hex-label');

// Error Dialog
const errorDialog = document.querySelector('#error-dialog');
const errorDetail = document.querySelector('#error-detail');
const errorClose = document.querySelector('#error-close');

// Preview Dialog
const previewDialog = document.querySelector('#preview-dialog');
const previewTitle = document.querySelector('#preview-title');
const previewFormatBadge = document.querySelector('#preview-format-badge');
const previewScaleBadge = document.querySelector('#preview-scale-badge');
const previewAlphaBadge = document.querySelector('#preview-alpha-badge');
const previewCleanBadge = document.querySelector('#preview-clean-badge');
const previewStage = document.querySelector('#preview-stage');
const previewDimVal = document.querySelector('#preview-dim-val');
const previewSizeVal = document.querySelector('#preview-size-val');
const previewSavingsWrap = document.querySelector('#preview-savings-wrap');
const previewSavingsVal = document.querySelector('#preview-savings-val');
const previewDownloadBtn = document.querySelector('#preview-download-btn');
const previewCloseBtn = document.querySelector('#preview-close-btn');
const viewTabConverted = document.querySelector('#view-tab-converted');
const viewTabOriginal = document.querySelector('#view-tab-original');
const viewTabSplit = document.querySelector('#view-tab-split');

// Global State
const convertedItems = new Map(); // id -> item object
let isConverting = false;
let currentPreviewItem = null;
let activePreviewTab = 'converted'; // 'converted' | 'original' | 'split'
let qualityDebounceTimer = null;

// Settings & Defaults
function getTargetFromRoute() {
  const p = window.location.pathname.toLowerCase();
  if (p.endsWith('-to-avif')) return 'avif';
  if (p.endsWith('-to-png')) return 'png';
  if (p.endsWith('-to-jpeg') || p.endsWith('-to-jpg')) return 'jpeg';
  return 'webp';
}

const settings = {
  format: 'webp',
  scales: [1],
  quality: 85,
  clean: true,
  lossless: false,
  background: '#ffffff',
  viewMode: 'grid',
  outputSizeMode: 'auto', // 'auto' | 'custom'
  outputSizeLimitKb: 500,
  compressionTarget: 'limit', // 'limit' | 'target'
  inputSizeLimitMb: 50,
};

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem('zapwebp:settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.assign(settings, parsed);
      }
    }
  } catch {}
}
loadStoredSettings();

function persistSettings() {
  try {
    localStorage.setItem('zapwebp:settings', JSON.stringify({
      format: settings.format,
      scales: settings.scales,
      quality: settings.quality,
      clean: settings.clean,
      lossless: settings.lossless,
      background: settings.background,
      viewMode: settings.viewMode,
      outputSizeMode: settings.outputSizeMode,
      outputSizeLimitKb: settings.outputSizeLimitKb,
      compressionTarget: settings.compressionTarget,
      inputSizeLimitMb: settings.inputSizeLimitMb,
    }));
  } catch {}
}

// ==========================================================================
// 1. IndexedDB Persistence Layer (zapwebp-db)
// ==========================================================================
const DB_NAME = 'zapwebp-db';
const DB_VERSION = 1;
let dbPromise = null;

function getDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
  return dbPromise;
}

async function dbSaveFile(record) {
  try {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(record);
  } catch {}
}

async function dbDeleteFile(id) {
  try {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').delete(id);
  } catch {}
}

async function dbClearFiles() {
  try {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').clear();
  } catch {}
}

async function dbGetAllFiles() {
  try {
    const db = await getDb();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction('files', 'readonly');
      const req = tx.objectStore('files').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ==========================================================================
// 2. Theme Management (Auto / Light / Dark with Meta Sync)
// ==========================================================================
const metaThemeColor = document.querySelector('#meta-theme-color');

function applyTheme(theme) {
  let effective = theme;
  if (theme === 'auto') {
    effective = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', effective);
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', effective === 'dark' ? '#10120f' : '#f7f7f4');
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('zapwebp:theme') || localStorage.getItem('zapwebp_theme') || 'auto';
  applyTheme(savedTheme);

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const currentChoice = localStorage.getItem('zapwebp:theme') || 'auto';
      if (currentChoice === 'auto') applyTheme('auto');
    });
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('zapwebp:theme', next);
      localStorage.setItem('zapwebp_theme', next);
      applyTheme(next);
      syncSettingsModalUI();
    });
  }
}
initTheme();

// ==========================================================================
// 3. Settings Persistence (localStorage)
// ==========================================================================
function loadSettings() {
  const routeFmt = getTargetFromRoute();
  const savedFmt = localStorage.getItem('zapwebp:format') || localStorage.getItem('zapwebp_format');
  if (savedFmt && ['webp', 'avif', 'png', 'jpeg'].includes(savedFmt)) {
    settings.format = savedFmt;
  } else if (routeFmt) {
    settings.format = routeFmt;
  }

  const savedQuality = localStorage.getItem('zapwebp:quality') || localStorage.getItem('zapwebp_quality');
  if (savedQuality) {
    const q = parseInt(savedQuality, 10);
    if (!isNaN(q) && q >= 1 && q <= 100) settings.quality = q;
  }

  const savedLossless = localStorage.getItem('zapwebp_lossless');
  if (savedLossless !== null) {
    settings.lossless = savedLossless === 'true';
  }

  const savedClean = localStorage.getItem('zapwebp:clean') || localStorage.getItem('zapwebp_clean');
  if (savedClean !== null) {
    settings.clean = savedClean === 'true';
  }

  const savedView = localStorage.getItem('zapwebp:view');
  if (savedView && ['grid', 'list'].includes(savedView)) {
    settings.viewMode = savedView;
  } else if (typeof window !== 'undefined' && window.innerWidth < 640) {
    settings.viewMode = 'list';
  }

  const savedScales = localStorage.getItem('zapwebp_scales');
  if (savedScales) {
    try {
      const parsed = JSON.parse(savedScales);
      if (Array.isArray(parsed) && parsed.length) {
        settings.scales = parsed.filter((s) => [1, 2, 3].includes(s));
        if (!settings.scales.length) settings.scales = [1];
      }
    } catch {}
  }

  const savedBg = localStorage.getItem('zapwebp_background');
  if (savedBg && /^#[0-9a-fA-F]{6}$/.test(savedBg)) {
    settings.background = savedBg;
  }
}

function persistSettings() {
  try {
    localStorage.setItem('zapwebp:format', settings.format);
    localStorage.setItem('zapwebp_format', settings.format);
    localStorage.setItem('zapwebp:quality', String(settings.quality));
    localStorage.setItem('zapwebp_quality', String(settings.quality));
    localStorage.setItem('zapwebp_lossless', String(settings.lossless));
    localStorage.setItem('zapwebp:clean', String(settings.clean));
    localStorage.setItem('zapwebp_clean', String(settings.clean));
    localStorage.setItem('zapwebp:view', settings.viewMode);
    localStorage.setItem('zapwebp_scales', JSON.stringify(settings.scales));
    if (bgPicker?.value) {
      settings.background = bgPicker.value;
      localStorage.setItem('zapwebp_background', bgPicker.value);
    }
  } catch {}
}

loadSettings();

// ==========================================================================
// 4. Lossless & Size Limit Conflict Warning System
// ==========================================================================
const losslessConflictBanner = document.querySelector('#lossless-conflict-banner');
const conflictLimitVal = document.querySelector('#conflict-limit-val');
const conflictSwitchLossy = document.querySelector('#conflict-switch-lossy');
const conflictRemoveLimit = document.querySelector('#conflict-remove-limit');

function checkLosslessConflict() {
  if (!losslessConflictBanner) return false;
  const isLossless = settings.lossless || settings.format === 'png';
  const hasLimit = settings.outputSizeMode === 'custom' && Number(settings.outputSizeLimitKb) > 0;

  if (isLossless && hasLimit) {
    if (conflictLimitVal) conflictLimitVal.textContent = `${settings.outputSizeLimitKb} KB`;
    losslessConflictBanner.hidden = false;
    return true;
  } else {
    losslessConflictBanner.hidden = true;
    return false;
  }
}

if (conflictSwitchLossy) {
  conflictSwitchLossy.addEventListener('click', () => {
    settings.lossless = false;
    if (settings.format === 'png') {
      settings.format = 'webp';
    }
    persistSettings();
    syncUiWithSettings();
    syncSettingsSlideoverUI();
    checkLosslessConflict();
    reconvertAllItems();
  });
}

if (conflictRemoveLimit) {
  conflictRemoveLimit.addEventListener('click', () => {
    settings.outputSizeMode = 'auto';
    persistSettings();
    syncUiWithSettings();
    syncSettingsSlideoverUI();
    checkLosslessConflict();
    reconvertAllItems();
  });
}

// ==========================================================================
// 5. Settings Slide-Over Drawer & Confirm Delete Modal Controllers
// ==========================================================================
const settingsBtn = document.querySelector('#settings-btn');
const settingsSlideover = document.querySelector('#settings-slideover') || document.querySelector('#settings-modal');
const settingsSlideoverClose = document.querySelector('#settings-slideover-close') || document.querySelector('#settings-modal-close');
const tabBtnEssentials = document.querySelector('#tab-btn-essentials');
const tabBtnAdvanced = document.querySelector('#tab-btn-advanced');
const tabPaneEssentials = document.querySelector('#tab-pane-essentials');
const tabPaneAdvanced = document.querySelector('#tab-pane-advanced');

const settingQualityInput = document.querySelector('#setting-quality-input');
const settingQualityVal = document.querySelector('#setting-quality-val');
const settingSizeLimitInput = document.querySelector('#setting-size-limit-input');
const settingCleanToggle = document.querySelector('#setting-clean-toggle');
const settingInputLimitInput = document.querySelector('#setting-input-limit-input');
const settingLosslessToggle = document.querySelector('#setting-lossless-toggle');

function openSettingsSlideover() {
  syncSettingsSlideoverUI();
  if (settingsSlideover) settingsSlideover.hidden = false;
}

function closeSettingsSlideover() {
  if (settingsSlideover) settingsSlideover.hidden = true;
}

function switchSettingsTab(tabName) {
  if (!tabBtnEssentials || !tabBtnAdvanced) return;
  const isEssentials = tabName === 'essentials';
  tabBtnEssentials.classList.toggle('is-active', isEssentials);
  tabBtnEssentials.setAttribute('aria-selected', String(isEssentials));
  tabBtnAdvanced.classList.toggle('is-active', !isEssentials);
  tabBtnAdvanced.setAttribute('aria-selected', String(!isEssentials));

  if (tabPaneEssentials) tabPaneEssentials.hidden = !isEssentials;
  if (tabPaneAdvanced) tabPaneAdvanced.hidden = isEssentials;
}

if (tabBtnEssentials) tabBtnEssentials.addEventListener('click', () => switchSettingsTab('essentials'));
if (tabBtnAdvanced) tabBtnAdvanced.addEventListener('click', () => switchSettingsTab('advanced'));

function syncSettingsSlideoverUI() {
  // Format radios
  const fmtRadios = document.querySelectorAll('input[name="setting-default-format"]');
  fmtRadios.forEach((r) => { r.checked = (r.value === settings.format); });

  // Quality slider
  if (settingQualityInput) settingQualityInput.value = settings.quality;
  if (settingQualityVal) settingQualityVal.textContent = `${settings.quality}%`;

  // Output size limit
  const sizeModeRadios = document.querySelectorAll('input[name="setting-output-size-mode"]');
  sizeModeRadios.forEach((r) => { r.checked = (r.value === settings.outputSizeMode); });
  if (settingSizeLimitInput) {
    settingSizeLimitInput.value = settings.outputSizeLimitKb || 500;
    settingSizeLimitInput.disabled = (settings.outputSizeMode !== 'custom');
  }

  // Theme radios
  const themeChoice = localStorage.getItem('zapwebp:theme') || 'auto';
  const themeRadios = document.querySelectorAll('input[name="setting-theme"]');
  themeRadios.forEach((r) => { r.checked = (r.value === themeChoice); });

  // Clean metadata toggle
  if (settingCleanToggle) settingCleanToggle.checked = settings.clean;

  // Compression target radios
  const compTargetRadios = document.querySelectorAll('input[name="setting-compression-target"]');
  compTargetRadios.forEach((r) => { r.checked = (r.value === settings.compressionTarget); });

  // Input limit
  if (settingInputLimitInput) settingInputLimitInput.value = settings.inputSizeLimitMb || 50;

  // Lossless toggle
  if (settingLosslessToggle) settingLosslessToggle.checked = settings.lossless;
}

if (settingsBtn) settingsBtn.addEventListener('click', openSettingsSlideover);
if (settingsSlideoverClose) settingsSlideoverClose.addEventListener('click', closeSettingsSlideover);
if (settingsSlideover) {
  settingsSlideover.addEventListener('click', (e) => {
    if (e.target === settingsSlideover) closeSettingsSlideover();
  });
}

// Format radios
document.querySelectorAll('input[name="setting-default-format"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    settings.format = radio.value;
    persistSettings();
    syncUiWithSettings();
    checkLosslessConflict();
    reconvertAllItems();
  });
});

// Quality slider in settings
if (settingQualityInput) {
  settingQualityInput.addEventListener('input', () => {
    settings.quality = Number(settingQualityInput.value);
    if (settingQualityVal) settingQualityVal.textContent = `${settings.quality}%`;
    persistSettings();
    clearTimeout(qualityDebounceTimer);
    qualityDebounceTimer = setTimeout(() => {
      syncUiWithSettings();
      reconvertAllItems();
    }, 200);
  });
}

// Output size mode in settings
document.querySelectorAll('input[name="setting-output-size-mode"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    settings.outputSizeMode = radio.value;
    if (settingSizeLimitInput) {
      settingSizeLimitInput.disabled = (settings.outputSizeMode !== 'custom');
    }
    persistSettings();
    checkLosslessConflict();
    reconvertAllItems();
  });
});

if (settingSizeLimitInput) {
  settingSizeLimitInput.addEventListener('input', () => {
    const val = Number(settingSizeLimitInput.value);
    if (val > 0) {
      settings.outputSizeLimitKb = val;
      persistSettings();
      checkLosslessConflict();
      clearTimeout(qualityDebounceTimer);
      qualityDebounceTimer = setTimeout(() => {
        reconvertAllItems();
      }, 300);
    }
  });
}

// Theme radios
document.querySelectorAll('input[name="setting-theme"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    localStorage.setItem('zapwebp:theme', radio.value);
    applyTheme(radio.value);
  });
});

// Clean toggle
if (settingCleanToggle) {
  settingCleanToggle.addEventListener('change', () => {
    settings.clean = settingCleanToggle.checked;
    persistSettings();
    syncUiWithSettings();
    reconvertAllItems();
  });
}

// Compression target radios
document.querySelectorAll('input[name="setting-compression-target"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    settings.compressionTarget = radio.value;
    persistSettings();
    reconvertAllItems();
  });
});

// Input size limit
if (settingInputLimitInput) {
  settingInputLimitInput.addEventListener('input', () => {
    const val = Number(settingInputLimitInput.value);
    if (val > 0) {
      settings.inputSizeLimitMb = val;
      persistSettings();
    }
  });
}

// Lossless toggle in settings
if (settingLosslessToggle) {
  settingLosslessToggle.addEventListener('change', () => {
    settings.lossless = settingLosslessToggle.checked;
    persistSettings();
    syncUiWithSettings();
    checkLosslessConflict();
    reconvertAllItems();
  });
}

// Confirm Delete Modal
const confirmDeleteModal = document.querySelector('#confirm-delete-modal');
const confirmDeleteCancel = document.querySelector('#confirm-delete-cancel');
const confirmDeleteConfirm = document.querySelector('#confirm-delete-confirm');

function openConfirmDeleteModal() {
  if (confirmDeleteModal) confirmDeleteModal.hidden = false;
}

function closeConfirmDeleteModal() {
  if (confirmDeleteModal) confirmDeleteModal.hidden = true;
}

if (confirmDeleteCancel) confirmDeleteCancel.addEventListener('click', closeConfirmDeleteModal);
if (confirmDeleteModal) {
  confirmDeleteModal.addEventListener('click', (e) => {
    if (e.target === confirmDeleteModal) closeConfirmDeleteModal();
  });
}
if (confirmDeleteConfirm) {
  confirmDeleteConfirm.addEventListener('click', () => {
    closeConfirmDeleteModal();
    clearAllItems();
  });
}

// Reset workspace on brand logo click
const brandResetBtn = document.querySelector('#brand-reset-btn');
if (brandResetBtn) {
  brandResetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    convertedItems.clear();
    dbClearFiles();
    renderResultsView();
    if (losslessConflictBanner) losslessConflictBanner.hidden = true;
    closeSettingsSlideover();
  });
}

// ==========================================================================
// Comprehensive Web i18n Translation Engine (EN / TL)
// ==========================================================================
const I18N_DICTIONARIES = {
  en: {
    'nav.docs': 'Docs',
    'nav.cli': 'CLI',
    'nav.mcp': 'MCP',
    'hero.badge': '100% In-Browser · Zero Server Uploads',
    'hero.title': 'Convert<span class="accent-gradient"> correctly.</span>',
    'hero.description': '<span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Transparency preserved</span><span class="hero-pill-sep" aria-hidden="true">•</span><span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Metadata stripped</span><span class="hero-pill-sep" aria-hidden="true">•</span><span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Zero server uploads</span>',
    'dropzone.title': '<span class="highlight-action">Drop images here</span> or <span class="browse-link">browse files</span>',
    'dropzone.subtitle': 'Select single files, batches, or folders.',
    'dropzone.converting': 'Converting in browser...',
    'batch.files_converted': 'files converted',
    'batch.format_prefix': 'Format: ',
    'batch.press_hint': '(press 1–4)',
    'batch.add_more': 'Add more',
    'batch.download_all': 'Download all (ZIP)',
    'batch.delete_all': 'Delete all',
    'cockpit.format': 'Format',
    'cockpit.settings': 'Settings',
    'cockpit.background': 'Background',
    'cockpit.scales': 'Scales',
    'cockpit.quality': 'Quality',
    'cockpit.modes': 'Modes',
    'cockpit.lossless': 'Lossless',
    'cockpit.clean_mode': 'Clean Mode',
    'single.converted': 'Converted',
    'single.preview': 'Inspect',
    'single.share': 'Share',
    'single.download': 'Download',
    'single.delete': 'Delete',
    'card.preview': 'Preview',
    'card.download': 'Download',
    'card.delete': 'Delete',
    'card.add_more_title': 'Add More Images',
    'card.add_more_hint': 'Drop files here or click',
    'modal.title': 'Inspection & Comparison',
    'modal.tab_converted': 'Converted',
    'modal.tab_original': 'Original',
    'modal.tab_side_by_side': 'Side-by-Side',
    'modal.tab_swipe': 'Swipe',
    'modal.btn_crop': 'Crop',
    'modal.btn_download': 'Download File',
    'modal.dimensions': 'Dimensions',
    'modal.file_size': 'File Size',
    'modal.reduction': 'Reduction',
    'modal.original_label': 'Original',
    'modal.converted_label': 'Converted',
    'modal.alpha_preserved': 'Alpha Preserved',
    'modal.opaque': 'Opaque',
    'footer.tagline': 'Transparency-safe image conversion across developer terminals, AI agents, code editors, and browsers with zero server uploads.',
    'footer.col_ecosystem': 'Ecosystem & Tools',
    'footer.col_guides': 'Guides & Formats',
    'footer.col_sdks': 'Developer SDKs',
    'footer.col_platform': 'Open Platform',
    'footer.web_converter': 'Web Converter (In-Browser)',
    'footer.vscode_docs': 'VS Code Extension (Docs)',
    'footer.open_vsx': 'VS Code (Open VSX)',
    'footer.vs_marketplace': 'VS Code (VS Marketplace)',
    'footer.cli': 'CLI Tool (`zapwebp`)',
    'footer.mcp': 'MCP Server (AI Agents)',
    'footer.api': 'REST API & Edge Runtime',
    'footer.getting_started': 'Getting Started',
    'footer.formats': 'Supported Formats Matrix',
    'footer.transparency': 'Transparency & Alpha Rules',
    'footer.clean_mode': 'Clean Mode & EXIF Stripping',
    'footer.multipliers': 'Multi-Scale Retina (@1x/@2x/@3x)',
    'footer.faq': 'Common FAQs',
    'footer.sdk': 'JavaScript/TypeScript SDK',
    'footer.vite': 'Vite Plugin',
    'footer.next': 'Next.js Plugin',
    'footer.storage': 'Cloud Storage Adapters',
    'footer.github_action': 'GitHub Actions CI/CD',
    'footer.security': 'Zero-Trust Security Model',
    'footer.llms': 'Machine-Readable Spec (llms.txt)',
    'footer.openapi': 'OpenAPI Specification',
    'footer.github': 'GitHub Organization',
    'footer.license': 'MIT License',
    'footer.copyright': '© 2026 Zapwebp. Maintained by <strong>Eldrex Delos Reyes Bula</strong>. Republic of the Philippines.',
    'footer.full_docs': 'Full Docs Portal ↗',
  },
  tl: {
    'nav.docs': 'Mga Gabay',
    'nav.cli': 'CLI',
    'nav.mcp': 'MCP',
    'hero.badge': '100% Sa Loob ng Browser · Walang Server Uploads',
    'hero.title': 'Mag-convert<span class="accent-gradient"> nang tama.</span>',
    'hero.description': '<span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>Nananatili ang aninag</span><span class="hero-pill-sep" aria-hidden="true">•</span><span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>Tinanggal ang metadata</span><span class="hero-pill-sep" aria-hidden="true">•</span><span class="hero-pill-item"><svg class="hero-pill-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>Walang server uploads</span>',
    'dropzone.title': '<span class="highlight-action">I-drop ang mga larawan dito</span> o <span class="browse-link">mag-browse ng file</span>',
    'dropzone.subtitle': 'Pumili ng isang file, maramihan, o buong folder.',
    'dropzone.converting': 'Kasalukuyang kino-convert sa browser...',
    'batch.files_converted': '(na) file na-convert',
    'batch.format_prefix': 'Format: ',
    'batch.press_hint': '(pindutin 1–4)',
    'batch.add_more': 'Magdagdag pa',
    'batch.download_all': 'I-download lahat (ZIP)',
    'batch.delete_all': 'Burahin lahat',
    'cockpit.format': 'Format',
    'cockpit.settings': 'Mga Setting',
    'cockpit.background': 'Background',
    'cockpit.scales': 'Mga Sukat',
    'cockpit.quality': 'Kalidad',
    'cockpit.modes': 'Mga Mode',
    'cockpit.lossless': 'Walang bawas',
    'cockpit.clean_mode': 'Malinis na Mode',
    'single.converted': 'Na-convert',
    'single.preview': 'Pagsusuri',
    'single.share': 'Ibahagi',
    'single.download': 'I-download',
    'single.delete': 'Burahin',
    'card.preview': 'Pagsusuri',
    'card.download': 'I-download',
    'card.delete': 'Burahin',
    'card.add_more_title': 'Magdagdag Pa ng Larawan',
    'card.add_more_hint': 'I-drop dito o i-click',
    'modal.title': 'Pagsusuri at Paghahambing',
    'modal.tab_converted': 'Na-convert',
    'modal.tab_original': 'Orihinal',
    'modal.tab_side_by_side': 'Magkatabi',
    'modal.tab_swipe': 'I-swipe',
    'modal.btn_crop': 'I-crop',
    'modal.btn_download': 'I-download ang File',
    'modal.dimensions': 'Mga Sukat',
    'modal.file_size': 'Laki ng File',
    'modal.reduction': 'Nabawas',
    'modal.original_label': 'Orihinal',
    'modal.converted_label': 'Na-convert',
    'modal.alpha_preserved': 'Nananatiling Transparent',
    'modal.opaque': 'Opaque (May Kulay)',
    'footer.tagline': 'Mabilis at ligtas na conversion ng imahe sa terminal, AI agents, code editors, at browser nang walang server uploads.',
    'footer.col_ecosystem': 'Ekosistema at Mga Kagamitan',
    'footer.col_guides': 'Mga Gabay at Format',
    'footer.col_sdks': 'Mga SDK para sa Developer',
    'footer.col_platform': 'Bukas na Plataporma',
    'footer.web_converter': 'Web Converter (Sa Browser)',
    'footer.vscode_docs': 'VS Code Extension (Mga Gabay)',
    'footer.open_vsx': 'VS Code (Open VSX)',
    'footer.vs_marketplace': 'VS Code (VS Marketplace)',
    'footer.cli': 'CLI Tool (`zapwebp`)',
    'footer.mcp': 'MCP Server (AI Agents)',
    'footer.api': 'REST API & Edge Runtime',
    'footer.getting_started': 'Pagsisimula',
    'footer.formats': 'Talaan ng Suportadong Format',
    'footer.transparency': 'Mga Patakaran sa Aninag at Alpha',
    'footer.clean_mode': 'Malinis na Mode at Pag-alis ng EXIF',
    'footer.multipliers': 'Multi-Scale Retina (@1x/@2x/@3x)',
    'footer.faq': 'Mga Karaniwang Tanong (FAQ)',
    'footer.sdk': 'JavaScript/TypeScript SDK',
    'footer.vite': 'Vite Plugin',
    'footer.next': 'Next.js Plugin',
    'footer.storage': 'Cloud Storage Adapters',
    'footer.github_action': 'GitHub Actions CI/CD',
    'footer.security': 'Zero-Trust Model ng Seguridad',
    'footer.llms': 'Spec para sa Makina (llms.txt)',
    'footer.openapi': 'OpenAPI Specification',
    'footer.github': 'Organisasyon sa GitHub',
    'footer.license': 'Lisensyang MIT',
    'footer.copyright': '© 2026 Zapwebp. Pinapanatili ni <strong>Eldrex Delos Reyes Bula</strong>. Republika ng Pilipinas.',
    'footer.full_docs': 'Buong Portal ng Docs ↗',
  }
};

function getActiveLanguage() {
  return localStorage.getItem('zapwebp_lang')
    || localStorage.getItem('zapwebp:lang')
    || (navigator.language?.startsWith('tl') ? 'tl' : 'en');
}

function t(key, defaultVal) {
  const currentLang = getActiveLanguage();
  return I18N_DICTIONARIES[currentLang]?.[key] || I18N_DICTIONARIES.en[key] || defaultVal || key;
}

function applyTranslations(lang) {
  const activeLang = lang || getActiveLanguage();
  document.documentElement.lang = activeLang;
  localStorage.setItem('zapwebp_lang', activeLang);
  localStorage.setItem('zapwebp:lang', activeLang);

  // Update footer button
  const footerLangLabel = document.querySelector('#footer-lang-label');
  if (footerLangLabel) {
    footerLangLabel.textContent = activeLang.toUpperCase();
  }
  const footerLangBtn = document.querySelector('#footer-lang-btn');
  if (footerLangBtn) {
    footerLangBtn.setAttribute('title', activeLang === 'en' ? 'Switch to Tagalog (TL)' : 'Switch to English (EN)');
    footerLangBtn.setAttribute('aria-label', activeLang === 'en' ? 'Switch to Tagalog' : 'Switch to English');
  }

  // Update header button if present
  const headerLangBtn = document.querySelector('#header-lang-btn');
  if (headerLangBtn) {
    headerLangBtn.textContent = activeLang === 'en' ? '🌐 EN' : '🌐 TL';
    headerLangBtn.setAttribute('title', activeLang === 'en' ? 'Switch to Tagalog (TL)' : 'Switch to English (EN)');
  }

  // Translate all DOM elements tagged with data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const translation = I18N_DICTIONARIES[activeLang]?.[key] || I18N_DICTIONARIES.en[key];
    if (translation !== undefined) {
      if (translation.includes('<')) {
        el.innerHTML = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  // Re-render results cards so dynamic text adopts the current language
  if (typeof renderResultsView === 'function' && convertedItems.size > 0) {
    renderResultsView();
  }
}

function toggleLanguage() {
  const current = getActiveLanguage();
  const next = current === 'en' ? 'tl' : 'en';
  applyTranslations(next);
}

// Bind Header & Footer Language Toggle Buttons
const footerLangBtn = document.querySelector('#footer-lang-btn');
if (footerLangBtn) {
  footerLangBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleLanguage();
  });
}

const headerLangBtn = document.querySelector('#header-lang-btn');
if (headerLangBtn) {
  headerLangBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleLanguage();
  });
}

// Initial application of language on boot
applyTranslations();

// Keyboard shortcuts 1–4 and Escape
const FORMAT_CYCLE = ['webp', 'avif', 'png', 'jpeg'];
const formatBadgeBtn = document.querySelector('#format-badge-btn');
const formatBadgeLabel = document.querySelector('#format-badge-label');

if (formatBadgeBtn) {
  formatBadgeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const nextIdx = (FORMAT_CYCLE.indexOf(settings.format) + 1) % FORMAT_CYCLE.length;
    settings.format = FORMAT_CYCLE[nextIdx];
    persistSettings();
    syncUiWithSettings();
    reconvertAllItems();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === 'Escape') {
    closeSettingsSlideover();
    closeConfirmDeleteModal();
  }
  if ((e.metaKey || e.ctrlKey) && (e.key === ',' || e.key.toLowerCase() === 'k')) {
    e.preventDefault();
    if (settingsSlideover && !settingsSlideover.hidden) {
      closeSettingsSlideover();
    } else {
      openSettingsSlideover();
    }
    return;
  }
  const keyMap = { '1': 'webp', '2': 'avif', '3': 'png', '4': 'jpeg' };
  if (keyMap[e.key]) {
    e.preventDefault();
    const newFormat = keyMap[e.key];
    if (settings.format !== newFormat) {
      settings.format = newFormat;
      persistSettings();
      syncUiWithSettings();
      reconvertAllItems();
    }
  }
});

// View toggle (Grid / List)
const viewGridBtn = document.querySelector('#view-grid-btn');
const viewListBtn = document.querySelector('#view-list-btn');

function setViewMode(mode) {
  settings.viewMode = mode;
  try {
    localStorage.setItem('zapwebp:view', mode);
  } catch {}
  if (viewGridBtn) {
    viewGridBtn.classList.toggle('is-active', mode === 'grid');
    viewGridBtn.setAttribute('aria-pressed', String(mode === 'grid'));
  }
  if (viewListBtn) {
    viewListBtn.classList.toggle('is-active', mode === 'list');
    viewListBtn.setAttribute('aria-pressed', String(mode === 'list'));
  }
  renderResultsView();
}

if (viewGridBtn) {
  viewGridBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewMode('grid');
  });
}
if (viewListBtn) {
  viewListBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    setViewMode('list');
  });
}

// Apply Target Lock configuration (hides format picker when locked)
function applyTargetLockConfig() {
  const cfg = window.ZAPWEBP_CONFIG || {};
  const lockTarget = cfg.webApp?.lockTarget || cfg.output?.lock || cfg.ingest?.target || cfg.lockTarget;
  if (lockTarget) {
    settings.format = lockTarget;
    const pills = document.querySelector('#format-pills');
    if (pills && pills.parentElement && pills.parentElement.classList.contains('bar-control-item')) {
      pills.parentElement.hidden = true;
      pills.parentElement.style.display = 'none';
    } else if (pills) {
      pills.hidden = true;
      pills.style.display = 'none';
    }
  }
}
applyTargetLockConfig();
if (!window.ZAPWEBP_CONFIG && typeof fetch === 'function') {
  fetch('/zapwebp.json')
    .then((r) => r.ok ? r.json() : null)
    .then((data) => {
      if (data) {
        window.ZAPWEBP_CONFIG = data;
        applyTargetLockConfig();
      }
    })
    .catch(() => {});
}

// UI Initialization from Settings
function syncUiWithSettings() {
  // Format pills
  formatPills.forEach((btn) => {
    const isMatch = btn.dataset.format === settings.format;
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-checked', String(isMatch));
  });

  // Scale buttons
  scaleButtons.forEach((btn) => {
    const scale = Number(btn.dataset.scale);
    const isMatch = settings.scales.includes(scale);
    btn.classList.toggle('is-active', isMatch);
    btn.setAttribute('aria-pressed', String(isMatch));
  });

  // Quality slider
  if (qualitySlider) {
    qualitySlider.value = settings.quality;
    if (qualityDisplay) qualityDisplay.textContent = `${settings.quality}%`;
  }

  // Lossless toggle
  if (losslessToggle) {
    losslessToggle.checked = settings.lossless;
  }

  // Clean toggle
  if (cleanToggle) {
    cleanToggle.checked = settings.clean;
  }

  // Background picker
  if (bgPicker && settings.background) {
    bgPicker.value = settings.background;
    if (bgHexLabel) bgHexLabel.textContent = settings.background.toUpperCase();
  }

  updateQualitySliderState();
  updateBackgroundPickerVisibility();
  updateToggleCards();
}

function updateToggleCards() {
  const cleanCard = document.querySelector('#clean-toggle-card');
  if (cleanCard && cleanToggle) {
    cleanCard.classList.toggle('is-active', cleanToggle.checked);
  }
  const losslessCard = document.querySelector('#lossless-toggle-card');
  if (losslessCard && losslessToggle) {
    losslessCard.classList.toggle('is-active', losslessToggle.checked);
  }
}

function updateQualitySliderState() {
  const isLossless = settings.lossless || settings.format === 'png';
  const sliderItem = qualitySlider?.closest('.bar-slider-item');
  if (sliderItem) {
    sliderItem.classList.toggle('is-disabled', isLossless);
  }
  if (qualitySlider) {
    qualitySlider.disabled = isLossless;
  }
  if (qualityDisplay) {
    if (settings.format === 'png') {
      qualityDisplay.textContent = 'Lossless';
    } else if (settings.lossless) {
      qualityDisplay.textContent = '100% (Lossless)';
    } else {
      qualityDisplay.textContent = `${settings.quality}%`;
    }
  }
}

function updateBackgroundPickerVisibility() {
  if (bgItem) {
    bgItem.hidden = (settings.format !== 'jpeg');
  }
}

syncUiWithSettings();

// ==========================================================================
// 3. Reactive Controls: Immediate Re-conversion on Settings Changes
// ==========================================================================
if (cockpitToggleBtn && cockpitAdvancedControls) {
  cockpitToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = cockpitAdvancedControls.classList.toggle('is-expanded');
    cockpitToggleBtn.setAttribute('aria-expanded', String(isExpanded));
    cockpitToggleBtn.classList.toggle('is-active', isExpanded);
  });
}

if (formatPills.length) {
  formatPills.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newFmt = btn.dataset.format;
      if (settings.format === newFmt) return;
      settings.format = newFmt;
      persistSettings();
      syncUiWithSettings();
      reconvertAllItems();
    });
  });
}

scaleButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const scale = Number(btn.dataset.scale);
    const set = new Set(settings.scales);
    if (set.has(scale)) {
      if (set.size > 1) {
        set.delete(scale);
      }
    } else {
      set.add(scale);
    }
    settings.scales = Array.from(set).sort((a, b) => a - b);
    persistSettings();
    syncUiWithSettings();
    reconvertAllItems();
  });
});

if (qualitySlider) {
  qualitySlider.addEventListener('input', () => {
    settings.quality = Number(qualitySlider.value);
    if (qualityDisplay) qualityDisplay.textContent = `${settings.quality}%`;
    persistSettings();
    clearTimeout(qualityDebounceTimer);
    qualityDebounceTimer = setTimeout(() => {
      reconvertAllItems();
    }, 200);
  });
}

if (losslessToggle) {
  losslessToggle.addEventListener('change', () => {
    settings.lossless = losslessToggle.checked;
    persistSettings();
    updateQualitySliderState();
    updateToggleCards();
    reconvertAllItems();
  });
}

if (cleanToggle) {
  cleanToggle.addEventListener('change', () => {
    settings.clean = cleanToggle.checked;
    persistSettings();
    updateToggleCards();
    reconvertAllItems();
  });
}

if (bgPicker && bgHexLabel) {
  bgPicker.addEventListener('input', () => {
    bgHexLabel.textContent = bgPicker.value.toUpperCase();
    settings.background = bgPicker.value;
    persistSettings();
    if (settings.format === 'jpeg') {
      clearTimeout(qualityDebounceTimer);
      qualityDebounceTimer = setTimeout(() => {
        reconvertAllItems();
      }, 200);
    }
  });
}

function formatKb(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1000) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot).toLowerCase();
}

function generateSrcsetHtml(baseName, scales, toFormat) {
  const ext = toFormat === 'jpeg' ? 'jpg' : toFormat;
  const primary = `${baseName}.${ext}`;
  const sorted = Array.from(scales).sort((a, b) => a - b);
  const srcsetString = sorted
    .map((s) => `${baseName}${s === 1 ? '' : `@${s}x`}.${ext} ${s}x`)
    .join(', ');
  return `<img src="${primary}" srcset="${srcsetString}" alt="">`;
}

// ==========================================================================
// 6. Dual-Layer Conversion Engine (Web Worker + In-Browser Canvas + API Fallback)
// ==========================================================================

function getConversionWorker() {
  if (typeof Worker === 'undefined') return null;
  try {
    return new Worker('/worker.js');
  } catch {
    return null;
  }
}

async function convertViaWorker(file, options) {
  return new Promise((resolve, reject) => {
    const worker = getConversionWorker();
    if (!worker) {
      return reject(new Error('Web Worker not supported'));
    }

    const id = `work_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Worker conversion timed out'));
    }, 30000);

    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      if (e.data.id === id) {
        if (e.data.success) {
          resolve(e.data);
        } else if (e.data.fallbackToMain) {
          reject(new Error('FALLBACK_TO_MAIN'));
        } else {
          reject(new Error(e.data.error || 'Worker conversion failed'));
        }
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      reject(err);
    };

    worker.postMessage({ id, file, options });
  });
}

/**
 * Size-Enforcing Canvas Encoder
 * Supports Auto, Limit (strict step-down), Target (binary search), and Unlimited (Lossless)
 */
async function encodeCanvasWithOptions(canvas, mimeType, toFormat, requestedQuality, isLossless, outputSizeMode, outputSizeLimitKb, compressionTarget) {
  if (isLossless || toFormat === 'png') {
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b && (b.type === mimeType || b.size > 0)) resolve(b);
        else reject(new Error(`Failed to encode canvas to ${mimeType}`));
      }, mimeType, 1.0);
    });
    return { blob, qualityReduced: false, originalQuality: 100, finalQuality: 100 };
  }

  const initialQ = (requestedQuality || 85) / 100;
  const initialBlob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b && (b.type === mimeType || b.size > 0)) resolve(b);
      else reject(new Error(`Failed to encode canvas to ${mimeType}`));
    }, mimeType, initialQ);
  });

  if (outputSizeMode !== 'custom' || !outputSizeLimitKb || outputSizeLimitKb <= 0) {
    return { blob: initialBlob, qualityReduced: false, originalQuality: requestedQuality, finalQuality: requestedQuality };
  }

  const targetBytes = outputSizeLimitKb * 1024;
  if (initialBlob.size <= targetBytes) {
    return { blob: initialBlob, qualityReduced: false, originalQuality: requestedQuality, finalQuality: requestedQuality, limitKb: outputSizeLimitKb };
  }

  // File exceeds targetBytes: apply compression loop
  if (compressionTarget === 'target') {
    let low = 10;
    let high = Math.min(95, requestedQuality);
    let bestBlob = initialBlob;
    let bestQ = requestedQuality;
    let minOverBlob = initialBlob;
    let minOverQ = requestedQuality;

    for (let iter = 0; iter < 5; iter++) {
      const mid = Math.round((low + high) / 2);
      const testBlob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, mid / 100);
      });
      if (!testBlob) continue;
      if (testBlob.size <= targetBytes) {
        bestBlob = testBlob;
        bestQ = mid;
        low = mid + 1;
      } else {
        minOverBlob = testBlob;
        minOverQ = mid;
        high = mid - 1;
      }
    }

    const finalBlob = bestBlob.size <= targetBytes ? bestBlob : minOverBlob;
    const finalQ = bestBlob.size <= targetBytes ? bestQ : minOverQ;
    return {
      blob: finalBlob,
      qualityReduced: finalQ < requestedQuality,
      originalQuality: requestedQuality,
      finalQuality: finalQ,
      limitKb: outputSizeLimitKb
    };
  } else {
    // Limit mode (strict step down)
    const stepDownQualities = [75, 65, 55, 45, 35, 25, 15, 10].filter((q) => q < requestedQuality);
    let currentBlob = initialBlob;
    let currentQ = requestedQuality;

    for (const q of stepDownQualities) {
      const testBlob = await new Promise((resolve) => {
        canvas.toBlob((b) => resolve(b), mimeType, q / 100);
      });
      if (!testBlob) continue;
      currentBlob = testBlob;
      currentQ = q;
      if (testBlob.size <= targetBytes) {
        break;
      }
    }

    return {
      blob: currentBlob,
      qualityReduced: currentQ < requestedQuality,
      originalQuality: requestedQuality,
      finalQuality: currentQ,
      limitKb: outputSizeLimitKb
    };
  }
}

async function convertImageFile(file, toFormat, quality, scales, isClean, isLossless, bgColor, cropOptions = null) {
  // Try Web Worker first for single-scale default pipelines without crop
  if ((!scales || (scales.length === 1 && scales[0] === 1)) && !cropOptions) {
    try {
      const res = await convertViaWorker(file, {
        format: toFormat,
        quality,
        clean: isClean,
        lossless: isLossless,
        bgColor,
        outputSizeMode: settings.outputSizeMode,
        outputSizeLimitKb: settings.outputSizeLimitKb,
        compressionTarget: settings.compressionTarget,
      });

      const baseName = file.name.replace(/\.[^.]+$/, '');
      const outExt = toFormat === 'jpeg' ? 'jpg' : toFormat;
      const outName = `${baseName}.${outExt}`;
      const url = URL.createObjectURL(res.blob);

      return [{
        name: outName,
        scale: 1,
        width: res.width || 512,
        height: res.height || 512,
        size: res.size || res.blob.size,
        originalSize: file.size,
        blob: res.blob,
        url,
        alphaPreserved: toFormat !== 'jpeg',
        format: toFormat,
        baseName,
        relativePath: file.relativePath ? file.relativePath.replace(/\.[^.]+$/, `.${outExt}`) : outName,
        qualityReduced: res.qualityReduced || false,
        originalQuality: res.originalQuality || quality,
        finalQuality: res.finalQuality || quality,
        limitKb: res.limitKb || settings.outputSizeLimitKb,
      }];
    } catch {
      // Fallback to in-browser canvas
    }
  }

  try {
    return await convertInBrowser(file, toFormat, quality, scales, isClean, isLossless, bgColor, cropOptions);
  } catch (err) {
    // If browser canvas cannot decode/encode, fallback seamlessly to server
    try {
      return await convertViaApi(file, toFormat, quality, scales, isClean, isLossless, bgColor);
    } catch (apiErr) {
      throw new Error(err.message || apiErr.message || 'Conversion failed');
    }
  }
}

/**
 * Client-Side in-browser canvas converter
 */
async function convertInBrowser(file, toFormat, quality, scales = [1], isClean = true, isLossless = false, bgColor = '#ffffff', cropOptions = null) {
  const ext = getFileExtension(file.name);
  const mimeType = toFormat === 'jpeg' ? 'image/jpeg' : `image/${toFormat}`;

  let img;
  const isSvg = ext === '.svg';
  let baseWidth = 512;
  let baseHeight = 512;

  if (isSvg) {
    let svgText = await file.text();

    if (isClean) {
      svgText = svgText
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
        .replace(/<title[\s\S]*?<\/title>/gi, '')
        .replace(/<desc[\s\S]*?<\/desc>/gi, '');
    }

    if (/<script[\s>]/i.test(svgText) || /on\w+\s*=/i.test(svgText) || /<foreignObject[\s>]/i.test(svgText)) {
      throw new Error('SVG contains active content (scripts or event handlers) and was rejected.');
    }

    // Normalizing SVG intrinsic sizing so vectors render with high fidelity
    const widthMatch = svgText.match(/\bwidth=["']?(\d+(?:\.\d+)?)(px)?["']?/i);
    const heightMatch = svgText.match(/\bheight=["']?(\d+(?:\.\d+)?)(px)?["']?/i);
    const viewBoxMatch = svgText.match(/\bviewBox=["']?([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)[\s,]+([\d.-]+)["']?/i);

    let parsedW = widthMatch ? parseFloat(widthMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[3]) : 512);
    let parsedH = heightMatch ? parseFloat(heightMatch[1]) : (viewBoxMatch ? parseFloat(viewBoxMatch[4]) : 512);
    if (!parsedW || isNaN(parsedW) || parsedW <= 0) parsedW = 512;
    if (!parsedH || isNaN(parsedH) || parsedH <= 0) parsedH = 512;

    if (!svgText.includes('width=') || !svgText.includes('height=')) {
      svgText = svgText.replace(/<svg\b/i, `<svg width="${parsedW}" height="${parsedH}" `);
    }

    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    img = await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(blobUrl);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to render SVG vector geometry.'));
      };
      image.src = blobUrl;
    });
    baseWidth = img.naturalWidth || parsedW;
    baseHeight = img.naturalHeight || parsedH;
  } else {
    // Raster formats (PNG, WebP, JPEG, AVIF, GIF)
    img = await createImageBitmap(file).catch(async () => {
      const blobUrl = URL.createObjectURL(file);
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error('Unsupported raster format in browser canvas.'));
        };
        image.src = blobUrl;
      });
    });
    baseWidth = img.width || img.naturalWidth || 512;
    baseHeight = img.height || img.naturalHeight || 512;
  }

  // Handle Crop Rectangles (auto or manual)
  const crop = cropOptions || file.cropOptions;
  let srcX = 0;
  let srcY = 0;
  let srcW = baseWidth;
  let srcH = baseHeight;

  if (crop && crop.width > 0 && crop.height > 0) {
    srcX = Math.max(0, Math.min(crop.x, baseWidth - 1));
    srcY = Math.max(0, Math.min(crop.y, baseHeight - 1));
    srcW = Math.max(1, Math.min(crop.width, baseWidth - srcX));
    srcH = Math.max(1, Math.min(crop.height, baseHeight - srcY));
  }

  const outputs = [];
  const sortedScales = Array.from(scales).sort((a, b) => a - b);
  const baseName = file.name.replace(/\.[^.]+$/, '');

  for (const scale of sortedScales) {
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.clearRect(0, 0, width, height);

    if (toFormat === 'jpeg') {
      ctx.fillStyle = bgColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, width, height);

    let alphaPreserved = false;
    if (toFormat !== 'jpeg') {
      const sampleW = Math.min(width, 32);
      const sampleH = Math.min(height, 32);
      const sample = ctx.getImageData(0, 0, sampleW, sampleH);
      for (let i = 3; i < sample.data.length; i += 4) {
        if (sample.data[i] < 255) {
          alphaPreserved = true;
          break;
        }
      }
    }

    const scaleSuffix = scale === 1 ? '' : `@${scale}x`;
    const outExt = toFormat === 'jpeg' ? 'jpg' : toFormat;
    const outName = `${baseName}${scaleSuffix}.${outExt}`;

    const encodeRes = await encodeCanvasWithOptions(
      canvas,
      mimeType,
      toFormat,
      quality,
      isLossless,
      settings.outputSizeMode,
      settings.outputSizeLimitKb,
      settings.compressionTarget
    );

    const url = URL.createObjectURL(encodeRes.blob);

    outputs.push({
      name: outName,
      scale,
      width,
      height,
      size: encodeRes.blob.size,
      originalSize: file.size,
      blob: encodeRes.blob,
      url,
      alphaPreserved,
      format: toFormat,
      baseName,
      relativePath: file.relativePath ? file.relativePath.replace(/\.[^.]+$/, `${scaleSuffix}.${outExt}`) : outName,
      qualityReduced: encodeRes.qualityReduced || false,
      originalQuality: encodeRes.originalQuality || quality,
      finalQuality: encodeRes.finalQuality || quality,
      limitKb: encodeRes.limitKb || settings.outputSizeLimitKb,
    });
  }

  return outputs;
}

/**
 * Server API fallback converter (Sharp/libvips)
 */
async function convertViaApi(file, toFormat, quality, scales = [1], isClean = true, isLossless = false, bgColor = '#ffffff') {
  const formData = new FormData();
  formData.append('files', file);
  formData.append('to', toFormat);
  formData.append('quality', String(quality));
  formData.append('lossless', String(isLossless));
  formData.append('clean', String(isClean));
  if (bgColor) formData.append('background', bgColor);

  const res = await fetch('/api/convert', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Conversion failed with status ${res.status}`);
  }

  const json = await res.json();
  const result = json.results?.[0];
  if (!result || result.error) {
    throw new Error(result?.error || 'Conversion failed');
  }

  const byteChars = atob(result.data);
  const byteNumbers = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const mimeType = toFormat === 'jpeg' ? 'image/jpeg' : `image/${toFormat}`;
  const blob = new Blob([byteNumbers], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outExt = toFormat === 'jpeg' ? 'jpg' : toFormat;

  const outputs = [];
  const sortedScales = Array.from(scales).sort((a, b) => a - b);
  for (const s of sortedScales) {
    const scaleSuffix = s === 1 ? '' : `@${s}x`;
    const outName = `${baseName}${scaleSuffix}.${outExt}`;
    outputs.push({
      name: outName,
      scale: s,
      width: Math.round((result.width || 512) * s),
      height: Math.round((result.height || 512) * s),
      size: blob.size,
      originalSize: file.size,
      blob,
      url,
      alphaPreserved: Boolean(result.alphaPreserved),
      format: toFormat,
      baseName,
      relativePath: file.relativePath ? file.relativePath.replace(/\.[^.]+$/, `${scaleSuffix}.${outExt}`) : outName,
    });
  }
  return outputs;
}

// ==========================================================================
// 5. Reactive In-Place Re-conversion (No Re-upload Needed)
// ==========================================================================
async function reconvertAllItems() {
  if (!convertedItems.size) return;

  const target = settings.format;
  const quality = settings.quality;
  const scales = settings.scales;
  const clean = settings.clean;
  const lossless = settings.lossless;
  const bgColor = bgPicker ? bgPicker.value : '#ffffff';

  for (const [id, item] of convertedItems) {
    if (!item.file) continue;
    try {
      const oldOutputs = item.outputs || [];
      const outputs = await convertImageFile(
        item.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        item.cropOptions || item.file?.cropOptions
      );

      // Revoke old URLs only after new conversion succeeded safely
      for (const old of oldOutputs) {
        if (old.url) URL.revokeObjectURL(old.url);
      }

      item.outputs = outputs;
      item.status = 'done';
      item.error = null;
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Conversion failed';
    }
  }

  renderResultsView();

  if (currentPreviewItem && convertedItems.has(currentPreviewItem.id)) {
    const updated = convertedItems.get(currentPreviewItem.id);
    currentPreviewItem = updated;
    updatePreviewModalDetails(updated);
  }
}

// ==========================================================================
// 6. Download All ZIP Bundle
// ==========================================================================
async function downloadBatchZip() {
  if (!window.fflate?.zip) {
    throw new Error('ZIP generator not available');
  }

  const allOutputs = [];
  for (const item of convertedItems.values()) {
    if (item.outputs?.length) {
      allOutputs.push(...item.outputs);
    }
  }

  if (!allOutputs.length) return;

  const zipEntries = {};
  let totalBytes = 0;

  for (const item of allOutputs) {
    if (item.blob) {
      const buffer = new Uint8Array(await item.blob.arrayBuffer());
      zipEntries[item.relativePath || item.name] = buffer;
      totalBytes += buffer.length;
    }
  }

  const manifest = {
    generatedBy: 'Zapwebp 2.2.0',
    generatedAt: new Date().toISOString(),
    engine: 'client-side-browser-wasm',
    settings: {
      targetFormat: settings.format,
      quality: settings.quality,
      lossless: settings.lossless,
      cleanMode: settings.clean,
      scales: settings.scales,
    },
    totals: {
      items: convertedItems.size,
      outputFiles: allOutputs.length,
      outputBytes: totalBytes,
    },
    assets: allOutputs.map((item) => ({
      name: item.name,
      scale: item.scale,
      width: item.width,
      height: item.height,
      bytes: item.size,
      alphaPreserved: item.alphaPreserved,
    })),
  };

  zipEntries['manifest.json'] = new TextEncoder().encode(JSON.stringify(manifest, null, 2));

  const zipData = await new Promise((resolve, reject) => {
    window.fflate.zip(zipEntries, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const zipBlob = new Blob([zipData], { type: 'application/zip' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zapwebp-batch-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================================================
// 7. Results View Rendering with Auto-Detection (Single vs Batch)
// ==========================================================================
const batchHeaderBar = document.querySelector('#batch-header-bar');
const btnBatchAdd = document.querySelector('#btn-batch-add');
const btnDownloadAll = document.querySelector('#btn-download-all');
const btnDeleteAll = document.querySelector('#btn-delete-all');

if (batchHeaderBar) {
  batchHeaderBar.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

if (btnBatchAdd) {
  btnBatchAdd.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    fileInput.click();
  });
}

if (btnDownloadAll) {
  btnDownloadAll.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    downloadBatchZip();
  });
}

if (btnDeleteAll) {
  btnDeleteAll.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    openConfirmDeleteModal();
  });
}

function downloadSingleOutput(out) {
  if (!out?.url) return;
  const a = document.createElement('a');
  a.href = out.url;
  a.download = out.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function renderResultsView() {
  if (!resultsContainer) return;

  const itemsList = Array.from(convertedItems.values());
  const doneItems = itemsList.filter((item) => item.status === 'done');

  // Case 1: Empty state -> Reset workspace to idle dropzone
  if (itemsList.length === 0) {
    resultsContainer.hidden = true;
    resultsContainer.replaceChildren();
    resultsContainer.classList.remove('is-single-file');
    if (batchHeaderBar) batchHeaderBar.hidden = true;
    if (convertingState) convertingState.hidden = true;
    if (idleGlyph) idleGlyph.hidden = false;
    return;
  }

  if (idleGlyph) idleGlyph.hidden = true;
  resultsContainer.hidden = false;
  resultsContainer.replaceChildren();

  // Case 2: Exactly 1 file (Single-file layout)
  if (itemsList.length === 1 && doneItems.length === 1) {
    if (batchHeaderBar) batchHeaderBar.hidden = true;
    resultsContainer.classList.add('is-single-file');
    resultsContainer.classList.remove('view-grid', 'view-list');
    const item = doneItems[0];
    const out = item.outputs?.[0];
    if (!out) return;

    const savingsPct = item.originalSize > 0 
      ? Math.round(((item.originalSize - out.size) / item.originalSize) * 100)
      : 0;

    const singleCard = document.createElement('div');
    singleCard.className = 'single-result-card';
    singleCard.innerHTML = `
      <div class="single-card-top">
        <div class="single-status-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${t('single.converted', 'Converted')}</span>
        </div>
        <div class="single-fmt-pill">${(item.originalFormat || 'SRC').toUpperCase()} → ${out.format.toUpperCase()}</div>
      </div>
      <div class="single-card-main">
        <div class="single-thumb-wrap" title="Click to inspect & compare image" role="button" tabindex="0">
          <img src="${out.url}" alt="${item.name}" />
          <div class="single-thumb-overlay" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </div>
        </div>
        <div class="single-details-col">
          <div class="single-filename" title="${item.name}">${item.name}</div>
          <div class="single-stats-row">
            <span class="single-size-from">${formatKb(item.originalSize)}</span>
            <svg class="single-arrow-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            <span class="single-size-to">${formatKb(out.size)}</span>
            <span class="single-savings-badge ${savingsPct >= 0 ? 'is-saved' : 'is-grown'}">
              ${savingsPct > 0 ? '−' : '+'}${Math.abs(savingsPct)}%
            </span>
          </div>
          ${out.qualityReduced ? `
            <div class="quality-downgrade-badge" title="Quality was automatically reduced to fit file size target">
              📉 Quality reduced from ${out.originalQuality} to ${out.finalQuality} to fit ${out.limitKb} KB.
            </div>
          ` : ''}
        </div>
      </div>
      <div class="single-card-actions">
        <button type="button" class="btn-single-preview" data-id="${item.id}" title="Inspect & Compare in Split View" aria-label="Inspect & Compare">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          <span>${t('single.preview', 'Inspect')}</span>
        </button>
        <button type="button" class="btn-single-crop" data-id="${item.id}" title="${t('card.crop', 'Crop & Rotate')}" aria-label="Crop image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
          <span>${t('card.crop', 'Crop')}</span>
        </button>
        ${typeof navigator !== 'undefined' && navigator.share ? `
          <button type="button" class="btn-single-share" data-id="${item.id}" title="Share converted image" aria-label="Share">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            <span>${t('single.share', 'Share')}</span>
          </button>
        ` : ''}
        <button type="button" class="btn-single-download" data-id="${item.id}" title="Download ${out.name}" aria-label="Download ${out.name}">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span>${t('single.download', 'Download')} ${out.format.toUpperCase()}</span>
        </button>
        <button type="button" class="btn-single-delete" data-id="${item.id}" title="${t('single.delete', 'Delete file')}" aria-label="${t('single.delete', 'Delete file')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      <div class="single-card-footer">
        <button type="button" class="btn-single-convert-more" title="Convert another image" aria-label="Convert another image">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          <span>${t('card.convert_another', 'Convert Another Image')}</span>
        </button>
      </div>
    `;

    singleCard.querySelector('.single-thumb-wrap')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPreviewModal(item);
    });

    singleCard.querySelector('.btn-single-preview')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPreviewModal(item);
    });

    singleCard.querySelector('.btn-single-crop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openCropModal(item);
    });

    singleCard.querySelector('.btn-single-convert-more')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });

    singleCard.querySelector('.btn-single-share')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        if (out.blob && navigator.canShare) {
          const shareFile = new File([out.blob], out.name, { type: out.blob.type || 'image/webp' });
          if (navigator.canShare({ files: [shareFile] })) {
            await navigator.share({ files: [shareFile], title: out.name });
            return;
          }
        }
        await navigator.share({ title: out.name, url: out.url });
      } catch (err) {
        if (err.name !== 'AbortError') {
          downloadSingleOutput(out);
        }
      }
    });

    singleCard.querySelector('.btn-single-download')?.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadSingleOutput(out);
    });

    singleCard.querySelector('.btn-single-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      removeItem(item.id);
    });

    resultsContainer.appendChild(singleCard);
    return;
  }

  // Case 3: More than 1 file (Batch layout)
  resultsContainer.classList.remove('is-single-file');
  resultsContainer.className = `results-container ${settings.viewMode === 'list' ? 'view-list' : 'view-grid'}`;
  if (batchHeaderBar) {
    batchHeaderBar.hidden = false;
    let totalIn = 0;
    let totalOut = 0;
    for (const it of doneItems) {
      totalIn += it.originalSize || 0;
      for (const o of (it.outputs || [])) {
        totalOut += o.size || 0;
      }
    }
    const batchSavings = totalIn > 0 ? Math.round(((totalIn - totalOut) / totalIn) * 100) : 0;
    const batchCountEl = document.querySelector('#batch-count');
    const batchBytesEl = document.querySelector('#batch-bytes');
    if (batchCountEl) {
      batchCountEl.textContent = `${doneItems.length} ${t('batch.files_converted', 'files converted')}`;
    }
    if (batchBytesEl) {
      batchBytesEl.textContent = `· ${formatKb(totalIn)} → ${formatKb(totalOut)} (${batchSavings > 0 ? '−' : '+'}${Math.abs(batchSavings)}%)`;
    }
    const fmtBadgeLabel = document.querySelector('#format-badge-label');
    if (fmtBadgeLabel) {
      fmtBadgeLabel.textContent = settings.format.toUpperCase();
    }
  }

  const isList = settings.viewMode === 'list';
  resultsContainer.className = `results-container ${isList ? 'view-list' : 'view-grid'}`;

  for (const item of itemsList) {
    if (item.status === 'converting') {
      const convCard = document.createElement('div');
      convCard.className = 'result-card';
      convCard.innerHTML = `
        <div class="converting-skeleton">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-text">${t('dropzone.converting', 'Converting...')}</div>
        </div>
      `;
      resultsContainer.appendChild(convCard);
      continue;
    }

    if (item.status === 'error') {
      const errCard = document.createElement('div');
      errCard.className = 'result-card is-error';
      errCard.innerHTML = `
        <button type="button" class="btn-single-delete" title="${t('single.delete', 'Remove')}" style="position:absolute;top:6px;right:6px;">✕</button>
        <div class="error-badge-icon">!</div>
        <span class="result-name" title="${item.name}">${item.name}</span>
        <span class="result-meta" style="color:var(--error);">${item.error || 'Failed'}</span>
      `;
      errCard.querySelector('.btn-single-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
      });
      resultsContainer.appendChild(errCard);
      continue;
    }

    const out = item.outputs?.[0];
    if (!out) continue;

    const savingsPct = item.originalSize > 0 
      ? Math.round(((item.originalSize - out.size) / item.originalSize) * 100)
      : 0;

    if (isList) {
      // List View Row
      const row = document.createElement('div');
      row.className = 'result-list-row';
      row.innerHTML = `
        <div class="list-row-left" title="Click to inspect & preview image">
          <img class="list-row-thumb" src="${out.url}" alt="${item.name}" />
          <span class="list-row-name" title="${item.name}">${item.name}</span>
        </div>
        <div class="list-row-meta">
          <span class="result-savings-pill">${savingsPct > 0 ? '−' : '+'}${Math.abs(savingsPct)}%</span>
          <span class="list-row-sizes">${formatKb(item.originalSize)} → ${formatKb(out.size)}</span>
          ${out.qualityReduced ? `
            <span class="result-downgrade-badge" title="Quality reduced from ${out.originalQuality} to ${out.finalQuality} to fit ${out.limitKb} KB">
              📉 ${out.originalQuality} → ${out.finalQuality}
            </span>
          ` : ''}
        </div>
        <div class="list-row-actions">
          <button type="button" class="btn-batch-action btn-row-preview" title="${t('card.preview', 'Inspect & Preview')}" aria-label="Preview image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>${t('card.preview', 'Preview')}</span>
          </button>
          <button type="button" class="btn-batch-action btn-row-crop" title="${t('card.crop', 'Crop & Rotate')}" aria-label="Crop image">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
            <span>${t('card.crop', 'Crop')}</span>
          </button>
          <button type="button" class="btn-batch-action btn-batch-download" title="${t('card.download', 'Download converted file')}" aria-label="Download file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            <span>${t('card.download', 'Download')}</span>
          </button>
          <button type="button" class="btn-single-delete" title="${t('single.delete', 'Delete file')}" aria-label="Delete file">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      row.querySelector('.list-row-left')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreviewModal(item);
      });
      row.querySelector('.btn-row-preview')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreviewModal(item);
      });
      row.querySelector('.btn-row-crop')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCropModal(item);
      });
      row.querySelector('.btn-batch-download')?.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSingleOutput(out);
      });
      row.querySelector('.btn-single-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
      });
      resultsContainer.appendChild(row);
    } else {
      // Grid View Card
      const card = document.createElement('div');
      card.className = 'result-card';
      card.dataset.itemId = item.id;

      card.innerHTML = `
        <div class="result-thumb-box" title="Click to inspect & preview image">
          <img class="result-thumb" src="${out.url}" alt="${item.name}" loading="lazy" />
        </div>
        <div class="result-info-box">
          <div class="result-name" title="${item.name}">${item.name}</div>
          <div class="result-meta">
            <span class="result-size-text">${formatKb(item.originalSize)} → ${formatKb(out.size)}</span>
            <span class="result-savings-pill">${savingsPct > 0 ? '−' : '+'}${Math.abs(savingsPct)}%</span>
          </div>
          ${out.qualityReduced ? `
            <div class="result-downgrade-badge" title="Quality reduced from ${out.originalQuality} to ${out.finalQuality} to fit ${out.limitKb} KB">
              📉 ${out.originalQuality} → ${out.finalQuality}
            </div>
          ` : ''}
        </div>
        <div class="result-actions">
          <button type="button" class="result-action-btn result-preview-btn" title="${t('card.preview', 'Inspect & Preview')}" aria-label="Preview image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button type="button" class="result-action-btn result-crop-btn" title="${t('card.crop', 'Crop & Rotate')}" aria-label="Crop image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>
          </button>
          <button type="button" class="result-action-btn result-download-btn" title="${t('card.download', 'Download converted file')}" aria-label="Download file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button type="button" class="result-action-btn result-delete-btn" title="${t('single.delete', 'Remove file')}" aria-label="Remove file">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      `;
      card.querySelector('.result-thumb-box')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreviewModal(item);
      });
      card.querySelector('.result-preview-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openPreviewModal(item);
      });
      card.querySelector('.result-crop-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openCropModal(item);
      });
      card.querySelector('.result-download-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadSingleOutput(out);
      });
      card.querySelector('.result-delete-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        removeItem(item.id);
      });
      resultsContainer.appendChild(card);
    }
  }

  // "+ Add More" Drop Card at the end of the results grid
  const addCard = document.createElement('div');
  addCard.className = 'add-more-card';
  addCard.setAttribute('tabindex', '0');
  addCard.setAttribute('role', 'button');
  addCard.setAttribute('aria-label', 'Add more images to this batch');
  addCard.innerHTML = `
    <div class="add-more-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </div>
    <span class="add-more-text">${t('card.add_more_title', 'Add More Images')}</span>
    <span class="add-more-subtext">${t('card.add_more_hint', 'Drop files here or click')}</span>
  `;
  addCard.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  addCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  resultsContainer.appendChild(addCard);
}

function removeItem(id) {
  if (convertedItems.has(id)) {
    const it = convertedItems.get(id);
    if (it.outputs) {
      for (const out of it.outputs) {
        if (out.url) URL.revokeObjectURL(out.url);
      }
    }
    if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
    convertedItems.delete(id);
    dbDeleteFile(id);
    renderResultsView();
  }
}

function clearAllItems() {
  for (const it of convertedItems.values()) {
    if (it.outputs) {
      for (const out of it.outputs) {
        if (out.url) URL.revokeObjectURL(out.url);
      }
    }
    if (it.originalUrl) URL.revokeObjectURL(it.originalUrl);
  }
  convertedItems.clear();
  dbClearFiles();
  renderResultsView();
}

// ==========================================================================
// 8. Interactive Preview Modal Controller
// ==========================================================================
function openPreviewModal(item) {
  if (!previewDialog || !item) return;
  currentPreviewItem = item;
  activePreviewTab = 'converted';

  [viewTabConverted, viewTabOriginal, viewTabSplit].forEach((tab) => {
    if (!tab) return;
    const isAct = tab === viewTabConverted;
    tab.classList.toggle('is-active', isAct);
    tab.setAttribute('aria-selected', String(isAct));
  });

  updatePreviewModalDetails(item);

  if (typeof previewDialog.showModal === 'function') {
    previewDialog.showModal();
  } else {
    previewDialog.setAttribute('open', '');
  }
}

function updatePreviewModalDetails(item) {
  if (!item || !previewDialog) return;
  const primaryOut = item.outputs?.[0];
  if (!primaryOut) return;

  if (previewTitle) previewTitle.textContent = primaryOut.name;
  if (previewFormatBadge) previewFormatBadge.textContent = primaryOut.format.toUpperCase();
  if (previewScaleBadge) previewScaleBadge.textContent = `@${primaryOut.scale}x`;

  if (previewAlphaBadge) {
    previewAlphaBadge.textContent = primaryOut.alphaPreserved ? 'Alpha Preserved' : 'Opaque';
    previewAlphaBadge.classList.toggle('preview-badge-alpha', primaryOut.alphaPreserved);
  }

  if (previewCleanBadge) {
    previewCleanBadge.hidden = !settings.clean;
  }

  if (previewDimVal) previewDimVal.textContent = `${primaryOut.width} × ${primaryOut.height} px`;
  if (previewSizeVal) {
    previewSizeVal.textContent = `${formatKb(item.originalSize)} → ${formatKb(primaryOut.size)}`;
  }

  if (previewSavingsWrap && previewSavingsVal) {
    if (item.originalSize && primaryOut.size < item.originalSize) {
      const pct = Math.round(((item.originalSize - primaryOut.size) / item.originalSize) * 100);
      previewSavingsVal.textContent = `-${pct}%`;
      previewSavingsWrap.hidden = false;
    } else {
      previewSavingsWrap.hidden = true;
    }
  }

  if (previewDownloadBtn) {
    previewDownloadBtn.href = primaryOut.url;
    previewDownloadBtn.download = primaryOut.name;
  }

  renderPreviewStage();
}

function renderPreviewStage() {
  if (!previewStage || !currentPreviewItem) return;
  const item = currentPreviewItem;
  const primaryOut = item.outputs?.[0];
  if (!primaryOut) return;

  previewStage.replaceChildren();

  if (activePreviewTab === 'converted') {
    const wrap = document.createElement('div');
    wrap.className = 'preview-stage-single';
    wrap.innerHTML = `<img src="${primaryOut.url}" alt="${primaryOut.name}" />`;
    previewStage.appendChild(wrap);
  } else if (activePreviewTab === 'original') {
    const wrap = document.createElement('div');
    wrap.className = 'preview-stage-single';
    wrap.innerHTML = `<img src="${item.originalUrl}" alt="${item.name}" />`;
    previewStage.appendChild(wrap);
  } else if (activePreviewTab === 'split') {
    const splitWrap = document.createElement('div');
    splitWrap.className = 'preview-stage-split';
    splitWrap.innerHTML = `
      <div class="split-pane">
        <span class="split-pane-label">Original (${formatKb(item.originalSize)})</span>
        <img src="${item.originalUrl}" alt="Original: ${item.name}" />
      </div>
      <div class="split-pane">
        <span class="split-pane-label">Converted (${formatKb(primaryOut.size)})</span>
        <img src="${primaryOut.url}" alt="Converted: ${primaryOut.name}" />
      </div>
    `;
    previewStage.appendChild(splitWrap);
  }
}

// Preview Modal Tab Triggers
[
  { btn: viewTabConverted, mode: 'converted' },
  { btn: viewTabOriginal, mode: 'original' },
  { btn: viewTabSplit, mode: 'split' },
].forEach(({ btn, mode }) => {
  if (!btn) return;
  btn.addEventListener('click', () => {
    activePreviewTab = mode;
    [viewTabConverted, viewTabOriginal, viewTabSplit].forEach((b) => {
      if (!b) return;
      const match = b === btn;
      b.classList.toggle('is-active', match);
      b.setAttribute('aria-selected', String(match));
    });
    renderPreviewStage();
  });
});

if (previewCloseBtn && previewDialog) {
  previewCloseBtn.addEventListener('click', () => previewDialog.close());
  previewDialog.addEventListener('click', (e) => {
    if (e.target === previewDialog) previewDialog.close();
  });
}

function showError(msg) {
  if (errorDetail && errorDialog) {
    errorDetail.textContent = msg;
    errorDialog.showModal();
  } else {
    alert(msg);
  }
}

if (errorClose && errorDialog) {
  errorClose.addEventListener('click', () => errorDialog.close());
  errorDialog.addEventListener('click', (e) => {
    if (e.target === errorDialog) errorDialog.close();
  });
}

// ==========================================================================
// 9. Non-Destructive File Ingestion (Appends to Queue with Progress & Worker)
// ==========================================================================
let cancelBatchRequested = false;
const btnCancelBatch = document.querySelector('#btn-cancel-batch');
if (btnCancelBatch) {
  btnCancelBatch.addEventListener('click', () => {
    cancelBatchRequested = true;
  });
}

async function handleFiles(files) {
  if (!files?.length) return;

  const validFiles = [];
  const maxBytes = (settings.inputSizeLimitMb || 50) * 1024 * 1024;
  for (const f of files) {
    if (f.size > maxBytes) {
      showError(`"${f.name}" exceeds the ${settings.inputSizeLimitMb || 50} MB input limit.`);
      continue;
    }
    if (SUPPORTED_EXTENSIONS.has(getFileExtension(f.name))) {
      validFiles.push(f);
    }
  }

  if (!validFiles.length) {
    showError('None of the selected files match supported image formats (SVG, PNG, WebP, AVIF, JPEG, GIF, TIFF).');
    return;
  }

  // Check lossless conflict before starting conversion
  checkLosslessConflict();

  // If first time, hide idle glyph
  if (convertedItems.size === 0) {
    if (idleGlyph) idleGlyph.hidden = true;
  }

  const target = settings.format;
  const quality = settings.quality;
  const scales = settings.scales;
  const clean = settings.clean;
  const lossless = settings.lossless;
  const bgColor = bgPicker ? bgPicker.value : '#ffffff';

  // 1. Add converting placeholders to Map
  const newItems = [];
  for (const f of validFiles) {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const originalUrl = URL.createObjectURL(f);

    const item = {
      id,
      file: f,
      name: f.name,
      originalSize: f.size,
      originalUrl,
      status: 'converting',
      error: null,
      outputs: [],
    };

    convertedItems.set(id, item);
    newItems.push(item);
  }

  // Render view immediately with skeletons
  renderResultsView();

  // Progress Bar initialization
  cancelBatchRequested = false;
  const progressFill = document.querySelector('#progress-fill');
  const progressPercent = document.querySelector('#progress-percent');
  const progressFilename = document.querySelector('#progress-filename');

  if (convertingState) convertingState.hidden = false;
  if (progressFill) progressFill.style.width = '0%';
  if (progressPercent) progressPercent.textContent = '0%';

  // 2. Convert each newly added file
  const total = newItems.length;
  for (let idx = 0; idx < total; idx++) {
    if (cancelBatchRequested) {
      // Mark remaining unstarted items as canceled
      for (let j = idx; j < total; j++) {
        const remaining = newItems[j];
        if (remaining.status === 'converting') {
          convertedItems.delete(remaining.id);
        }
      }
      break;
    }

    const item = newItems[idx];
    const pct = Math.round(((idx + 1) / total) * 100);

    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressPercent) progressPercent.textContent = `${pct}%`;
    if (progressFilename) progressFilename.textContent = `Converting ${idx + 1} of ${total}: ${item.name}`;

    try {
      const outputs = await convertImageFile(
        item.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        item.cropOptions || item.file?.cropOptions
      );
      item.outputs = outputs;
      item.status = 'done';

      // Save to IndexedDB
      if (outputs.length > 0) {
        dbSaveFile({
          id: item.id,
          name: item.name,
          format: target,
          sizeIn: item.originalSize,
          sizeOut: outputs[0].size,
          originalBlob: item.file,
          convertedBlob: outputs[0].blob,
          alphaPreserved: outputs[0].alphaPreserved,
          createdAt: Date.now()
        });
      }
    } catch (err) {
      item.status = 'error';
      item.error = err.message || 'Conversion failed';
    }

    // Update view as each file completes
    renderResultsView();
  }

  if (convertingState) convertingState.hidden = true;
}

// Restore saved queue from IndexedDB on startup
async function restoreSavedFiles() {
  try {
    const records = await dbGetAllFiles();
    if (records && records.length) {
      for (const rec of records) {
        if (rec.originalBlob && rec.convertedBlob) {
          const originalUrl = URL.createObjectURL(rec.originalBlob);
          const convertedUrl = URL.createObjectURL(rec.convertedBlob);
          const ext = rec.format === 'jpeg' ? 'jpg' : rec.format;
          const baseName = rec.name.replace(/\.[^.]+$/, '');
          const outName = `${baseName}.${ext}`;
          const item = {
            id: rec.id,
            file: new File([rec.originalBlob], rec.name, { type: rec.originalBlob.type }),
            name: rec.name,
            originalSize: rec.sizeIn,
            originalUrl,
            status: 'done',
            error: null,
            outputs: [{
              name: outName,
              scale: 1,
              size: rec.sizeOut,
              originalSize: rec.sizeIn,
              blob: rec.convertedBlob,
              url: convertedUrl,
              alphaPreserved: Boolean(rec.alphaPreserved),
              format: rec.format,
              baseName,
              relativePath: outName
            }]
          };
          convertedItems.set(rec.id, item);
        }
      }
      renderResultsView();
    }
  } catch {}
}
restoreSavedFiles();

// ==========================================================================
// 10. Drag & Drop and File Picker Handlers
// ==========================================================================
if (dropzone) {
  dropzone.addEventListener('click', (e) => {
    if (isConverting) return;
    // Guard against clicks on any interactive button, link, badge, toggle, card, or controls
    if (e.target.closest('button, a, input, select, label, .batch-header-bar, #batch-header-bar, #results, .results-container, .single-result-card, .result-card, .result-list-row, .add-more-card, .interactive-controls')) {
      return;
    }
    // If results are visible or idle glyph is hidden, clicking empty space in dropzone should NOT open file picker
    if (!idleGlyph || idleGlyph.hidden || (resultsContainer && !resultsContainer.hidden)) {
      return;
    }
    fileInput.click();
  });

  dropzone.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isConverting) {
      e.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'dragend'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragging');
    });
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragging');
    const files = await collectFilesFromDataTransfer(e.dataTransfer);
    if (files?.length) handleFiles(files);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
      handleFiles(Array.from(fileInput.files));
    }
    fileInput.value = '';
  });
}

// Window Drag & Drop (Drop anywhere to add without wiping)
window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', async (e) => {
  if (e.target.closest('#dropzone')) return;
  e.preventDefault();
  const files = await collectFilesFromDataTransfer(e.dataTransfer);
  if (files?.length) handleFiles(files);
});

async function collectFilesFromDataTransfer(dataTransfer) {
  if (!dataTransfer) return [];
  const files = [];
  const items = Array.from(dataTransfer.items || []);

  async function walkEntry(entry, pathPrefix = '') {
    if (entry.isFile) {
      const file = await new Promise((resolve) => entry.file(resolve));
      if (SUPPORTED_EXTENSIONS.has(getFileExtension(file.name))) {
        file.relativePath = pathPrefix + file.name;
        files.push(file);
      }
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise((resolve) => {
        reader.readEntries(resolve, () => resolve([]));
      });
      for (const child of entries) {
        await walkEntry(child, `${pathPrefix}${entry.name}/`);
      }
    }
  }

  for (const item of items) {
    const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
    if (entry) {
      await walkEntry(entry);
    } else if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file && SUPPORTED_EXTENSIONS.has(getFileExtension(file.name))) {
        files.push(file);
      }
    }
  }

  if (files.length) return files;

  if (dataTransfer.files?.length) {
    return Array.from(dataTransfer.files).filter((f) => SUPPORTED_EXTENSIONS.has(getFileExtension(f.name)));
  }

  return [];
}

// ==========================================================================
// 11. Interactive Cropper Modal Controller (Crop Then Convert)
// ==========================================================================
const cropDialog = document.querySelector('#crop-dialog');
const cropCloseBtn = document.querySelector('#crop-close-btn');
const cropSourceImg = document.querySelector('#crop-source-img');
const cropSelectionBox = document.querySelector('#crop-selection-box');
const cropCoordsText = document.querySelector('#crop-coords-text');
const cropResetBtn = document.querySelector('#crop-reset-btn');
const cropApplyBtn = document.querySelector('#crop-apply-btn');
const previewCropBtn = document.querySelector('#preview-crop-btn');
const aspectBtns = Array.from(document.querySelectorAll('.aspect-btn'));

let activeCropItem = null;
let activeAspect = 'free'; // 'free' | '1:1' | '16:9' | '4:5' | '3:2' | '9:16'
let cropBox = { x: 0, y: 0, width: 100, height: 100 };
let imgNaturalW = 100;
let imgNaturalH = 100;
let imgDispW = 100;
let imgDispH = 100;

function getNumericAspect(aspect) {
  if (aspect === '1:1') return 1;
  if (aspect === '16:9') return 16 / 9;
  if (aspect === '4:5') return 4 / 5;
  if (aspect === '3:2') return 3 / 2;
  if (aspect === '9:16') return 9 / 16;
  return null;
}

function updateCropBoxDOM() {
  if (!cropSelectionBox) return;
  cropSelectionBox.style.left = `${cropBox.x}px`;
  cropSelectionBox.style.top = `${cropBox.y}px`;
  cropSelectionBox.style.width = `${cropBox.width}px`;
  cropSelectionBox.style.height = `${cropBox.height}px`;

  const scaleX = imgNaturalW / (imgDispW || 1);
  const scaleY = imgNaturalH / (imgDispH || 1);
  const natX = Math.round(cropBox.x * scaleX);
  const natY = Math.round(cropBox.y * scaleY);
  const natW = Math.round(cropBox.width * scaleX);
  const natH = Math.round(cropBox.height * scaleY);

  if (cropCoordsText) {
    cropCoordsText.textContent = `Crop: ${natW} × ${natH} at (${natX}, ${natY}) px`;
  }
}

function applyAspectToBox(aspect) {
  activeAspect = aspect;
  aspectBtns.forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.aspect === aspect);
  });

  const numAspect = getNumericAspect(aspect);
  if (!numAspect) return;

  let targetW, targetH;
  const currentRatio = imgDispW / imgDispH;
  if (currentRatio > numAspect) {
    targetH = Math.round(imgDispH * 0.85);
    targetW = Math.round(targetH * numAspect);
  } else {
    targetW = Math.round(imgDispW * 0.85);
    targetH = Math.round(targetW / numAspect);
  }

  targetW = Math.max(20, Math.min(targetW, imgDispW));
  targetH = Math.max(20, Math.min(targetH, imgDispH));

  cropBox = {
    x: Math.round((imgDispW - targetW) / 2),
    y: Math.round((imgDispH - targetH) / 2),
    width: targetW,
    height: targetH,
  };
  updateCropBoxDOM();
}

function openCropModal(item) {
  if (!cropDialog || !item || !cropSourceImg) return;
  activeCropItem = item;

  cropSourceImg.onload = () => {
    imgNaturalW = cropSourceImg.naturalWidth || 512;
    imgNaturalH = cropSourceImg.naturalHeight || 512;
    imgDispW = cropSourceImg.clientWidth || 300;
    imgDispH = cropSourceImg.clientHeight || 300;

    if (item.cropOptions) {
      const scaleX = imgDispW / imgNaturalW;
      const scaleY = imgDispH / imgNaturalH;
      cropBox = {
        x: Math.round(item.cropOptions.x * scaleX),
        y: Math.round(item.cropOptions.y * scaleY),
        width: Math.round(item.cropOptions.width * scaleX),
        height: Math.round(item.cropOptions.height * scaleY),
      };
      if (item.cropOptions.aspect) {
        activeAspect = item.cropOptions.aspect;
      }
    } else {
      cropBox = {
        x: Math.round(imgDispW * 0.1),
        y: Math.round(imgDispH * 0.1),
        width: Math.round(imgDispW * 0.8),
        height: Math.round(imgDispH * 0.8),
      };
      activeAspect = 'free';
    }

    aspectBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.aspect === activeAspect);
    });

    updateCropBoxDOM();
  };

  cropSourceImg.src = item.originalUrl || item.outputs?.[0]?.url;

  if (typeof cropDialog.showModal === 'function') {
    cropDialog.showModal();
  } else {
    cropDialog.setAttribute('open', '');
  }
}

function closeCropModal() {
  if (!cropDialog) return;
  if (typeof cropDialog.close === 'function') {
    cropDialog.close();
  } else {
    cropDialog.removeAttribute('open');
  }
  activeCropItem = null;
}

// Drag & Resize Handlers
let isDraggingBox = false;
let isResizingHandle = null;
let startDragX = 0;
let startDragY = 0;
let initialBox = null;

if (cropSelectionBox) {
  cropSelectionBox.addEventListener('pointerdown', (e) => {
    const handleEl = e.target.closest('.crop-handle');
    if (handleEl) {
      isResizingHandle = handleEl.dataset.handle;
      isDraggingBox = false;
    } else {
      isDraggingBox = true;
      isResizingHandle = null;
    }
    startDragX = e.clientX;
    startDragY = e.clientY;
    initialBox = { ...cropBox };
    cropSelectionBox.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  cropSelectionBox.addEventListener('pointermove', (e) => {
    if (!isDraggingBox && !isResizingHandle) return;
    const dx = e.clientX - startDragX;
    const dy = e.clientY - startDragY;

    if (isDraggingBox) {
      let newX = initialBox.x + dx;
      let newY = initialBox.y + dy;
      newX = Math.max(0, Math.min(newX, imgDispW - initialBox.width));
      newY = Math.max(0, Math.min(newY, imgDispH - initialBox.height));
      cropBox.x = newX;
      cropBox.y = newY;
    } else if (isResizingHandle) {
      const numAspect = getNumericAspect(activeAspect);
      let newX = initialBox.x;
      let newY = initialBox.y;
      let newW = initialBox.width;
      let newH = initialBox.height;

      if (isResizingHandle === 'se') {
        newW = Math.max(20, Math.min(initialBox.width + dx, imgDispW - initialBox.x));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height + dy, imgDispH - initialBox.y));
      } else if (isResizingHandle === 'nw') {
        newW = Math.max(20, Math.min(initialBox.width - dx, initialBox.x + initialBox.width));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height - dy, initialBox.y + initialBox.height));
        newX = initialBox.x + (initialBox.width - newW);
        newY = initialBox.y + (initialBox.height - newH);
      } else if (isResizingHandle === 'ne') {
        newW = Math.max(20, Math.min(initialBox.width + dx, imgDispW - initialBox.x));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height - dy, initialBox.y + initialBox.height));
        newY = initialBox.y + (initialBox.height - newH);
      } else if (isResizingHandle === 'sw') {
        newW = Math.max(20, Math.min(initialBox.width - dx, initialBox.x + initialBox.width));
        newH = numAspect ? Math.round(newW / numAspect) : Math.max(20, Math.min(initialBox.height + dy, imgDispH - initialBox.y));
        newX = initialBox.x + (initialBox.width - newW);
      }

      if (newX >= 0 && newY >= 0 && newX + newW <= imgDispW && newY + newH <= imgDispH) {
        cropBox = { x: newX, y: newY, width: newW, height: newH };
      }
    }
    updateCropBoxDOM();
  });

  const stopDrag = (e) => {
    if (isDraggingBox || isResizingHandle) {
      isDraggingBox = false;
      isResizingHandle = null;
      try { cropSelectionBox.releasePointerCapture(e.pointerId); } catch {}
    }
  };

  cropSelectionBox.addEventListener('pointerup', stopDrag);
  cropSelectionBox.addEventListener('pointercancel', stopDrag);

  cropSelectionBox.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    let handled = false;
    if (e.key === 'ArrowLeft') {
      cropBox.x = Math.max(0, cropBox.x - step);
      handled = true;
    } else if (e.key === 'ArrowRight') {
      cropBox.x = Math.min(imgDispW - cropBox.width, cropBox.x + step);
      handled = true;
    } else if (e.key === 'ArrowUp') {
      cropBox.y = Math.max(0, cropBox.y - step);
      handled = true;
    } else if (e.key === 'ArrowDown') {
      cropBox.y = Math.min(imgDispH - cropBox.height, cropBox.y + step);
      handled = true;
    }
    if (handled) {
      e.preventDefault();
      updateCropBoxDOM();
    }
  });
}

aspectBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    applyAspectToBox(btn.dataset.aspect);
  });
});

if (cropCloseBtn) cropCloseBtn.addEventListener('click', closeCropModal);

if (cropResetBtn) {
  cropResetBtn.addEventListener('click', () => {
    cropBox = { x: 0, y: 0, width: imgDispW, height: imgDispH };
    activeAspect = 'free';
    aspectBtns.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.aspect === 'free'));
    updateCropBoxDOM();
  });
}

if (cropApplyBtn) {
  cropApplyBtn.addEventListener('click', async () => {
    if (!activeCropItem) return;
    const scaleX = imgNaturalW / (imgDispW || 1);
    const scaleY = imgNaturalH / (imgDispH || 1);

    const naturalCrop = {
      x: Math.round(cropBox.x * scaleX),
      y: Math.round(cropBox.y * scaleY),
      width: Math.round(cropBox.width * scaleX),
      height: Math.round(cropBox.height * scaleY),
      aspect: activeAspect,
    };

    activeCropItem.cropOptions = naturalCrop;
    const itemToReconvert = activeCropItem;
    closeCropModal();

    const target = settings.format;
    const quality = settings.quality;
    const scales = settings.scales;
    const clean = settings.clean;
    const lossless = settings.lossless;
    const bgColor = bgPicker ? bgPicker.value : '#ffffff';

    try {
      const oldOutputs = itemToReconvert.outputs || [];
      const newOutputs = await convertImageFile(
        itemToReconvert.file,
        target,
        quality,
        scales,
        clean,
        lossless,
        bgColor,
        naturalCrop
      );
      for (const old of oldOutputs) {
        if (old.url) URL.revokeObjectURL(old.url);
      }
      itemToReconvert.outputs = newOutputs;
      itemToReconvert.status = 'done';
    } catch (err) {
      itemToReconvert.error = err.message || 'Crop conversion failed';
    }

    renderResultsView();
    if (currentPreviewItem && currentPreviewItem.id === itemToReconvert.id) {
      updatePreviewModalDetails(itemToReconvert);
    }
  });
}

if (previewCropBtn) {
  previewCropBtn.addEventListener('click', () => {
    if (!currentPreviewItem) return;
    const item = currentPreviewItem;
    if (previewDialog) {
      if (typeof previewDialog.close === 'function') previewDialog.close();
      else previewDialog.removeAttribute('open');
    }
    openCropModal(item);
  });
}

// Global Clipboard Paste Support (Images and SVG text)
window.addEventListener('paste', async (e) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== fileInput) {
    return;
  }

  const clipboardData = e.clipboardData;
  if (!clipboardData) return;

  const files = [];
  const items = Array.from(clipboardData.items || []);
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  }

  if (files.length) {
    e.preventDefault();
    handleFiles(files);
    return;
  }

  const text = clipboardData.getData('text/plain')?.trim();
  if (text) {
    if (/^<svg[\s>]/i.test(text) || (/^<\?xml/i.test(text) && /<svg[\s>]/i.test(text))) {
      e.preventDefault();
      const svgFile = new File([text], `pasted-${Date.now()}.svg`, { type: 'image/svg+xml' });
      handleFiles([svgFile]);
    }
  }
});

// Footer Language Selector
const langSelect = document.querySelector('#lang-select');
if (langSelect) {
  const savedLang = localStorage.getItem('zapwebp_lang') || (navigator.language?.startsWith('tl') ? 'tl' : 'en');
  langSelect.value = savedLang;
  document.documentElement.lang = savedLang;

  langSelect.addEventListener('change', () => {
    const chosen = langSelect.value;
    document.documentElement.lang = chosen;
    localStorage.setItem('zapwebp_lang', chosen);
  });
}

// ==========================================================================
// 12. Battery-Aware Optimization & Device Power Profiling
// ==========================================================================
if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
  navigator.getBattery().then((battery) => {
    function evaluateBatteryProfile() {
      const isLowPower = battery.level < 0.20 && !battery.charging;
      document.documentElement.classList.toggle('power-saver-mode', isLowPower);
      window.ZAPWEBP_POWER_SAVER = isLowPower;
    }
    evaluateBatteryProfile();
    battery.addEventListener('levelchange', evaluateBatteryProfile);
    battery.addEventListener('chargingchange', evaluateBatteryProfile);
  }).catch(() => {});
}

// ==========================================================================
// 13. PWA Service Worker Registration (Offline Application Shell)
// ==========================================================================
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installingWorker = reg.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
              }
            });
          }
        });
      })
      .catch(() => {});
  });
}
