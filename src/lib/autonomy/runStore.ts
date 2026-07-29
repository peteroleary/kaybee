import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Unsubscribe } from '../repository/workspaceRepository';
import { applyRunResult, type ApplyRunResultArgs } from './applyRunResult';
import {
  DEFAULT_AUTONOMY_POLICY,
  LEASE_INTERRUPT_MS,
  LEASE_MS,
  mergePolicy,
  type AgentRun,
  type AutonomyPolicy,
} from './types';

export type ClaimResult = { ok: true } | { ok: false; reason: 'not_claimable' | 'budget_exhausted' };

/**
 * Persistence seam for the autonomy engine, mirroring the Phase 2 repository
 * pattern: owner-scoped Firestore in production, an in-memory twin for
 * tests. All multi-writer invariants (dedupe on enqueue, single-claimant
 * lease, budget decrement) live inside transactions — never in caller code.
 */
export interface RunStore {
  subscribeRuns(cb: (runs: AgentRun[]) => void): Unsubscribe;
  subscribePolicy(cb: (policy: AutonomyPolicy) => void): Unsubscribe;
  /** Deep-merges a patch into users/{uid}.autonomy. Never pass budget.runsUsed
   *  here — the claim transaction owns that counter. */
  savePolicy(patch: Partial<AutonomyPolicy>): Promise<void>;
  /** Creates the run doc iff the (deterministic) id is free. */
  enqueueRun(run: Omit<AgentRun, 'ownerUid'>): Promise<'enqueued' | 'exists'>;
  /** Transactionally flips queued -> running with a fresh lease, decrementing
   *  the remaining budget in the same transaction. */
  claimRun(runId: string, claimantId: string, now: number): Promise<ClaimResult>;
  /** Extends the lease iff we still hold it. False = we lost the run. */
  renewLease(runId: string, claimantId: string, now: number): Promise<boolean>;
  applyRunResult(args: ApplyRunResultArgs): Promise<void>;
  cancelRun(runId: string, now: number): Promise<void>;
  /** Marks runs stuck `running` past the interrupt threshold. Returns count. */
  sweepInterrupted(now: number): Promise<number>;
}

// ---------------------------------------------------------------------------
// Firestore implementation
// ---------------------------------------------------------------------------

export function createFirestoreRunStore(uid: string): RunStore {
  const runsCol = collection(db, 'runs');
  const userRef = doc(db, 'users', uid);

  return {
    subscribeRuns(cb) {
      const q = query(runsCol, where('ownerUid', '==', uid), orderBy('queuedAt', 'desc'));
      return onSnapshot(q, snap => {
        cb(snap.docs.map(d => ({ id: d.id, ...(d.data() as object) }) as AgentRun));
      });
    },

    subscribePolicy(cb) {
      return onSnapshot(userRef, snap => {
        const autonomy = snap.data()?.autonomy as Partial<AutonomyPolicy> | undefined;
        cb(mergePolicy(DEFAULT_AUTONOMY_POLICY, autonomy ?? null));
      });
    },

    async savePolicy(patch) {
      await setDoc(userRef, { autonomy: patch }, { merge: true });
    },

    async enqueueRun(run) {
      const runRef = doc(runsCol, run.id);
      return runTransaction(db, async tx => {
        const existing = await tx.get(runRef);
        if (existing.exists()) return 'exists' as const;
        tx.set(runRef, { ...run, ownerUid: uid });
        return 'enqueued' as const;
      });
    },

    async claimRun(runId, claimantId, now) {
      const runRef = doc(runsCol, runId);
      return runTransaction(db, async tx => {
        const runSnap = await tx.get(runRef);
        if (!runSnap.exists()) return { ok: false, reason: 'not_claimable' } as const;
        const run = runSnap.data() as AgentRun;
        const claimable =
          run.status === 'queued' ||
          (run.status === 'running' && run.leaseExpiresAt != null && run.leaseExpiresAt < now);
        if (!claimable) return { ok: false, reason: 'not_claimable' } as const;

        const userSnap = await tx.get(userRef);
        const policy = mergePolicy(
          DEFAULT_AUTONOMY_POLICY,
          (userSnap.data()?.autonomy as Partial<AutonomyPolicy> | undefined) ?? null,
        );
        // The kill switch is enforced inside the claim too: a pause that
        // lands between evaluation and claim still wins. Manual runs are the
        // exception — an explicit user click is not autonomy — but they
        // still spend budget (checked below).
        if (run.trigger !== 'manual' && !policy.enabled) return { ok: false, reason: 'not_claimable' } as const;
        if (policy.budget.runsUsed >= policy.budget.maxRunsTotal) {
          tx.update(runRef, {
            status: 'error',
            error: { code: 'budget_exhausted', message: 'Autonomy budget exhausted.', retryable: false },
            finishedAt: now,
          });
          return { ok: false, reason: 'budget_exhausted' } as const;
        }

        tx.update(runRef, {
          status: 'running',
          leaseOwner: claimantId,
          leaseExpiresAt: now + LEASE_MS,
          startedAt: now,
        });
        tx.set(userRef, { autonomy: { budget: { runsUsed: increment(1) } } }, { merge: true });
        return { ok: true } as const;
      });
    },

    async renewLease(runId, claimantId, now) {
      const runRef = doc(runsCol, runId);
      return runTransaction(db, async tx => {
        const snap = await tx.get(runRef);
        if (!snap.exists()) return false;
        const run = snap.data() as AgentRun;
        if (run.status !== 'running' || run.leaseOwner !== claimantId) return false;
        tx.update(runRef, { leaseExpiresAt: now + LEASE_MS });
        return true;
      });
    },

    async applyRunResult(args) {
      await applyRunResult(db, uid, args);
    },

    async cancelRun(runId, now) {
      const runRef = doc(runsCol, runId);
      await runTransaction(db, async tx => {
        const snap = await tx.get(runRef);
        if (!snap.exists()) return;
        const run = snap.data() as AgentRun;
        if (run.status !== 'queued' && run.status !== 'running') return;
        tx.update(runRef, {
          status: 'cancelled',
          error: { code: 'aborted', message: 'Run cancelled.', retryable: false },
          leaseOwner: null,
          leaseExpiresAt: null,
          finishedAt: now,
        });
      });
    },

    async sweepInterrupted(now) {
      const q = query(runsCol, where('ownerUid', '==', uid), where('status', '==', 'running'));
      const snap = await getDocs(q);
      const stale = snap.docs.filter(d => {
        const run = d.data() as AgentRun;
        return run.leaseExpiresAt != null && run.leaseExpiresAt < now - LEASE_INTERRUPT_MS;
      });
      if (stale.length === 0) return 0;
      const batch = writeBatch(db);
      stale.forEach(d =>
        batch.update(d.ref, {
          status: 'interrupted',
          leaseOwner: null,
          leaseExpiresAt: null,
          finishedAt: now,
          error: { code: 'internal', message: 'Run lease expired; the executing tab likely closed.', retryable: true },
        }),
      );
      await batch.commit();
      return stale.length;
    },
  };
}

// ---------------------------------------------------------------------------
// In-memory implementation (tests; same transactional semantics)
// ---------------------------------------------------------------------------

export interface MemoryRunStore extends RunStore {
  readonly runs: AgentRun[];
  policy: AutonomyPolicy;
  /** Test hook: observe the exact card patch each applyRunResult carries. */
  onApplyCardPatch?: (cardId: string | null, patch: Record<string, unknown> | null) => void;
}

export function createMemoryRunStore(initialPolicy?: Partial<AutonomyPolicy>): MemoryRunStore {
  const runMap = new Map<string, AgentRun>();
  const runListeners = new Set<(runs: AgentRun[]) => void>();
  const policyListeners = new Set<(policy: AutonomyPolicy) => void>();

  const store: MemoryRunStore = {
    runs: [],
    policy: mergePolicy(DEFAULT_AUTONOMY_POLICY, initialPolicy ?? null),

    subscribeRuns(cb) {
      runListeners.add(cb);
      cb([...runMap.values()]);
      return () => runListeners.delete(cb);
    },

    subscribePolicy(cb) {
      policyListeners.add(cb);
      cb(store.policy);
      return () => policyListeners.delete(cb);
    },

    async savePolicy(patch) {
      store.policy = mergePolicy(store.policy, patch);
      policyListeners.forEach(cb => cb(store.policy));
    },

    async enqueueRun(run) {
      if (runMap.has(run.id)) return 'exists';
      runMap.set(run.id, { ...run, ownerUid: 'memory' });
      emitRuns();
      return 'enqueued';
    },

    async claimRun(runId, claimantId, now) {
      const run = runMap.get(runId);
      if (!run) return { ok: false, reason: 'not_claimable' };
      const claimable =
        run.status === 'queued' ||
        (run.status === 'running' && run.leaseExpiresAt != null && run.leaseExpiresAt < now);
      if (!claimable) return { ok: false, reason: 'not_claimable' };
      if (run.trigger !== 'manual' && !store.policy.enabled) return { ok: false, reason: 'not_claimable' };
      if (store.policy.budget.runsUsed >= store.policy.budget.maxRunsTotal) {
        runMap.set(runId, {
          ...run,
          status: 'error',
          error: { code: 'budget_exhausted', message: 'Autonomy budget exhausted.', retryable: false },
          finishedAt: now,
        });
        emitRuns();
        return { ok: false, reason: 'budget_exhausted' };
      }
      store.policy = {
        ...store.policy,
        budget: { ...store.policy.budget, runsUsed: store.policy.budget.runsUsed + 1 },
      };
      runMap.set(runId, {
        ...run,
        status: 'running',
        leaseOwner: claimantId,
        leaseExpiresAt: now + LEASE_MS,
        startedAt: now,
      });
      emitRuns();
      policyListeners.forEach(cb => cb(store.policy));
      return { ok: true };
    },

    async renewLease(runId, claimantId, now) {
      const run = runMap.get(runId);
      if (!run || run.status !== 'running' || run.leaseOwner !== claimantId) return false;
      runMap.set(runId, { ...run, leaseExpiresAt: now + LEASE_MS });
      emitRuns();
      return true;
    },

    async applyRunResult(args) {
      const run = runMap.get(args.runId);
      if (run) {
        runMap.set(args.runId, {
          ...run,
          status: args.outcome === 'success' ? 'success' : args.outcome === 'error' ? 'error' : 'cancelled',
          output: args.output,
          suggestedProgress: args.suggestedProgress,
          usage: args.usage,
          error: args.error,
          leaseOwner: null,
          leaseExpiresAt: null,
          finishedAt: args.finishedAt,
        });
        emitRuns();
      }
      store.onApplyCardPatch?.(args.cardId, args.cardPatch);
    },

    async cancelRun(runId, now) {
      const run = runMap.get(runId);
      if (!run || (run.status !== 'queued' && run.status !== 'running')) return;
      runMap.set(runId, {
        ...run,
        status: 'cancelled',
        error: { code: 'aborted', message: 'Run cancelled.', retryable: false },
        leaseOwner: null,
        leaseExpiresAt: null,
        finishedAt: now,
      });
      emitRuns();
    },

    async sweepInterrupted(now) {
      let count = 0;
      for (const [id, run] of runMap) {
        if (
          run.status === 'running' &&
          run.leaseExpiresAt != null &&
          run.leaseExpiresAt < now - LEASE_INTERRUPT_MS
        ) {
          runMap.set(id, {
            ...run,
            status: 'interrupted',
            leaseOwner: null,
            leaseExpiresAt: null,
            finishedAt: now,
            error: { code: 'internal', message: 'Run lease expired.', retryable: true },
          });
          count += 1;
        }
      }
      if (count > 0) emitRuns();
      return count;
    },
  };

  function emitRuns() {
    const runs = [...runMap.values()];
    (store as { runs: AgentRun[] }).runs = runs;
    runListeners.forEach(cb => cb(runs));
  }

  return store;
}
