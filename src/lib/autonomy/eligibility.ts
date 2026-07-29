import type { AgentDoc } from '../agents/types';
import { resolveAgentAssignment } from '../agents/resolveAssignment';
import type { CardItemData, ListConfig } from '../../types';
import type { AgentRun, AutonomyPolicy } from './types';

/** A card as the engine sees it: the hydrated card plus its containment. */
export type EngineCard = CardItemData & { boardId: string; listId: string; position: number };

export type IneligibilityReason =
  | 'autonomy_disabled'
  | 'approval_required'
  | 'budget_exhausted'
  | 'rate_limited'
  | 'list_not_autonomous'
  | 'already_completed'
  | 'no_agent_assigned'
  | 'agent_is_human'
  | 'agent_not_auto_execute'
  | 'dependency_unmet'
  | 'dependency_cycle'
  | 'already_queued_or_running'
  | 'already_succeeded_at_revision'
  | 'max_attempts_reached'
  | 'backoff_wait'
  | 'concurrency_limit';

export type Eligibility =
  | { eligible: true; agent: AgentDoc; attempt: number }
  | { eligible: false; reason: IneligibilityReason };

/** Per-goal autonomy override, read structurally off the goal doc. Set by
 *  "Apply & Run" (goal.autonomy.enabled = true); false opts a goal back out. */
export interface GoalAutonomyOverride {
  enabled?: boolean;
}

export interface EligibilityContext {
  listsById: Map<string, Pick<ListConfig, 'autoRunAgents'>>;
  cardsById: Map<string, EngineCard>;
  agents: AgentDoc[];
  /** Goals carrying an optional structural `autonomy` override field. */
  goals: Array<{ id: string; autonomy?: GoalAutonomyOverride | null }>;
  policy: AutonomyPolicy;
  runs: AgentRun[];
  /** Runs currently holding a lease (status 'running'). */
  runsInFlight: number;
  now: number;
}

const PRIORITY_RANK: Record<CardItemData['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Exponential backoff before the next attempt of a card whose last run
 *  failed retryably: base * 2^(attempts-1), capped. */
export function computeBackoffMs(attempts: number, policy: AutonomyPolicy): number {
  const exp = Math.max(0, attempts - 1);
  return Math.min(policy.backoffBaseMs * 2 ** exp, policy.backoffMaxMs);
}

/** Resolves the agent a card would run under: explicit assignment first,
 *  then the assignment hint through the Phase 3 registry resolver. */
export function resolveAgentForCard(card: EngineCard, agents: AgentDoc[]): AgentDoc | null {
  if (card.assignedAgentId) {
    return agents.find(a => a.id === card.assignedAgentId) ?? null;
  }
  if (card.assignmentHint && card.assignmentHint.trim().length > 0) {
    const assignment = resolveAgentAssignment(card.assignmentHint, agents);
    return assignment.agentId ? (agents.find(a => a.id === assignment.agentId) ?? null) : null;
  }
  return null;
}

/**
 * Decides whether a single card may be auto-run right now. ALL three gates
 * are required: the list's autoRunAgents, a resolvable agent with autoExecute
 * (never kind 'human'), and policy.enabled — autoRunAgents alone is true in
 * dozens of seeded lists (including chat_feed) and is NOT sufficient.
 */
export function evaluateCard(card: EngineCard, ctx: EligibilityContext): Eligibility {
  const { policy, runs, now } = ctx;

  if (card.status === 'completed') return { eligible: false, reason: 'already_completed' };

  if (!policy.enabled) return { eligible: false, reason: 'autonomy_disabled' };

  if (card.goalId) {
    const goal = ctx.goals.find(g => g.id === card.goalId);
    if (goal) {
      const override = goal.autonomy?.enabled;
      if (override === false) return { eligible: false, reason: 'autonomy_disabled' };
      if (policy.requireApprovalForFirstRunOfGoal && override !== true) {
        return { eligible: false, reason: 'approval_required' };
      }
    }
  }

  if (policy.budget.runsUsed >= policy.budget.maxRunsTotal) {
    return { eligible: false, reason: 'budget_exhausted' };
  }

  const hourAgo = now - 3_600_000;
  const runsThisHour = runs.filter(r => r.queuedAt >= hourAgo).length;
  if (runsThisHour >= policy.maxRunsPerHour) return { eligible: false, reason: 'rate_limited' };

  const list = ctx.listsById.get(card.listId);
  if (!list || !list.autoRunAgents) return { eligible: false, reason: 'list_not_autonomous' };

  const agent = resolveAgentForCard(card, ctx.agents);
  if (!agent) return { eligible: false, reason: 'no_agent_assigned' };
  if (agent.kind === 'human') return { eligible: false, reason: 'agent_is_human' };
  if (!agent.autoExecute) return { eligible: false, reason: 'agent_not_auto_execute' };

  for (const depId of card.dependsOnCardIds ?? []) {
    const dep = ctx.cardsById.get(depId);
    if (!dep || dep.status !== 'completed') return { eligible: false, reason: 'dependency_unmet' };
  }

  const revision = card.revision ?? 1;
  const runsAtRevision = runs.filter(r => r.cardId === card.id && r.cardRevision === revision);

  if (runsAtRevision.some(r => r.status === 'queued' || r.status === 'running')) {
    return { eligible: false, reason: 'already_queued_or_running' };
  }
  if (runsAtRevision.some(r => r.status === 'success')) {
    return { eligible: false, reason: 'already_succeeded_at_revision' };
  }

  const attempts = runsAtRevision.length;
  if (attempts >= policy.maxAttemptsPerCard) {
    return { eligible: false, reason: 'max_attempts_reached' };
  }

  const lastFailure = runsAtRevision
    .filter(r => r.status === 'error' && r.finishedAt != null)
    .sort((a, b) => (b.finishedAt ?? 0) - (a.finishedAt ?? 0))[0];
  if (lastFailure?.error?.retryable) {
    const notBefore = (lastFailure.finishedAt ?? 0) + computeBackoffMs(attempts, policy);
    if (now < notBefore) return { eligible: false, reason: 'backoff_wait' };
  }

  return { eligible: true, agent, attempt: attempts + 1 };
}

export interface RunnableSelection {
  runnable: Array<{ card: EngineCard; agent: AgentDoc; attempt: number }>;
  blocked: Array<{ card: EngineCard; reason: IneligibilityReason }>;
}

/** Returns the ids of every card sitting on a dependency cycle. Only edges
 *  between cards present in `cards` are considered. */
export function findCycleMembers(cards: EngineCard[]): Set<string> {
  const byId = new Map(cards.map(c => [c.id, c]));
  const state = new Map<string, 'visiting' | 'done'>();
  const inCycle = new Set<string>();

  const visit = (id: string, stack: string[]): void => {
    // `stack` is the current DFS path, including `id` as its last element.
    for (const dep of byId.get(id)?.dependsOnCardIds ?? []) {
      if (!byId.has(dep)) continue;
      const s = state.get(dep);
      if (s === 'done') continue;
      if (s === 'visiting') {
        // Back edge: everything on the stack from `dep` up forms the cycle.
        const idx = stack.indexOf(dep);
        for (let i = idx; i < stack.length; i++) inCycle.add(stack[i]);
        continue;
      }
      state.set(dep, 'visiting');
      visit(dep, [...stack, dep]);
      state.set(dep, 'done');
    }
  };

  for (const card of cards) {
    if (state.has(card.id)) continue;
    state.set(card.id, 'visiting');
    visit(card.id, [card.id]);
    state.set(card.id, 'done');
  }
  return inCycle;
}

/**
 * Evaluates every card, then orders the eligible ones for execution:
 * dependencies before dependents (Kahn), ties broken by priority then list
 * position, truncated to the remaining concurrency budget. Cards cut by the
 * truncation are reported as 'concurrency_limit'.
 */
export function selectRunnableCards(cards: EngineCard[], ctx: EligibilityContext): RunnableSelection {
  const cycleMembers = findCycleMembers(cards);
  const runnable: RunnableSelection['runnable'] = [];
  const blocked: RunnableSelection['blocked'] = [];

  const eligible: Array<{ card: EngineCard; agent: AgentDoc; attempt: number }> = [];
  for (const card of cards) {
    if (cycleMembers.has(card.id)) {
      blocked.push({ card, reason: 'dependency_cycle' });
      continue;
    }
    const result = evaluateCard(card, ctx);
    if (result.eligible) {
      eligible.push({ card, agent: result.agent, attempt: result.attempt });
    } else if ('reason' in result) {
      // Narrow via `in` — no strictNullChecks in this repo, so the else-branch
      // of a boolean-tag union does not narrow on its own.
      blocked.push({ card, reason: result.reason });
    }
  }

  // Kahn's algorithm over the eligible subgraph; among the currently
  // unblocked cards pick the best (priority, then position).
  const eligibleById = new Map(eligible.map(e => [e.card.id, e]));
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const e of eligible) {
    const deps = (e.card.dependsOnCardIds ?? []).filter(d => eligibleById.has(d));
    indegree.set(e.card.id, deps.length);
    for (const d of deps) {
      dependents.set(d, [...(dependents.get(d) ?? []), e.card.id]);
    }
  }

  const byRank = (a: EngineCard, b: EngineCard): number => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return p !== 0 ? p : a.position - b.position;
  };

  let available = eligible.map(e => e.card).filter(c => (indegree.get(c.id) ?? 0) === 0).sort(byRank);
  const ordered: EngineCard[] = [];
  while (available.length > 0) {
    const next = available.shift()!;
    ordered.push(next);
    for (const dependentId of dependents.get(next.id) ?? []) {
      const remaining = (indegree.get(dependentId) ?? 0) - 1;
      indegree.set(dependentId, remaining);
      if (remaining === 0) {
        const dependent = eligibleById.get(dependentId)!.card;
        available.push(dependent);
        available.sort(byRank);
      }
    }
  }

  const slots = Math.max(0, ctx.policy.maxConcurrentRuns - ctx.runsInFlight);
  ordered.forEach((card, index) => {
    const e = eligibleById.get(card.id)!;
    if (index < slots) {
      runnable.push({ card, agent: e.agent, attempt: e.attempt });
    } else {
      blocked.push({ card, reason: 'concurrency_limit' });
    }
  });

  return { runnable, blocked };
}
