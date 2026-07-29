import { apiPost, ApiClientError } from '../api/client';
import type { AgentRunApiResponse, RunErrorInfo } from '../../shared/contracts/agentRun';
import type { InteractiveWidget } from '../../types';

export interface AgentExecutionRequest {
  runId: string;
  cardId: string;
  agentId: string | null;
  cardTitle: string;
  cardDescription: string;
  prompt: string;
  systemPrompt?: string;
  model?: string;
  widgets: InteractiveWidget[];
  upstream: Array<{ cardId: string; title: string; output: string }>;
  goal: { title: string; outcome: string } | null;
}

export type AgentExecutionResult = AgentRunApiResponse;

/**
 * The seam between the run engine and whatever actually executes a card.
 * Today: HTTP to the Express Gemini proxy. Later: a Cloud Function can claim
 * runs server-side and fulfill the same contract — the engine and UI do not
 * change.
 */
export interface AgentExecutor {
  readonly id: string;
  execute(req: AgentExecutionRequest, signal: AbortSignal): Promise<AgentExecutionResult>;
}

function statusToRunError(status: number, message: string): RunErrorInfo {
  switch (status) {
    case 401:
    case 403:
      return { code: 'internal', message: `Unauthenticated (${status}): ${message}`, retryable: false };
    case 408:
    case 504:
      return { code: 'timeout', message, retryable: true };
    case 429:
      return { code: 'rate_limited', message, retryable: true };
    default:
      return { code: 'internal', message, retryable: true };
  }
}

/** Executes runs by POSTing to `/api/agent-run` (authenticated via apiPost,
 *  idempotent via the deterministic run id). */
export class HttpAgentExecutor implements AgentExecutor {
  readonly id = 'http-agent-run';

  async execute(req: AgentExecutionRequest, signal: AbortSignal): Promise<AgentExecutionResult> {
    try {
      return await apiPost<AgentRunApiResponse>('/api/agent-run', req, {
        idempotencyKey: req.runId,
        signal,
      });
    } catch (err: any) {
      if (signal.aborted) {
        return { ok: false, error: { code: 'aborted', message: 'Run aborted by client.', retryable: false } };
      }
      if (err instanceof ApiClientError) {
        const details = err.details as { error?: RunErrorInfo } | undefined;
        if (details?.error?.code) {
          return { ok: false, error: details.error };
        }
        return { ok: false, error: statusToRunError(err.status, err.message) };
      }
      return {
        ok: false,
        error: { code: 'provider_error', message: err?.message ?? String(err), retryable: true },
      };
    }
  }
}
