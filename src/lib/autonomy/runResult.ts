import type { CardItemData, InteractiveWidget } from '../../types';

/** Card-side projection of a run's output is capped at 8KB; the full output
 *  lives on the run doc. */
export const CARD_OUTPUT_MAX_BYTES = 8 * 1024;

export function truncateForCard(output: string, maxBytes = CARD_OUTPUT_MAX_BYTES): string {
  if (output.length <= maxBytes) return output;
  return `${output.slice(0, maxBytes)}…`;
}

/** Merges server-returned widget updates into the card's widgets *by id*:
 *  matching ids are replaced, unknown ids are appended, unmentioned widgets
 *  are preserved. */
export function mergeWidgetsById(
  existing: InteractiveWidget[],
  updates: InteractiveWidget[],
): InteractiveWidget[] {
  const updateById = new Map(updates.map(w => [w.id, w]));
  const merged = existing.map(w => updateById.get(w.id) ?? w);
  const existingIds = new Set(existing.map(w => w.id));
  for (const w of updates) {
    if (!existingIds.has(w.id)) merged.push(w);
  }
  return merged;
}

export type RunOutcome = 'success' | 'error' | 'cancelled';

/**
 * Maps a run outcome to the card's *work* status — distinct from
 * `executionStatus`, which records the *last run* state. A cancelled run
 * leaves the work status untouched. Successful runs land in `in_review` when
 * the agent requires human approval, otherwise `completed`.
 */
export function resolveWorkStatus(
  outcome: RunOutcome,
  agent: { requiresApproval?: boolean } | null,
): CardItemData['status'] | null {
  switch (outcome) {
    case 'success':
      return agent?.requiresApproval ? 'in_review' : 'completed';
    case 'error':
      return 'failed';
    case 'cancelled':
      return null;
  }
}

export function resolveExecutionStatus(outcome: RunOutcome): CardItemData['executionStatus'] {
  switch (outcome) {
    case 'success':
      return 'success';
    case 'error':
      return 'error';
    case 'cancelled':
      return 'idle';
  }
}

export interface CardRunPatchArgs {
  card: CardItemData;
  outcome: RunOutcome;
  output: string | null;
  suggestedProgress: number | null;
  updatedWidgets: InteractiveWidget[] | null;
  agentRequiresApproval: boolean;
  runId: string;
  now: number;
}

/**
 * Builds the exact card patch a finished run applies. `progress` is only
 * touched when the model returned a real suggestedProgress (null means "no
 * opinion" — never coerce to 100, and a legitimate 0 stays 0). `status` and
 * `executionStatus` are set independently per resolveWorkStatus.
 */
export function buildCardRunPatch(args: CardRunPatchArgs): Record<string, unknown> {
  const { card, outcome, output, suggestedProgress, updatedWidgets, agentRequiresApproval, runId, now } = args;

  const patch: Record<string, unknown> = {
    executionStatus: resolveExecutionStatus(outcome),
    lastRunId: runId,
    lastExecutionAt: new Date(now).toISOString(),
  };

  if (output != null) patch.lastExecutionOutput = truncateForCard(output);

  const workStatus = resolveWorkStatus(outcome, { requiresApproval: agentRequiresApproval });
  if (workStatus) patch.status = workStatus;

  if (outcome === 'success' && suggestedProgress != null) {
    patch.progress = Math.min(100, Math.max(0, Math.round(suggestedProgress)));
  }

  if (updatedWidgets && updatedWidgets.length > 0) {
    patch.widgets = mergeWidgetsById(card.widgets ?? [], updatedWidgets);
  }

  return patch;
}
