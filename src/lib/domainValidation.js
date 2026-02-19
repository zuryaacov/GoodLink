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

  // שומרים www. אם המשתמש הקליד אותו (tipul.com ו-www.tipul.com שונים)

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

  // 2b. Block goodlink.ai and glynk.to (any form: domain or subdomain)
  const BLOCKED_DOMAINS = ['glynk.to', 'goodlink.ai'];
  const normalizedForBlock = sanitized.replace(/^www\./i, '');
  if (
    BLOCKED_DOMAINS.some(
      (b) => normalizedForBlock === b || normalizedForBlock.endsWith('.' + b)
    )
  ) {
    return { isValid: false, error: 'This domain cannot be used.', sanitized: null };
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

    // רשימת TLDs דו-חלקיים נפוצים (country-code second-level domains)
    const twoPartTLDs = [
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
      'com.ph', 'net.ph', 'org.ph', 'gov.ph',
      'com.vn', 'net.vn', 'org.vn', 'gov.vn',
      'co.id', 'or.id', 'ac.id', 'go.id',
      'com.ar', 'net.ar', 'org.ar', 'gov.ar',
      'com.co', 'net.co', 'org.co', 'gov.co',
      'com.pe', 'net.pe', 'org.pe', 'gob.pe',
      'com.ve', 'net.ve', 'org.ve', 'gob.ve',
      'com.ec', 'net.ec', 'org.ec', 'gob.ec',
      'com.uy', 'net.uy', 'org.uy', 'gub.uy',
      'com.py', 'net.py', 'org.py', 'gov.py',
      'com.bo', 'net.bo', 'org.bo', 'gob.bo',
      'co.cl', 'cl',
      'com.tr', 'net.tr', 'org.tr', 'gov.tr',
      'com.ua', 'net.ua', 'org.ua', 'gov.ua',
      'co.ru', 'com.ru', 'net.ru', 'org.ru',
      'com.pl', 'net.pl', 'org.pl', 'gov.pl',
      'co.at', 'or.at', 'ac.at', 'gv.at',
      'com.es', 'nom.es', 'org.es', 'gob.es',
      'com.pt', 'net.pt', 'org.pt', 'gov.pt',
      'co.it', 'com.it', 'net.it', 'org.it',
      'com.fr', 'net.fr', 'org.fr', 'gouv.fr',
      'com.de', 'net.de', 'org.de',
      'com.nl', 'net.nl', 'org.nl',
      'com.be', 'net.be', 'org.be',
      'com.gr', 'net.gr', 'org.gr', 'gov.gr',
      'com.ro', 'net.ro', 'org.ro', 'gov.ro',
      'com.se', 'org.se', 'pp.se',
      'com.no', 'net.no', 'org.no',
      'com.fi', 'net.fi', 'org.fi',
      'com.dk', 'net.dk', 'org.dk',
      'com.ie', 'net.ie', 'org.ie', 'gov.ie',
      'com.cz', 'net.cz', 'org.cz',
      'com.hu', 'net.hu', 'org.hu', 'gov.hu',
      'com.sk', 'net.sk', 'org.sk',
      'com.bg', 'net.bg', 'org.bg',
      'com.hr', 'net.hr', 'org.hr',
      'com.si', 'net.si', 'org.si',
      'com.rs', 'net.rs', 'org.rs',
      'com.ba', 'net.ba', 'org.ba',
      'com.mk', 'net.mk', 'org.mk',
      'com.al', 'net.al', 'org.al',
      'com.cy', 'net.cy', 'org.cy', 'gov.cy',
      'com.mt', 'net.mt', 'org.mt',
      'com.eg', 'net.eg', 'org.eg', 'gov.eg',
      'co.ae', 'net.ae', 'org.ae', 'gov.ae',
      'com.sa', 'net.sa', 'org.sa', 'gov.sa',
      'com.qa', 'net.qa', 'org.qa', 'gov.qa',
      'com.kw', 'net.kw', 'org.kw', 'gov.kw',
      'com.bh', 'net.bh', 'org.bh', 'gov.bh',
      'com.om', 'net.om', 'org.om', 'gov.om',
      'com.jo', 'net.jo', 'org.jo', 'gov.jo',
      'com.lb', 'net.lb', 'org.lb', 'gov.lb',
      'com.pk', 'net.pk', 'org.pk', 'gov.pk',
      'com.bd', 'net.bd', 'org.bd', 'gov.bd',
      'com.np', 'net.np', 'org.np', 'gov.np',
      'com.lk', 'net.lk', 'org.lk', 'gov.lk',
      'co.ke', 'or.ke', 'ne.ke', 'go.ke',
      'co.ug', 'or.ug', 'ne.ug', 'go.ug',
      'co.tz', 'or.tz', 'ne.tz', 'go.tz',
      'co.zw', 'org.zw', 'gov.zw',
      'co.bw', 'org.bw',
      'com.ng', 'net.ng', 'org.ng', 'gov.ng',
      'com.gh', 'net.gh', 'org.gh', 'gov.gh',
    ];

    // בדיקה אם זה TLD דו-חלקי
    let domainNameLabel;
    if (labels.length >= 3) {
      const possibleTwoPartTLD = `${labels[labels.length - 2]}.${labels[labels.length - 1]}`;
      if (twoPartTLDs.includes(possibleTwoPartTLD.toLowerCase())) {
        // TLD דו-חלקי - הדומיין הוא כל מה שלפני שני החלקים האחרונים
        domainNameLabel = labels.slice(0, -2).join('.');
      } else {
        // TLD רגיל - הדומיין הוא כל מה שלפני החלק האחרון
        domainNameLabel = labels.slice(0, -1).join('.');
      }
    } else {
      // רק 2 חלקים - הדומיין הוא החלק הראשון
      domainNameLabel = labels[0];
    }

    // בדיקת אורך מינימלי של שם הדומיין (לפחות תו אחד – מאפשר ai.com, x.com, db.com וכו')
    const mainDomainPart = domainNameLabel.split('.').pop() || domainNameLabel;
    if (mainDomainPart.length < 1) {
      return {
        isValid: false,
        error: 'Domain name cannot be empty',
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
