import type { Player } from '../types';

export function getResignResult(resigningPlayer: Player): string {
  return resigningPlayer === 'black' ? 'W+R' : 'B+R';
}

export function getResignWinnerLabel(resigningPlayer: Player): 'Black' | 'White' {
  return resigningPlayer === 'black' ? 'White' : 'Black';
}

export function getPlayerLabel(player: Player): 'Black' | 'White' {
  return player === 'black' ? 'Black' : 'White';
}
