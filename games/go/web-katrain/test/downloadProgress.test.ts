import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBlobWithProgress, responseBlobWithProgress } from '../src/utils/downloadProgress';

const encoder = new TextEncoder();

function responseFromChunks(chunks: string[], headers?: HeadersInit): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { headers }
  );
}

describe('download progress helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports byte counts and percentages while reading a response stream', async () => {
    const progress: Array<{ receivedBytes: number; totalBytes: number | null; percent: number | null }> = [];
    const response = responseFromChunks(['abc', 'defg'], {
      'content-length': '7',
      'content-type': 'application/x-go-sgf',
    });

    const blob = await responseBlobWithProgress(response, (update) => progress.push(update));

    expect(await blob.text()).toBe('abcdefg');
    expect(blob.type).toBe('application/x-go-sgf');
    expect(progress).toEqual([
      { receivedBytes: 3, totalBytes: 7, percent: 43 },
      { receivedBytes: 7, totalBytes: 7, percent: 100 },
    ]);
  });

  it('keeps progress indeterminate when content length is unknown', async () => {
    const progress: Array<{ receivedBytes: number; totalBytes: number | null; percent: number | null }> = [];
    const response = responseFromChunks(['abc', 'def']);

    const blob = await responseBlobWithProgress(response, (update) => progress.push(update));

    expect(await blob.text()).toBe('abcdef');
    expect(progress).toEqual([
      { receivedBytes: 3, totalBytes: null, percent: null },
      { receivedBytes: 6, totalBytes: null, percent: null },
    ]);
  });

  it('throws a clear error for failed fetches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 503 })));

    await expect(fetchBlobWithProgress('/model.bin.gz')).rejects.toThrow('Download failed (503)');
  });
});
