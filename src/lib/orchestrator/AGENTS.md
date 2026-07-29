# src/lib/orchestrator DOX

## Purpose

The `src/lib/orchestrator/` directory is the conversation core behind the orchestrator dock (`src/features/orchestrator/`): capped context building, the proposal state machine, and thread/message persistence.

## Ownership

- `context.ts` — `buildOrchestratorContext`: budgeted text block (`MAX_CONTEXT_CHARS = 12_000`, per-section caps) replacing any whole-board payload.
- `proposals.ts` — proposal state machine (`nextProposalState`).
- `threadStore.ts` — `ThreadStore` persistence seam: Firestore when signed in, localStorage-backed memory store when signed out.
- `types.ts` — `OrchestratorThread`, `OrchestratorMessage`, `ProposalState`, `HistoryEntry`.

## Local Contracts

- **Persistence layout**: Firestore root `threads/{id}` collection with a `messages/` subcollection; every doc is `ownerUid`-scoped (enforced by `firestore.rules`). Signed-out users get the same `ThreadStore` interface over localStorage.
- **Nothing mutates the workspace**: an orchestrator response is persisted as a message with a `pending` proposal; applying it is a separate explicit user action.
- **Proposal state machine**: only `pending` proposals transition (`apply` / `refine` / `discard` / `supersede`); all other states are terminal and illegal transitions throw.
- **Context is always capped**: callers pass the `buildOrchestratorContext` block to `/api/orchestrate`; never POST the entire nested board.

## Work Guidance

## Verification

- **Unit Tests**: `pnpm test` — `context.test.ts`, `proposals.test.ts`.

## Child DOX Index

- No nested child directories in `src/lib/orchestrator/`.
