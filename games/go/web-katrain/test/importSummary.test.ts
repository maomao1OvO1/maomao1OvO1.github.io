import { describe, expect, it } from 'vitest';
import { appendRestoredAnalysisSummary, formatRestoredAnalysisSuffix } from '../src/utils/importSummary';

describe('import summary helpers', () => {
  it('formats restored analysis counts for loaded SGFs', () => {
    expect(formatRestoredAnalysisSuffix(0)).toBe('');
    expect(formatRestoredAnalysisSuffix(0.9)).toBe('');
    expect(formatRestoredAnalysisSuffix(Number.NaN)).toBe('');
    expect(formatRestoredAnalysisSuffix(1)).toBe('with 1 restored analysis');
    expect(formatRestoredAnalysisSuffix(2)).toBe('with 2 restored analyses');
    expect(formatRestoredAnalysisSuffix(2.9)).toBe('with 2 restored analyses');
  });

  it('appends restored analysis summaries without double punctuation', () => {
    expect(appendRestoredAnalysisSummary('Loaded SGF.', 0)).toBe('Loaded SGF.');
    expect(appendRestoredAnalysisSummary('Loaded SGF.', 1)).toBe('Loaded SGF with 1 restored analysis.');
    expect(appendRestoredAnalysisSummary('Downloaded OGS game 123.', 3)).toBe(
      'Downloaded OGS game 123 with 3 restored analyses.'
    );
  });
});
