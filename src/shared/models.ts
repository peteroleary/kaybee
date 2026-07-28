export const MODELS = {
  orchestrator: 'gemini-3.6-flash',
  goalDecompose: 'gemini-3.6-flash',
  agentRun: 'gemini-3.6-flash',
  smartSuggestions: 'gemini-3.6-flash',
  transcribe: 'gemini-3.5-flash',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
