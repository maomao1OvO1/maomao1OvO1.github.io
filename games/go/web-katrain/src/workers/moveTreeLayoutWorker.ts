import {
  computeMoveTreeLayout,
  type MoveTreeLayout,
  type MoveTreeLayoutDirection,
  type MoveTreeLayoutItem,
} from '../utils/moveTreeLayout';

type LayoutRequest = {
  requestId: number;
  items: MoveTreeLayoutItem[];
  direction?: MoveTreeLayoutDirection;
};

type LayoutResponse =
  | { requestId: number; ok: true; layout: MoveTreeLayout }
  | { requestId: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<LayoutRequest>) => {
  const { requestId, items, direction } = event.data;
  try {
    const response: LayoutResponse = {
      requestId,
      ok: true,
      layout: computeMoveTreeLayout(items, direction),
    };
    self.postMessage(response);
  } catch (err) {
    const response: LayoutResponse = {
      requestId,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(response);
  }
};

export {};
