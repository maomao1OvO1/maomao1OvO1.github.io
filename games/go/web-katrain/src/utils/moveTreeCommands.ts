export type MoveTreeCommand = 'center-current' | 'toggle-layout' | 'toggle-minimap';

export const MOVE_TREE_COMMAND_EVENT = 'web-katrain:move-tree-command';

export function dispatchMoveTreeCommand(command: MoveTreeCommand): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(MOVE_TREE_COMMAND_EVENT, { detail: { command } }));
}

export function getMoveTreeCommandFromEvent(event: Event): MoveTreeCommand | null {
  if (!(event instanceof CustomEvent)) return null;
  const detail = event.detail as { command?: unknown } | null;
  switch (detail?.command) {
    case 'center-current':
    case 'toggle-layout':
    case 'toggle-minimap':
      return detail.command;
    default:
      return null;
  }
}
