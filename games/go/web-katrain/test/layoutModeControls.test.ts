import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('layout mode controls', () => {
  it('applies per-mode analysis settings without suppressing hook dependencies', () => {
    const source = readFileSync('src/components/Layout.tsx', 'utf8');

    expect(source).toContain('lastAppliedModeControlsRef.current === mode');
    expect(source).toContain('lastAppliedModeControlsRef.current = mode');
    expect(source).toContain('}, [mode, modeControls, updateSettings]);');
    expect(source).not.toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
  });
});
