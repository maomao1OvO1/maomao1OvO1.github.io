import { describe, expect, it } from 'vitest';
import { getEngineModelLabel } from '../src/utils/engineLabel';

describe('engine model labels', () => {
  it('prefers the parsed engine model name', () => {
    expect(getEngineModelLabel('kata1-b18', 'blob:abc')).toBe('kata1-b18');
    expect(getEngineModelLabel('kata1\u202efgs', '/models/fallback.bin.gz')).toBe('kata1fgs');
  });

  it('uses a readable fallback for uploaded blob model URLs', () => {
    expect(getEngineModelLabel(null, 'blob:https://app.local/abc')).toBe('Uploaded weights');
  });

  it('falls back to the decoded model URL filename', () => {
    expect(getEngineModelLabel(null, '/models/kata%20small.bin.gz?cache=1')).toBe('kata small.bin.gz');
    expect(getEngineModelLabel(null, '/models/review%E2%80%AEfgs.bin.gz?cache=1')).toBe('reviewfgs.bin.gz');
  });
});
