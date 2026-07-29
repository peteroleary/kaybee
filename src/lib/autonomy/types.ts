import type { RunErrorInfo } from '../../shared/contracts/agentRun';

export type { RunErrorInfo };

export type RunStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled' | 'interrupted';

export type RunTrigger = 'auto' | 'manual';

/**
 * Persisted at `runs/{runId}`. The doc id is deterministic — see buildRunId —
 * so two tabs computing the same work produce the same id and `enqueueRun`
 * can abort the duplicate inside a transaction.
 */
export interface AgentRun {
  id: string;
  ownerUid: string;
  cardId: string;
  /** Denormalized for the run console so it renders without a card join. */
  cardTitle: string;
  boardId: string;
  goalId: string | null;
  agentId: string | null;
  cardRevision: number;
  attempt: number;
  status: RunStatus;
  trigger: RunTrigger;
  error: RunErrorInfo | null;
  /** Full model output; the card only carries an 8KB projection. */
  output: string | null;
  suggestedProgress: number | null;
  usage: { model: string; estimatedTokens: number } | null;
  /** Engine instance (tab) currently holding the lease. */
  leaseOwner: string | null;
  /** Epoch ms after which another engine may reclaim this run. */
  leaseExpiresAt: number | null;
  queuedAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface AutonomyPolicy {
  /** Master kill switch. When false, nothing runs — even goal-opted-in cards. */
  enabled: boolean;
  maxConcurrentRuns: number;
  maxRunsPerHour: number;
  maxAttemptsPerCard: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  budget: { maxRunsTotal: number; runsUsed: number; resetAt: string | null };
  requireApprovalForFirstRunOfGoal: boolean;
}

/** Ships disabled: autonomy is opt-in per goal, never on by default. */
export const DEFAULT_AUTONOMY_POLICY: AutonomyPolicy = {
  enabled: false,
  maxConcurrentRuns: 2,
  maxRunsPerHour: 30,
  maxAttemptsPerCard: 3,
  backoffBaseMs: 5_000,
  backoffMaxMs: 300_000,
  budget: { maxRunsTotal: 25, runsUsed: 0, resetAt: null },
  requireApprovalForFirstRunOfGoal: true,
};

export function mergePolicy(
  base: AutonomyPolicy,
  override?: Partial<AutonomyPolicy> | null,
): AutonomyPolicy {
  if (!override) return base;
  return {
    ...base,
    ...override,
    budget: { ...base.budget, ...(override.budget ?? {}) },
  };
}

/** `run_${cardId}_r${cardRevision}_a${attempt}` — deterministic per unit of work. */
export function buildRunId(cardId: string, cardRevision: number, attempt: number): string {
  return `run_${cardId}_r${cardRevision}_a${attempt}`;
}

export const LEASE_MS = 90_000;
export const LEASE_RENEW_MS = 30_000;
/** Runs stuck `running` with a lease expired by more than this are marked `interrupted` on load. */
export const LEASE_INTERRUPT_MS = 2 * LEASE_MS;
