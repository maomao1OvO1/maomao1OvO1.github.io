import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CandidateMove } from '../src/types';

const analyzeMock = vi.fn();

vi.mock('../src/engine/katago/client', () => ({
  getKataGoEngineClient: () => ({
    analyze: analyzeMock,
    getEngineInfo: () => ({ backend: 'test', modelName: 'test-model' }),
  }),
  isKataGoCanceledError: () => false,
}));

const passMove: CandidateMove = {
  x: -1,
  y: -1,
  winRate: 0.5,
  scoreLead: 0,
  visits: 16,
  pointsLost: 0,
  order: 0,
  prior: 1,
};

describe('AI move strength settings', () => {
  beforeEach(() => {
    analyzeMock.mockReset();
    analyzeMock.mockResolvedValue({
      rootWinRate: 0.5,
      rootScoreLead: 0,
      rootScoreSelfplay: 0,
      rootScoreStdev: 0,
      rootVisits: 16,
      moves: [passMove],
      ownership: new Float32Array(19 * 19),
      ownershipStdev: new Float32Array(19 * 19),
      policy: new Float32Array(19 * 19 + 1),
    });
  });

  it('disables root noise and NN randomization for actual AI moves', async () => {
    const { useGameStore } = await import('../src/store/gameStore');
    const store = useGameStore.getState();
    store.resetGame();

    useGameStore.setState((state) => ({
      isAiPlaying: true,
      aiColor: 'black',
      settings: {
        ...state.settings,
        katagoWideRootNoise: 0.5,
        katagoNnRandomize: true,
      },
    }));

    useGameStore.getState().makeAiMove();

    expect(analyzeMock).toHaveBeenCalledTimes(1);
    expect(analyzeMock.mock.calls[0]?.[0]).toMatchObject({
      wideRootNoise: 0,
      nnRandomize: false,
    });
  });
});
