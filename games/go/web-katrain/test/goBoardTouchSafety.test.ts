import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('GoBoard touch safety', () => {
  it('cancels multi-touch gestures before they can become board clicks', () => {
    const source = readFileSync('src/components/GoBoard.tsx', 'utf8');

    expect(source).toContain('const cancelTouchGesture = useCallback');
    expect(source).toContain('if (suppressClick) suppressNextClickRef.current = true;');
    expect(source).toContain('if (e.touches.length !== 1) {');
    expect(source).toContain('cancelTouchGesture(true);');
    expect(source).toContain('const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {');
    expect(source).toContain('if (e.touches.length > 0) {');
    expect(source).toContain('onTouchMove={handleTouchMove}');
  });

  it('allows browser pinch zoom in play mode but locks touch behavior while editing', () => {
    const source = readFileSync('src/components/GoBoard.tsx', 'utf8');

    expect(source).toContain("const boardTouchAction = isEditMode || scoringMode || isSelectingRegionOfInterest ? 'none' : 'pan-x pan-y pinch-zoom';");
    expect(source).toContain('touchAction: boardTouchAction');
    expect(source).not.toContain('select-none touch-none');
  });

  it('requires live continuous analysis before drawing analysis overlays', () => {
    const source = readFileSync('src/components/GoBoard.tsx', 'utf8');

    expect(source).toContain('isContinuousAnalysis: state.isContinuousAnalysis');
    expect(source).toContain('const hasAnalysisOverlay = isAnalysisMode && isContinuousAnalysis;');
    expect(source).not.toContain('const hasAnalysisOverlay = isAnalysisMode || !!visibleAnalysis;');
    expect(source).toContain('if (!hasAnalysisOverlay || !settings.analysisShowEval || settings.showLastNMistakes === 0) return;');
  });
});
