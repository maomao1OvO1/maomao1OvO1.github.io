import { describe, expect, it, vi } from 'vitest';
import {
  dispatchMoveTreeCommand,
  getMoveTreeCommandFromEvent,
  MOVE_TREE_COMMAND_EVENT,
} from '../src/utils/moveTreeCommands';

describe('move tree command events', () => {
  it('parses supported move tree commands from custom events', () => {
    expect(getMoveTreeCommandFromEvent(new CustomEvent(MOVE_TREE_COMMAND_EVENT, { detail: { command: 'center-current' } }))).toBe(
      'center-current'
    );
    expect(getMoveTreeCommandFromEvent(new CustomEvent(MOVE_TREE_COMMAND_EVENT, { detail: { command: 'toggle-layout' } }))).toBe(
      'toggle-layout'
    );
    expect(getMoveTreeCommandFromEvent(new CustomEvent(MOVE_TREE_COMMAND_EVENT, { detail: { command: 'toggle-minimap' } }))).toBe(
      'toggle-minimap'
    );
    expect(getMoveTreeCommandFromEvent(new CustomEvent(MOVE_TREE_COMMAND_EVENT, { detail: { command: 'unknown' } }))).toBeNull();
    expect(getMoveTreeCommandFromEvent(new Event(MOVE_TREE_COMMAND_EVENT))).toBeNull();
  });

  it('dispatches move tree commands on window when available', () => {
    const listener = vi.fn();
    const windowTarget = new EventTarget();
    vi.stubGlobal('window', windowTarget);
    window.addEventListener(MOVE_TREE_COMMAND_EVENT, listener);
    dispatchMoveTreeCommand('toggle-layout');
    window.removeEventListener(MOVE_TREE_COMMAND_EVENT, listener);
    vi.unstubAllGlobals();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getMoveTreeCommandFromEvent(listener.mock.calls[0]![0] as Event)).toBe('toggle-layout');
  });
});
