import React from 'react';
import { restoreAccessibilityWidgetVisibility } from '../../lib/accessibilityPreferences';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * Subtle control to bring back the floating accessibility menu after it was hidden.
 */
export default function AccessibilityFooterRestore({ className = '', onAfterClick }) {
  const { t } = useLanguage();
  const merged = ['gl-acc-footer-restore', className].filter(Boolean).join(' ').trim();
  return (
    <button
      type="button"
      onClick={() => {
        restoreAccessibilityWidgetVisibility();
        onAfterClick?.();
      }}
      className={merged}
    >
      {t('accShowMenu')}
    </button>
  );
}
