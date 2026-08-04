import { describe, expect, it } from 'vitest';
import { buildCommitUrl } from '../src/utils/appInfo';

describe('app info', () => {
  it('builds GitHub commit URLs for real commit hashes', () => {
    expect(buildCommitUrl('abcdef1')).toBe('https://github.com/Sir-Teo/web-katrain/commit/abcdef1');
    expect(buildCommitUrl('1234567890abcdef1234567890abcdef12345678')).toBe(
      'https://github.com/Sir-Teo/web-katrain/commit/1234567890abcdef1234567890abcdef12345678'
    );
  });

  it('omits commit links for dev or malformed build identifiers', () => {
    expect(buildCommitUrl('dev')).toBeNull();
    expect(buildCommitUrl('main')).toBeNull();
    expect(buildCommitUrl('abc')).toBeNull();
    expect(buildCommitUrl('abcdefg')).toBeNull();
  });
});
