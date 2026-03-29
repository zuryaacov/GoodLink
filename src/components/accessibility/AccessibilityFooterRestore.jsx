import React from 'react';
import { restoreAccessibilityWidgetVisibility } from '../../lib/accessibilityPreferences';

/**
 * Subtle control to bring back the floating accessibility menu after it was hidden.
 */
export default function AccessibilityFooterRestore({ className = '', onAfterClick }) {
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
      Show accessibility menu
    </button>
  );
}
