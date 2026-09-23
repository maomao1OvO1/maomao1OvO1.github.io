import { mediaQueryMatches } from './mediaQuery';

export const DESKTOP_LAYOUT_MIN_WIDTH = 1024;
export const DESKTOP_LAYOUT_MIN_HEIGHT = 500;
export const DESKTOP_LAYOUT_MEDIA = `(min-width: ${DESKTOP_LAYOUT_MIN_WIDTH}px) and (min-height: ${DESKTOP_LAYOUT_MIN_HEIGHT}px)`;
export const MOBILE_LAYOUT_MEDIA = `(max-width: ${DESKTOP_LAYOUT_MIN_WIDTH - 1}px), (max-height: ${DESKTOP_LAYOUT_MIN_HEIGHT - 1}px)`;

export function isDesktopLayoutSize(width: number, height: number): boolean {
  return width >= DESKTOP_LAYOUT_MIN_WIDTH && height >= DESKTOP_LAYOUT_MIN_HEIGHT;
}

export function isMobileLayoutSize(width: number, height: number): boolean {
  return !isDesktopLayoutSize(width, height);
}

export function isDesktopLayoutViewport(): boolean {
  if (typeof window === 'undefined') return true;
  return mediaQueryMatches(
    DESKTOP_LAYOUT_MEDIA,
    isDesktopLayoutSize(window.innerWidth, window.innerHeight)
  );
}

export function isMobileLayoutViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return mediaQueryMatches(
    MOBILE_LAYOUT_MEDIA,
    isMobileLayoutSize(window.innerWidth, window.innerHeight)
  );
}
