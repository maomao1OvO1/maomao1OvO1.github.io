export type EngineDiagnosticInput = {
  status: string;
  requestedBackend: string;
  activeBackend: string;
  modelLabel: string | null;
  modelUrl: string;
  error: string;
};

export function formatEngineErrorReport(input: EngineDiagnosticInput): string {
  return [
    'Web KaTrain engine error',
    `Status: ${input.status}`,
    `Requested backend: ${input.requestedBackend}`,
    `Active backend: ${input.activeBackend}`,
    `Model: ${input.modelLabel ?? 'Not loaded'}`,
    `Model URL: ${input.modelUrl}`,
    '',
    input.error,
  ].join('\n');
}
