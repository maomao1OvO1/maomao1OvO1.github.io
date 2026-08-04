export function formatRestoredAnalysisSuffix(count: number): string {
  const normalized = Math.floor(count);
  if (!Number.isFinite(count) || normalized <= 0) return '';
  if (normalized === 1) return 'with 1 restored analysis';
  return `with ${normalized} restored analyses`;
}

export function appendRestoredAnalysisSummary(message: string, count: number): string {
  const suffix = formatRestoredAnalysisSuffix(count);
  if (!suffix) return message;
  const trimmed = message.trim().replace(/[.!?]+$/, '');
  return `${trimmed} ${suffix}.`;
}
