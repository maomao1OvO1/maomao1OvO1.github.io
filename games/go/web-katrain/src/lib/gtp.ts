import { DEFAULT_BOARD_SIZE, type BoardSize } from '../types';

const GTP_COORD = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'] as const;

export type ParsedGtpMove =
  | { kind: 'pass' }
  | {
      kind: 'move';
      x: number;
      y: number;
    };

export function parseGtpMove(s: string, boardSize: BoardSize = DEFAULT_BOARD_SIZE): ParsedGtpMove | null {
  const t = s.trim().toUpperCase();
  if (t === 'PASS') return { kind: 'pass' };
  const m = /^([A-T])([1-9]|1[0-9])$/.exec(t);
  if (!m) return null;
  const colChar = m[1]!;
  if (colChar === 'I') return null;
  const raw = colChar.charCodeAt(0) - 65;
  const x = raw >= 9 ? raw - 1 : raw;
  const row = Number.parseInt(m[2]!, 10);
  const y = boardSize - row;
  if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return null;
  if (x >= GTP_COORD.length) return null;
  return { kind: 'move', x, y };
}
