import { describe, it, expect } from 'vitest';
import { validateDomain } from './domainValidation.js';

describe('validateDomain', () => {
  it('rejects empty or non-string domains', () => {
    const res = validateDomain('');
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Domain must be a non-empty string');
  });

  it('sanitizes protocol and path and validates basic domains', () => {
    const res = validateDomain('https://Example.com/some/path?query=1');
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe('example.com');
  });

  it('blocks internal goodlink infrastructure domains', () => {
    const res = validateDomain('links.goodlink.ai');
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('This domain cannot be used.');
  });

  it('rejects localhost and IPs by default', () => {
    expect(validateDomain('localhost').isValid).toBe(false);
    expect(validateDomain('127.0.0.1').isValid).toBe(false);
  });

  it('enforces TLD presence and structure', () => {
    const noTld = validateDomain('example');
    expect(noTld.isValid).toBe(false);
    expect(noTld.error).toContain('must have a TLD');

    const badTld = validateDomain('example.c');
    expect(badTld.isValid).toBe(false);
    expect(badTld.error).toContain('at least 2 characters');
  });
});

