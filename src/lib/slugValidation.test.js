import { describe, it, expect } from 'vitest';
import { validateSlugFormat } from './slugValidation.js';

describe('validateSlugFormat', () => {
  it('rejects empty or whitespace-only slugs', () => {
    const res = validateSlugFormat('   ');
    expect(res.isValid).toBe(false);
    expect(res.error).toBe('Slug cannot be empty');
  });

  it('enforces length between 3 and 30 characters', () => {
    const tooShort = validateSlugFormat('ab');
    expect(tooShort.isValid).toBe(false);
    expect(tooShort.error).toContain('at least 3');

    const tooLong = validateSlugFormat('a'.repeat(31));
    expect(tooLong.isValid).toBe(false);
    expect(tooLong.error).toContain('cannot exceed 30');
  });

  it('allows only english letters, digits and hyphens, and lowercases automatically', () => {
    const ok = validateSlugFormat('AbC-123');
    expect(ok.isValid).toBe(true);
    expect(ok.normalizedSlug).toBe('abc-123');

    const invalid = validateSlugFormat('abc_123');
    expect(invalid.isValid).toBe(false);
    expect(invalid.error).toContain('Only English letters');
  });

  it('rejects consecutive or edge hyphens', () => {
    const consecutive = validateSlugFormat('abc--123');
    expect(consecutive.isValid).toBe(false);
    expect(consecutive.error).toBe('Slug cannot contain consecutive hyphens (--).');

    const leading = validateSlugFormat('-abc');
    expect(leading.isValid).toBe(false);
    expect(leading.error).toBe('Slug cannot start with a hyphen (-).');

    const trailing = validateSlugFormat('abc-');
    expect(trailing.isValid).toBe(false);
    expect(trailing.error).toBe('Slug cannot end with a hyphen (-).');
  });
});

