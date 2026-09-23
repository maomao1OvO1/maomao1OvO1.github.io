import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getKataGoWarmupFallbackBackend,
  normalizeKataGoBackendPreference,
  shouldCacheKataGoFallbackForRequest,
  shouldRetryKataGoModelLoadOnFallback,
} from '../src/engine/katago/backendFallback';

describe('KataGo backend fallback policy', () => {
  it('defaults to WebGPU while preserving explicit CPU/WASM choices', () => {
    expect(normalizeKataGoBackendPreference()).toBe('webgpu');
    expect(normalizeKataGoBackendPreference('webgpu')).toBe('webgpu');
    expect(normalizeKataGoBackendPreference('wasm')).toBe('wasm');
    expect(normalizeKataGoBackendPreference('cpu')).toBe('cpu');
  });

  it('selects the next fallback backend only for warm-up failures', () => {
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'webgpu',
      activeBackend: 'webgpu',
      stage: 'warmup',
    })).toBe('wasm');
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'webgpu',
      activeBackend: 'WebGPU',
      stage: 'warmup',
    })).toBe('wasm');
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'webgpu',
      activeBackend: 'wasm',
      stage: 'warmup',
    })).toBe('cpu');
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'wasm',
      activeBackend: 'wasm',
      stage: 'warmup',
    })).toBe('cpu');
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'webgpu',
      activeBackend: 'webgpu',
      stage: 'fetch',
    })).toBeNull();
    expect(getKataGoWarmupFallbackBackend({
      requestedBackend: 'cpu',
      activeBackend: 'cpu',
      stage: 'warmup',
    })).toBeNull();
  });

  it('retries warm-up failures while the fallback chain has another backend', () => {
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'webgpu',
      activeBackend: 'webgpu',
      stage: 'warmup',
    })).toBe(true);
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'webgpu',
      activeBackend: 'WebGPU',
      stage: 'warmup',
    })).toBe(true);
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'webgpu',
      activeBackend: 'webgpu',
      stage: 'fetch',
    })).toBe(false);
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'webgpu',
      activeBackend: 'wasm',
      stage: 'warmup',
    })).toBe(true);
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'wasm',
      activeBackend: 'wasm',
      stage: 'warmup',
    })).toBe(true);
    expect(shouldRetryKataGoModelLoadOnFallback({
      requestedBackend: 'cpu',
      activeBackend: 'cpu',
      stage: 'warmup',
    })).toBe(false);
  });

  it('caches a successful fallback backend under the original request', () => {
    expect(shouldCacheKataGoFallbackForRequest({
      requestedBackend: 'webgpu',
      fallbackBackend: 'wasm',
    })).toBe(true);
    expect(shouldCacheKataGoFallbackForRequest({
      requestedBackend: 'webgpu',
      fallbackBackend: 'cpu',
    })).toBe(true);
    expect(shouldCacheKataGoFallbackForRequest({
      requestedBackend: 'webgpu',
      fallbackBackend: 'webgpu',
    })).toBe(false);
    expect(shouldCacheKataGoFallbackForRequest({
      requestedBackend: 'wasm',
      fallbackBackend: 'cpu',
    })).toBe(true);
    expect(shouldCacheKataGoFallbackForRequest({
      requestedBackend: 'cpu',
      fallbackBackend: 'cpu',
    })).toBe(false);
  });

  it('wires the warm-up retry through the worker model load path', () => {
    const workerSource = readFileSync('src/engine/katago/worker.ts', 'utf8');

    expect(workerSource).toContain('installModel(await createWarmedModel(parsed), parsed, modelUrl);');
    expect(workerSource).toContain('getKataGoWarmupFallbackBackend({');
    expect(workerSource).toContain('const attemptedFallbacks = new Set<KataGoBackendPreference>();');
    expect(workerSource).toContain("stage: 'warmup'");
    expect(workerSource).toContain('await switchToFallbackBackendForRequest(requestedBackend, fallbackBackend);');
    expect(workerSource).toContain('backendPreference = requestedBackend;');
  });
});
