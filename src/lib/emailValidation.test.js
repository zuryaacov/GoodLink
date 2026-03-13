import { describe, it, expect } from 'vitest';
import { isValidEmail } from './emailValidation.js';

describe('isValidEmail', () => {
  it('returns false for non-string or empty values', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
  });

  it('accepts a standard valid email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('rejects emails that are too long or invalid structurally', () => {
    const longLocal = `${'a'.repeat(65)}@example.com`;
    expect(isValidEmail(longLocal)).toBe(false);

    expect(isValidEmail('user@localhost')).toBe(false);
    expect(isValidEmail('user@example.c')).toBe(false);
  });
});

