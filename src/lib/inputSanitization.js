/**
 * Input Sanitization Utility
 *
 * Detects and blocks XSS / HTML injection / script injection attempts
 * in free-text input fields (names, UTM params, custom event names, etc.).
 *
 * URL fields are already protected by urlValidation.js (protocol whitelist).
 * Slug fields are already limited to a-z, 0-9, hyphens.
 * Domain fields are already limited to valid domain characters.
 * Pixel IDs / CAPI Tokens already have strict regex per platform.
 */

// ── Dangerous patterns (case-insensitive) ────────────────────────────
const DANGEROUS_PATTERNS = [
  // Script tags (opening or self-closing)
  { regex: /<\s*script\b/i, label: 'script tag' },
  { regex: /<\s*\/\s*script/i, label: 'script closing tag' },

  // Dangerous protocols
  { regex: /javascript\s*:/i, label: 'javascript: protocol' },
  { regex: /vbscript\s*:/i, label: 'vbscript: protocol' },
  { regex: /data\s*:\s*text\/html/i, label: 'data:text/html URI' },

  // Event handlers (onclick=, onerror=, onload=, etc.)
  { regex: /\bon[a-z]{2,}\s*=/i, label: 'event handler attribute' },

  // Dangerous HTML tags that can execute code or load external resources
  { regex: /<\s*iframe\b/i, label: 'iframe tag' },
  { regex: /<\s*object\b/i, label: 'object tag' },
  { regex: /<\s*embed\b/i, label: 'embed tag' },
  { regex: /<\s*applet\b/i, label: 'applet tag' },
  { regex: /<\s*form\b/i, label: 'form tag' },
  { regex: /<\s*meta\b/i, label: 'meta tag' },
  { regex: /<\s*base\b/i, label: 'base tag' },
  { regex: /<\s*link\b[^>]*href/i, label: 'link tag with href' },
  { regex: /<\s*svg\b[^>]*\bon[a-z]/i, label: 'SVG with event handler' },
  { regex: /<\s*math\b[^>]*\bon[a-z]/i, label: 'MathML with event handler' },
  { regex: /<\s*body\b[^>]*\bon[a-z]/i, label: 'body with event handler' },
  { regex: /<\s*img\b[^>]*\bon[a-z]/i, label: 'img with event handler' },
  { regex: /<\s*video\b[^>]*\bon[a-z]/i, label: 'video with event handler' },
  { regex: /<\s*audio\b[^>]*\bon[a-z]/i, label: 'audio with event handler' },
  { regex: /<\s*input\b[^>]*\bon[a-z]/i, label: 'input with event handler' },
  { regex: /<\s*details\b[^>]*\bon[a-z]/i, label: 'details with event handler' },

  // CSS expression (IE legacy but still worth blocking)
  { regex: /expression\s*\(/i, label: 'CSS expression()' },
  { regex: /-moz-binding\s*:/i, label: 'CSS -moz-binding' },

  // Encoded / obfuscated XSS attempts
  { regex: /&#x0*6a;?&#x0*61;?&#x0*76;?&#x0*61;?/i, label: 'hex-encoded "java"' },
  { regex: /\\u006a\\u0061\\u0076\\u0061/i, label: 'unicode-escaped "java"' },
  { regex: /\x00/g, label: 'null byte' },
];

/**
 * Check whether a string contains potentially malicious code.
 *
 * @param {string} value – raw user input
 * @returns {{ safe: boolean, error?: string }}
 */
export function checkForMaliciousInput(value) {
  if (value == null || typeof value !== 'string') {
    return { safe: true };
  }

  // Normalize: collapse whitespace so attackers can't bypass with extra spaces
  const normalized = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''); // strip control chars

  for (const { regex, label } of DANGEROUS_PATTERNS) {
    if (regex.test(normalized)) {
      return {
        safe: false,
        error: `Input contains potentially dangerous content and cannot be saved.`,
        _detail: label, // internal detail – not shown to user
      };
    }
  }

  return { safe: true };
}

/**
 * Sanitize a free-text input value:
 * 1. Strips control characters (except newline/tab)
 * 2. Checks for malicious patterns → rejects if found
 * 3. Strips any remaining HTML tags (belt-and-suspenders)
 *
 * @param {string} value – raw user input
 * @returns {{ safe: boolean, sanitized?: string, error?: string }}
 */
export function sanitizeInput(value) {
  if (value == null || typeof value !== 'string') {
    return { safe: true, sanitized: '' };
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return { safe: true, sanitized: '' };
  }

  // Step 1 – strip invisible / zero-width characters
  let cleaned = trimmed
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')   // C0 control chars
    .replace(/[\u200B-\u200F\u2028-\u202F\u2060\uFEFF]/g, ''); // zero-width / directional

  // Step 2 – check for malicious patterns
  const check = checkForMaliciousInput(cleaned);
  if (!check.safe) {
    return { safe: false, error: check.error };
  }

  // Step 3 – strip any remaining HTML tags as a final safety net
  const stripped = cleaned.replace(/<[^>]*>/g, '');

  return { safe: true, sanitized: stripped };
}

/**
 * Strip null bytes and C0 control characters from a string.
 * PostgreSQL (and Supabase) do not allow null character in text fields ("null character not permitted").
 * Use this on any user-supplied string before sending to the database.
 *
 * @param {string} str
 * @returns {string}
 */
export function stripNullAndControlChars(str) {
  if (str == null || typeof str !== 'string') return str;
  return str
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Recursively clean all string values in an object (strip null bytes and control chars).
 * Use before supabase.from().insert() or .update() to avoid "null character not permitted".
 *
 * @param {object} obj - Plain object or value
 * @returns {object} - New object with cleaned strings (arrays and nested objects processed)
 */
export function cleanPayloadForDb(obj) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return stripNullAndControlChars(obj);
  if (Array.isArray(obj)) return obj.map((item) => cleanPayloadForDb(item));
  if (typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      out[key] = cleanPayloadForDb(obj[key]);
    }
    return out;
  }
  return obj;
}
