/**
 * URL Validation Utility
 * 
 * Comprehensive URL validation before making API calls.
 * This prevents unnecessary calls to Cloudflare Worker and Google Safe Browsing API.
 */

import isFQDN from 'validator/lib/isFQDN';
import isURL from 'validator/lib/isURL';

/**
 * Validate URL structure and format
 * 
 * @param {string} urlString - The URL to validate
 * @returns {{isValid: boolean, error?: string, normalizedUrl?: string}}
 */
export function validateUrl(urlString) {
  // 1. Trim - Remove whitespace from start and end
  const trimmed = urlString.trim();
  
  // בדיקה 1: ה-URL לא ריק
  if (!trimmed || trimmed === '') {
    return {
      isValid: false,
      error: 'URL cannot be empty',
    };
  }

  // בדיקה 2: אין רווחים
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL cannot contain spaces',
    };
  }

  // בדיקה 3: תווים לא חוקיים
  const invalidChars = /[<>"\{\}\|\\^`]/;
  if (invalidChars.test(trimmed)) {
    return {
      isValid: false,
      error: 'URL contains invalid characters',
    };
  }

  // 2. Lowercase - Domains are case-insensitive (but preserve original for protocol check)
  const lowercased = trimmed.toLowerCase();

  // 3. Check for basic structure
  let urlToValidate = lowercased;
  let hasProtocol = false;
  let protocol = null;

  // בדיקה 4: פרוטוקול
  const protocolRegex = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;
  if (!protocolRegex.test(trimmed)) {
    // No protocol - add https:// for validation
    urlToValidate = `https://${lowercased}`;
    hasProtocol = false;
  } else {
    hasProtocol = true;
    urlToValidate = trimmed; // Keep original case for protocol check
    
    // בדיקת פרוטוקול תקני
    const validProtocols = ['http', 'https', 'ftp', 'ftps', 'ws', 'wss'];
    protocol = trimmed.split('://')[0].toLowerCase();
    if (!validProtocols.includes(protocol)) {
      return {
        isValid: false,
        error: `Invalid protocol: ${protocol}. Only http, https, ftp, ftps, ws, and wss are allowed.`,
      };
    }
    
    // Use lowercase version for further validation
    urlToValidate = lowercased;
  }

  // 4. Try to parse as URL (basic syntax check)
  let urlObj;
  try {
    urlObj = new URL(urlToValidate);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // 5. Extract hostname (domain)
  const hostname = urlObj.hostname;

  // בדיקה 6: יש דומיין
  if (!hostname || hostname.length === 0) {
    return {
      isValid: false,
      error: 'URL must contain a domain',
    };
  }

  // בדיקה 7: דומיין תקני - בדיקה בסיסית עם regex
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^\[(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\]$|^\[(?:[0-9a-fA-F]{1,4}:)*:(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}\]$/;
  
  // Allow localhost, IPv4, IPv6, or valid domain format
  const isValidDomainFormat = domainRegex.test(hostname) || 
                               ipv4Regex.test(hostname) || 
                               ipv6Regex.test(hostname) || 
                               hostname === 'localhost';
  
  if (!isValidDomainFormat) {
    return {
      isValid: false,
      error: 'Invalid domain format',
    };
  }

  // 6. Check for consecutive hyphens (double hyphens) - not allowed in domains
  if (hostname.includes('--')) {
    return {
      isValid: false,
      error: 'Domain cannot contain consecutive hyphens (--). Please remove the extra hyphen.',
    };
  }

  // 7. Check for hyphens at start or end of domain parts
  const domainParts = hostname.split('.');
  for (const part of domainParts) {
    if (part.startsWith('-') || part.endsWith('-')) {
      return {
        isValid: false,
        error: 'Domain parts cannot start or end with a hyphen',
      };
    }
  }

  // 7.5. Check minimum domain structure - must have at least domain + TLD (2 parts minimum)
  if (domainParts.length < 2) {
    return {
      isValid: false,
      error: 'Invalid domain format. Domain must include a top-level domain (TLD). Example: domain.com',
    };
  }

  // 7.6. Check TLD validity - TLD must be at least 2 characters and contain only letters
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return {
      isValid: false,
      error: 'Invalid domain format. Top-level domain (TLD) must be at least 2 characters. Example: domain.com',
    };
  }
  
  // TLD should contain only letters (no numbers, no special chars)
  if (!/^[a-z]{2,}$/i.test(tld)) {
    return {
      isValid: false,
      error: 'Invalid domain format. Top-level domain (TLD) must contain only letters.',
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
    // New gTLDs (common ones)
    'io', 'ai', 'app', 'dev', 'tech', 'online', 'site', 'website', 'store', 'shop', 'blog', 'info', 'biz', 'xyz',
  ];
  
  // If TLD is not in the common list and domain has only 2 parts, it's likely invalid
  // (e.g., "www.google" where "google" is not a TLD)
  if (domainParts.length === 2 && !validCommonTLDs.includes(tld.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid domain format. "${tld}" is not a recognized top-level domain (TLD). Please verify the URL is correct.`,
    };
  }

  // 7.7. Check for suspicious double TLD patterns (like .com.co, .net.co, etc.)
  // Block common suspicious patterns unless they're known legitimate country codes
  if (domainParts.length >= 3) {
    const secondLastPart = domainParts[domainParts.length - 2];
    const lastPart = domainParts[domainParts.length - 1];
    
    // Common legitimate double TLDs (country codes with generic TLDs)
    const legitimateDoubleTLDs = [
      'com.au', 'com.br', 'com.mx', 'com.ar', 'com.pe', 'com.ve',
      'net.au', 'net.br', 'net.mx',
      'org.au', 'org.br', 'org.mx',
      'co.uk', 'co.za', 'co.nz', 'co.jp', 'co.kr',
      'com.sg', 'com.hk', 'com.tw', 'com.cn',
    ];
    
    const doubleTLD = `${secondLastPart}.${lastPart}`;
    
    // Common generic TLDs that shouldn't appear before country codes
    const commonGenericTLDs = ['com', 'net', 'org', 'edu', 'gov', 'mil'];
    
    // If it's a generic TLD followed by a 2-letter code, check if it's legitimate
    if (commonGenericTLDs.includes(secondLastPart) && lastPart.length === 2) {
      if (!legitimateDoubleTLDs.includes(doubleTLD)) {
        return {
          isValid: false,
          error: `Invalid domain format. "${doubleTLD}" is not a recognized domain extension. Please verify the URL is correct.`,
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
      error: 'Invalid domain format. Domain must be a fully qualified domain name (FQDN) with a valid TLD. Example: domain.com',
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

  // 14. Check for localhost/private IPs (optional - can be allowed or blocked)
  // Uncomment if you want to block localhost:
  // if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
  //   return {
  //     isValid: false,
  //     error: 'Localhost and private IP addresses are not allowed',
  //   };
  // }

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
            error: `Suspicious subdomain detected. "${subdomain}.${mainDomain}" may be a typo or phishing attempt. Please verify the URL is correct.`,
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
          error: 'Domain name is too short. Please verify the URL is correct.',
        };
      }
    }
  }

  // 16. Check for common typos
  const commonTypos = {
    'http:///': 'http://',
    'https:///': 'https://',
    'http:/': 'http://',
    'https:/': 'https://',
  };

  // 17. Check for minimum domain part length (each part should be at least 1 char, but warn on very short)
  for (let i = 0; i < domainParts.length - 1; i++) {
    const part = domainParts[i];
    if (part.length === 0) {
      return {
        isValid: false,
        error: 'Domain parts cannot be empty',
      };
    }
  }

  // 18. Normalize URL - return with https:// if no protocol
  const normalizedUrl = hasProtocol ? lowercased : `https://${lowercased}`;

  // All validations passed
  return {
    isValid: true,
    normalizedUrl: normalizedUrl,
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

