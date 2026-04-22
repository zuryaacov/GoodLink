export function openLemonOverlay(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const link = document.createElement('a');
  link.href = targetUrl;
  link.className = 'lemonsqueezy-button';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';

  try {
    if (typeof window.createLemonSqueezy === 'function') {
      window.createLemonSqueezy();
    }
    document.body.appendChild(link);
    link.click();
  } finally {
    window.setTimeout(() => {
      link.remove();
    }, 0);
  }
}
