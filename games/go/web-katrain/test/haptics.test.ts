import { describe, expect, it, vi } from 'vitest';
import { playNavigationHaptic, playStoneHaptic, vibrateSafe } from '../src/utils/haptics';

describe('haptic helpers', () => {
  it('uses vibration when the browser exposes it', () => {
    const vibrate = vi.fn(() => true);
    const target = { vibrate } as unknown as Navigator;

    expect(playStoneHaptic(target)).toBe(true);
    expect(playNavigationHaptic(target)).toBe(true);
    expect(vibrate).toHaveBeenNthCalledWith(1, 12);
    expect(vibrate).toHaveBeenNthCalledWith(2, 8);
  });

  it('treats missing or blocked vibration as unsupported', () => {
    const blocked = {} as Navigator;
    Object.defineProperty(blocked, 'vibrate', {
      configurable: true,
      get() {
        throw new Error('vibration blocked');
      },
    });

    expect(vibrateSafe(10, null)).toBe(false);
    expect(vibrateSafe(10, {} as Navigator)).toBe(false);
    expect(vibrateSafe(10, blocked)).toBe(false);
  });
});
