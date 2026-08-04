import { useEffect, useMemo, useState } from 'react';
import {
  getShortcutBindings,
  loadShortcutOverrides,
  SHORTCUTS_UPDATED_EVENT,
  shortcutDisplay,
} from '../utils/shortcuts';

export function useShortcutLabels<const T extends readonly string[]>(ids: T): Record<T[number], string> {
  const [overrides, setOverrides] = useState(() => loadShortcutOverrides());

  useEffect(() => {
    const refresh = () => setOverrides(loadShortcutOverrides());
    window.addEventListener(SHORTCUTS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(SHORTCUTS_UPDATED_EVENT, refresh);
  }, []);

  return useMemo(() => {
    const labels = {} as Record<T[number], string>;
    for (const id of ids) {
      labels[id as T[number]] = shortcutDisplay(getShortcutBindings(id, overrides));
    }
    return labels;
  }, [ids, overrides]);
}
