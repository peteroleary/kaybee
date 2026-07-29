import { describe, expect, it } from 'vitest';
import type { AgentDoc } from '../agents/types';
import type { CardItemData } from '../../types';
import {
  computeBackoffMs,
  evaluateCard,
  findCycleMembers,
  selectRunnableCards,
  type EligibilityContext,
  type EngineCard,
} from './eligibility';
import { DEFAULT_AUTONOMY_POLICY, type AgentRun, type AutonomyPolicy } from './types';

const NOW = 1_800_000_000_000;

function makePolicy(overrides: Partial<AutonomyPolicy> = {}): AutonomyPolicy {
  return {
    ...DEFAULT_AUTONOMY_POLICY,
    ...overrides,
    enabled: overrides.enabled ?? true,
    budget: { maxRunsTotal: 25, runsUsed: 0, resetAt: null, ...(overrides.budget ?? {}) },
  };
}

function makeAgent(overrides: Partial<AgentDoc> = {}): AgentDoc {
  const now = new Date(NOW).toISOString();
  return {
    id: 'agent-1',
    ownerUid: 'user-1',
    kind: 'agent',
    slug: 'general-agent',
    name: 'General Agent',
    description: '',
    entityType: 'agent',
    capabilities: [],
    status: 'idle',
    autoExecute: true,
    requiresApproval: false,
    model: 'gemini-3.6-flash',
    systemPrompt: '',
    isBuiltIn: true,
    lastExecutionAt: null,
    runCount: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

let cardSeq = 0;
function makeCard(overrides: Partial<EngineCard> = {}): EngineCard {
  cardSeq += 1;
  const now = new Date(NOW).toISOString();
  const base: CardItemData = {
    id: `card-${cardSeq}`,
    title: `Card ${cardSeq}`,
    description: '',
    entityType: 'agent',
    status: 'todo',
    progress: 0,
    rbacRole: 'contributor',
    widgets: [],
    subtasks: [],
    tags: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    revision: 1,
    assignedAgentId: 'agent-1',
  };
  return { ...base, boardId: 'board-1', listId: 'list-1', position: cardSeq * 1024, ...overrides };
}

function makeRun(overrides: Partial<AgentRun> = {}): AgentRun {
  return {
    id: 'run_x_r1_a1',
    ownerUid: 'user-1',
    cardId: 'card-1',
    cardTitle: 'Card',
    boardId: 'board-1',
    goalId: null,
    agentId: 'agent-1',
    cardRevision: 1,
    attempt: 1,
    status: 'queued',
    trigger: 'auto',
    error: null,
    output: null,
    suggestedProgress: null,
    usage: null,
    leaseOwner: null,
    leaseExpiresAt: null,
    queuedAt: NOW,
    startedAt: null,
    finishedAt: null,
    ...overrides,
  };
}

function makeCtx(cards: EngineCard[], overrides: Partial<EligibilityContext> = {}): EligibilityContext {
  return {
    listsById: new Map([['list-1', { autoRunAgents: true }]]),
    cardsById: new Map(cards.map(c => [c.id, c])),
    agents: [makeAgent()],
    goals: [],
    policy: makePolicy(),
    runs: [],
    runsInFlight: 0,
    now: NOW,
    ...overrides,
  };
}

describe('evaluateCard', () => {
  it('accepts a fully-gated card and reports the next attempt', () => {
    const card = makeCard();
    const result = evaluateCard(card, makeCtx([card]));
    expect(result).toMatchObject({ eligible: true, attempt: 1 });
  });

  it('rejects completed cards as already_completed', () => {
    const card = makeCard({ status: 'completed' });
    expect(evaluateCard(card, makeCtx([card]))).toEqual({ eligible: false, reason: 'already_completed' });
  });

  it('rejects when the global kill switch is off (the ship-disabled default)', () => {
    expect(DEFAULT_AUTONOMY_POLICY.enabled).toBe(false);
    const card = makeCard();
    const ctx = makeCtx([card], { policy: makePolicy({ enabled: false }) });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'autonomy_disabled' });
  });

  it('rejects when the goal override disables autonomy', () => {
    const card = makeCard({ goalId: 'goal-1' });
    const ctx = makeCtx([card], {
      goals: [{ id: 'goal-1', autonomy: { enabled: false } }],
      policy: makePolicy({ requireApprovalForFirstRunOfGoal: false }),
    });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'autonomy_disabled' });
  });

  it('requires first-run approval for goal cards until the goal opts in', () => {
    const card = makeCard({ goalId: 'goal-1' });
    const ctx = makeCtx([card], { goals: [{ id: 'goal-1' }] });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'approval_required' });

    const approved = makeCtx([card], { goals: [{ id: 'goal-1', autonomy: { enabled: true } }] });
    expect(evaluateCard(card, approved)).toMatchObject({ eligible: true });
  });

  it('rejects when the budget is exhausted', () => {
    const card = makeCard();
    const ctx = makeCtx([card], {
      policy: makePolicy({ budget: { maxRunsTotal: 25, runsUsed: 25, resetAt: null } }),
    });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'budget_exhausted' });
  });

  it('rejects when the hourly rate limit is hit', () => {
    const card = makeCard({ id: 'card-new' });
    const runs = Array.from({ length: 30 }, (_, i) =>
      makeRun({ id: `run_old_${i}`, cardId: `other-${i}`, queuedAt: NOW - 60_000 }),
    );
    const ctx = makeCtx([card], { runs, policy: makePolicy({ maxRunsPerHour: 30 }) });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'rate_limited' });
  });

  it('rejects when the list has autoRunAgents off', () => {
    const card = makeCard();
    const ctx = makeCtx([card], { listsById: new Map([['list-1', { autoRunAgents: false }]]) });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'list_not_autonomous' });
  });

  it('chat_feed hazard: autoRunAgents:true is NOT sufficient without an agent', () => {
    // Seeded chat lists carry autoRunAgents: true; their transcript cards have
    // no assignedAgentId and no assignmentHint. Gating on the list flag alone
    // would execute chat transcripts — the exact hazard the three-gate rule
    // exists to prevent.
    const chatCard = makeCard({
      assignedAgentId: null,
      assignmentHint: null,
      entityType: 'human',
      chatSender: { name: 'User Member', isAgent: false, timestamp: '10:00' },
      tags: ['Chat-Message'],
    });
    const ctx = makeCtx([chatCard]);
    expect(evaluateCard(chatCard, ctx)).toEqual({ eligible: false, reason: 'no_agent_assigned' });
  });

  it('rejects cards assigned to a kind:human agent', () => {
    const human = makeAgent({ id: 'human-1', kind: 'human', autoExecute: false });
    const card = makeCard({ assignedAgentId: 'human-1' });
    const ctx = makeCtx([card], { agents: [makeAgent(), human] });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'agent_is_human' });
  });

  it('rejects when the resolved agent has autoExecute off', () => {
    const gated = makeAgent({ id: 'agent-gated', autoExecute: false });
    const card = makeCard({ assignedAgentId: 'agent-gated' });
    const ctx = makeCtx([card], { agents: [gated] });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'agent_not_auto_execute' });
  });

  it('resolves an assignment hint through the agent registry', () => {
    const card = makeCard({ assignedAgentId: null, assignmentHint: 'General Agent' });
    const result = evaluateCard(card, makeCtx([card]));
    expect(result).toMatchObject({ eligible: true });
  });

  it('rejects unmet and missing dependencies', () => {
    const dep = makeCard({ id: 'dep-1', status: 'in_progress' });
    const card = makeCard({ dependsOnCardIds: ['dep-1'] });
    expect(evaluateCard(card, makeCtx([card, dep]))).toEqual({ eligible: false, reason: 'dependency_unmet' });

    const orphan = makeCard({ dependsOnCardIds: ['dep-deleted'] });
    expect(evaluateCard(orphan, makeCtx([orphan]))).toEqual({ eligible: false, reason: 'dependency_unmet' });

    const doneDep = makeCard({ id: 'dep-2', status: 'completed' });
    const ready = makeCard({ dependsOnCardIds: ['dep-2'] });
    expect(evaluateCard(ready, makeCtx([ready, doneDep]))).toMatchObject({ eligible: true });
  });

  it('rejects cards with a queued or running run at this revision', () => {
    const card = makeCard({ id: 'card-1' });
    const runs = [makeRun({ status: 'running' })];
    expect(evaluateCard(card, makeCtx([card], { runs }))).toEqual({
      eligible: false,
      reason: 'already_queued_or_running',
    });
  });

  it('never re-runs a card that already succeeded at this revision', () => {
    const card = makeCard({ id: 'card-1', revision: 2 });
    const runs = [makeRun({ status: 'success', cardRevision: 2 })];
    expect(evaluateCard(card, makeCtx([card], { runs }))).toEqual({
      eligible: false,
      reason: 'already_succeeded_at_revision',
    });

    // A success at an OLDER revision does not block: semantic edits re-open the card.
    const older = [makeRun({ status: 'success', cardRevision: 1 })];
    expect(evaluateCard(card, makeCtx([card], { runs: older }))).toMatchObject({ eligible: true, attempt: 1 });
  });

  it('stops after maxAttemptsPerCard runs at this revision', () => {
    const card = makeCard({ id: 'card-1' });
    const runs = [1, 2, 3].map(a =>
      makeRun({ id: `run_1_${a}`, attempt: a, status: 'error', finishedAt: NOW - 9_000_000 }),
    );
    const ctx = makeCtx([card], { runs, policy: makePolicy({ maxAttemptsPerCard: 3 }) });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'max_attempts_reached' });
  });

  it('honors exponential backoff after a retryable failure', () => {
    const card = makeCard({ id: 'card-1' });
    const failedRun = makeRun({
      status: 'error',
      finishedAt: NOW - 1_000,
      error: { code: 'provider_error', message: 'boom', retryable: true },
    });
    const ctx = makeCtx([card], { runs: [failedRun] });
    expect(evaluateCard(card, ctx)).toEqual({ eligible: false, reason: 'backoff_wait' });

    const later = makeCtx([card], { runs: [failedRun], now: NOW + 10_000 });
    expect(evaluateCard(card, later)).toMatchObject({ eligible: true, attempt: 2 });
  });

  it('non-retryable failures do not trigger backoff', () => {
    const card = makeCard({ id: 'card-1' });
    const failedRun = makeRun({
      status: 'error',
      finishedAt: NOW - 1_000,
      error: { code: 'invalid_input', message: 'bad', retryable: false },
    });
    expect(evaluateCard(card, makeCtx([card], { runs: [failedRun] }))).toMatchObject({ eligible: true });
  });
});

describe('computeBackoffMs', () => {
  it('doubles per attempt and caps at backoffMaxMs', () => {
    const policy = makePolicy({ backoffBaseMs: 5_000, backoffMaxMs: 300_000 });
    expect(computeBackoffMs(1, policy)).toBe(5_000);
    expect(computeBackoffMs(2, policy)).toBe(10_000);
    expect(computeBackoffMs(3, policy)).toBe(20_000);
    expect(computeBackoffMs(20, policy)).toBe(300_000);
  });
});

describe('findCycleMembers', () => {
  it('flags every member of a dependency cycle, including self-loops', () => {
    const a = makeCard({ id: 'a', dependsOnCardIds: ['b'] });
    const b = makeCard({ id: 'b', dependsOnCardIds: ['a'] });
    const c = makeCard({ id: 'c', dependsOnCardIds: ['c'] });
    const d = makeCard({ id: 'd', dependsOnCardIds: ['a'] });
    const members = findCycleMembers([a, b, c, d]);
    expect([...members].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('selectRunnableCards', () => {
  it('never selects a dependent before its dependency completes', () => {
    // Strict sequencing: a dependent is dependency_unmet while its dep is
    // unfinished — even when the dep itself is runnable in the same pass.
    // Claiming both in parallel would silently break the dependency order.
    const dep = makeCard({ id: 'dep', priority: 'low' });
    const dependent = makeCard({ id: 'dependent', priority: 'urgent', dependsOnCardIds: ['dep'] });

    const first = selectRunnableCards([dependent, dep], makeCtx([dep, dependent]));
    expect(first.runnable.map(r => r.card.id)).toEqual(['dep']);
    expect(first.blocked.map(b => b.reason)).toEqual(['dependency_unmet']);

    const doneDep = makeCard({ id: 'dep', priority: 'low', status: 'completed' });
    const second = selectRunnableCards([dependent, doneDep], makeCtx([doneDep, dependent]));
    expect(second.runnable.map(r => r.card.id)).toEqual(['dependent']);
  });

  it('blocks every cycle member with dependency_cycle', () => {
    const a = makeCard({ id: 'a', dependsOnCardIds: ['b'] });
    const b = makeCard({ id: 'b', dependsOnCardIds: ['a'] });
    const { runnable, blocked } = selectRunnableCards([a, b], makeCtx([a, b]));
    expect(runnable).toEqual([]);
    expect(blocked.map(x => x.reason)).toEqual(['dependency_cycle', 'dependency_cycle']);
  });

  it('breaks ties by priority then position', () => {
    const low = makeCard({ id: 'low', priority: 'low', position: 0 });
    const urgent = makeCard({ id: 'urgent', priority: 'urgent', position: 4096 });
    const medium = makeCard({ id: 'medium', priority: 'medium', position: 1024 });
    const { runnable } = selectRunnableCards([low, medium, urgent], makeCtx([low, medium, urgent], {
      policy: makePolicy({ maxConcurrentRuns: 10 }),
    }));
    expect(runnable.map(r => r.card.id)).toEqual(['urgent', 'medium', 'low']);
  });

  it('truncates to maxConcurrentRuns minus runsInFlight', () => {
    const cards = [makeCard({ id: 'c1' }), makeCard({ id: 'c2' }), makeCard({ id: 'c3' })];
    const ctx = makeCtx(cards, { policy: makePolicy({ maxConcurrentRuns: 2 }), runsInFlight: 0 });
    const { runnable, blocked } = selectRunnableCards(cards, ctx);
    expect(runnable).toHaveLength(2);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toBe('concurrency_limit');

    const inFlight = makeCtx(cards, { policy: makePolicy({ maxConcurrentRuns: 2 }), runsInFlight: 2 });
    const none = selectRunnableCards(cards, inFlight);
    expect(none.runnable).toHaveLength(0);
    expect(none.blocked.map(b => b.reason)).toEqual([
      'concurrency_limit',
      'concurrency_limit',
      'concurrency_limit',
    ]);
  });
});
