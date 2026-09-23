import { TEXT_ENTRY_TARGET_SELECTOR } from './keyboardTarget';

export type WheelNavigationAction = 'back' | 'forward' | 'prevMistake' | 'nextMistake';

export const WHEEL_NAVIGATION_THRESHOLD = 30;
export const WHEEL_NAVIGATION_THROTTLE_MS = 50;
export const WHEEL_NAVIGATION_IGNORE_SELECTOR = [
  'button',
  'a[href]',
  TEXT_ENTRY_TARGET_SELECTOR,
  '[role="button"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[data-wheel-navigation-ignore="true"]',
].join(',');

export function getWheelNavigationAction(args: {
  deltaX: number;
  deltaY: number;
  shiftKey?: boolean;
  threshold?: number;
}): WheelNavigationAction | null {
  const dominantDelta = Math.abs(args.deltaY) >= Math.abs(args.deltaX) ? args.deltaY : args.deltaX;
  const threshold = args.threshold ?? WHEEL_NAVIGATION_THRESHOLD;
  if (dominantDelta === 0 || Math.abs(dominantDelta) < threshold) return null;

  const scrollUp = dominantDelta < 0;
  if (args.shiftKey) return scrollUp ? 'prevMistake' : 'nextMistake';
  return scrollUp ? 'back' : 'forward';
}

type ClosestTarget = EventTarget & {
  closest: (selector: string) => Element | null;
};

function hasClosestTarget(target: EventTarget | null): target is ClosestTarget {
  return typeof (target as Partial<ClosestTarget> | null)?.closest === 'function';
}

export function shouldIgnoreWheelNavigationTarget(
  target: EventTarget | null,
  selector = WHEEL_NAVIGATION_IGNORE_SELECTOR
): boolean {
  if (!hasClosestTarget(target)) return false;
  return target.closest(selector) !== null;
}
