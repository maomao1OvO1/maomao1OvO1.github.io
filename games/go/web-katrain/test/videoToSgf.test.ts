import { describe, expect, it } from 'vitest';
import {
  buildMoveSequenceSgf,
  collapseStableStates,
  reconstructMovesFromStates,
} from '../src/utils/videoToSgf';
import { parseSgf } from '../src/utils/sgf';
import type { BoardState, Player } from '../src/types';

const mk = (size: number, placements: Array<[number, number, Player]>): BoardState => {
  const board: BoardState = Array.from({ length: size }, () => Array<Player | null>(size).fill(null));
  for (const [x, y, p] of placements) board[y]![x] = p;
  return board;
};

describe('collapseStableStates', () => {
  it('drops consecutive duplicates', () => {
    const a = mk(9, [[0, 0, 'black']]);
    const a2 = mk(9, [[0, 0, 'black']]);
    const b = mk(9, [[0, 0, 'black'], [1, 0, 'white']]);
    expect(collapseStableStates([a, a2, b, b]).length).toBe(2);
  });
});

describe('reconstructMovesFromStates', () => {
  it('reconstructs a clean alternating opening with no warnings', () => {
    const states = [
      mk(9, []),
      mk(9, [[0, 0, 'black']]),
      mk(9, [[0, 0, 'black'], [1, 0, 'white']]),
      mk(9, [[0, 0, 'black'], [1, 0, 'white'], [2, 0, 'black']]),
    ];
    const { moves, warnings } = reconstructMovesFromStates(states, 9);
    expect(warnings).toEqual([]);
    expect(moves).toEqual([
      { x: 0, y: 0, player: 'black' },
      { x: 1, y: 0, player: 'white' },
      { x: 2, y: 0, player: 'black' },
    ]);
  });

  it('handles a capture: the captured stone is removed in the final board', () => {
    const states = [
      mk(9, [[0, 1, 'black']]),
      mk(9, [[0, 1, 'black'], [0, 0, 'white']]),
      mk(9, [[0, 1, 'black'], [1, 0, 'black']]), // white at (0,0) captured
    ];
    const { moves, finalBoard, warnings } = reconstructMovesFromStates(states, 9);
    expect(warnings).toEqual([]);
    expect(moves).toEqual([
      { x: 0, y: 1, player: 'black' },
      { x: 0, y: 0, player: 'white' },
      { x: 1, y: 0, player: 'black' },
    ]);
    expect(finalBoard[0]![0]).toBeNull(); // captured white removed
  });

  it('ignores frames where stones briefly disappear', () => {
    const states = [
      mk(9, [[0, 0, 'black']]),
      mk(9, []), // hand covers the board
      mk(9, [[0, 0, 'black'], [1, 0, 'white']]),
    ];
    const { moves } = reconstructMovesFromStates(states, 9);
    expect(moves).toEqual([
      { x: 0, y: 0, player: 'black' },
      { x: 1, y: 0, player: 'white' },
    ]);
  });
});

describe('buildMoveSequenceSgf', () => {
  it('round-trips through the SGF parser', () => {
    const moves = [
      { x: 0, y: 0, player: 'black' as Player },
      { x: 3, y: 2, player: 'white' as Player },
    ];
    const sgf = buildMoveSequenceSgf(moves, 9);
    const parsed = parseSgf(sgf);
    expect(parsed.moves).toEqual(moves);
  });
});
