import type { AgentDoc } from '../agents/types';
import type { BoardData, CardItemData, ListConfig, UserGoal } from '../../types';
import type { CreateCardInput } from '../repository/workspaceRepository';
import { computeGoalProgress } from '../goals/progress';
import type { AgentExecutionRequest, AgentExecutor } from './executor';
import {
  selectRunnableCards,
  type EligibilityContext,
  type EngineCard,
  type IneligibilityReason,
} from './eligibility';
import {
  collectFeedForwardEvents,
  collectLegacyFeedForwardEvents,
  MAX_FEED_FORWARD_HOPS,
  sanitizeRoutedClone,
  snapshotBoards,
  type CardSnapshot,
} from './feedForward';
import { buildCardRunPatch, type RunOutcome } from './runResult';
import type { RunStore } from './runStore';
import { buildRunId, DEFAULT_AUTONOMY_POLICY, LEASE_RENEW_MS, type AgentRun, type AutonomyPolicy, type RunTrigger } from './types';

export interface CoordinatorSnapshot {
  boards: BoardData[];
  goals: UserGoal[];
  agents: AgentDoc[];
  policy: AutonomyPolicy;
  runs: AgentRun[];
}

export interface BlockedCard {
  cardId: string;
  cardTitle: string;
  reason: IneligibilityReason;
}

export interface CoordinatorDeps {
  store: RunStore;
  executor: AgentExecutor;
  /** Unique id of this engine instance (tab); stamped onto leases. */
  clientId: string;
  ownerUid: string;
  /** Leader election is an optimization only — claims are transactional, so a
   *  standby tab that wrongly believes it is leader still cannot double-run. */
  isLeader?: () => boolean;
  routeCard: (targetBoardId: string, targetListId: string, input: CreateCardInput, sourceCard: CardItemData) => void;
  logActivity?: (action: string, cardTitle?: string) => void;
  onEvaluated?: (info: { blocked: BlockedCard[] }) => void;
  now?: () => number;
  /** Test seam: evaluation debounce (production 750ms). */
  debounceMs?: number;
  /** Test seam: periodic sweep/backoff tick (production 10s). */
  sweepIntervalMs?: number;
}

export interface RunCoordinator {
  start(): void;
  stop(): void;
  updateSnapshot(patch: Partial<CoordinatorSnapshot>): void;
  requestEvaluation(reason: string): void;
  runCardNow(cardId: string): Promise<string | null>;
  cancelRun(runId: string): Promise<void>;
}

const UPSTREAM_OUTPUT_MAX = 2_000;

function flattenCards(boards: BoardData[]): EngineCard[] {
  const out: EngineCard[] = [];
  for (const board of boards) {
    for (const list of board.lists) {
      list.cards.forEach((card, index) => {
        out.push({ ...card, boardId: board.id, listId: list.id, position: index });
      });
    }
  }
  return out;
}

/**
 * The client-side run engine. Claims queued runs under a lease, executes them
 * through the injected executor, and settles them through the store's single
 * applyRunResult batch. All cross-tab correctness lives in the store's
 * transactions; this class only orchestrates one tab's share of the work.
 */
export function createLocalRunCoordinator(deps: CoordinatorDeps): RunCoordinator {
  const now = deps.now ?? (() => Date.now());
  const debounceMs = deps.debounceMs ?? 750;
  const sweepIntervalMs = deps.sweepIntervalMs ?? 10_000;
  const isLeader = deps.isLeader ?? (() => true);

  let snapshot: CoordinatorSnapshot = {
    boards: [],
    goals: [],
    agents: [],
    policy: DEFAULT_AUTONOMY_POLICY,
    runs: [],
  };

  let started = false;
  let stopped = false;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let sweepTimer: ReturnType<typeof setInterval> | null = null;
  let leaseTimer: ReturnType<typeof setInterval> | null = null;
  let evaluating = false;
  let evalAgainAfter = false;

  const activeExecutions = new Map<string, AbortController>();
  let prevCardSnapshots: Map<string, CardSnapshot> | null = null;

  function findCard(cardId: string): EngineCard | null {
    return flattenCards(snapshot.boards).find(c => c.id === cardId) ?? null;
  }

  function buildEligibilityContext(cards: EngineCard[]): EligibilityContext {
    const listsById = new Map<string, Pick<ListConfig, 'autoRunAgents'>>();
    for (const board of snapshot.boards) {
      for (const list of board.lists) listsById.set(list.id, list);
    }
    return {
      listsById,
      cardsById: new Map(cards.map(c => [c.id, c])),
      agents: snapshot.agents,
      goals: snapshot.goals as EligibilityContext['goals'],
      policy: snapshot.policy,
      runs: snapshot.runs,
      runsInFlight: snapshot.runs.filter(r => r.status === 'running').length,
      now: now(),
    };
  }

  function handleFeedForward(): void {
    const next = snapshotBoards(snapshot.boards);
    if (prevCardSnapshots === null) {
      // First snapshot after (re)start: prime the edge detector without
      // firing — 'always' connections would otherwise route every card
      // already sitting in a source list.
      prevCardSnapshots = next;
      return;
    }
    const prev = prevCardSnapshots;
    prevCardSnapshots = next;

    const cardsById = new Map<string, CardItemData>();
    for (const board of snapshot.boards) {
      for (const list of board.lists) {
        for (const card of list.cards) cardsById.set(card.id, card);
      }
    }

    for (const event of collectFeedForwardEvents(snapshot.boards, prev, next)) {
      route(event.card, event.connection.targetBoardId, event.connection.targetListId);
    }
    for (const event of collectLegacyFeedForwardEvents(prev, next, cardsById)) {
      const targetBoard = snapshot.boards.find(b => b.id === event.targetBoardId);
      const targetList = targetBoard?.lists[0];
      if (targetBoard && targetList) route(event.card, targetBoard.id, targetList.id);
    }
  }

  function route(card: CardItemData, targetBoardId: string, targetListId: string): void {
    const input = sanitizeRoutedClone(card, {
      description: `Automatically routed. Output: ${card.lastExecutionOutput || 'Completed'}`,
    });
    deps.routeCard(targetBoardId, targetListId, input, card);
    deps.logActivity?.(
      `Feed-Forward routed card "${card.title}" (hop ${input.lineage?.hopCount ?? 1}/${MAX_FEED_FORWARD_HOPS})`,
      card.title,
    );
  }

  function buildRunDoc(
    card: EngineCard,
    agentId: string | null,
    attempt: number,
    trigger: RunTrigger,
  ): Omit<AgentRun, 'ownerUid'> {
    const revision = card.revision ?? 1;
    return {
      id: buildRunId(card.id, revision, attempt),
      cardId: card.id,
      cardTitle: card.title,
      boardId: card.boardId,
      goalId: card.goalId ?? null,
      agentId,
      cardRevision: revision,
      attempt,
      status: 'queued',
      trigger,
      error: null,
      output: null,
      suggestedProgress: null,
      usage: null,
      leaseOwner: null,
      leaseExpiresAt: null,
      queuedAt: now(),
      startedAt: null,
      finishedAt: null,
    };
  }

  function buildExecutionRequest(run: AgentRun, card: EngineCard): AgentExecutionRequest {
    const agent = run.agentId ? snapshot.agents.find(a => a.id === run.agentId) : null;
    const goal = card.goalId ? snapshot.goals.find(g => g.id === card.goalId) : null;
    const cardsById = new Map(flattenCards(snapshot.boards).map(c => [c.id, c]));
    const upstream = (card.dependsOnCardIds ?? [])
      .map(depId => cardsById.get(depId))
      .filter((c): c is EngineCard => Boolean(c?.lastExecutionOutput))
      .slice(0, 10)
      .map(c => ({
        cardId: c.id,
        title: c.title,
        output: (c.lastExecutionOutput ?? '').slice(0, UPSTREAM_OUTPUT_MAX),
      }));

    return {
      runId: run.id,
      cardId: card.id,
      agentId: run.agentId,
      cardTitle: card.title,
      cardDescription: card.description,
      prompt: card.prompt || 'Execute card routine and evaluate widgets',
      systemPrompt: agent?.systemPrompt || undefined,
      model: agent?.model,
      widgets: card.widgets ?? [],
      upstream,
      goal: goal ? { title: goal.title, outcome: goal.outcome } : null,
    };
  }

  async function executeRun(runId: string): Promise<void> {
    const claim = await deps.store.claimRun(runId, deps.clientId, now());
    if (!claim.ok) {
      // Narrow via `in` — this repo's tsconfig has no strictNullChecks, so the
      // {ok:true}|{ok:false} union does not narrow on `!claim.ok` alone.
      if ('reason' in claim && claim.reason === 'budget_exhausted') {
        deps.logActivity?.('Autonomy run refused: budget exhausted');
      }
      return;
    }

    const run = snapshot.runs.find(r => r.id === runId);
    const card = run ? findCard(run.cardId) : null;
    if (!run || !card) {
      await deps.store.cancelRun(runId, now());
      return;
    }

    const controller = new AbortController();
    activeExecutions.set(runId, controller);

    try {
      const result = await deps.executor.execute(buildExecutionRequest(run, card), controller.signal);
      const outcome: RunOutcome = controller.signal.aborted ? 'cancelled' : 'error' in result ? 'error' : 'success';
      const agent = run.agentId ? snapshot.agents.find(a => a.id === run.agentId) : null;

      const cardPatch = buildCardRunPatch({
        card,
        outcome,
        output: 'error' in result ? result.error.message : result.output,
        suggestedProgress: 'error' in result ? null : result.suggestedProgress,
        updatedWidgets: 'error' in result ? null : result.updatedWidgets,
        agentRequiresApproval: agent?.requiresApproval ?? false,
        runId,
        now: now(),
      });

      const goalProgress = computeGoalProgressFor(card, cardPatch);

      await deps.store.applyRunResult({
        runId,
        outcome,
        output: 'error' in result ? null : result.output,
        suggestedProgress: 'error' in result ? null : result.suggestedProgress,
        usage: 'error' in result ? null : result.usage,
        error: 'error' in result ? result.error : null,
        cardId: card.id,
        cardPatch,
        goalProgress,
        activity: {
          timestamp: new Date(now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actor: { name: agent?.name ?? 'Autonomy Engine', isAgent: true },
          action:
            outcome === 'success'
              ? `Autonomous run succeeded: "${card.title}" (attempt ${run.attempt})`
              : outcome === 'error'
                ? `Autonomous run failed: "${card.title}" (${'error' in result ? result.error.code : 'aborted'})`
                : `Autonomous run cancelled: "${card.title}"`,
          boardName: snapshot.boards.find(b => b.id === card.boardId)?.name ?? '',
          cardTitle: card.title,
        },
        finishedAt: now(),
      });

      deps.logActivity?.(
        outcome === 'success' ? `Autonomous agent completed "${card.title}"` : `Autonomous run ended ${outcome}: "${card.title}"`,
        card.title,
      );
    } catch (err: any) {
      // The executor contract says it never throws, but a bug there must not
      // strand a run in `running` forever — settle it as an internal error.
      await deps.store
        .applyRunResult({
          runId,
          outcome: 'error',
          output: null,
          suggestedProgress: null,
          usage: null,
          error: { code: 'internal', message: err?.message ?? String(err), retryable: true },
          cardId: card.id,
          cardPatch: buildCardRunPatch({
            card,
            outcome: 'error',
            output: null,
            suggestedProgress: null,
            updatedWidgets: null,
            agentRequiresApproval: false,
            runId,
            now: now(),
          }),
          goalProgress: null,
          activity: null,
          finishedAt: now(),
        })
        .catch(e => console.error('Failed to settle errored run:', e));
    } finally {
      activeExecutions.delete(runId);
      coordinator.requestEvaluation('settle');
    }
  }

  function computeGoalProgressFor(
    card: EngineCard,
    cardPatch: Record<string, unknown>,
  ): { goalId: string; detail: ReturnType<typeof computeGoalProgress> } | null {
    if (!card.goalId) return null;
    const siblingCards = flattenCards(snapshot.boards).filter(c => c.goalId === card.goalId);
    if (siblingCards.length === 0) return null;
    const projected = siblingCards.map(c =>
      c.id === card.id
        ? {
            status: (cardPatch.status as CardItemData['status']) ?? c.status,
            progress: (cardPatch.progress as number) ?? c.progress,
          }
        : { status: c.status, progress: c.progress },
    );
    return { goalId: card.goalId, detail: computeGoalProgress(projected) };
  }

  async function evaluate(): Promise<void> {
    if (evaluating) {
      evalAgainAfter = true;
      return;
    }
    evaluating = true;
    try {
      if (stopped || !isLeader()) return;

      handleFeedForward();

      if (!snapshot.policy.enabled) {
        deps.onEvaluated?.({ blocked: [] });
        return;
      }

      const cards = flattenCards(snapshot.boards);
      const ctx = buildEligibilityContext(cards);
      const { runnable, blocked } = selectRunnableCards(cards, ctx);
      deps.onEvaluated?.({
        blocked: blocked.map(b => ({ cardId: b.card.id, cardTitle: b.card.title, reason: b.reason })),
      });

      for (const { card, agent, attempt } of runnable) {
        const runDoc = buildRunDoc(card, agent.id, attempt, 'auto');
        const enqueued = await deps.store.enqueueRun(runDoc);
        if (enqueued === 'enqueued') {
          // Snapshot is stale by construction — add the run locally so the
          // execution request can resolve it before Firestore echoes back.
          snapshot.runs = [{ ...runDoc, ownerUid: deps.ownerUid }, ...snapshot.runs];
          void executeRun(runDoc.id);
        }
      }
    } finally {
      evaluating = false;
      if (evalAgainAfter) {
        evalAgainAfter = false;
        coordinator.requestEvaluation('again');
      }
    }
  }

  function abortAllActive(): void {
    for (const controller of activeExecutions.values()) controller.abort();
  }

  const coordinator: RunCoordinator = {
    start() {
      if (started) return;
      started = true;
      stopped = false;

      void deps.store
        .sweepInterrupted(now())
        .then(count => {
          if (count > 0) deps.logActivity?.(`Reclaimed ${count} interrupted run(s)`);
        })
        .catch(err => console.error('Failed to sweep interrupted runs:', err));

      sweepTimer = setInterval(() => {
        void deps.store.sweepInterrupted(now()).catch(() => undefined);
        coordinator.requestEvaluation('interval');
      }, sweepIntervalMs);

      leaseTimer = setInterval(() => {
        for (const runId of activeExecutions.keys()) {
          void deps.store.renewLease(runId, deps.clientId, now()).then(kept => {
            if (!kept) activeExecutions.get(runId)?.abort();
          });
        }
      }, LEASE_RENEW_MS);

      coordinator.requestEvaluation('start');
    },

    stop() {
      if (!started) return;
      started = false;
      stopped = true;
      if (debounceTimer) clearTimeout(debounceTimer);
      if (sweepTimer) clearInterval(sweepTimer);
      if (leaseTimer) clearInterval(leaseTimer);
      debounceTimer = null;
      sweepTimer = null;
      leaseTimer = null;
      abortAllActive();
    },

    updateSnapshot(patch) {
      const prevEnabled = snapshot.policy.enabled;
      snapshot = { ...snapshot, ...patch };

      // Kill switch observed via the policy snapshot: in-flight runs abort
      // (settling as cancelled) and evaluation short-circuits.
      if (patch.policy && prevEnabled && !patch.policy.enabled) {
        abortAllActive();
      }

      if (patch.boards || patch.runs || patch.policy || patch.agents || patch.goals) {
        coordinator.requestEvaluation('snapshot');
      }
    },

    requestEvaluation(_reason: string) {
      if (!started || stopped) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        void evaluate();
      }, debounceMs);
    },

    async runCardNow(cardId) {
      const card = findCard(cardId);
      if (!card) return null;
      if (snapshot.runs.some(r => r.cardId === cardId && (r.status === 'queued' || r.status === 'running'))) {
        return null;
      }

      const revision = card.revision ?? 1;
      const attempt = snapshot.runs.filter(r => r.cardId === cardId && r.cardRevision === revision).length + 1;
      // Explicit user action: bypasses the eligibility gates on purpose, but
      // still flows through enqueue -> claim -> execute -> applyRunResult so
      // the run is leased, budgeted, and observable like any other.
      const agentId = card.assignedAgentId ?? null;
      const runDoc = buildRunDoc(card, agentId, attempt, 'manual');

      const enqueued = await deps.store.enqueueRun(runDoc);
      snapshot.runs = [{ ...runDoc, ownerUid: deps.ownerUid }, ...snapshot.runs];
      if (enqueued === 'enqueued') {
        void executeRun(runDoc.id);
      }
      return runDoc.id;
    },

    async cancelRun(runId) {
      const active = activeExecutions.get(runId);
      if (active) {
        active.abort();
        return;
      }
      await deps.store.cancelRun(runId, now());
    },
  };

  return coordinator;
}
