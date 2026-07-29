import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentDoc } from '../agents/types';
import type { BoardData, CardItemData } from '../../types';
import type { CreateCardInput } from '../repository/workspaceRepository';
import { createLocalRunCoordinator, type RunCoordinator } from './coordinator';
import type { AgentExecutionResult, AgentExecutor } from './executor';
import { createMemoryRunStore, type MemoryRunStore } from './runStore';
import { DEFAULT_AUTONOMY_POLICY, LEASE_INTERRUPT_MS, type AgentRun, type AutonomyPolicy } from './types';

const NOW = 1_800_000_000_000;

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

function makeCard(overrides: Partial<CardItemData> = {}): CardItemData {
  const now = new Date(NOW).toISOString();
  return {
    id: 'card-1',
    title: 'Task card',
    description: 'do the thing',
    entityType: 'agent',
    status: 'todo',
    progress: 0,
    rbacRole: 'contributor',
    widgets: [],
    subtasks: [],
    prompt: 'run it',
    tags: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    revision: 1,
    assignedAgentId: 'agent-1',
    ...overrides,
  };
}

function makeBoard(cards: CardItemData[], overrides: Partial<BoardData> = {}): BoardData {
  return {
    id: 'board-1',
    name: 'Board',
    description: '',
    icon: 'Layers',
    category: 'Core Engineering',
    rbacRole: 'admin',
    lists: [
      {
        id: 'list-1',
        title: 'Agents',
        listType: 'kanban',
        homogenousType: 'agents_only',
        color: 'indigo',
        icon: 'Bot',
        autoRunAgents: true,
        rbacRole: 'contributor',
        cards,
      },
    ],
    feedForwardConnections: [],
    ...overrides,
  };
}

const SUCCESS_RESULT: AgentExecutionResult = {
  ok: true,
  output: 'task done',
  suggestedProgress: 80,
  updatedWidgets: [],
  usage: { model: 'gemini-3.6-flash', estimatedTokens: 42 },
};

function successExecutor(): AgentExecutor & { execute: ReturnType<typeof vi.fn> } {
  return { id: 'fake', execute: vi.fn(async () => SUCCESS_RESULT) };
}

function enabledPolicy(overrides: Partial<AutonomyPolicy> = {}): AutonomyPolicy {
  return { ...DEFAULT_AUTONOMY_POLICY, ...overrides, enabled: overrides.enabled ?? true };
}

interface Harness {
  store: MemoryRunStore;
  coordinator: RunCoordinator;
  executor: AgentExecutor & { execute: ReturnType<typeof vi.fn> };
  routed: Array<{ boardId: string; listId: string; input: CreateCardInput }>;
  cardPatches: Array<{ cardId: string | null; patch: Record<string, unknown> | null }>;
}

function makeHarness(opts: {
  policy?: Partial<AutonomyPolicy>;
  executor?: AgentExecutor & { execute: ReturnType<typeof vi.fn> };
  clientId?: string;
  store?: MemoryRunStore;
}): Harness {
  const store = opts.store ?? createMemoryRunStore({ enabled: true, ...(opts.policy ?? {}) });
  const executor = opts.executor ?? successExecutor();
  const routed: Harness['routed'] = [];
  const cardPatches: Harness['cardPatches'] = [];
  store.onApplyCardPatch = (cardId, patch) => cardPatches.push({ cardId, patch });

  const coordinator = createLocalRunCoordinator({
    store,
    executor,
    clientId: opts.clientId ?? 'tab-a',
    ownerUid: 'user-1',
    routeCard: (boardId, listId, input) => routed.push({ boardId, listId, input }),
    debounceMs: 0,
    sweepIntervalMs: 3_600_000,
  });
  return { store, coordinator, executor, routed, cardPatches };
}

function pushSnapshot(h: Harness, boards: BoardData[], policy?: AutonomyPolicy) {
  h.coordinator.updateSnapshot({
    boards,
    goals: [],
    agents: [makeAgent()],
    policy: policy ?? enabledPolicy(),
    runs: h.store.runs,
  });
}

const live: RunCoordinator[] = [];
afterEach(() => {
  while (live.length) live.pop()!.stop();
});

describe('local run coordinator', () => {
  it('runs an eligible card end to end: enqueue -> claim -> execute -> applyRunResult', async () => {
    const h = makeHarness({});
    live.push(h.coordinator);
    h.coordinator.start();
    pushSnapshot(h, [makeBoard([makeCard()])]);

    await vi.waitFor(() => expect(h.executor.execute).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(h.cardPatches).toHaveLength(1));

    const run = h.store.runs.find(r => r.cardId === 'card-1');
    expect(run?.id).toBe('run_card-1_r1_a1');
    expect(run?.status).toBe('success');
    expect(h.store.policy.budget.runsUsed).toBe(1);

    const patch = h.cardPatches[0].patch!;
    expect(patch.executionStatus).toBe('success');
    expect(patch.status).toBe('completed');
    expect(patch.progress).toBe(80);
    expect(patch.lastRunId).toBe('run_card-1_r1_a1');
  });

  it('never enqueues the same work twice from two tabs (deterministic id + claim)', async () => {
    const store = createMemoryRunStore({ enabled: true });
    const a = makeHarness({ store, clientId: 'tab-a' });
    const b = makeHarness({ store, clientId: 'tab-b' });
    live.push(a.coordinator, b.coordinator);
    a.coordinator.start();
    b.coordinator.start();

    const boards = [makeBoard([makeCard()])];
    pushSnapshot(a, boards);
    pushSnapshot(b, boards);

    await vi.waitFor(() => expect(store.runs.length).toBeGreaterThan(0));
    await vi.waitFor(() => {
      const execCount = a.executor.execute.mock.calls.length + b.executor.execute.mock.calls.length;
      expect(execCount).toBe(1);
    });
    expect(store.runs).toHaveLength(1);
    expect(store.policy.budget.runsUsed).toBe(1);
  });

  it('refuses to overspend budget inside the claim, even when eligibility was optimistic', async () => {
    // Store-side budget is empty; the coordinator's snapshot policy still has
    // headroom, so the claim transaction is the only thing preventing spend.
    const store = createMemoryRunStore({
      enabled: true,
      budget: { maxRunsTotal: 0, runsUsed: 0, resetAt: null },
    });
    const h = makeHarness({ store });
    live.push(h.coordinator);
    h.coordinator.start();
    pushSnapshot(h, [makeBoard([makeCard()])], enabledPolicy());

    await vi.waitFor(() => {
      const run = store.runs.find(r => r.cardId === 'card-1');
      expect(run?.status).toBe('error');
      expect(run?.error?.code).toBe('budget_exhausted');
    });
    expect(h.executor.execute).not.toHaveBeenCalled();
  });

  it('kills in-flight runs within one policy snapshot when autonomy is paused', async () => {
    let resolveRun: ((r: AgentExecutionResult) => void) | null = null;
    const blockingExecutor: AgentExecutor & { execute: ReturnType<typeof vi.fn> } = {
      id: 'blocking',
      execute: vi.fn(
        (_req, signal: AbortSignal) =>
          new Promise<AgentExecutionResult>(resolve => {
            resolveRun = resolve;
            signal.addEventListener('abort', () =>
              resolve({ ok: false, error: { code: 'aborted', message: 'aborted', retryable: false } }),
            );
          }),
      ),
    };
    const h = makeHarness({ executor: blockingExecutor });
    live.push(h.coordinator);
    h.coordinator.start();
    pushSnapshot(h, [makeBoard([makeCard()])]);

    await vi.waitFor(() => expect(blockingExecutor.execute).toHaveBeenCalledTimes(1));

    h.coordinator.updateSnapshot({ policy: enabledPolicy({ enabled: false }) });

    await vi.waitFor(() => {
      const run = h.store.runs.find(r => r.cardId === 'card-1');
      expect(run?.status).toBe('cancelled');
    });
    expect(resolveRun).not.toBeNull();
  });

  it('marks a lease-expired running run interrupted on sweep', async () => {
    const store = createMemoryRunStore({ enabled: true });
    const staleRun: AgentRun = {
      id: 'run_card-9_r1_a1',
      ownerUid: 'memory',
      cardId: 'card-9',
      cardTitle: 'Stale',
      boardId: 'board-1',
      goalId: null,
      agentId: 'agent-1',
      cardRevision: 1,
      attempt: 1,
      status: 'running',
      trigger: 'auto',
      error: null,
      output: null,
      suggestedProgress: null,
      usage: null,
      leaseOwner: 'dead-tab',
      leaseExpiresAt: NOW - LEASE_INTERRUPT_MS - 1_000,
      queuedAt: NOW - 500_000,
      startedAt: NOW - 400_000,
      finishedAt: null,
    };
    await store.enqueueRun(staleRun);

    const swept = await store.sweepInterrupted(NOW);
    expect(swept).toBe(1);
    expect(store.runs[0].status).toBe('interrupted');
  });

  it('manual runs bypass the kill switch but still spend budget', async () => {
    const h = makeHarness({ policy: { enabled: false } });
    live.push(h.coordinator);
    h.coordinator.start();
    pushSnapshot(h, [makeBoard([makeCard()])], enabledPolicy({ enabled: false }));

    const runId = await h.coordinator.runCardNow('card-1');
    expect(runId).toBe('run_card-1_r1_a1');

    await vi.waitFor(() => expect(h.executor.execute).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => {
      expect(h.store.runs.find(r => r.id === runId)?.status).toBe('success');
    });
    expect(h.store.policy.budget.runsUsed).toBe(1);
  });

  it('routes a completed card through sanitized feed-forward exactly once (edge, not level)', async () => {
    const h = makeHarness({});
    live.push(h.coordinator);
    h.coordinator.start();

    const card = makeCard({ status: 'in_progress', targetBoardFeedId: undefined });
    const connections: BoardData['feedForwardConnections'] = [
      {
        id: 'conn-1',
        sourceBoardId: 'board-1',
        sourceListId: 'list-1',
        targetBoardId: 'board-2',
        targetListId: 'list-2',
        condition: 'on_complete',
      },
    ];

    // First snapshot primes the edge detector — no routing.
    pushSnapshot(h, [makeBoard([card], { feedForwardConnections: connections })]);
    await new Promise(r => setTimeout(r, 20));
    expect(h.routed).toHaveLength(0);

    // Completion edge -> one sanitized clone.
    pushSnapshot(h, [makeBoard([{ ...card, status: 'completed' }], { feedForwardConnections: connections })]);
    await vi.waitFor(() => expect(h.routed).toHaveLength(1));
    const clone = h.routed[0];
    expect(clone.boardId).toBe('board-2');
    expect(clone.input.assignedAgentId).toBeNull();
    expect(clone.input.dependsOnCardIds).toEqual([]);
    expect(clone.input.executionStatus).toBe('idle');
    expect(clone.input.lineage).toEqual({ rootCardId: 'card-1', hopCount: 1 });

    // Same steady state pushed again -> no second route (level guard).
    pushSnapshot(h, [makeBoard([{ ...card, status: 'completed' }], { feedForwardConnections: connections })]);
    await new Promise(r => setTimeout(r, 20));
    expect(h.routed).toHaveLength(1);
  });
});
