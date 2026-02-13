/**
 * URL Validation Utility
 *
 * Comprehensive URL validation before making API calls.
 * This prevents unnecessary calls to Cloudflare Worker and Google Safe Browsing API.
 *
 * **WWW:** URLs are accepted and preserved both with and without www.
 *
 * **Protocol:** "https:/" / "http:/" (single slash) are normalized to "https://" / "http://".
 * If no protocol is given, "https://" is prepended.
 *
 * **How it is stored (examples):**
 *   https:/www.google.com  → https://www.google.com
 *   www.google.com         → https://www.google.com
 *   https:/google.com      → https://google.com
 *   google.com             → https://google.com
 *   http:/www.google2.com  → http://www.google2.com
 *   http:/google.com       → http://google.com
 */

import isFQDN from 'validator/lib/isFQDN';

/** Hosts that cannot be used (glynk.to, goodlink.ai in any form including www) */
const BLOCKED_REDIRECT_HOSTS = ['glynk.to', 'goodlink.ai'];

/**
 * Validate URL structure and format
 * 
 * @param {string} urlString - The URL to validate
 * @returns {{isValid: boolean, error?: string, normalizedUrl?: string}}
 */
export function validateUrl(urlString) {
  // 0. Null / undefined / non-string guard
  if (!urlString || typeof urlString !== 'string') {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  // 1. Trim - Remove whitespace from start and end
  const trimmed = urlString.trim();

  // Check 1: URL is not empty
  if (!trimmed || trimmed === '') {
    return {
      isValid: false,
      error: 'URL cannot be empty',
    };
  }

  // Check 2: No spaces
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL cannot contain spaces',
    };
  }

  // Check 3: Invalid characters
  const invalidChars = /[<>"\{\}\|\\^`]/;
  if (invalidChars.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL contains invalid characters',
    };
  }

  // 2. Normalize common protocol typo: "https:/" or "http:/" (one slash) → "https://" / "http://"
  let normalizedInput = trimmed.replace(/^(https?):\/(?!\/)/i, '$1://');

  // 3. Lowercase - Domains are case-insensitive (but preserve for protocol check)
  const lowercased = normalizedInput.toLowerCase();

  // 4. Check for basic structure
  let urlToValidate = lowercased;
  let hasProtocol = false;
  let protocol = null;

  // Check 5: Protocol
  const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
  if (!protocolRegex.test(normalizedInput)) {
    // No protocol - add https:// for validation
    urlToValidate = `https://${lowercased}`;
    hasProtocol = false;
  } else {
    hasProtocol = true;

    // Check for valid protocol
    const validProtocols = ['http', 'https'];
    protocol = normalizedInput.split('://')[0].toLowerCase();
    if (!validProtocols.includes(protocol)) {
      return {
        isValid: false,
        error: `Invalid protocol: ${protocol}. Only http and https are allowed.`,
      };
    }

    urlToValidate = lowercased;
  }

  // 6. Try to parse as URL (basic syntax check)
  let urlObj;
  try {
    urlObj = new URL(urlToValidate);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // 5a. Block URLs with @ (userinfo), e.g. https://example.com@google.com
  if (urlObj.username || urlObj.password) {
    return {
      isValid: false,
      error: 'URL cannot contain @ in the address. Please use a valid URL.',
    };
  }

  // 5. Extract hostname (domain)
  const hostname = urlObj.hostname;

  // Check 6: Has domain
  if (!hostname || hostname.length === 0) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // Check 7: Block IP addresses and localhost - strictly enforce FQDN
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^\[?(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\]?$|^\[?(?:[0-9a-fA-F]{1,4}:)*:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\]?$/;

  if (ipv4Regex.test(hostname) || ipv6Regex.test(hostname)) {
    return {
      isValid: false,
      error: 'IP addresses are not allowed. Please use a valid domain name.',
    };
  }

  if (hostname === 'localhost') {
    return {
      isValid: false,
      error: 'Localhost is not allowed. Please use a valid domain name.',
    };
  }

  // Check 7b: Block glynk.to and goodlink.ai (any form: www, subdomain)
  const normalizedHost = hostname.toLowerCase().replace(/^www\./, '');
  if (
    BLOCKED_REDIRECT_HOSTS.some(
      (b) => normalizedHost === b || normalizedHost.endsWith('.' + b)
    )
  ) {
    return {
      isValid: false,
      error: 'This URL cannot point to glynk.to or goodlink.ai. Please use a different URL.',
    };
  }

  // Check 8: Valid domain using Regex
  // This ensures it has valid characters and structure (e.g. example.com)
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  if (!domainRegex.test(hostname) && !isFQDN(hostname)) {
    return {
      isValid: false,
      error: 'Invalid domain format. Must be a valid domain (e.g., example.com).',
    };
  }

  // 6. Check for consecutive hyphens (double hyphens) - not allowed in domains
  if (hostname.includes('--')) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // 7. Check for hyphens at start or end of domain parts
  const domainParts = hostname.split('.');
  for (const part of domainParts) {
    if (part.startsWith('-') || part.endsWith('-')) {
      return {
        isValid: false,
        error: 'Invalid domain',
      };
    }
  }

  // 7.5. Check minimum domain structure - must have at least domain + TLD (2 parts minimum)
  if (domainParts.length < 2) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // 7.6. Check TLD validity - TLD must be at least 2 characters and contain only letters
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // TLD should contain only letters (no numbers, no special chars)
  if (!/^[a-z]{2,}$/i.test(tld)) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // 7.6.5. Check if TLD is a valid known TLD (common TLDs list)
  // This catches cases like "www.google" where "google" is not a valid TLD
  const validCommonTLDs = [
    // Generic TLDs
    'com', 'net', 'org', 'edu', 'gov', 'mil', 'int',
    // Country code TLDs (common ones)
    'uk', 'us', 'ca', 'au', 'de', 'fr', 'it', 'es', 'nl', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'pl', 'cz', 'ie', 'pt', 'gr',
    'il', 'ae', 'sa', 'eg', 'za', 'ng', 'ke', 'ma', 'tn', 'dz',
    'jp', 'cn', 'kr', 'in', 'id', 'th', 'vn', 'ph', 'my', 'sg', 'hk', 'tw', 'nz',
    'br', 'mx', 'ar', 'cl', 'co', 'pe', 've', 'ec', 'uy', 'py', 'bo', 'cr', 'pa', 'do', 'gt', 'hn', 'ni', 'sv',
    'ru', 'ua', 'by', 'kz', 'ge', 'am', 'az',
    'tr', 'ro', 'bg', 'hr', 'si', 'rs', 'ba', 'mk', 'al', 'cy', 'mt', 'lu', 'li', 'is',
    'qa', 'kw', 'bh', 'om', 'jo', 'lb', 'pk', 'bd', 'np', 'lk', 'mm',
    // New gTLDs (common ones)
    'io', 'ai', 'app', 'dev', 'tech', 'online', 'site', 'website', 'store', 'shop', 'blog', 'info', 'biz', 'xyz',
    'me', 'cc', 'tv', 'gg', 'to', 'ly', 'fm', 'so', 'land', 'world', 'club', 'link', 'page', 'one', 'pro',
    'live', 'media', 'agency', 'design', 'marketing', 'digital', 'space', 'zone', 'work', 'cloud', 'tools',
    'center', 'solutions', 'systems', 'network', 'group', 'team', 'studio', 'academy', 'consulting',
    'money', 'finance', 'trading', 'capital', 'fund', 'ventures', 'partners', 'holdings',
    'health', 'care', 'clinic', 'dental', 'fit', 'yoga',
    'news', 'press', 'today', 'report', 'review', 'guide', 'tips', 'how',
    'art', 'music', 'video', 'photo', 'gallery', 'film', 'games', 'play',
    'travel', 'flights', 'hotel', 'holiday', 'tours', 'cruise',
    'food', 'restaurant', 'cafe', 'pizza', 'wine', 'beer', 'coffee',
    'fashion', 'style', 'beauty', 'hair', 'shoes', 'jewelry',
    'auto', 'car', 'cars', 'bike', 'taxi',
    'house', 'homes', 'estate', 'property', 'rent', 'apartments',
    'legal', 'law', 'attorney', 'lawyer',
    'pet', 'dog', 'vet',
    'church', 'bible', 'faith',
    'coop', 'museum', 'aero', 'mobi', 'tel', 'cat', 'asia', 'jobs',
  ];

  // If TLD is not in the common list and domain has only 2 parts, it's likely invalid
  // (e.g., "www.google" where "google" is not a TLD)
  if (domainParts.length === 2 && !validCommonTLDs.includes(tld.toLowerCase())) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // 7.7. Check for suspicious double TLD patterns (like .com.co, .net.co, etc.)
  // Block common suspicious patterns unless they're known legitimate country codes
  if (domainParts.length >= 3) {
    const secondLastPart = domainParts[domainParts.length - 2];
    const lastPart = domainParts[domainParts.length - 1];

    // Common legitimate double TLDs (country codes with generic TLDs)
    const legitimateDoubleTLDs = [
      'co.il', 'org.il', 'net.il', 'ac.il', 'gov.il', 'muni.il', 'k12.il',
      'co.uk', 'org.uk', 'me.uk', 'net.uk', 'ac.uk', 'gov.uk',
      'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
      'co.nz', 'net.nz', 'org.nz', 'govt.nz',
      'com.br', 'net.br', 'org.br', 'gov.br',
      'co.za', 'net.za', 'org.za', 'gov.za',
      'co.in', 'net.in', 'org.in', 'gov.in',
      'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
      'com.mx', 'net.mx', 'org.mx', 'gob.mx',
      'com.cn', 'net.cn', 'org.cn', 'gov.cn',
      'co.kr', 'ne.kr', 'or.kr', 'go.kr',
      'com.tw', 'net.tw', 'org.tw', 'gov.tw',
      'com.hk', 'net.hk', 'org.hk', 'gov.hk',
      'com.sg', 'net.sg', 'org.sg', 'gov.sg',
      'co.th', 'in.th', 'ac.th', 'go.th',
      'com.my', 'net.my', 'org.my', 'gov.my',
      'com.ar', 'net.ar', 'org.ar', 'gov.ar',
      'com.co', 'net.co', 'org.co', 'gov.co',
      'com.pe', 'net.pe', 'org.pe', 'gob.pe',
      'com.ve', 'net.ve', 'org.ve', 'gob.ve',
      'com.tr', 'net.tr', 'org.tr', 'gov.tr',
      'com.ua', 'net.ua', 'org.ua', 'gov.ua',
      'com.ru', 'net.ru', 'org.ru',
      'com.pl', 'net.pl', 'org.pl', 'gov.pl',
      'com.es', 'org.es', 'gob.es',
      'com.pt', 'net.pt', 'org.pt',
      'com.gr', 'net.gr', 'org.gr',
      'com.eg', 'net.eg', 'org.eg',
      'co.ae', 'net.ae', 'org.ae',
      'com.sa', 'net.sa', 'org.sa',
      'com.pk', 'net.pk', 'org.pk',
      'com.bd', 'net.bd', 'org.bd',
      'com.ph', 'net.ph', 'org.ph',
      'com.vn', 'net.vn', 'org.vn',
      'co.id', 'or.id', 'ac.id',
    ];

    const doubleTLD = `${secondLastPart}.${lastPart}`;

    // Common generic TLDs that shouldn't appear before country codes
    const commonGenericTLDs = ['com', 'net', 'org', 'edu', 'gov', 'mil'];

    // If it's a generic TLD followed by a 2-letter code, check if it's legitimate
    if (commonGenericTLDs.includes(secondLastPart) && lastPart.length === 2) {
      if (!legitimateDoubleTLDs.includes(doubleTLD)) {
        return {
          isValid: false,
          error: 'Invalid domain',
        };
      }
    }
  }

  // 8. Use validator library to check if hostname is a valid FQDN (Fully Qualified Domain Name)
  // This catches cases like "www.saasaipartners" (missing TLD)
  if (!isFQDN(hostname, {
    require_tld: true,        // Must have TLD
    allow_underscores: false, // No underscores allowed
    allow_trailing_dot: false, // No trailing dot
    allow_numeric_tld: false,  // TLD cannot be numeric
  })) {
    return {
      isValid: false,
      error: 'Invalid domain',
    };
  }

  // Protocol check already done above (lines 54-76) - no need to check again

  // 13. Check for valid port (if specified)
  if (urlObj.port) {
    const portNum = parseInt(urlObj.port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return {
        isValid: false,
        error: 'Port number must be between 1 and 65535',
      };
    }
  }

  // 14. Block localhost and private/reserved IPs
  if (
    hostname === 'localhost' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('169.254.')
  ) {
    return {
      isValid: false,
      error: 'Localhost and private IP addresses are not allowed',
    };
  }

  // 15. Check for suspicious subdomain patterns on well-known domains
  if (domainParts.length >= 2) {
    const subdomain = domainParts[0];
    const mainDomain = domainParts.slice(1).join('.');

    // List of well-known domains that shouldn't have suspicious subdomains
    const wellKnownDomains = [
      'google.com', 'google.co.il', 'google.co.uk', 'google.fr', 'google.de',
      'facebook.com', 'youtube.com', 'amazon.com', 'amazon.co.uk',
      'microsoft.com', 'apple.com', 'twitter.com', 'x.com',
      'instagram.com', 'linkedin.com', 'github.com', 'netflix.com',
      'paypal.com', 'ebay.com', 'walmart.com', 'target.com',
    ];

    // Check if main domain is well-known
    if (wellKnownDomains.includes(mainDomain)) {
      // Flag suspiciously short subdomains (1-3 characters) on well-known domains
      if (subdomain.length > 0 && subdomain.length <= 3) {
        // Allow common legitimate short subdomains
        const legitimateShortSubdomains = [
          'www', 'api', 'cdn', 'img', 'js', 'css', 'ftp', 'smtp', 'mail',
          'pop', 'imap', 'vpn', 'ssh', 'git', 'dev', 'stg', 'prd', 'uat',
          'test', 'qa', 'app', 'web', 'mob', 'ios', 'win', 'mac', 'old',
          'new', 'tmp', 'bak', 'log', 'db', 'sql', 'node', 'php', 'py',
          'go', 'rb', 'java', 'net', 'asp', 'jsp', 'html', 'xml', 'json',
        ];

        if (!legitimateShortSubdomains.includes(subdomain.toLowerCase())) {
          return {
            isValid: false,
            error: 'Invalid domain',
          };
        }
      }
    }

    // Check for suspiciously short main domain parts
    if (domainParts.length === 2) {
      const domainName = domainParts[0];
      if (domainName.length <= 1) {
        return {
          isValid: false,
          error: 'Invalid domain',
        };
      }
    }
  }

  // 16. Check for minimum domain part length (each part should be at least 1 char)
  for (let i = 0; i < domainParts.length - 1; i++) {
    const part = domainParts[i];
    if (part.length === 0) {
      return {
        isValid: false,
        error: 'Invalid domain',
      };
    }
  }

  // 17. Normalize URL - add https:// if no protocol; do NOT strip www (allow with or without www)
  const normalizedUrl = hasProtocol ? lowercased : `https://${lowercased}`;

  return {
    isValid: true,
    normalizedUrl,
  };
}

/**
 * Quick validation check (lightweight)
 * Use this for real-time feedback while user is typing
 * 
 * @param {string} urlString - The URL to validate
 * @returns {boolean}
 */
export function isUrlFormatValid(urlString) {
  if (!urlString || !urlString.trim()) {
    return false;
  }

  const trimmed = urlString.trim().toLowerCase();

  // Basic checks only
  if (trimmed.length < 4) return false; // Minimum: a.co
  if (!trimmed.includes('.')) return false; // Must have a dot

  // Check for obvious invalid characters
  const invalidChars = [' ', '@', '!', '#', '$'];
  for (const char of invalidChars) {
    if (trimmed.includes(char)) return false;
  }

  return true;
}

/**
 * Normalize host from URL or host string for comparison (lowercase, no www, no port).
 * @param {string} urlOrHost - Full URL or hostname
 * @returns {string}
 */
function normalizeHostForRedirectComparison(urlOrHost) {
  if (!urlOrHost || typeof urlOrHost !== 'string') return '';
  const trimmed = urlOrHost.trim().toLowerCase();
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const hostOnly = withoutProtocol.split('/')[0].split('?')[0].split('#')[0];
  const withoutPort = hostOnly.replace(/:\d+$/, '');
  return withoutPort.replace(/^www\./, '');
}

/**
 * Check if host is a blocked redirect destination (glynk.to, goodlink.ai or their subdomains).
 * @param {string} host - Normalized host (e.g. from normalizeHostForRedirectComparison)
 * @returns {boolean}
 */
export function isBlockedRedirectHost(host) {
  if (!host) return false;
  return BLOCKED_REDIRECT_HOSTS.some(
    (blocked) => host === blocked || host.endsWith(`.${blocked}`)
  );
}

/**
 * Validate bot redirect URL: must be valid URL, not blocked (glynk.to / goodlink.ai), and not same as link target.
 * @param {string} redirectUrl - The bot redirect URL to validate
 * @param {string} targetUrl - The link's target/destination URL (original link)
 * @returns {{ isValid: boolean, error?: string, normalizedUrl?: string }}
 */
export function validateBotRedirectUrl(redirectUrl, targetUrl) {
  const urlResult = validateUrl(redirectUrl);
  if (!urlResult.isValid) return urlResult;

  const redirectHost = normalizeHostForRedirectComparison(urlResult.normalizedUrl || redirectUrl);

  if (isBlockedRedirectHost(redirectHost)) {
    return {
      isValid: false,
      error: 'Redirect cannot point to glynk.to or goodlink.ai. Please use a different URL.',
    };
  }

  const targetHost = normalizeHostForRedirectComparison(targetUrl || '');
  if (targetHost && redirectHost === targetHost) {
    return {
      isValid: false,
      error: 'Redirect cannot be the same as your link destination. Please use a different URL.',
    };
  }

  return { isValid: true, normalizedUrl: urlResult.normalizedUrl };
}

