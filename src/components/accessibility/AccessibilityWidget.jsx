import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Accessibility } from 'lucide-react';
import '@fontsource/opendyslexic/latin-400.css';
import './accessibilityWidget.css';
import {
  GL_ACC_DEFAULTS,
  GL_ACC_PREFS_CHANGED_EVENT,
  GL_ACC_STORAGE_KEY,
  applyAccessibilityPreferencesToDocument,
  loadAccessibilityPreferences,
  saveAccessibilityPreferences,
} from '../../lib/accessibilityPreferences';
import { useToast } from '../common/ToastProvider.jsx';
import { useLanguage } from '../../i18n/LanguageContext';

function getFocusableElements(container) {
  if (!container) return [];
  const sel =
    'button:not([disabled]):not(.gl-acc-panel-backdrop), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(sel)).filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return el.getClientRects().length > 0;
  });
}

/**
 * Floating WCAG 2.2 AA / ADA-oriented accessibility menu (global, persisted).
 */
export default function AccessibilityWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(() => loadAccessibilityPreferences());
  const { showToast } = useToast();
  const { t } = useLanguage();

  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const guideRef = useRef(null);
  const prevFocusRef = useRef(null);
  /** Tracks widgetHidden so we can broadcast to Sidebar in the same tab (storage omits same-tab updates). */
  const prevWidgetHiddenRef = useRef(undefined);

  const titleId = useId();
  const panelId = 'gl-acc-accessibility-menu-panel';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const saved = saveAccessibilityPreferences(prefs);
    applyAccessibilityPreferencesToDocument(saved);

    if (prevWidgetHiddenRef.current === undefined) {
      prevWidgetHiddenRef.current = saved.widgetHidden;
      return;
    }
    if (prevWidgetHiddenRef.current !== saved.widgetHidden) {
      prevWidgetHiddenRef.current = saved.widgetHidden;
      window.dispatchEvent(new CustomEvent(GL_ACC_PREFS_CHANGED_EVENT, { detail: saved }));
    }
  }, [prefs]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== GL_ACC_STORAGE_KEY || e.newValue == null) return;
      try {
        const merged = { ...GL_ACC_DEFAULTS, ...JSON.parse(e.newValue) };
        const normalized = saveAccessibilityPreferences(merged);
        applyAccessibilityPreferencesToDocument(normalized);
        setPrefs(normalized);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const onPrefsChanged = (e) => {
      if (e?.detail) setPrefs(e.detail);
    };
    window.addEventListener(GL_ACC_PREFS_CHANGED_EVENT, onPrefsChanged);
    return () => window.removeEventListener(GL_ACC_PREFS_CHANGED_EVENT, onPrefsChanged);
  }, []);

  useEffect(() => {
    if (!prefs.readingGuide) return undefined;
    const move = (clientY) => {
      const el = guideRef.current;
      if (el) el.style.top = `${clientY}px`;
    };
    const onMouse = (e) => move(e.clientY);
    const onTouch = (e) => {
      if (e.touches?.[0]) move(e.touches[0].clientY);
    };
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('touchmove', onTouch);
    };
  }, [prefs.readingGuide]);

  useEffect(() => {
    if (!open) return undefined;

    prevFocusRef.current = document.activeElement;
    const panel = panelRef.current;
    const focusables = getFocusableElements(panel);
    const preferred = panel?.querySelector('#gl-acc-first-focus');
    const first =
      preferred && focusables.includes(preferred) ? preferred : focusables[0];
    const last = focusables[focusables.length - 1];
    window.setTimeout(() => first?.focus(), 0);

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === panel) {
          e.preventDefault();
          last?.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const prev = prevFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus();
        } catch {
          triggerRef.current?.focus();
        }
      } else {
        triggerRef.current?.focus();
      }
    };
  }, [open]);

  const patchPrefs = useCallback((partial) => {
    setPrefs((prev) => ({ ...prev, ...partial }));
  }, []);

  const bumpFont = (delta) => {
    setPrefs((prev) => {
      const nextScale = Math.min(200, Math.max(100, prev.fontScale + delta));
      return { ...prev, fontScale: nextScale };
    });
  };

  const resetAll = () => {
    const fresh = saveAccessibilityPreferences({ ...GL_ACC_DEFAULTS });
    setPrefs(fresh);
    applyAccessibilityPreferencesToDocument(fresh);
  };

  const toggle = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hideFloatingWidget = () => {
    setOpen(false);
    setPrefs((prev) => ({ ...prev, widgetHidden: true }));
    showToast({
      type: 'success',
      title: t('accHiddenToastTitle'),
      message: t('accHiddenToastMessage'),
      duration: 12000,
    });
  };

  if (!mounted) return null;

  const showReadingGuide = prefs.readingGuide;
  const showWidgetChrome = !prefs.widgetHidden;

  if (!showReadingGuide && !showWidgetChrome) return null;

  const content = (
    <>
      {showReadingGuide && (
        <div
          ref={guideRef}
          className="gl-acc-reading-guide-line"
          aria-hidden="true"
          style={{ top: 0 }}
        />
      )}

      {showWidgetChrome && (
      <div className="gl-acc-widget-root">
        <button
          ref={triggerRef}
          type="button"
          className="gl-acc-widget-trigger"
          aria-label={t('accMenuAria')}
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          <Accessibility size={26} strokeWidth={2.2} aria-hidden />
        </button>

        {open && (
          <>
            <button
              type="button"
              className="gl-acc-panel-backdrop"
              aria-label={t('accCloseAria')}
              tabIndex={-1}
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="gl-acc-panel"
            >
              <div className="gl-acc-panel-header">
                <div>
                  <h2 id={titleId} className="gl-acc-panel-title">
                    {t('accTitle')}
                  </h2>
                  <p className="gl-acc-panel-sub">{t('accSubtitle')}</p>
                </div>
                <button
                  type="button"
                  className="gl-acc-close"
                  aria-label={t('accCloseAria')}
                  onClick={() => setOpen(false)}
                >
                  <span aria-hidden>×</span>
                </button>
              </div>

              <div className="gl-acc-section">
                <span className="gl-acc-section-label" id={`${titleId}-text`}>
                  {t('accTextSize')}
                </span>
                <div className="gl-acc-row" role="group" aria-labelledby={`${titleId}-text`}>
                  <button
                    id="gl-acc-first-focus"
                    type="button"
                    className="gl-acc-btn"
                    onClick={() => bumpFont(-10)}
                    disabled={prefs.fontScale <= 100}
                    aria-label={t('accDecreaseText')}
                  >
                    A−
                  </button>
                  <span className="gl-acc-font-value" aria-live="polite">
                    {prefs.fontScale}%
                  </span>
                  <button
                    type="button"
                    className="gl-acc-btn"
                    onClick={() => bumpFont(10)}
                    disabled={prefs.fontScale >= 200}
                    aria-label={t('accIncreaseText')}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="gl-acc-section">
                <span className="gl-acc-section-label" id={`${titleId}-font`}>
                  {t('accReadableFont')}
                </span>
                <div
                  className="gl-acc-segment"
                  role="radiogroup"
                  aria-labelledby={`${titleId}-font`}
                  onKeyDown={(e) => {
                    const order = ['default', 'sans', 'dyslexia'];
                    const i = order.indexOf(prefs.fontMode);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      patchPrefs({ fontMode: order[Math.min(order.length - 1, i + 1)] });
                    }
                    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      e.preventDefault();
                      patchPrefs({ fontMode: order[Math.max(0, i - 1)] });
                    }
                  }}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={prefs.fontMode === 'default'}
                    tabIndex={prefs.fontMode === 'default' ? 0 : -1}
                    aria-label={t('accFontDefaultAria')}
                    className={prefs.fontMode === 'default' ? 'gl-acc-segment-active' : ''}
                    onClick={() => patchPrefs({ fontMode: 'default' })}
                  >
                    {t('accFontDefault')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={prefs.fontMode === 'sans'}
                    tabIndex={prefs.fontMode === 'sans' ? 0 : -1}
                    aria-label={t('accFontSansAria')}
                    className={prefs.fontMode === 'sans' ? 'gl-acc-segment-active' : ''}
                    onClick={() => patchPrefs({ fontMode: 'sans' })}
                  >
                    {t('accFontSans')}
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={prefs.fontMode === 'dyslexia'}
                    tabIndex={prefs.fontMode === 'dyslexia' ? 0 : -1}
                    aria-label={t('accFontDyslexicAria')}
                    className={prefs.fontMode === 'dyslexia' ? 'gl-acc-segment-active' : ''}
                    onClick={() => patchPrefs({ fontMode: 'dyslexia' })}
                  >
                    {t('accFontDyslexic')}
                  </button>
                </div>
              </div>

              <div className="gl-acc-section">
                <span className="gl-acc-section-label">{t('accDisplay')}</span>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.highContrast}
                  onClick={() => toggle('highContrast')}
                >
                  <span>{t('accHighContrast')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.grayscale}
                  onClick={() => toggle('grayscale')}
                >
                  <span>{t('accGrayscale')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.highlightLinks}
                  onClick={() => toggle('highlightLinks')}
                >
                  <span>{t('accHighlightLinks')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.reduceMotion}
                  onClick={() => toggle('reduceMotion')}
                >
                  <span>{t('accStopAnimations')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.bigCursor}
                  onClick={() => toggle('bigCursor')}
                >
                  <span>{t('accBigCursor')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
                <button
                  type="button"
                  className="gl-acc-toggle"
                  aria-pressed={prefs.readingGuide}
                  onClick={() => toggle('readingGuide')}
                >
                  <span>{t('accReadingGuide')}</span>
                  <span className="gl-acc-toggle-track" aria-hidden>
                    <span className="gl-acc-toggle-knob" />
                  </span>
                </button>
              </div>

              <div className="gl-acc-reset-row">
                <button
                  type="button"
                  className="gl-acc-btn gl-acc-btn-primary"
                  onClick={() => {
                    resetAll();
                    setOpen(false);
                  }}
                >
                  {t('accResetAll')}
                </button>
              </div>

              <div className="gl-acc-hide-widget-row">
                <button
                  type="button"
                  className="gl-acc-btn gl-acc-btn-outline gl-acc-hide-widget-btn"
                  title={t('accHideFloatingTitle')}
                  aria-describedby={`${titleId}-hide-hint`}
                  onClick={hideFloatingWidget}
                >
                  {t('accHideFloating')}
                </button>
                <p id={`${titleId}-hide-hint`} className="gl-acc-panel-sub" style={{ marginTop: '0.5rem' }}>
                  {t('accHideFloatingHint')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </>
  );

  return createPortal(content, document.body);
}
