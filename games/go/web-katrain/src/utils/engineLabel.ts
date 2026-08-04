import { stripUnsafeFilenameControls } from './filename';

export function getEngineModelLabel(
  engineModelName: string | null | undefined,
  modelUrl: string | null | undefined
): string | null {
  const cleanEngineName = stripUnsafeFilenameControls(engineModelName ?? '').trim();
  if (cleanEngineName) return cleanEngineName;
  const rawUrl = modelUrl?.trim();
  if (!rawUrl) return null;
  if (rawUrl.startsWith('blob:')) return 'Uploaded weights';
  const cleanUrl = rawUrl.split('#')[0]?.split('?')[0] ?? rawUrl;
  const base = cleanUrl.split('/').pop();
  if (!base) return null;
  try {
    return stripUnsafeFilenameControls(decodeURIComponent(base)).trim() || null;
  } catch {
    return stripUnsafeFilenameControls(base).trim() || null;
  }
}
