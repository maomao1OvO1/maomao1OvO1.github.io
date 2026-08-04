import { describe, expect, it } from 'vitest';
import {
  getWheelNavigationAction,
  shouldIgnoreWheelNavigationTarget,
  WHEEL_NAVIGATION_IGNORE_SELECTOR,
} from '../src/utils/wheelNavigation';

describe('wheel navigation', () => {
  it('ignores small wheel deltas before the threshold', () => {
    expect(getWheelNavigationAction({ deltaX: 0, deltaY: 12 })).toBeNull();
    expect(getWheelNavigationAction({ deltaX: -18, deltaY: 4 })).toBeNull();
  });

  it('uses the dominant wheel axis for move navigation', () => {
    expect(getWheelNavigationAction({ deltaX: 0, deltaY: -40 })).toBe('back');
    expect(getWheelNavigationAction({ deltaX: 0, deltaY: 40 })).toBe('forward');
    expect(getWheelNavigationAction({ deltaX: -45, deltaY: 10 })).toBe('back');
  });

  it('uses shifted wheel input for mistake navigation', () => {
    expect(getWheelNavigationAction({ deltaX: 0, deltaY: -40, shiftKey: true })).toBe('prevMistake');
    expect(getWheelNavigationAction({ deltaX: 0, deltaY: 40, shiftKey: true })).toBe('nextMistake');
  });

  it('ignores interactive controls inside wheel navigation regions', () => {
    const matchingTarget = {
      closest: (selector: string) => (selector === WHEEL_NAVIGATION_IGNORE_SELECTOR ? ({} as Element) : null),
    } as unknown as EventTarget;
    const plainTarget = {
      closest: () => null,
    } as unknown as EventTarget;

    expect(shouldIgnoreWheelNavigationTarget(matchingTarget)).toBe(true);
    expect(shouldIgnoreWheelNavigationTarget(plainTarget)).toBe(false);
    expect(shouldIgnoreWheelNavigationTarget(null)).toBe(false);
  });

  it('ignores editable content regions that can receive text', () => {
    expect(WHEEL_NAVIGATION_IGNORE_SELECTOR).toContain('[contenteditable]:not([contenteditable="false"])');
    expect(WHEEL_NAVIGATION_IGNORE_SELECTOR).toContain('[role="textbox"]');
    expect(WHEEL_NAVIGATION_IGNORE_SELECTOR).toContain('[role="searchbox"]');
  });
});
