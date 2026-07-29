# src/features/orchestrator DOX

## Purpose

The `src/features/orchestrator/` directory is the UI of the AI orchestrator: a persistent right-rail dock for multi-turn planning conversations. Domain logic and persistence live in `src/lib/orchestrator/`.

## Ownership

- `OrchestratorDock.tsx` — the right rail (48px collapsed ↔ 400px expanded), mounted at App level so it survives board switches. Visibility is `dockOpen` in `UiStateProvider`.
- `OrchestratorProvider.tsx` / `useOrchestrator.ts` — conversation state: threads, messages, sending, proposals.
- `Composer.tsx` — prompt input plus the voice-recording block (transcription via `/api/transcribe`).
- `ProposalCard.tsx` — renders a pending proposal, reusing `src/features/goals/PlanPreview.tsx`.
- `api.ts` — `sendOrchestratorMessage`: POSTs one turn to `/api/orchestrate` via `apiPost` and validates the `{summary, proposal}` response against `OrchestratorResponseSchema`.

## Local Contracts

- The dock proposes, never mutates: every AI response lands as a `pending` proposal; workspace changes happen only when the user applies it.
- Server contract: request `{threadId, message, context, history, summary?}`; response exactly `{summary, proposal}`.

## Work Guidance

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/features/orchestrator/`.
