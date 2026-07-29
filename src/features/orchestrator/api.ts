import { apiPost } from '../../lib/api/client';
import { OrchestratorResponseSchema, type OrchestratorResponse } from '../../shared/contracts/orchestrator';
import type { HistoryEntry } from '../../lib/orchestrator/types';

export interface SendOrchestratorMessageInput {
  threadId: string;
  message: string;
  /** Capped context block from buildOrchestratorContext. */
  context: string;
  /** Last-16-message window of the thread. */
  history: HistoryEntry[];
  /** Rolling heuristic thread summary. */
  summary?: string;
}

/**
 * POSTs one orchestrator turn and re-validates the response client-side so
 * callers get a typed { summary, proposal } — the proposal is persisted with
 * proposalState 'pending' by the caller; nothing here mutates the workspace.
 */
export async function sendOrchestratorMessage(
  input: SendOrchestratorMessageInput
): Promise<OrchestratorResponse> {
  const raw = await apiPost<unknown>('/api/orchestrate', input);
  return OrchestratorResponseSchema.parse(raw);
}
