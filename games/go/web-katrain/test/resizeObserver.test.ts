import { afterEach, describe, expect, it } from 'vitest';
import { getResizeObserverConstructor } from '../src/utils/resizeObserver';

const originalResizeObserver = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');

function restoreResizeObserver() {
  if (originalResizeObserver) {
    Object.defineProperty(globalThis, 'ResizeObserver', originalResizeObserver);
  } else {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
}

describe('resize observer helpers', () => {
  afterEach(() => {
    restoreResizeObserver();
  });

  it('returns the ResizeObserver constructor when available', () => {
    class FakeResizeObserver {}
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: FakeResizeObserver,
    });

    expect(getResizeObserverConstructor()).toBe(FakeResizeObserver);
  });

  it('treats missing or blocked ResizeObserver access as unavailable', () => {
    Reflect.deleteProperty(globalThis, 'ResizeObserver');
    expect(getResizeObserverConstructor()).toBeNull();

    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      get() {
        throw new Error('resize observer blocked');
      },
    });
    expect(getResizeObserverConstructor()).toBeNull();
  });
});
