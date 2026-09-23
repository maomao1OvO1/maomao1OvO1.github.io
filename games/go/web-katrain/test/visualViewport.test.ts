import { describe, expect, it, vi } from 'vitest';
import { getVisualKeyboardInset, getVisualViewport } from '../src/utils/visualViewport';

describe('visual viewport helpers', () => {
  it('returns a viewport only when event listeners are available', () => {
    const viewport = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    expect(getVisualViewport({ visualViewport: viewport })).toBe(viewport);
    expect(getVisualViewport({ visualViewport: null })).toBeNull();
    expect(getVisualViewport({ visualViewport: {} as VisualViewport })).toBeNull();
  });

  it('treats blocked visualViewport access as unavailable', () => {
    const source = {};
    Object.defineProperty(source, 'visualViewport', {
      configurable: true,
      get() {
        throw new Error('visualViewport blocked');
      },
    });

    expect(getVisualViewport(source)).toBeNull();
  });

  it('computes the keyboard inset from visual viewport occlusion', () => {
    const viewport = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      height: 520,
      offsetTop: 20,
    };

    expect(getVisualKeyboardInset({ innerHeight: 800, visualViewport: viewport })).toBe(260);
  });

  it('clamps missing or expanded visual viewport measurements', () => {
    const viewport = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      height: 900,
      offsetTop: 0,
    };

    expect(getVisualKeyboardInset({ innerHeight: 800, visualViewport: viewport })).toBe(0);
    expect(getVisualKeyboardInset({ innerHeight: 800, visualViewport: null })).toBe(0);
  });
});
