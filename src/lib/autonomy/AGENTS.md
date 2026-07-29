# src/lib/autonomy DOX

## Purpose

The `src/lib/autonomy/` directory is the autonomy run engine: it decides which cards agents may execute, claims and leases runs transactionally, executes them through a pluggable seam, and applies results back to cards.

## Ownership

- `eligibility.ts` — per-card eligibility gates and runnable-card selection (dependency-ordered, concurrency-truncated).
- `runStore.ts` — `RunStore` persistence seam: Firestore root `runs/` collection + `users/{uid}.autonomy` policy; in-memory twin for tests.
- `types.ts` — `AgentRun`, `AutonomyPolicy`, `DEFAULT_AUTONOMY_POLICY`, `buildRunId`, lease constants.
- `executor.ts` — `AgentExecutor` seam; `HttpAgentExecutor` POSTs to `/api/agent-run` via `apiPost`.
- `coordinator.ts` — evaluation loop driving enqueue/claim/execute/apply.
- `leaderElection.ts` — BroadcastChannel tab leader election (optimization only).
- `useRunEngine.ts` — React hook mounting the engine; published to UI via `src/features/runs/AutonomyContext.tsx`.
- `applyRunResult.ts` / `runResult.ts` — card patch construction and application (writes `executionStatus`).
- `feedForward.ts` — cross-board clone sanitization (`sanitizeRoutedClone`) and hop cap (`MAX_FEED_FORWARD_HOPS = 3`).

## Local Contracts

- **Three-gate eligibility**: a card auto-runs only if ALL of (1) its list's `autoRunAgents`, (2) a resolvable non-human agent with `autoExecute`, and (3) `policy.enabled` hold. `autoRunAgents` alone is never sufficient.
- **Ship-disabled defaults**: `DEFAULT_AUTONOMY_POLICY` is `enabled: false`, `requireApprovalForFirstRunOfGoal: true`, `maxRunsTotal: 25`, `maxConcurrentRuns: 2`. Autonomy is opt-in per goal (`UserGoal.autonomy.enabled`), never on by default.
- **Transactional lease + budget**: claiming a run flips `queued → running` with a 90s lease (`LEASE_MS`) and increments `budget.runsUsed` via `increment(1)` in the SAME transaction. All multi-writer invariants live inside transactions, never in caller code. Never write `budget.runsUsed` outside the claim transaction.
- **Deterministic run ids**: `run_${cardId}_r${cardRevision}_a${attempt}` — duplicate enqueues abort inside a transaction. Run docs are an audit trail and are never deleted.
- **Kill switch enforced at claim time**: a policy pause landing between evaluation and claim still wins (checked inside the claim transaction). Manual runs are exempt from the kill switch but still spend budget.
- **Leader election is not a correctness mechanism**: two tabs that both believe they are leader still cannot double-run a card; the lease claim guarantees that.
- **Feed-forward clones**: routed clones are sanitized via `sanitizeRoutedClone` and stop routing at `MAX_FEED_FORWARD_HOPS` (3).

## Work Guidance

## Verification

- **Unit Tests**: `pnpm test` — `eligibility.test.ts`, `coordinator.test.ts`, `runResult.test.ts`, `feedForward.test.ts` cover the invariants above.

## Child DOX Index

- No nested child directories in `src/lib/autonomy/`.
