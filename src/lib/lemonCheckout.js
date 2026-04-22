const SCRIPT_SRC = 'https://app.lemonsqueezy.com/js/lemon.js';
const BODY_SCROLL_STYLE_KEYS = [
  'overflow',
  'overflowX',
  'overflowY',
  'position',
  'top',
  'left',
  'right',
  'width',
  'paddingRight',
  'marginRight',
];

const snapshotBodyScrollStyles = () => {
  if (typeof document === 'undefined') return null;
  const snap = {};
  BODY_SCROLL_STYLE_KEYS.forEach((key) => {
    snap[key] = document.body.style[key] || '';
  });
  return snap;
};

const restoreBodyScrollStyles = (snapshot) => {
  if (!snapshot || typeof document === 'undefined') return;
  BODY_SCROLL_STYLE_KEYS.forEach((key) => {
    document.body.style[key] = snapshot[key] || '';
  });
};

const isCheckoutSuccessEvent = (payload) => {
  const eventName = String(payload?.event || payload?.name || '').toLowerCase();
  return (
    eventName.includes('checkout.success') ||
    eventName.includes('checkout_success') ||
    eventName.includes('order_created') ||
    eventName.includes('payment_success')
  );
};

const dispatchCheckoutSuccess = (payload) => {
  window.dispatchEvent(
    new CustomEvent('goodlink:lemon-checkout-success', {
      detail: payload || null,
    })
  );
};

const isCheckoutClosedEvent = (payload) => {
  const eventName = String(payload?.event || payload?.name || '').toLowerCase();
  return eventName.includes('close');
};

const ensureLemonScript = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (window.LemonSqueezy?.Url?.Open) return true;

  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
  if (!existing) {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.defer = true;
    document.head.appendChild(script);
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const checkReady = () => {
      if (window.LemonSqueezy?.Url?.Open) {
        resolve(true);
        return;
      }
      if (Date.now() - startedAt > 4000) {
        resolve(false);
        return;
      }
      window.setTimeout(checkReady, 100);
    };
    checkReady();
  });
};

const ensureLemonSetup = () => {
  if (typeof window === 'undefined') return;
  if (window.__goodlinkLemonSetupDone) return;

  if (typeof window.createLemonSqueezy === 'function') {
    window.createLemonSqueezy();
  }

  if (window.LemonSqueezy?.Setup) {
    window.LemonSqueezy.Setup({
      eventHandler: (payload) => {
        if (isCheckoutSuccessEvent(payload)) {
          if (window.__goodlinkLemonBodyStyleSnapshot) {
            restoreBodyScrollStyles(window.__goodlinkLemonBodyStyleSnapshot);
            window.__goodlinkLemonBodyStyleSnapshot = null;
          }
          dispatchCheckoutSuccess(payload);
        }
        if (isCheckoutClosedEvent(payload)) {
          if (window.__goodlinkLemonBodyStyleSnapshot) {
            restoreBodyScrollStyles(window.__goodlinkLemonBodyStyleSnapshot);
            window.__goodlinkLemonBodyStyleSnapshot = null;
          }
        }
      },
    });
  }

  window.__goodlinkLemonSetupDone = true;
};

export async function openLemonOverlay(url) {
  const targetUrl = String(url || '').trim();
  if (!targetUrl) return false;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;

  const isReady = await ensureLemonScript();
  if (!isReady) {
    window.location.assign(targetUrl);
    return false;
  }

  ensureLemonSetup();

  window.__goodlinkLemonBodyStyleSnapshot = snapshotBodyScrollStyles();

  if (window.LemonSqueezy?.Url?.Open) {
    window.LemonSqueezy.Url.Open(targetUrl);
    return true;
  }

  window.location.assign(targetUrl);
  return false;
}
