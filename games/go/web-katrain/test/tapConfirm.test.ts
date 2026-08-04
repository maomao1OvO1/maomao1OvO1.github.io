import { describe, expect, it } from 'vitest';
import { getTapConfirmAction, TAP_CONFIRM_TIMEOUT_MS } from '../src/utils/tapConfirm';

describe('tap confirm helper', () => {
  it('previews the first tap with an expiry', () => {
    const action = getTapConfirmAction(null, { x: 3, y: 15 }, 'black', 1000);

    expect(action).toEqual({
      type: 'preview',
      pending: { x: 3, y: 15, player: 'black', expiresAt: 1000 + TAP_CONFIRM_TIMEOUT_MS },
    });
  });

  it('commits a second tap on the same point for the same player before expiry', () => {
    const pending = { x: 3, y: 15, player: 'black' as const, expiresAt: 4000 };

    expect(getTapConfirmAction(pending, { x: 3, y: 15 }, 'black', 2500)).toEqual({ type: 'commit' });
  });

  it('starts a fresh preview after expiry, a different point, or a different player', () => {
    const pending = { x: 3, y: 15, player: 'black' as const, expiresAt: 4000 };

    expect(getTapConfirmAction(pending, { x: 3, y: 15 }, 'black', 4500).type).toBe('preview');
    expect(getTapConfirmAction(pending, { x: 4, y: 15 }, 'black', 2500).type).toBe('preview');
    expect(getTapConfirmAction(pending, { x: 3, y: 15 }, 'white', 2500).type).toBe('preview');
  });
});
