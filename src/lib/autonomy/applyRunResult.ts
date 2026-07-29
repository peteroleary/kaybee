import { collection, doc, serverTimestamp, writeBatch, type Firestore } from 'firebase/firestore';
import type { ActivityLog } from '../../types';
import type { GoalProgress } from '../goals/progress';
import type { RunErrorInfo } from '../../shared/contracts/agentRun';
import type { RunStatus } from './types';
import type { RunOutcome } from './runResult';

export interface ApplyRunResultArgs {
  runId: string;
  outcome: RunOutcome;
  output: string | null;
  suggestedProgress: number | null;
  usage: { model: string; estimatedTokens: number } | null;
  error: RunErrorInfo | null;
  /** Null when the card was deleted mid-run — the run still terminates. */
  cardId: string | null;
  /** Precomputed via buildCardRunPatch; null when there is no card to patch. */
  cardPatch: Record<string, unknown> | null;
  goalProgress: { goalId: string; detail: GoalProgress } | null;
  activity: Omit<ActivityLog, 'id'> | null;
  finishedAt: number;
}

const OUTCOME_TO_RUN_STATUS: Record<RunOutcome, RunStatus> = {
  success: 'success',
  error: 'error',
  cancelled: 'cancelled',
};

/**
 * The single writer of run outcomes. One writeBatch: run doc -> card
 * (executionStatus, work status, progress, merged widgets, 8KB output
 * projection) -> activity entry -> recomputed goal progress. Card writes go
 * straight to the doc, bypassing repository.updateCard on purpose: run
 * results must NOT bump `revision`, or `already_succeeded_at_revision` would
 * never hold and every succeeded card would re-run forever.
 */
export async function applyRunResult(db: Firestore, uid: string, args: ApplyRunResultArgs): Promise<void> {
  const batch = writeBatch(db);

  batch.update(doc(db, 'runs', args.runId), {
    status: OUTCOME_TO_RUN_STATUS[args.outcome],
    output: args.output,
    suggestedProgress: args.suggestedProgress,
    usage: args.usage,
    error: args.error,
    leaseOwner: null,
    leaseExpiresAt: null,
    finishedAt: args.finishedAt,
  });

  if (args.cardId && args.cardPatch) {
    batch.update(doc(db, 'cards', args.cardId), {
      ...args.cardPatch,
      updatedAt: serverTimestamp(),
    });
  }

  if (args.activity) {
    batch.set(doc(collection(db, 'activity')), {
      ...args.activity,
      ownerUid: uid,
      createdAt: serverTimestamp(),
    });
  }

  if (args.goalProgress) {
    batch.update(doc(db, 'goals', args.goalProgress.goalId), {
      progress: args.goalProgress.detail.percent,
      progressDetail: args.goalProgress.detail,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}
