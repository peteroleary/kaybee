import type { PlanProposal } from '../../shared/contracts/goalPlan';
import type { UserGoal } from '../../types';
import type { AppliedRefs } from '../repository/types';
import type { WorkspaceRepository } from '../repository/workspaceRepository';
import type { GoalProgress } from './progress';

export interface ApplyGoalPlanResult {
  boardId: string;
  appliedRefs: AppliedRefs;
  agentIds: string[];
  progress: number;
  progressDetail: GoalProgress;
}

/**
 * Applies a goal's persisted `plan` to `goal.boardId`, creating the board
 * first if the goal doesn't own one yet, via the repository's batched
 * `applyPlan` (which itself defers to shared/plan/normalize's
 * materializePlan — the single normalizer, not a second implementation).
 *
 * This function only *derives* the goal bookkeeping — appliedRefs, the
 * (raw, unresolved) suggested agent ids, and the post-apply progress
 * snapshot. It does not write the goal document itself; callers persist the
 * returned fields (see WorkspaceProvider.handleApplyGoalPlan), matching how
 * every other repository-facing handler in this codebase separates "do the
 * work" from "log/persist the result".
 */
export async function applyGoalPlan(
  repository: WorkspaceRepository,
  goal: UserGoal,
  plan: PlanProposal
): Promise<ApplyGoalPlanResult> {
  const boardId =
    goal.boardId ??
    (await repository.createBoard({
      name: goal.title,
      category: 'Cross-Functional',
      description: goal.description || `Board created for goal: "${goal.title}"`,
    }));

  const appliedRefs = await repository.applyPlan(plan, { boardId, goalId: goal.id });

  // TODO(agent-registry): Phase 3 is building a real agent registry under
  // src/lib/agents/** with a `resolveAgentAssignment` that will turn these
  // raw capability ids (and each card's assignmentHint, already carried
  // through by materializePlan) into concrete agent bindings. Until that
  // lands, just carry the model's raw suggestions forward on the goal so
  // nothing is silently dropped — see src/types.ts UserGoal.agentIds.
  const agentIds = Array.from(new Set([...(goal.agentIds ?? []), ...plan.suggestedAgents]));

  // Freshly materialized cards always start as { status: 'todo', progress: 0 }
  // (see materializePlan), so folding them into the goal's progress is just
  // widening the denominator — nothing prior (already-applied cards, if any)
  // needs to be re-read to do this correctly.
  const prior = goal.progressDetail;
  const newCardCount = appliedRefs.cardIds.length;
  const total = (prior?.total ?? 0) + newCardCount;
  const progressDetail: GoalProgress = {
    total,
    completed: prior?.completed ?? 0,
    inProgress: prior?.inProgress ?? 0,
    blocked: prior?.blocked ?? 0,
    failed: prior?.failed ?? 0,
    waitingOnHuman: prior?.waitingOnHuman ?? 0,
    percent: total === 0 ? 0 : Math.round((((prior?.percent ?? 0) / 100) * (prior?.total ?? 0)) / total * 100),
  };

  return { boardId, appliedRefs, agentIds, progress: progressDetail.percent, progressDetail };
}
