import { beforeEach, describe, expect, it, vi } from 'vitest';

const analyzeMock = vi.fn();
const evaluateBatchMock = vi.fn();

vi.mock('../src/engine/katago/client', () => ({
  getKataGoEngineClient: () => ({
    analyze: analyzeMock,
    evaluateBatch: evaluateBatchMock,
    getEngineInfo: () => ({ backend: 'test', modelName: 'test-model' }),
  }),
  isKataGoCanceledError: (err: unknown) =>
    !!err && typeof err === 'object' && (err as { kataGoCanceled?: boolean }).kataGoCanceled === true,
}));

const waitFor = async (predicate: () => boolean) => {
  for (let i = 0; i < 80; i++) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error('Timed out waiting for store state');
};

describe('game analysis failure reporting', () => {
  beforeEach(async () => {
    analyzeMock.mockReset();
    evaluateBatchMock.mockReset();

    const { analysisQueue } = await import('../src/utils/analysisQueue');
    const { useGameStore } = await import('../src/store/gameStore');
    analysisQueue.cancelWhere(() => true, 'test reset');
    analysisQueue.clearCache();
    useGameStore.getState().resetGame();
    useGameStore.setState({
      engineError: null,
      engineStatus: 'idle',
      notification: null,
    });
  });

  it('surfaces fast game analysis engine failures instead of silently finishing', async () => {
    const { useGameStore } = await import('../src/store/gameStore');
    analyzeMock.mockRejectedValue(new Error('backend unavailable'));

    const store = useGameStore.getState();
    store.playMove(3, 3);
    store.playMove(15, 15);
    store.startFastGameAnalysis();

    await waitFor(() => !useGameStore.getState().isGameAnalysisRunning);

    const state = useGameStore.getState();
    expect(analyzeMock).toHaveBeenCalled();
    expect(state.engineStatus).toBe('error');
    expect(state.engineError).toBe('backend unavailable');
    expect(state.notification).toMatchObject({
      type: 'error',
      message: 'Fast game review failed for all 3 positions: backend unavailable',
      copyText: 'Fast game review failed for all 3 positions: backend unavailable',
    });
  });
});
