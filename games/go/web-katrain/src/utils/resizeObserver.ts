export function getResizeObserverConstructor(): typeof ResizeObserver | null {
  try {
    const resizeObserverConstructor = globalThis.ResizeObserver;
    return typeof resizeObserverConstructor === 'function' ? resizeObserverConstructor : null;
  } catch {
    return null;
  }
}
