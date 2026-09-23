import { describe, expect, it } from 'vitest';
import { DEFAULT_BOARD_SIZE, type BoardState } from '../src/types';
import { useGameStore } from '../src/store/gameStore';
import { makeAnalysisPositionKey } from '../src/utils/analysisPositionKey';

const emptyBoard = (): BoardState =>
  Array.from({ length: DEFAULT_BOARD_SIZE }, () => Array.from({ length: DEFAULT_BOARD_SIZE }, () => null));

describe('analysis position keys', () => {
  it('changes when board contents or move history changes', () => {
    const board = emptyBoard();
    const base = makeAnalysisPositionKey({
      board,
      currentPlayer: 'black',
      moveHistory: [],
      komi: 6.5,
      rules: 'japanese',
    });

    const boardWithStone = emptyBoard();
    boardWithStone[3][3] = 'black';
    expect(
      makeAnalysisPositionKey({
        board: boardWithStone,
        currentPlayer: 'white',
        moveHistory: [{ x: 3, y: 3, player: 'black' }],
        komi: 6.5,
        rules: 'japanese',
      })
    ).not.toBe(base);

    expect(
      makeAnalysisPositionKey({
        board,
        currentPlayer: 'black',
        moveHistory: [{ x: -1, y: -1, player: 'white' }],
        komi: 6.5,
        rules: 'japanese',
      })
    ).not.toBe(base);
  });

  it('does not reuse the literal root id for fresh roots', () => {
    const store = useGameStore.getState();
    store.resetGame();
    expect(useGameStore.getState().rootNode.id).toMatch(/^root-/);
    expect(useGameStore.getState().rootNode.id).not.toBe('root');
  });
});
