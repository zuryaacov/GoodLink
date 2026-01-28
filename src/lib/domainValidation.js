/**
 * בדיקה מקיפה אם דומיין חוקי
 * @param {string} domain - הדומיין לבדיקה
 * @param {object} options - אפשרויות נוספות
 * @returns {object} - { isValid: boolean, error: string|null, sanitized: string|null }
 */
export function validateDomain(domain, options = {}) {
  const {
    allowSubdomains = true, // לאפשר subdomain (www.example.com)
    allowPunycode = true, // לאפשר דומיינים בינלאומיים (xn--)
    requireTLD = true, // לדרוש סיומת (.com, .io, וכו')
    allowLocalhost = false, // לאפשר localhost
    allowIP = false, // לאפשר כתובות IP
    maxLength = 253, // אורך מקסימלי
    checkDNS = false, // בדיקת DNS (async - רק בסביבת Node.js)
  } = options;

  // 1. בדיקות בסיסיות
  if (!domain || typeof domain !== 'string') {
    return { isValid: false, error: 'Domain must be a non-empty string', sanitized: null };
  }

  // ניקוי רווחים
  let sanitized = domain.trim().toLowerCase();

  // הסרת פרוטוקול אם יש
  sanitized = sanitized.replace(/^https?:\/\//i, '');

  // הסרת www. אופציונלי
  sanitized = sanitized.replace(/^www\./i, '');

  // הסרת path/query/fragment
  sanitized = sanitized.split('/')[0].split('?')[0].split('#')[0];

  // הסרת port
  sanitized = sanitized.split(':')[0];

  // 2. בדיקת אורך
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Domain too long (max ${maxLength} chars)`, sanitized: null };
  }

  if (sanitized.length === 0) {
    return { isValid: false, error: 'Domain is empty after sanitization', sanitized: null };
  }

  // 3. בדיקת localhost
  if (sanitized === 'localhost') {
    if (allowLocalhost) {
      return { isValid: true, error: null, sanitized };
    }
    return { isValid: false, error: 'Localhost not allowed', sanitized: null };
  }

  // 4. בדיקת IP address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

  if (ipv4Regex.test(sanitized) || ipv6Regex.test(sanitized)) {
    if (allowIP) {
      // בדיקה שה-IPv4 תקין (0-255)
      if (ipv4Regex.test(sanitized)) {
        const parts = sanitized.split('.');
        if (parts.some((part) => parseInt(part) > 255)) {
          return { isValid: false, error: 'Invalid IPv4 address', sanitized: null };
        }
      }
      return { isValid: true, error: null, sanitized };
    }
    return { isValid: false, error: 'IP addresses not allowed', sanitized: null };
  }

  // 5. בדיקת תווים לא חוקיים
  const invalidChars = /[^a-z0-9\-\.]/;
  if (invalidChars.test(sanitized) && !allowPunycode) {
    return { isValid: false, error: 'Invalid characters in domain', sanitized: null };
  }

  // אם יש Punycode, בדוק שהוא מתחיל ב-xn--
  if (allowPunycode && /[^a-z0-9\-\.]/.test(sanitized)) {
    return {
      isValid: false,
      error: 'Non-ASCII characters require Punycode encoding',
      sanitized: null,
    };
  }

  // 6. פיצול לחלקים (labels)
  const labels = sanitized.split('.');

  // בדיקה שיש לפחות 2 חלקים (domain.tld) אם נדרש TLD
  if (requireTLD && labels.length < 2) {
    return { isValid: false, error: 'Domain must have a TLD (e.g., .com)', sanitized: null };
  }

  // 7. בדיקת כל label
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];

    // Label לא יכול להיות ריק
    if (label.length === 0) {
      return { isValid: false, error: 'Empty label in domain', sanitized: null };
    }

    // Label לא יכול להיות ארוך מ-63 תווים
    if (label.length > 63) {
      return {
        isValid: false,
        error: `Label "${label}" exceeds 63 characters`,
        sanitized: null,
      };
    }

    // Label לא יכול להתחיל או להסתיים במקף
    if (label.startsWith('-') || label.endsWith('-')) {
      return {
        isValid: false,
        error: `Label "${label}" cannot start/end with hyphen`,
        sanitized: null,
      };
    }

    // Label צריך להכיל רק a-z, 0-9, מקף (או xn-- ל-Punycode)
    const labelRegex = allowPunycode ? /^[a-z0-9\-]+$/ : /^[a-z0-9\-]+$/;
    if (!labelRegex.test(label)) {
      return { isValid: false, error: `Invalid label "${label}"`, sanitized: null };
    }
  }

  // 8. בדיקת TLD
  if (requireTLD) {
    const tld = labels[labels.length - 1];

    // TLD צריך להכיל רק אותיות (לא מספרים)
    if (/\d/.test(tld) && !tld.startsWith('xn--')) {
      return { isValid: false, error: 'TLD cannot contain numbers', sanitized: null };
    }

    // TLD צריך להיות לפחות 2 תווים
    if (tld.length < 2) {
      return { isValid: false, error: 'TLD must be at least 2 characters', sanitized: null };
    }

    // בדיקת אורך מינימלי של הדומיין (לפחות 3 תווים לפני ה-TLD)
    const domainWithoutTld = labels.slice(0, -1).join('.');
    if (domainWithoutTld.length < 3) {
      return {
        isValid: false,
        error: 'Domain name must be at least 3 characters (before TLD)',
        sanitized: null
      };
    }
  }

  // 9. בדיקת subdomains
  if (!allowSubdomains && labels.length > 2) {
    return { isValid: false, error: 'Subdomains not allowed', sanitized: null };
  }

  // ✅ הדומיין תקין!
  return { isValid: true, error: null, sanitized };
}

/**
 * פונקציה לבדיקת רשימת דומיינים
 */
export function validateDomains(domains, options = {}) {
  const results = [];

  for (const domain of domains) {
    const result = validateDomain(domain, options);
    results.push({
      original: domain,
      ...result,
    });
  }

  return results;
}

/**
 * פונקציה ל-DNS lookup (רק ב-Node.js או Cloudflare Workers)
 */
export async function validateDomainWithDNS(domain, options = {}) {
  // בדיקה ראשונית
  const basicCheck = validateDomain(domain, options);
  if (!basicCheck.isValid) {
    return basicCheck;
  }

  try {
    // בדיקת DNS (רק בסביבת Cloudflare Workers או Node.js)
    const response = await fetch(
      `https://1.1.1.1/dns-query?name=${basicCheck.sanitized}&type=A`,
      {
        headers: { Accept: 'application/dns-json' },
      }
    );

    const data = await response.json();

    if (data.Status !== 0 || !data.Answer || data.Answer.length === 0) {
      return {
        isValid: false,
        error: 'Domain does not resolve (no DNS records)',
        sanitized: basicCheck.sanitized,
      };
    }

    return {
      isValid: true,
      error: null,
      sanitized: basicCheck.sanitized,
      dnsRecords: data.Answer,
    };
  } catch (err) {
    return {
      isValid: false,
      error: `DNS lookup failed: ${err.message}`,
      sanitized: basicCheck.sanitized,
    };
  }
}
