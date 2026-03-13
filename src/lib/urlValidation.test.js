import { describe, it, expect } from 'vitest';
import { validateUrl } from './urlValidation.js';

describe('validateUrl', () => {
  it('returns error for empty input', () => {
    const result = validateUrl('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('URL cannot be empty');
  });

  it('normalizes common protocol typos and missing protocol', () => {
    const httpsSingleSlash = validateUrl('https:/google.com');
    expect(httpsSingleSlash.isValid).toBe(true);
    expect(httpsSingleSlash.normalizedUrl).toBe('https://google.com');

    const noProtocol = validateUrl('google.com');
    expect(noProtocol.isValid).toBe(true);
    expect(noProtocol.normalizedUrl).toBe('https://google.com');
  });

  it('rejects URLs with spaces or invalid characters', () => {
    const withSpaces = validateUrl('https://exa mple.com');
    expect(withSpaces.isValid).toBe(false);
    expect(withSpaces.error).toBe('URL cannot contain spaces');

    const withInvalidChars = validateUrl('https://example.com<');
    expect(withInvalidChars.isValid).toBe(false);
    expect(withInvalidChars.error).toBe('URL contains invalid characters');
  });

  it('rejects URLs with invalid protocol', () => {
    const res = validateUrl('ftp://example.com');
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Invalid protocol');
  });

  it('blocks internal and URL-shortener domains', () => {
    const internal = validateUrl('https://goodlink.ai/some-path');
    expect(internal.isValid).toBe(false);
    // הודעת שגיאה ידידותית על URL חסום
    expect(internal.error).toContain('blocked URL');

    const bitly = validateUrl('https://bit.ly/abc123');
    expect(bitly.isValid).toBe(false);
    expect(bitly.error).toContain('blocked URL');
  });
});

