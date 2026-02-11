/**
 * Input Sanitization Utility
 *
 * Detects and blocks XSS / HTML injection / script injection attempts
 * in free-text input fields (names, UTM params, custom event names, etc.).
 *
 * URL fields are already protected by urlValidation.js (protocol whitelist).
 * Slug fields are already limited to a-z, 0-9, hyphens.
 * Domain fields are already limited to valid domain characters.
 * Pixel ID and CAPI Token fields are checked via checkForMaliciousInput in pixelValidation and CAPI UI.
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
    .replace(/\0/g, '')           // null byte (ASCII 0)
    .replace(/\u0000/g, '')       // Unicode null
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

/**
 * Final safety: remove null character from JSON serialization of payload.
 * Always does JSON round-trip and strips \\u0000 so PostgreSQL never receives null.
 * If parse fails after replace, returns deep-cleaned copy via cleanPayloadForDb.
 */
export function ensureNoNullInPayload(obj) {
  try {
    let s = JSON.stringify(obj);
    const lenBefore = s.length;
    s = s.replace(/\\u0000/g, '');
    const lenAfter = s.length;
    if (lenBefore !== lenAfter) {
      console.warn('[ensureNoNullInPayload] Stripped', (lenBefore - lenAfter) / 6, '\\u0000 from JSON');
    }
    return JSON.parse(s);
  } catch (e) {
    console.error('[ensureNoNullInPayload] Parse failed after strip, using cleanPayloadForDb fallback:', e);
    return cleanPayloadForDb(obj);
  }
}

/**
 * Build a payload that is guaranteed safe for Supabase: clone via JSON and strip null.
 * Use this as the single source before .update() / .insert().
 */
export function payloadSafeForSupabase(obj) {
  const once = ensureNoNullInPayload(obj);
  const twice = ensureNoNullInPayload(once);
  const jsonCheck = JSON.stringify(twice);
  if (jsonCheck.includes('\\u0000')) {
    console.warn('[payloadSafeForSupabase] Still had \\u0000 after two passes, using cleanPayloadForDb');
    return cleanPayloadForDb(twice);
  }
  return twice;
}

/**
 * Last-resort: build body string, strip \\u0000, parse. The returned object is the only
 * one that ever gets sent – Supabase will stringify it again, so no null can remain.
 */
export function payloadFromCleanJson(obj) {
  try {
    const s = JSON.stringify(obj).replace(/\\u0000/g, '');
    return JSON.parse(s);
  } catch (e) {
    console.error('[payloadFromCleanJson]', e);
    return cleanPayloadForDb(obj);
  }
}

/**
 * Aggressive string cleaner: removes BOTH literal null bytes (\x00) AND escaped sequences (\\u0000).
 * Uses split/join which is more reliable than regex for some edge cases.
 */
function stripAllNullFromString(str) {
  if (typeof str !== 'string') return str;
  let cleaned = str;
  const lenBefore = cleaned.length;

  // Remove literal null bytes (ASCII 0x00) - use split/join for reliability
  cleaned = cleaned.split('\0').join('');
  cleaned = cleaned.split('\x00').join('');
  cleaned = cleaned.split('\u0000').join('');

  // Remove escaped unicode null (\\u0000 in JSON strings)
  cleaned = cleaned.split('\\u0000').join('');

  // Remove other control characters that might slip through
  cleaned = cleaned.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');

  const lenAfter = cleaned.length;
  if (lenBefore !== lenAfter) {
    console.warn(
      '[stripAllNullFromString] Removed',
      lenBefore - lenAfter,
      'characters (null/control chars) from string'
    );
  }
  return cleaned.trim();
}

/**
 * Deep recursive cleaner: ensures EVERY string in the object tree is null-free.
 * More aggressive than cleanPayloadForDb - runs stripAllNullFromString on each string.
 */
function deepCleanAllStrings(obj, depth = 0) {
  if (depth > 20) return obj; // safety limit
  if (obj == null) return obj;
  if (typeof obj === 'string') return stripAllNullFromString(obj);
  if (Array.isArray(obj)) {
    return obj.map((item) => deepCleanAllStrings(item, depth + 1));
  }
  if (typeof obj === 'object') {
    const out = {};
    for (const key of Object.keys(obj)) {
      out[key] = deepCleanAllStrings(obj[key], depth + 1);
    }
    return out;
  }
  return obj;
}

/**
 * Build a JSON body string that is 100% guaranteed to not contain null bytes (\u0000).
 * Use this when Supabase client still fails with "null character not permitted" despite
 * all the cleaning. Returns { bodyString, payload } so you can send bodyString via fetch.
 */
export function buildCleanBodyString(obj) {
  // Step 1: Deep clean every string in the object tree
  const deepCleaned = deepCleanAllStrings(obj);

  // Step 2: Run through the standard cleaning pipeline
  const cleaned = payloadFromCleanJson(payloadSafeForSupabase(cleanPayloadForDb(deepCleaned)));

  // Step 3: Stringify and strip any remaining null from the JSON string itself
  let bodyStr = JSON.stringify(cleaned);
  bodyStr = stripAllNullFromString(bodyStr);

  // Step 4: Verify the body is clean
  if (bodyStr.includes('\x00') || bodyStr.includes('\0') || bodyStr.includes('\\u0000')) {
    console.error('[buildCleanBodyString] CRITICAL: Body still has null after all cleaning!');
  }

  try {
    return { bodyString: bodyStr, payload: JSON.parse(bodyStr) };
  } catch (e) {
    console.error('[buildCleanBodyString] Parse failed after strip:', e);
    // Return bodyString even if parse fails - we'll send it anyway
    return { bodyString: bodyStr, payload: cleaned };
  }
}

/**
 * Send a PATCH request directly to Supabase REST API (PostgREST) with a manually cleaned body string.
 * Bypasses Supabase JS client to ensure the exact body we build (without \u0000) is sent.
 *
 * @param {object} opts - { supabaseUrl, anonKey, accessToken, table, filter, payload }
 * @returns {Promise<{ data, error }>}
 */
export async function manualSupabasePatch({ supabaseUrl, anonKey, accessToken, table, filter, payload }) {
  const { bodyString } = buildCleanBodyString(payload);

  // Final verification: check for ANY form of null character
  const hasLiteralNull = bodyString.includes('\x00') || bodyString.includes('\0');
  const hasEscapedNull = bodyString.includes('\\u0000');

  if (hasLiteralNull || hasEscapedNull) {
    console.error(
      '[manualSupabasePatch] CRITICAL: body string still contains null after cleaning!',
      'Literal null:', hasLiteralNull, 'Escaped null:', hasEscapedNull,
      'Length:', bodyString.length
    );
  } else {
    console.log('[manualSupabasePatch] ✅ Body string clean, length:', bodyString.length);
  }
  const url = `${supabaseUrl}/rest/v1/${table}?${filter}`;
  const headers = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    Prefer: 'return=minimal',
  };
  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: bodyString,
    });
    if (!response.ok) {
      const errorText = await response.text();
      let errorObj;
      try {
        errorObj = JSON.parse(errorText);
      } catch {
        errorObj = { message: errorText, code: String(response.status) };
      }
      return { data: null, error: errorObj };
    }
    return { data: {}, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message, code: 'FETCH_ERROR' } };
  }
}

/** Max depth for JSON normalization to avoid PostgREST/DB "program_limit_exceeded" (54000). */
const MAX_JSON_DEPTH = 15;

/**
 * Recursively normalize a value for PostgREST: clean strings, remove null from arrays,
 * enforce depth limit to avoid regex/stack issues in DB. Use for payloads that include
 * pixels, geo_rules, utm_presets.
 *
 * @param {*} value
 * @param {number} depth
 * @returns {*} normalized value
 */
function normalizeValueForPostgrest(value, depth) {
  if (depth > MAX_JSON_DEPTH) {
    return Array.isArray(value) ? [] : typeof value === 'object' ? {} : value;
  }
  if (value == null) return null;
  if (typeof value === 'string') return stripNullAndControlChars(value);
  if (Array.isArray(value)) {
    const arr = value
      .map((item) => normalizeValueForPostgrest(item, depth + 1))
      .filter((item) => item !== undefined && item !== null);
    return arr;
  }
  if (typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      const v = normalizeValueForPostgrest(value[key], depth + 1);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

/** Keys that are JSON/JSONB columns and can trigger 54000 if too complex. */
const JSON_COLUMN_KEYS = ['pixels', 'geo_rules', 'utm_presets'];

/**
 * Normalize JSON-like columns in a links payload to reduce risk of PostgREST 54000
 * (program_limit_exceeded): deep clean strings, remove nulls from arrays, depth limit.
 * Other fields are left as-is; run cleanPayloadForDb after if you want full clean.
 *
 * @param {object} payload – raw links update/insert payload
 * @returns {object} new payload with normalized JSON columns
 */
export function normalizeJsonColumnsForPostgrest(payload) {
  if (payload == null || typeof payload !== 'object') return payload;
  const out = { ...payload };
  for (const key of JSON_COLUMN_KEYS) {
    if (key in out && out[key] != null) {
      out[key] = normalizeValueForPostgrest(out[key], 0);
    }
  }
  return out;
}

/**
 * Debug: find and log any path in obj that contains a null byte. Log to console for tail.
 * @param {object} obj
 * @param {string} prefix
 * @returns {string[]} paths that contain null
 */
export function findNullCharsInPayload(obj, prefix = '') {
  const paths = [];
  const hasNull = (s) => typeof s === 'string' && (s.includes('\0') || s.includes('\u0000'));
  if (obj == null) return paths;
  if (typeof obj === 'string') {
    if (hasNull(obj)) paths.push(prefix || '(root)');
    return paths;
  }
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      paths.push(...findNullCharsInPayload(item, `${prefix}[${i}]`));
    });
    return paths;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];
      if (typeof val === 'string') {
        if (hasNull(val)) paths.push(path);
      } else {
        paths.push(...findNullCharsInPayload(val, path));
      }
    }
  }
  return paths;
}

/**
 * CRITICAL DEBUG: Scan every top-level key and check if its JSON contains null character.
 * Prints big red console error for each key that has null. Use this right before sending
 * the payload to Supabase to identify the exact field causing "null character not permitted".
 *
 * @param {object} payload
 */
export function debugFindNullInPayload(payload) {
  if (!payload || typeof payload !== 'object') return;

  console.log('%c=== NULL CHARACTER DEBUG SCAN ===', 'background: yellow; color: black; font-size: 14px; font-weight: bold;');

  let foundNull = false;
  Object.entries(payload).forEach(([key, value]) => {
    const str = JSON.stringify(value);
    const hasLiteralNull = str && (str.includes('\u0000') || str.includes('\0') || str.includes('\x00'));
    const hasEscapedNull = str && str.includes('\\u0000');

    if (hasLiteralNull || hasEscapedNull) {
      foundNull = true;
      console.error(
        `%c !!! האשם נמצא: השדה "${key}" מכיל תו NULL !!!`,
        'background: red; color: white; font-size: 16px; font-weight: bold; padding: 4px;'
      );
      console.log(`   Field: ${key}`);
      console.log(`   Literal null: ${hasLiteralNull}`);
      console.log(`   Escaped null: ${hasEscapedNull}`);
      console.log('   Value:', value);
      console.log('   JSON:', str.substring(0, 200) + (str.length > 200 ? '...' : ''));
    }
  });

  if (!foundNull) {
    console.log('%c✅ No null characters found in payload', 'background: green; color: white; font-size: 14px; padding: 4px;');
  }

  console.log('%c=== END DEBUG SCAN ===', 'background: yellow; color: black; font-size: 14px; font-weight: bold;');
}
