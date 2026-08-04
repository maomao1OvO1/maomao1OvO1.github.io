import { describe, expect, it } from 'vitest';
import { formatEngineErrorReport } from '../src/utils/engineDiagnostics';

describe('engine diagnostics', () => {
  it('formats copyable engine error details', () => {
    expect(formatEngineErrorReport({
      status: 'error',
      requestedBackend: 'webgpu',
      activeBackend: 'wasm',
      modelLabel: 'katago-small.bin.gz',
      modelUrl: '/models/katago-small.bin.gz',
      error: 'Failed to fetch model: 404 Not Found',
    })).toBe([
      'Web KaTrain engine error',
      'Status: error',
      'Requested backend: webgpu',
      'Active backend: wasm',
      'Model: katago-small.bin.gz',
      'Model URL: /models/katago-small.bin.gz',
      '',
      'Failed to fetch model: 404 Not Found',
    ].join('\n'));
  });
});
