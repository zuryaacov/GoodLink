/**
 * GoodLink accessibility widget — persistence and document application.
 * Applies classes / CSS variables on <html> and <body> (WCAG 2.2 AA tooling).
 */

export const GL_ACC_STORAGE_KEY = 'goodlink-a11y-v1';

/** Fired when preferences are updated programmatically (e.g. footer “show menu”). Detail: full prefs object. */
export const GL_ACC_PREFS_CHANGED_EVENT = 'goodlink-a11y-prefs-changed';

export const GL_ACC_DEFAULTS = {
  /** 100–200, percentage of root font size */
  fontScale: 100,
  highContrast: false,
  grayscale: false,
  /** 'default' | 'sans' | 'dyslexia' */
  fontMode: 'default',
  highlightLinks: false,
  reduceMotion: false,
  bigCursor: false,
  readingGuide: false,
  /** When true, the floating trigger is not shown (persisted). */
  widgetHidden: false,
};

/**
 * @returns {typeof GL_ACC_DEFAULTS}
 */
export function loadAccessibilityPreferences() {
  try {
    const raw = localStorage.getItem(GL_ACC_STORAGE_KEY);
    if (!raw) return { ...GL_ACC_DEFAULTS };
    const parsed = JSON.parse(raw);
    return normalizePreferences({ ...GL_ACC_DEFAULTS, ...parsed });
  } catch {
    return { ...GL_ACC_DEFAULTS };
  }
}

/**
 * @param {Partial<typeof GL_ACC_DEFAULTS>} prefs
 */
export function saveAccessibilityPreferences(prefs) {
  const next = normalizePreferences({ ...GL_ACC_DEFAULTS, ...prefs });
  try {
    localStorage.setItem(GL_ACC_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

function normalizePreferences(p) {
  let fontScale = Number(p.fontScale);
  if (!Number.isFinite(fontScale)) fontScale = 100;
  fontScale = Math.min(200, Math.max(100, Math.round(fontScale / 5) * 5));

  const fontMode = ['default', 'sans', 'dyslexia'].includes(p.fontMode)
    ? p.fontMode
    : 'default';

  return {
    fontScale,
    highContrast: Boolean(p.highContrast),
    grayscale: Boolean(p.grayscale),
    fontMode,
    highlightLinks: Boolean(p.highlightLinks),
    reduceMotion: Boolean(p.reduceMotion),
    bigCursor: Boolean(p.bigCursor),
    readingGuide: Boolean(p.readingGuide),
    widgetHidden: Boolean(p.widgetHidden),
  };
}

/**
 * Sync preference object to DOM (idempotent).
 * @param {typeof GL_ACC_DEFAULTS} prefs
 */
export function applyAccessibilityPreferencesToDocument(prefs) {
  const html = document.documentElement;
  const body = document.body;
  if (!body) return;

  const normalized = normalizePreferences({ ...GL_ACC_DEFAULTS, ...prefs });
  const { widgetHidden: _wh, ...rest } = normalized;
  void _wh;

  const scale = rest.fontScale / 100;
  html.classList.toggle('gl-acc-font-scale', rest.fontScale !== 100);
  html.style.setProperty('--gl-acc-font-scale', String(scale));

  body.classList.toggle('gl-acc-high-contrast', rest.highContrast);
  body.classList.toggle('gl-acc-grayscale', rest.grayscale);
  body.classList.toggle('gl-acc-highlight-links', rest.highlightLinks);
  body.classList.toggle('gl-acc-reduce-motion', rest.reduceMotion);
  body.classList.toggle('gl-acc-big-cursor', rest.bigCursor);
  body.classList.toggle('gl-acc-reading-guide-active', rest.readingGuide);

  body.classList.remove('gl-acc-font-readable', 'gl-acc-font-dyslexia');
  if (rest.fontMode === 'sans') body.classList.add('gl-acc-font-readable');
  if (rest.fontMode === 'dyslexia') body.classList.add('gl-acc-font-dyslexia');
}

/**
 * Clear widgetHidden and show the floating menu again. Dispatches {@link GL_ACC_PREFS_CHANGED_EVENT}.
 */
export function restoreAccessibilityWidgetVisibility() {
  const current = loadAccessibilityPreferences();
  const next = saveAccessibilityPreferences({ ...current, widgetHidden: false });
  applyAccessibilityPreferencesToDocument(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GL_ACC_PREFS_CHANGED_EVENT, { detail: next }));
  }
  return next;
}

/** Call early (e.g. main.jsx) to reduce flash before React mounts. */
export function hydrateAccessibilityFromStorage() {
  if (typeof document === 'undefined') return;
  applyAccessibilityPreferencesToDocument(loadAccessibilityPreferences());
}
