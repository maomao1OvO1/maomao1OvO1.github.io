import { describe, expect, it } from 'vitest';
import { getPlayerLabel, getResignResult, getResignWinnerLabel } from '../src/utils/resign';

describe('resign helpers', () => {
  it('maps the resigning player to the SGF result', () => {
    expect(getResignResult('black')).toBe('W+R');
    expect(getResignResult('white')).toBe('B+R');
  });

  it('formats player and winner labels for confirmation UI', () => {
    expect(getPlayerLabel('black')).toBe('Black');
    expect(getPlayerLabel('white')).toBe('White');
    expect(getResignWinnerLabel('black')).toBe('White');
    expect(getResignWinnerLabel('white')).toBe('Black');
  });
});
