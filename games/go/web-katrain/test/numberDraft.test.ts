import { describe, expect, it } from 'vitest';
import { parseIntegerDraft } from '../src/utils/numberDraft';

describe('number draft parsing', () => {
  it('accepts whole non-negative integer drafts', () => {
    expect(parseIntegerDraft('0')).toBe(0);
    expect(parseIntegerDraft('12')).toBe(12);
    expect(parseIntegerDraft(' 003 ')).toBe(3);
  });

  it('rejects partial, fractional, negative, empty, and unsafe drafts', () => {
    expect(parseIntegerDraft('')).toBeNull();
    expect(parseIntegerDraft('2abc')).toBeNull();
    expect(parseIntegerDraft('1e2')).toBeNull();
    expect(parseIntegerDraft('1.5')).toBeNull();
    expect(parseIntegerDraft('-1')).toBeNull();
    expect(parseIntegerDraft('9007199254740992')).toBeNull();
  });
});
