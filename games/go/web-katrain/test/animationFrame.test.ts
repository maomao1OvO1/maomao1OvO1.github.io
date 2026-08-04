import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  afterAnimationFrames,
  cancelAnimationFrameSafe,
  getAnimationFrameApi,
  getAnimationNow,
  requestAnimationFrameSafe,
} from '../src/utils/animationFrame';

const originalRequestAnimationFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
const originalCancelAnimationFrame = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame');
const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance');

function restoreDescriptor(name: 'requestAnimationFrame' | 'cancelAnimationFrame' | 'performance', descriptor: PropertyDescriptor | undefined) {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    Reflect.deleteProperty(globalThis, name);
  }
}

describe('animation frame helpers', () => {
  afterEach(() => {
    restoreDescriptor('requestAnimationFrame', originalRequestAnimationFrame);
    restoreDescriptor('cancelAnimationFrame', originalCancelAnimationFrame);
    restoreDescriptor('performance', originalPerformance);
    vi.useRealTimers();
    vi.restoreAllMocks();
    restoreDescriptor('requestAnimationFrame', originalRequestAnimationFrame);
    restoreDescriptor('cancelAnimationFrame', originalCancelAnimationFrame);
    restoreDescriptor('performance', originalPerformance);
  });

  it('uses requestAnimationFrame when available and cancels by handle', () => {
    const requestAnimationFrame = vi.fn(() => 42);
    const cancelAnimationFrame = vi.fn();
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: requestAnimationFrame,
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: cancelAnimationFrame,
    });

    expect(getAnimationFrameApi()).not.toBeNull();
    const callback = vi.fn();
    const handle = requestAnimationFrameSafe(callback);

    expect(handle).toEqual({ kind: 'raf', id: 42 });
    expect(requestAnimationFrame).toHaveBeenCalledWith(callback);

    cancelAnimationFrameSafe(handle);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });

  it('falls back to a timeout when animation frame access is blocked', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      get() {
        throw new Error('raf blocked');
      },
    });
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      get() {
        throw new Error('cancel blocked');
      },
    });

    const callback = vi.fn();
    const handle = requestAnimationFrameSafe(callback);
    expect(handle.kind).toBe('timeout');

    vi.advanceTimersByTime(15);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    const cancelled = requestAnimationFrameSafe(callback);
    cancelAnimationFrameSafe(cancelled);
    vi.advanceTimersByTime(16);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('waits for multiple frames on the timeout fallback', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
    Reflect.deleteProperty(globalThis, 'cancelAnimationFrame');

    let resolved = false;
    const promise = afterAnimationFrames(2).then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(16);
    await Promise.resolve();
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(16);
    await promise;
    expect(resolved).toBe(true);
  });

  it('falls back to Date.now when performance access is blocked', () => {
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      get() {
        throw new Error('performance blocked');
      },
    });

    expect(Number.isFinite(getAnimationNow())).toBe(true);
  });
});
