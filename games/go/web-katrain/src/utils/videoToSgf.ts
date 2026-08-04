import type { BoardSize, BoardState, Move, Player } from '../types';
import { applyCapturesInPlace, boardsEqual } from './gameLogic';
import { createEmptyBoard } from './boardSize';
import { coordinateToSgf } from './sgf';
import type { PhotoBoardStone } from './photoBoard';

const opposite = (p: Player): Player => (p === 'black' ? 'white' : 'black');
const cloneBoard = (board: BoardState): BoardState => board.map((row) => [...row]);

/** Build a square board from a flat row-major stones array. */
export const boardStateFromStones = (stones: PhotoBoardStone[], boardSize: BoardSize): BoardState => {
  const board = createEmptyBoard(boardSize);
  for (let i = 0; i < boardSize * boardSize; i++) {
    const stone = stones[i] ?? null;
    if (stone) board[Math.floor(i / boardSize)]![i % boardSize] = stone;
  }
  return board;
};

/** Collapse runs of identical consecutive board states. */
export const collapseStableStates = (states: BoardState[]): BoardState[] => {
  const out: BoardState[] = [];
  for (const state of states) {
    const prev = out[out.length - 1];
    if (!prev || !boardsEqual(prev, state)) out.push(state);
  }
  return out;
};

interface Diff {
  adds: Move[];
  removes: number;
  conflicts: number;
}

const diffBoards = (from: BoardState, to: BoardState): Diff => {
  const adds: Move[] = [];
  let removes = 0;
  let conflicts = 0;
  for (let y = 0; y < to.length; y++) {
    for (let x = 0; x < to.length; x++) {
      const a = from[y]?.[x] ?? null;
      const b = to[y]?.[x] ?? null;
      if (a === b) continue;
      if (!a && b) adds.push({ x, y, player: b });
      else if (a && !b) removes++;
      else conflicts++; // both stones, different colour: recognition flip
    }
  }
  return { adds, removes, conflicts };
};

export interface ReconstructionResult {
  moves: Move[];
  finalBoard: BoardState;
  warnings: string[];
}

/**
 * Reconstruct a move sequence from a timeline of recognised board states.
 * Designed to be correct for the clean case (one new alternating stone per
 * stable state, with captures) and to degrade gracefully otherwise, always
 * keeping the final position faithful to the last recognised state.
 */
export const reconstructMovesFromStates = (
  rawStates: BoardState[],
  boardSize: BoardSize,
): ReconstructionResult => {
  const states = collapseStableStates(rawStates.filter((s) => s.length === boardSize));
  const moves: Move[] = [];
  const warnings: string[] = [];
  let cur = createEmptyBoard(boardSize);
  let expected: Player = 'black';

  for (const target of states) {
    if (boardsEqual(cur, target)) continue;
    const { adds, removes, conflicts } = diffBoards(cur, target);

    if (conflicts > 0) {
      warnings.push('Skipped a frame with conflicting stone colours.');
      continue;
    }
    if (adds.length === 0) {
      // Only removals — almost always a hand or glare hiding stones.
      if (removes > 0) warnings.push('Ignored a frame where stones briefly disappeared.');
      continue;
    }

    if (adds.length > 1) {
      warnings.push(`Uncertain move order at a frame with ${adds.length} new stones.`);
    }

    for (const move of adds) {
      if (adds.length === 1 && move.player !== expected) {
        warnings.push('Detected an out-of-turn move; kept the detected colour.');
      }
      cur[move.y]![move.x] = move.player;
      applyCapturesInPlace(cur, move.x, move.y, move.player);
      moves.push(move);
      expected = opposite(move.player);
    }

    if (!boardsEqual(cur, target)) {
      // Trust the camera: sync to the detected position so the SGF stays faithful.
      cur = cloneBoard(target);
    }
  }

  return { moves, finalBoard: cur, warnings };
};

/** Build a playable SGF move sequence from reconstructed moves. */
export const buildMoveSequenceSgf = (
  moves: Move[],
  boardSize: BoardSize,
  komi = 6.5,
  sourceName?: string,
): string => {
  const header = [
    'GM[1]',
    'FF[4]',
    'CA[UTF-8]',
    'AP[web-KaTrain:video-board]',
    `SZ[${boardSize}]`,
    `KM[${Number.isFinite(komi) ? komi : 6.5}]`,
    'GN[Video board capture]',
  ];
  if (sourceName?.trim()) header.push(`SO[${sourceName.trim().replace(/\\/g, '\\\\').replace(/]/g, '\\]')}]`);
  const moveStr = moves
    .map((m) => `;${m.player === 'black' ? 'B' : 'W'}[${coordinateToSgf(m.x, m.y)}]`)
    .join('');
  return `(;${header.join('')}${moveStr})`;
};
