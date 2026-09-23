export type VisualViewportLike = Pick<VisualViewport, 'addEventListener' | 'removeEventListener'> &
  Partial<Pick<VisualViewport, 'height' | 'offsetTop'>>;

type VisualViewportSource = {
  innerHeight?: number;
  visualViewport?: VisualViewportLike | null;
};

export function getVisualViewport(target?: VisualViewportSource | null): VisualViewportLike | null {
  try {
    const source = target ?? (typeof window !== 'undefined' ? window : null);
    const viewport = source?.visualViewport;
    if (!viewport) return null;
    if (typeof viewport.addEventListener !== 'function' || typeof viewport.removeEventListener !== 'function') {
      return null;
    }
    return viewport;
  } catch {
    return null;
  }
}

export function getVisualKeyboardInset(target?: VisualViewportSource | null): number {
  try {
    const source = target ?? (typeof window !== 'undefined' ? window : null);
    const viewport = getVisualViewport(source);
    if (!source || !viewport) return 0;
    const innerHeight = typeof source.innerHeight === 'number' ? source.innerHeight : 0;
    const viewportHeight = typeof viewport.height === 'number' ? viewport.height : innerHeight;
    const offsetTop = typeof viewport.offsetTop === 'number' ? viewport.offsetTop : 0;
    if (!Number.isFinite(innerHeight) || !Number.isFinite(viewportHeight) || !Number.isFinite(offsetTop)) {
      return 0;
    }
    return Math.max(0, Math.round(innerHeight - viewportHeight - Math.max(0, offsetTop)));
  } catch {
    return 0;
  }
}
