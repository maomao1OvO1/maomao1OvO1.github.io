import type { Player } from '../types';

export const TAP_CONFIRM_TIMEOUT_MS = 3000;

export type TapConfirmPoint = {
  x: number;
  y: number;
  player: Player;
  expiresAt: number;
};

export type TapConfirmAction =
  | { type: 'commit' }
  | { type: 'preview'; pending: TapConfirmPoint };

export function getTapConfirmAction(
  pending: TapConfirmPoint | null,
  point: { x: number; y: number },
  player: Player,
  now: number,
  timeoutMs = TAP_CONFIRM_TIMEOUT_MS
): TapConfirmAction {
  if (
    pending &&
    pending.x === point.x &&
    pending.y === point.y &&
    pending.player === player &&
    pending.expiresAt >= now
  ) {
    return { type: 'commit' };
  }

  return {
    type: 'preview',
    pending: {
      x: point.x,
      y: point.y,
      player,
      expiresAt: now + timeoutMs,
    },
  };
}
