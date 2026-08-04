import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FaTimes, FaVideo, FaCog, FaDownload } from 'react-icons/fa';
import { useEscapeToClose } from '../hooks/useEscapeToClose';
import { StaticBoard } from './StaticBoard';
import { BOARD_SIZES } from '../utils/boardSize';
import { KOMI, type BoardSize } from '../types';
import {
  getPhotoBoardRecognitionOptionsForSensitivity,
  recognizePhotoBoardFromPixels,
  DEFAULT_PHOTO_BOARD_RECOGNITION_SENSITIVITY,
} from '../utils/photoBoardRecognition';
import {
  boardStateFromStones,
  buildMoveSequenceSgf,
  reconstructMovesFromStates,
  type ReconstructionResult,
} from '../utils/videoToSgf';

interface VideoBoardModalProps {
  onClose: () => void;
  onImportSgf: (sgf: string) => void | Promise<void>;
  defaultBoardSize?: BoardSize;
}

const seekTo = (video: HTMLVideoElement, time: number): Promise<void> =>
  new Promise((resolve) => {
    const handler = () => {
      video.removeEventListener('seeked', handler);
      resolve();
    };
    video.addEventListener('seeked', handler);
    video.currentTime = time;
  });

/** Group identical warnings into "message (xN)" lines. */
const summarizeWarnings = (warnings: string[]): string[] => {
  const counts = new Map<string, number>();
  for (const w of warnings) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()].map(([w, n]) => (n > 1 ? `${w} (×${n})` : w));
};

export const VideoBoardModal: React.FC<VideoBoardModalProps> = ({ onClose, onImportSgf, defaultBoardSize = 19 }) => {
  useEscapeToClose(onClose);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [boardSize, setBoardSize] = useState<BoardSize>(defaultBoardSize);
  const [interval, setIntervalSec] = useState(1);
  const [sensitivity, setSensitivity] = useState(DEFAULT_PHOTO_BOARD_RECOGNITION_SENSITIVITY);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ReconstructionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const handleFile = useCallback((file: File | null) => {
    if (!file) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setFileName(file.name);
    setResult(null);
    setError(null);
    setProgress(null);
    const video = videoRef.current;
    if (video) {
      video.src = url;
      video.load();
    }
  }, []);

  const process = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !urlRef.current) return;
    setError(null);
    setResult(null);
    try {
      if (!video.duration || Number.isNaN(video.duration)) {
        await new Promise<void>((resolve, reject) => {
          const ok = () => { video.removeEventListener('loadedmetadata', ok); resolve(); };
          const fail = () => { video.removeEventListener('error', fail); reject(new Error('load failed')); };
          video.addEventListener('loadedmetadata', ok);
          video.addEventListener('error', fail);
        });
      }
      const duration = video.duration;
      const width = Math.min(video.videoWidth || 640, 720);
      const height = Math.round(width * ((video.videoHeight || 480) / (video.videoWidth || 640)));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not available');
      const options = getPhotoBoardRecognitionOptionsForSensitivity(sensitivity);
      const states = [];
      const step = Math.max(0.2, interval);
      setProgress(0);
      for (let t = 0; t <= duration; t += step) {
        await seekTo(video, Math.min(t, Math.max(0, duration - 0.05)));
        ctx.drawImage(video, 0, 0, width, height);
        const img = ctx.getImageData(0, 0, width, height);
        const recognized = recognizePhotoBoardFromPixels(img, boardSize, options);
        states.push(boardStateFromStones(recognized.stones, boardSize));
        setProgress(Math.min(1, t / Math.max(duration, 0.001)));
      }
      setProgress(1);
      setResult(reconstructMovesFromStates(states, boardSize));
    } catch {
      setError('Could not process this video. Try a clearer top-down clip.');
      setProgress(null);
    }
  }, [boardSize, interval, sensitivity]);

  const handleImport = useCallback(() => {
    if (!result || result.moves.length === 0) return;
    const sgf = buildMoveSequenceSgf(result.moves, boardSize, KOMI, fileName ?? undefined);
    void onImportSgf(sgf);
  }, [result, boardSize, fileName, onImportSgf]);

  const warnings = result ? summarizeWarnings(result.warnings) : [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-3 mobile-safe-inset mobile-safe-area-bottom"
      onClick={onClose}
    >
      <div
        className="ui-panel flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-board-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-bar flex items-center justify-between border-b border-[var(--ui-border)] px-4 py-3">
          <h2 id="video-board-title" className="inline-flex items-center gap-2 text-lg font-semibold text-[var(--ui-text)]">
            <FaVideo aria-hidden="true" /> Video to SGF
            <span className="rounded-full border border-[var(--ui-border)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--ui-text-muted)]">Beta</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="ui-control grid place-items-center rounded-lg text-[var(--ui-text-muted)] hover:bg-[var(--ui-surface-2)] hover:text-[var(--ui-text)]"
            aria-label="Close video import"
          >
            <FaTimes aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-[var(--ui-text-muted)]">
            Reconstruct a game from a steady, top-down recording of a real board. The result is best-effort — review
            it before saving.
          </p>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-[var(--ui-text)]">Video file</span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-[var(--ui-text-muted)] file:mr-3 file:rounded-lg file:border file:border-[var(--ui-border)] file:bg-[var(--ui-surface)] file:px-3 file:py-2 file:text-[var(--ui-text)]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ui-text)]">Board size</span>
              <select
                value={boardSize}
                onChange={(e) => setBoardSize(Number(e.target.value) as BoardSize)}
                className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-sm text-[var(--ui-text)]"
              >
                {BOARD_SIZES.map((sz) => (
                  <option key={sz} value={sz}>{sz}×{sz}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-[var(--ui-text)]">Sample every (s)</span>
              <input
                type="number"
                min={0.2}
                step={0.2}
                value={interval}
                onChange={(e) => setIntervalSec(Math.max(0.2, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-3 py-2 text-right text-sm text-[var(--ui-text)]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-xs font-semibold text-[var(--ui-text)]">
              <FaCog aria-hidden="true" /> Detection sensitivity: {sensitivity}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full"
            />
          </label>

          {progress !== null && progress < 1 && (
            <div className="h-2 w-full overflow-hidden rounded bg-[var(--ui-surface-2)]">
              <div className="h-full bg-[var(--ui-accent)]" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}

          {error && (
            <div className="rounded border border-[var(--ui-danger)] bg-[var(--ui-danger-soft)] px-3 py-2 text-sm text-[var(--ui-danger)]">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="mx-auto w-full max-w-[280px]">
                <StaticBoard board={result.finalBoard} maxPx={280} ariaLabel="Reconstructed final position" />
              </div>
              <div className="text-sm font-semibold text-[var(--ui-text)]">
                {result.moves.length} move{result.moves.length === 1 ? '' : 's'} reconstructed
              </div>
              {warnings.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-[var(--ui-warn,#d69e2e)] bg-[var(--ui-surface-2)] p-3 text-xs text-[var(--ui-text-muted)]">
                  {warnings.map((w) => (
                    <li key={w}>⚠ {w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Hidden processing surfaces */}
          <video ref={videoRef} className="hidden" muted playsInline preload="auto" />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="ui-bar flex flex-wrap justify-end gap-2 border-t border-[var(--ui-border)] px-4 py-3">
          <button
            type="button"
            onClick={() => void process()}
            disabled={!fileName || progress !== null && progress < 1}
            className="min-h-11 rounded-lg border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)] disabled:opacity-50"
          >
            {progress !== null && progress < 1 ? `Processing… ${Math.round((progress ?? 0) * 100)}%` : 'Process video'}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!result || result.moves.length === 0}
            className="min-h-11 rounded-lg border border-[var(--ui-accent)] bg-[var(--ui-accent-soft,var(--ui-surface-2))] px-4 py-2 text-sm font-semibold text-[var(--ui-text)] hover:bg-[var(--ui-surface-2)] disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2"><FaDownload aria-hidden="true" /> Import to board</span>
          </button>
        </div>
      </div>
    </div>
  );
};

VideoBoardModal.displayName = 'VideoBoardModal';
