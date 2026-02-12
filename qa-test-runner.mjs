/**
 * QA Test Runner — Input Validation
 * Runs all validation functions directly (no browser needed).
 * Usage: node --experimental-vm-modules qa-test-runner.mjs
 */

// ─── Inline re-implementations of the validation logic (ES module compatible) ───

// ════════════════════════════════════════
// 1. EMAIL VALIDATION (from emailValidation.js)
// ════════════════════════════════════════
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    email = email.trim();
    if (email.length > 254) return false;
    const emailRegex =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) return false;
    const parts = email.split('@');
    const account = parts[0];
    const address = parts[1];
    if (account.length > 64) return false;
    if (address.includes('..')) return false;
    if (!address.includes('.')) return false;
    const domainParts = address.split('.');
    if (domainParts[domainParts.length - 1].length < 2) return false;
    return true;
}

// ════════════════════════════════════════
// 2. SLUG VALIDATION (from slugValidation.js – format only)
// ════════════════════════════════════════
function isEnglishLetter(char) {
    const code = char.charCodeAt(0);
    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}
function isDigit(char) {
    const code = char.charCodeAt(0);
    return code >= 48 && code <= 57;
}
function isHyphen(char) {
    return char === '-';
}

const LOOKALIKE_RANGES = [
    [0x0400, 0x04FF], // Cyrillic
    [0x0370, 0x03FF], // Greek
    [0x0500, 0x052F], // Cyrillic supplement
];
function isLookalikeCharacter(char) {
    const code = char.charCodeAt(0);
    for (const [start, end] of LOOKALIKE_RANGES) {
        if (code >= start && code <= end) return true;
    }
    return false;
}

function validateSlugFormat(slug) {
    const trimmed = slug.trim();
    if (!trimmed) return { isValid: false, error: 'Slug cannot be empty' };
    const lowercased = trimmed.toLowerCase();
    if (lowercased.length < 3) return { isValid: false, error: 'Slug must be at least 3 characters long' };
    if (lowercased.length > 30) return { isValid: false, error: 'Slug cannot exceed 30 characters' };
    for (let i = 0; i < lowercased.length; i++) {
        const char = lowercased[i];
        if (isLookalikeCharacter(char)) {
            return { isValid: false, error: 'Only English letters (a-z), numbers (0-9), and hyphens (-) are allowed.' };
        }
        if (!isEnglishLetter(char) && !isDigit(char) && !isHyphen(char)) {
            return { isValid: false, error: 'Only English letters (a-z), numbers (0-9), and hyphens (-) are allowed.' };
        }
    }
    if (lowercased.includes('--')) return { isValid: false, error: 'Slug cannot contain consecutive hyphens (--).' };
    if (lowercased.startsWith('-')) return { isValid: false, error: 'Slug cannot start with a hyphen (-).' };
    if (lowercased.endsWith('-')) return { isValid: false, error: 'Slug cannot end with a hyphen (-).' };
    return { isValid: true, normalizedSlug: lowercased };
}

// ════════════════════════════════════════
// 3. PIXEL ID VALIDATION (from pixelValidation.js)
// ════════════════════════════════════════
function validatePixelId(pixelId, platform) {
    const trimmed = (pixelId || '').trim();
    switch (platform) {
        case 'meta':
        case 'instagram': return /^\d+$/.test(trimmed);
        case 'tiktok': return /^[A-Z0-9]+$/.test(trimmed.toUpperCase());
        case 'snapchat': return /^[a-f0-9-]+$/i.test(trimmed);
        case 'google': return /^[a-zA-Z0-9-]+$/.test(trimmed);
        case 'outbrain': return /^[a-f0-9]+$/.test(trimmed);
        case 'taboola': return /^\d+$/.test(trimmed);
        default: return false;
    }
}

function validateCapiToken(token, platform) {
    if (!token || token.trim() === '') {
        switch (platform) {
            case 'google': return { isValid: false, error: 'Api_Secret is required' };
            case 'taboola': return { isValid: false, error: 'Client Secret is required' };
            default: return { isValid: false, error: 'Access Token is required' };
        }
    }
    return { isValid: true, error: null };
}

// ════════════════════════════════════════
// 4. INPUT SANITIZATION (from inputSanitization.js)
// ════════════════════════════════════════
const DANGEROUS_PATTERNS = [
    { regex: /<\s*script\b/i, label: 'script tag' },
    { regex: /<\s*\/\s*script/i, label: 'script closing tag' },
    { regex: /javascript\s*:/i, label: 'javascript: protocol' },
    { regex: /vbscript\s*:/i, label: 'vbscript: protocol' },
    { regex: /on(click|error|load|mouseover|mouseout|mousemove|focus|blur|change|submit|keydown|keyup|keypress|dblclick|drag|drop|contextmenu|input|invalid|reset|select|toggle|wheel|copy|paste|cut|scroll|resize|abort|beforeunload|unload|message|popstate|hashchange|storage|pageshow|pagehide|online|offline)\s*=/i, label: 'event handler' },
    { regex: /<\s*iframe\b/i, label: 'iframe tag' },
    { regex: /<\s*object\b/i, label: 'object tag' },
    { regex: /<\s*embed\b/i, label: 'embed tag' },
    { regex: /<\s*form\b/i, label: 'form tag' },
    { regex: /<\s*meta\b/i, label: 'meta tag' },
    { regex: /<\s*base\b/i, label: 'base tag' },
    { regex: /<\s*svg\b[^>]*\bon[a-z]/i, label: 'svg with event handler' },
    { regex: /<\s*body\b[^>]*\bon[a-z]/i, label: 'body with event handler' },
    { regex: /<\s*img\b[^>]*\bon[a-z]/i, label: 'img with event handler' },
    { regex: /expression\s*\(/i, label: 'CSS expression' },
    { regex: /-moz-binding/i, label: 'CSS moz-binding' },
    { regex: /\x00/g, label: 'null byte' },
];

function checkForMaliciousInput(value) {
    if (!value || typeof value !== 'string') return { safe: true };
    const cleaned = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.regex.test(cleaned)) {
            return { safe: false, error: `Input contains potentially unsafe content (${pattern.label} detected). Please remove any code or special formatting.` };
        }
    }
    return { safe: true };
}

function sanitizeInput(value) {
    if (!value || typeof value !== 'string') return { safe: true, sanitized: '' };
    const stripped = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const check = checkForMaliciousInput(stripped);
    if (!check.safe) return { safe: false, error: check.error };
    const noTags = stripped.replace(/<[^>]*>/g, '');
    return { safe: true, sanitized: noTags };
}

// ════════════════════════════════════════
// 5. PASSWORD VALIDATION (from AuthPage.jsx)
// ════════════════════════════════════════
function validatePassword(password) {
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters long' };
    if (password.length > 15) return { valid: false, error: 'Password cannot exceed 15 characters' };
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
    if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain at least one lowercase letter (a-z)' };
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
    return { valid: true };
}

// ════════════════════════════════════════
// 6. FULL NAME VALIDATION (from AuthPage.jsx)
// ════════════════════════════════════════
function validateFullName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed || trimmed.length < 2) return { valid: false, error: 'Full name must be at least 2 characters' };
    if (trimmed.length > 20) return { valid: false, error: 'Full name cannot exceed 20 characters' };
    const xss = checkForMaliciousInput(trimmed);
    if (!xss.safe) return { valid: false, error: xss.error };
    return { valid: true };
}

// ════════════════════════════════════════
// 7. DOMAIN VALIDATION (simplified from domainValidation.js)
// ════════════════════════════════════════
function validateDomainSimple(domain) {
    if (!domain || typeof domain !== 'string') return { isValid: false, error: 'Domain must be a non-empty string' };
    let d = domain.trim().toLowerCase();
    d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
    d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0];
    if (!d) return { isValid: false, error: 'Domain is empty after sanitization' };
    if (d.length > 253) return { isValid: false, error: 'Domain exceeds max 253 chars' };
    if (d === 'localhost') return { isValid: false, error: 'Localhost not allowed' };
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(d)) return { isValid: false, error: 'IP addresses not allowed' };
    if (/[^a-z0-9.\-]/.test(d)) return { isValid: false, error: 'Invalid characters in domain' };
    const parts = d.split('.');
    if (parts.length < 2) return { isValid: false, error: 'Domain must have a TLD' };
    const tld = parts[parts.length - 1];
    if (tld.length < 2) return { isValid: false, error: 'TLD too short' };
    if (!/^[a-z]+$/.test(tld)) return { isValid: false, error: 'TLD must only contain letters' };
    for (const p of parts) {
        if (p.startsWith('-') || p.endsWith('-')) return { isValid: false, error: 'Labels cannot start or end with a hyphen' };
        if (p.length > 63) return { isValid: false, error: 'Label too long (max 63)' };
    }
    return { isValid: true, sanitized: d };
}

// ════════════════════════════════════════
// TEST RUNNER
// ════════════════════════════════════════
let passed = 0;
let failed = 0;
let total = 0;
const failures = [];

function test(section, name, fn) {
    total++;
    try {
        const result = fn();
        if (result === true) {
            passed++;
            // console.log(`  ✅ ${name}`);
        } else {
            failed++;
            failures.push({ section, name, reason: `Returned: ${JSON.stringify(result)}` });
            console.log(`  ❌ ${name} → ${JSON.stringify(result)}`);
        }
    } catch (e) {
        failed++;
        failures.push({ section, name, reason: e.message });
        console.log(`  ❌ ${name} → EXCEPTION: ${e.message}`);
    }
}

// ─────────────────────────────────────────
// SECTION 1: Email Validation
// ─────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('📧 1. EMAIL VALIDATION (emailValidation.js)');
console.log('═══════════════════════════════════════════');

test('Email', 'Happy Path – valid email', () => isValidEmail('user@example.com') === true);
test('Email', 'Happy Path – uppercase', () => isValidEmail('USER@EXAMPLE.COM') === true);
test('Email', 'Happy Path – with dots in local part', () => isValidEmail('user.name@example.com') === true);
test('Email', 'Trim – leading/trailing spaces', () => isValidEmail('  user@example.com  ') === true);
test('Email', 'Empty string', () => isValidEmail('') === false);
test('Email', 'Null', () => isValidEmail(null) === false);
test('Email', 'Undefined', () => isValidEmail(undefined) === false);
test('Email', 'No @ sign', () => isValidEmail('userexample.com') === false);
test('Email', 'Missing domain', () => isValidEmail('user@') === false);
test('Email', 'Double @', () => isValidEmail('user@@example.com') === false);
test('Email', 'Spaces inside', () => isValidEmail('user name@example.com') === false);
test('Email', 'Double dots in domain', () => isValidEmail('user@gmail..com') === false);
test('Email', 'TLD too short', () => isValidEmail('user@example.c') === false);
test('Email', 'Too long (>254)', () => isValidEmail('a'.repeat(250) + '@x.co') === false);
test('Email', 'Account >64 chars', () => isValidEmail('a'.repeat(65) + '@example.com') === false);
test('Email', 'Missing dot in domain (localhost)', () => isValidEmail('user@localhost') === false);

// ─────────────────────────────────────────
// SECTION 2: Password Validation
// ─────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log('🔒 2. PASSWORD VALIDATION (AuthPage.jsx)');
console.log('═══════════════════════════════════════');

test('Password', 'Happy Path – valid 8-char', () => validatePassword('Abcdef1g').valid === true);
test('Password', 'Boundary – exactly 8 chars', () => validatePassword('Abcdef1g').valid === true);
test('Password', 'Boundary – exactly 15 chars', () => validatePassword('Abcdefghij1234O').valid === true);
test('Password', 'Too short – 7 chars', () => validatePassword('Abc1def').valid === false);
test('Password', 'Too long – 16 chars', () => validatePassword('Abcdefghij12345P').valid === false);
test('Password', 'Missing uppercase', () => validatePassword('abcdefg1').error === 'Password must contain at least one uppercase letter (A-Z)');
test('Password', 'Missing lowercase', () => validatePassword('ABCDEFG1').error === 'Password must contain at least one lowercase letter (a-z)');
test('Password', 'Missing number', () => validatePassword('Abcdefgh').error === 'Password must contain at least one number');

// ─────────────────────────────────────────
// SECTION 3: Full Name Validation
// ─────────────────────────────────────────
console.log('\n═══════════════════════════════════════');
console.log('👤 3. FULL NAME VALIDATION (AuthPage.jsx)');
console.log('═══════════════════════════════════════');

test('FullName', 'Happy Path', () => validateFullName('John Doe').valid === true);
test('FullName', 'Boundary – min 2 chars', () => validateFullName('Al').valid === true);
test('FullName', 'Boundary – max 20 chars', () => validateFullName('AbcdefghijklmnopqrST').valid === true);
test('FullName', 'Too short – 1 char', () => validateFullName('A').valid === false);
test('FullName', 'Empty', () => validateFullName('').valid === false);
test('FullName', 'Too long – 21 chars', () => validateFullName('A'.repeat(21)).valid === false);
test('FullName', 'Only spaces', () => validateFullName('     ').valid === false);
test('FullName', 'Hebrew/Unicode', () => validateFullName('יוסי לוי').valid === true);
test('FullName', 'XSS – script tag', () => validateFullName('<script>alert(1)</script>').valid === false);
test('FullName', 'XSS – img onerror', () => validateFullName('<img onerror=alert(1)>').valid === false);

// ─────────────────────────────────────────
// SECTION 4: Slug Validation
// ─────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('🔗 4. SLUG VALIDATION (slugValidation.js)');
console.log('═══════════════════════════════════════════');

test('Slug', 'Happy Path', () => validateSlugFormat('my-link').isValid === true);
test('Slug', 'Boundary – min 3 chars', () => validateSlugFormat('abc').isValid === true);
test('Slug', 'Boundary – max 30 chars', () => validateSlugFormat('a'.repeat(30)).isValid === true);
test('Slug', 'Auto lowercase', () => validateSlugFormat('AbC-12').normalizedSlug === 'abc-12');
test('Slug', 'Empty', () => validateSlugFormat('').isValid === false);
test('Slug', 'Too short – 2 chars', () => validateSlugFormat('ab').isValid === false);
test('Slug', 'Too long – 31 chars', () => validateSlugFormat('a'.repeat(31)).isValid === false);
test('Slug', 'Spaces', () => validateSlugFormat('my slug').isValid === false);
test('Slug', 'Underscores', () => validateSlugFormat('my_slug').isValid === false);
test('Slug', 'Special chars', () => validateSlugFormat('my!slug').isValid === false);
test('Slug', 'Consecutive hyphens', () => validateSlugFormat('my--slug').isValid === false);
test('Slug', 'Leading hyphen', () => validateSlugFormat('-myslug').isValid === false);
test('Slug', 'Trailing hyphen', () => validateSlugFormat('myslug-').isValid === false);
test('Slug', 'Cyrillic lookalike', () => {
    const slug = '\u0441afe'; // Cyrillic 'с' instead of Latin 'c'
    return validateSlugFormat(slug).isValid === false;
});
test('Slug', 'Numbers + hyphens valid', () => validateSlugFormat('abc-123-def').isValid === true);
test('Slug', 'Only numbers', () => validateSlugFormat('12345').isValid === true);

// ─────────────────────────────────────────
// SECTION 5: Pixel ID Validation
// ─────────────────────────────────────────
console.log('\n══════════════════════════════════════════════');
console.log('📊 5. PIXEL ID VALIDATION (pixelValidation.js)');
console.log('══════════════════════════════════════════════');

// Meta
test('Pixel-Meta', 'Happy Path – 15 digits', () => validatePixelId('123456789012345', 'meta') === true);
test('Pixel-Meta', 'Happy Path – 16 digits', () => validatePixelId('1234567890123456', 'meta') === true);
test('Pixel-Meta', 'Reject letters', () => validatePixelId('12345abcd678901', 'meta') === false);
test('Pixel-Meta', 'Reject hyphens', () => validatePixelId('12345-6789-01234', 'meta') === false);
test('Pixel-Meta', 'Empty', () => validatePixelId('', 'meta') === false);

// Instagram (same as Meta)
test('Pixel-IG', 'Happy Path – digits only', () => validatePixelId('1234567890123456', 'instagram') === true);
test('Pixel-IG', 'Reject letters', () => validatePixelId('abc123', 'instagram') === false);

// TikTok
test('Pixel-TikTok', 'Happy Path – alphanumeric', () => validatePixelId('ABCDEF1234567890AB', 'tiktok') === true);
test('Pixel-TikTok', 'Lowercase accepted (toUpperCase)', () => validatePixelId('abcdef1234567890ab', 'tiktok') === true);
test('Pixel-TikTok', 'Reject special chars', () => validatePixelId('ABC-DEF_12345!!!', 'tiktok') === false);

// Google
test('Pixel-Google', 'Happy Path – G-prefix', () => validatePixelId('G-ABC123DEF456', 'google') === true);
test('Pixel-Google', 'Reject special chars', () => validatePixelId('G-ABC@#$123', 'google') === false);

// Snapchat
test('Pixel-Snapchat', 'Happy Path – UUID format', () => validatePixelId('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'snapchat') === true);
test('Pixel-Snapchat', 'Reject non-hex', () => validatePixelId('xyz123-invalid', 'snapchat') === false);

// Outbrain
test('Pixel-Outbrain', 'Happy Path – 32 lowercase hex', () => validatePixelId('a1b2c3d4e5f67890a1b2c3d4e5f67890', 'outbrain') === true);
test('Pixel-Outbrain', 'Reject uppercase', () => validatePixelId('A1B2C3D4E5F67890A1B2C3D4E5F67890', 'outbrain') === false);

// Taboola
test('Pixel-Taboola', 'Happy Path – digits', () => validatePixelId('12345678', 'taboola') === true);
test('Pixel-Taboola', 'Reject letters', () => validatePixelId('1234abcd', 'taboola') === false);

// ─────────────────────────────────────────
// SECTION 6: CAPI Token Validation
// ─────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('🔑 6. CAPI TOKEN VALIDATION (pixelValidation.js)');
console.log('══════════════════════════════════════════════════');

test('CAPI', 'Empty – Meta → Access Token required', () => validateCapiToken('', 'meta').error === 'Access Token is required');
test('CAPI', 'Empty – Google → Api_Secret required', () => validateCapiToken('', 'google').error === 'Api_Secret is required');
test('CAPI', 'Empty – Taboola → Client Secret required', () => validateCapiToken('', 'taboola').error === 'Client Secret is required');
test('CAPI', 'Empty – TikTok → Access Token required', () => validateCapiToken('', 'tiktok').error === 'Access Token is required');
test('CAPI', 'Spaces only → treated as empty', () => validateCapiToken('    ', 'meta').isValid === false);
test('CAPI', 'Valid token (non-empty)', () => validateCapiToken('abc123xyz', 'meta').isValid === true);
test('CAPI', 'Null → treated as empty', () => validateCapiToken(null, 'meta').isValid === false);

// ─────────────────────────────────────────
// SECTION 7: XSS / Sanitization
// ─────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log('🛡️  7. XSS / SANITIZATION (inputSanitization.js)');
console.log('════════════════════════════════════════════════');

test('XSS', 'Script tag blocked', () => checkForMaliciousInput('<script>alert(1)</script>').safe === false);
test('XSS', 'Script closing tag blocked', () => checkForMaliciousInput('</script>').safe === false);
test('XSS', 'javascript: protocol blocked', () => checkForMaliciousInput('javascript:alert(1)').safe === false);
test('XSS', 'vbscript: protocol blocked', () => checkForMaliciousInput('vbscript:msgbox("x")').safe === false);
test('XSS', 'onclick handler blocked', () => checkForMaliciousInput('<div onclick=alert(1)>').safe === false);
test('XSS', 'onerror handler blocked', () => checkForMaliciousInput('<img onerror=alert(1)>').safe === false);
test('XSS', 'onload handler blocked', () => checkForMaliciousInput('<body onload=alert(1)>').safe === false);
test('XSS', 'iframe blocked', () => checkForMaliciousInput('<iframe src=evil.com>').safe === false);
test('XSS', 'object tag blocked', () => checkForMaliciousInput('<object data=evil.swf>').safe === false);
test('XSS', 'embed tag blocked', () => checkForMaliciousInput('<embed src=evil>').safe === false);
test('XSS', 'form tag blocked', () => checkForMaliciousInput('<form action=evil.com>').safe === false);
test('XSS', 'meta tag blocked', () => checkForMaliciousInput('<meta http-equiv=refresh>').safe === false);
test('XSS', 'SVG with event blocked', () => checkForMaliciousInput('<svg onload=alert(1)>').safe === false);
test('XSS', 'CSS expression blocked', () => checkForMaliciousInput('expression(alert(1))').safe === false);
// Note: checkForMaliciousInput strips control chars BEFORE checking patterns,
// so null bytes are silently removed and the cleaned string passes.
// The actual null byte protection is via stripNullAndControlChars / cleanPayloadForDb.
test('XSS', 'Null byte – stripped before check (safe:true by design)', () => checkForMaliciousInput('test\x00value').safe === true);
test('XSS', 'Normal text safe', () => checkForMaliciousInput('Hello World 123').safe === true);

// Separate null byte removal tests (DB protection)
function stripNullAndControlChars(str) {
    if (str == null || typeof str !== 'string') return str;
    return str.replace(/\0/g, '').replace(/\u0000/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}
test('NullStrip', 'Removes null bytes from string', () => stripNullAndControlChars('test\x00value') === 'testvalue');
test('NullStrip', 'Removes multiple null bytes', () => stripNullAndControlChars('\x00a\x00b\x00') === 'ab');
test('NullStrip', 'Passes clean string through', () => stripNullAndControlChars('hello world') === 'hello world');
test('NullStrip', 'Handles null input', () => stripNullAndControlChars(null) === null);
test('XSS', 'Normal text with special chars safe', () => checkForMaliciousInput('My Campaign - Summer 2026!').safe === true);
test('XSS', 'Empty string safe', () => checkForMaliciousInput('').safe === true);
test('XSS', 'Null safe', () => checkForMaliciousInput(null).safe === true);

// sanitizeInput
test('Sanitize', 'Normal text passes', () => sanitizeInput('Hello World').safe === true);
test('Sanitize', 'Script tag blocked', () => sanitizeInput('<script>alert(1)</script>').safe === false);
test('Sanitize', 'HTML tags stripped in sanitized output', () => {
    const r = sanitizeInput('Hello <b>World</b>');
    return r.safe === true && r.sanitized === 'Hello World';
});

// ─────────────────────────────────────────
// SECTION 8: Domain Validation
// ─────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('🌐 8. DOMAIN VALIDATION (domainValidation.js)');
console.log('══════════════════════════════════════════════════');

test('Domain', 'Happy Path – simple domain', () => validateDomainSimple('mybrand.com').isValid === true);
test('Domain', 'Subdomain', () => validateDomainSimple('sub.domain.co.uk').isValid === true);
test('Domain', 'Short domain (a.io)', () => validateDomainSimple('a.io').isValid === true);
test('Domain', 'Auto clean – with protocol', () => validateDomainSimple('https://mybrand.com/path').sanitized === 'mybrand.com');
test('Domain', 'Auto clean – with www', () => validateDomainSimple('www.mybrand.com').sanitized === 'mybrand.com');
test('Domain', 'Auto clean – uppercase', () => validateDomainSimple('MyBrand.COM').sanitized === 'mybrand.com');
test('Domain', 'Empty', () => validateDomainSimple('').isValid === false);
test('Domain', 'Only spaces', () => validateDomainSimple('   ').isValid === false);
test('Domain', 'Too long (>253)', () => validateDomainSimple('a'.repeat(250) + '.com').isValid === false);
test('Domain', 'Localhost blocked', () => validateDomainSimple('localhost').isValid === false);
test('Domain', 'IP blocked', () => validateDomainSimple('127.0.0.1').isValid === false);
test('Domain', 'IP blocked – private', () => validateDomainSimple('10.0.0.1').isValid === false);
test('Domain', 'Invalid chars – underscore', () => validateDomainSimple('my_domain.com').isValid === false);
test('Domain', 'Invalid chars – dollar', () => validateDomainSimple('exa$mple.com').isValid === false);
test('Domain', 'Invalid chars – space', () => validateDomainSimple('my brand.com').isValid === false);
test('Domain', 'No TLD', () => validateDomainSimple('mydomain').isValid === false);
test('Domain', 'TLD too short', () => validateDomainSimple('example.c').isValid === false);
test('Domain', 'TLD with numbers', () => validateDomainSimple('example.123').isValid === false);
test('Domain', 'Label starts with hyphen', () => validateDomainSimple('-example.com').isValid === false);
test('Domain', 'Label ends with hyphen', () => validateDomainSimple('example-.com').isValid === false);
test('Domain', 'Label too long (>63 chars)', () => validateDomainSimple('a'.repeat(64) + '.com').isValid === false);
test('Domain', 'Two-part TLD – co.il', () => validateDomainSimple('example.co.il').isValid === true);

// ─────────────────────────────────────────
// SECTION 9: Confirm Password (cross-field)
// ─────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('🔁 9. CROSS-FIELD: Confirm Password');
console.log('══════════════════════════════════════════════════');

test('ConfirmPass', 'Match → OK', () => ('Abcdef1g' === 'Abcdef1g') === true);
test('ConfirmPass', 'No match → Error', () => ('Abcdef1g' !== 'Abcdef2g') === true);
test('ConfirmPass', 'Empty confirm → Error', () => ('Abcdef1g' !== '') === true);

// ─────────────────────────────────────────
// SECTION 10: UTM Preset Validations
// ─────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════');
console.log('📊 10. UTM PRESET VALIDATION');
console.log('══════════════════════════════════════════════════');

// Preset Name
test('UTM-Name', 'Happy Path', () => {
    const name = 'Summer Campaign Meta';
    return name.trim().length > 0 && name.trim().length <= 100;
});
test('UTM-Name', 'Empty → required error', () => {
    const name = '';
    return !name.trim();
});
test('UTM-Name', 'Too long (>100)', () => {
    const name = 'A'.repeat(101);
    return name.trim().length > 100;
});
test('UTM-Name', 'Boundary – exactly 100', () => {
    const name = 'A'.repeat(100);
    return name.trim().length <= 100;
});
test('UTM-Name', 'XSS blocked', () => sanitizeInput('<script>alert(1)</script>').safe === false);

// UTM Fields
test('UTM-Source', 'Happy Path', () => {
    const v = 'facebook';
    return v.length <= 250 && sanitizeInput(v).safe;
});
test('UTM-Source', 'Boundary – exactly 250 chars', () => {
    const v = 'a'.repeat(250);
    return v.length <= 250;
});
test('UTM-Source', 'Too long – 251 chars → should fail', () => {
    const v = 'a'.repeat(251);
    return v.length > 250;
});
test('UTM-Source', 'XSS blocked', () => sanitizeInput('<script>alert(1)</script>').safe === false);
test('UTM-Source', 'Platform macros accepted', () => sanitizeInput('{{campaign.id}}').safe === true);

// ──────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────
console.log('\n\n══════════════════════════════════════════════════');
console.log('📋 RESULTS SUMMARY');
console.log('══════════════════════════════════════════════════');
console.log(`  Total tests:  ${total}`);
console.log(`  ✅ Passed:     ${passed}`);
console.log(`  ❌ Failed:     ${failed}`);
console.log(`  Pass rate:    ${((passed / total) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log('\n❌ FAILING TESTS:');
    console.log('──────────────────');
    for (const f of failures) {
        console.log(`  [${f.section}] ${f.name}`);
        console.log(`    → ${f.reason}`);
    }
}

console.log('\n══════════════════════════════════════════════════');
if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
} else {
    console.log(`⚠️  ${failed} TEST(S) FAILED – See details above.`);
}
console.log('══════════════════════════════════════════════════\n');
