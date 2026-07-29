import { apiPost } from '../../lib/api/client';
import { PlanProposal, PlanProposalSchema } from '../../shared/contracts/goalPlan';
import type { BoardData } from '../../types';

export interface DecomposeGoalInput {
  title: string;
  description: string;
  outcome: string;
}

/**
 * Calls POST /api/goal-decompose (which already returns a PlanProposal-shaped
 * body validated server-side against PlanProposalSchema — see
 * src/server/api/gemini.ts callGoalDecomposition) and re-validates on the
 * client so callers get a typed, guaranteed-well-formed PlanProposal rather
 * than `any`.
 */
export async function decomposeGoal(goal: DecomposeGoalInput, currentBoard?: BoardData | null): Promise<PlanProposal> {
  const raw = await apiPost<unknown>('/api/goal-decompose', { goal, currentBoard: currentBoard ?? undefined });
  return PlanProposalSchema.parse(raw);
}
