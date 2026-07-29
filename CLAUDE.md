# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

KayBee is a goal-oriented Kanban & AI-orchestration web app: boards contain lists containing cards, where cards can represent tasks, humans, AI agents, agent swarms, or "troops," and boards can feed-forward into one another. React 19 + TypeScript + Vite + Tailwind v4 on the frontend, Firebase (Auth + Firestore) for persistence, and an Express server that wraps Google Gemini (`@google/genai`) for AI features (goal decomposition, orchestration, voice transcription, smart suggestions, agent execution).

## Commands

- Install: `pnpm install` (pnpm is the required package manager — see `pnpm-workspace.yaml`; ignore `bun.lock` if present, it is not authoritative)
- Dev server: `pnpm dev` — runs `tsx server.ts`, which boots a single Express server on port 3000 with Vite in middleware mode (HMR enabled)
- Build: `pnpm build` — `vite build` (frontend) then bundles `server.ts` into `dist/server.cjs` via esbuild
- Production run: `pnpm start` — `node dist/server.cjs`
- Type check / lint: `pnpm lint` (this is `tsc --noEmit`; there is no separate lint rule set for the frontend)
- Test: `pnpm test` (`vitest run`) — unit tests live next to source as `*.test.ts` under `src/` (configured in `vitest.config.ts`); `pnpm test:watch` for watch mode
- Clean: `pnpm clean`

### Firebase Cloud Functions (`functions/`)

This is a separate npm project/codebase from the root app.

- Build: `cd functions && npm run build` (tsc)
- Lint: `cd functions && npm run lint`
- Deploy: `cd functions && npm run deploy` (or `firebase deploy --only functions`)
- Target Firebase project: `kaybee-503713`
- `functions/src/index.ts` is currently a stub (all triggers commented out) — it is not where the app's AI/backend logic lives. Do not confuse this with `src/server/`.

## Architecture

### Backend: one Express server, not Cloud Functions

All real backend logic (AI calls) lives under `src/server/`, mounted by the single `server.ts` entrypoint at the repo root:

- `server.ts` — creates the Express app, mounts `src/server/routes.ts` at `/api`, and either runs Vite in middleware mode (dev) or serves `dist/` as static files with an SPA fallback (prod).
- `src/server/routes.ts` — defines the `/api/*` endpoints: `/health`, `/goal-decompose`, `/orchestrate`, `/transcribe`, `/agent-run`, `/smart-suggestions`.
- `src/server/middleware/auth.ts` — `requireAuth()` verifies `Authorization: Bearer <idToken>` via the Firebase Admin SDK. **Auth is enforced by default** (`AUTH_REQUIRED !== "false"`); requests without a valid token get 401. `AUTH_REQUIRED=false` is a local-dev-only escape hatch (pass-through with a loud boot warning) — never deploy with it.
- `src/server/api/gemini.ts` — wraps `@google/genai` calls (`callOrchestrator`, `callTranscribe`, `callAgentRun`, `callSmartSuggestions`, `callGoalDecomposition`) used by the routes above. `GEMINI_API_KEY` is read server-side only; never expose it to the client.
- Firebase (`functions/`) is a largely unused scaffold at present — new AI/API endpoints should go in `src/server/`, not `functions/`, unless the user asks to migrate to Cloud Functions.

### `/api/orchestrate` contract

Multi-turn, context-carrying. Request body: `{threadId, message, context, history, summary?}` — `message` (string) is required; `context` is the capped text block from `buildOrchestratorContext`; `history` is the thread's recent-message window; `summary` is the rolling thread summary. Response is exactly `{summary, proposal}` (an `OrchestratorResponse`, re-validated client-side against `OrchestratorResponseSchema`) — there are no top-level `newLists`/`newCards` fields. Applying a proposal is a client-side concern; the endpoint mutates nothing.

### Frontend: board state and data model

- `src/App.tsx` is the thin application shell — it renders `Navbar`, `BoardCanvas`, `ModalHost`, `OrchestratorDock`, and `ActivityDrawer`, wiring their props from `useWorkspace()` / `useUiState()`. It holds no state of its own.
- `src/state/WorkspaceProvider.tsx` is the central state hook: board/list/card CRUD, card movement, activity logging, goals, templates, tag colors, and feed-forward triggers between boards. UI components should delegate state mutation here (via `useWorkspace()`) rather than manipulating board data directly. `handleRunAgentTask` (manual agent runs) and `handleTriggerCrossBoardFeed` (feed-forward) route through the autonomy layer: cross-board clones are sanitized via `sanitizeRoutedClone` and capped at `MAX_FEED_FORWARD_HOPS` (3).
- `src/state/UiStateProvider.tsx` (via `useUiState()`) owns modal open/close state, zoom, board-view filters, `appMode: 'home' | 'board'`, and the orchestrator dock visibility (`dockOpen` / `toggleDock` / `setDockOpen`). There is no `'orchestrator'` modal — the dock replaced it.
- `src/lib/repository/` defines the `WorkspaceRepository` interface with two implementations `WorkspaceProvider` swaps between on auth state: `memoryRepository.ts` (signed out) and `firestoreRepository.ts` (signed in, seeded via `bootstrap.ts`).
- `src/types.ts` defines the core data model, read this before touching board/card logic:
  - `BoardData` → `ListConfig[]` → `CardItemData[]`
  - `EntityType` distinguishes `task | human | agent | routine | human_team | agent_swarm | troop` cards
  - `UserGoal` / `AgentDefinition` back the goal-oriented and autonomous-agent UX; `UserGoal.autonomy?: { enabled?: boolean } | null` is the per-goal autonomy override (set by the orchestrator's "Apply & Run"; `false` opts a goal out)
  - `FeedForwardConnection` models board-to-board automation
- `src/data/` holds static content: `templates.ts` (board templates), `tagsAndThemes.ts` (theme tokens). There is no mock workspace seed — new workspaces start empty and `bootstrap.ts` only claims `users/{uid}.seededAt` (it no longer seeds boards or migrates localStorage data).
- `src/components/` — generic chrome and modal components (`Navbar.tsx`, `BoardCanvas.tsx`, `CardDetailModal.tsx`, `AnalyticsDashboardModal.tsx`, `BoardInterconnectModal.tsx`, `VoiceActionModal.tsx`, etc.) plus `components/ui/` primitives. Feature-specific UI lives under `src/features/` (goals, agents, orchestrator, runs). Every component declares an explicit TypeScript props interface. Icons come from `lucide-react`.
- `src/context/AuthContext.tsx` — Firebase Auth context (`user`, `loading`, `signInWithGoogle`, `signOutUser`), wraps the app in `src/main.tsx`.
- `src/lib/firebase.ts` — Firebase Web SDK init; exports `app`, `auth`, `db`, `googleProvider`. Reads config from `import.meta.env.VITE_FIREBASE_*` (falls back to `NEXT_PUBLIC_FIREBASE_*`, then hardcoded defaults for project `kaybee-503713`).
- `src/utils/nlpAutoTag.ts` — lightweight auto-tagging logic for cards.

### Orchestrator dock (`src/features/orchestrator/` + `src/lib/orchestrator/`)

The AI orchestrator is a persistent right-rail dock (48px collapsed ↔ 400px expanded), not a modal. Every AI response lands as a pending plan proposal; nothing mutates the workspace until the user applies it.

- `OrchestratorDock.tsx` — the rail; lives at App level so it survives board switches. `OrchestratorProvider.tsx` / `useOrchestrator.ts` own the conversation state. `Composer.tsx` holds the prompt input plus the voice-recording block. `ProposalCard.tsx` renders proposals, reusing `src/features/goals/PlanPreview.tsx`.
- `src/lib/orchestrator/context.ts` — capped context builder (`MAX_CONTEXT_CHARS` 12,000; per-section caps for lists, card titles, goals, agents, runs). Never POST the entire nested board.
- `src/lib/orchestrator/proposals.ts` — proposal state machine: only `pending` proposals transition (`apply`/`refine`/`discard`/`supersede`); all other states are terminal and illegal transitions throw.
- `src/lib/orchestrator/threadStore.ts` — persistence: Firestore root `threads/{id}` collection with a `messages/` subcollection, all docs `ownerUid`-scoped; signed-out users get a localStorage-backed memory store with the same `ThreadStore` interface.

### Autonomy engine (`src/lib/autonomy/` + `src/features/runs/`)

Cards on autonomous lists can be executed by agents automatically. The invariants are money-critical — see `src/lib/autonomy/AGENTS.md` before changing anything here.

- Eligibility requires ALL three gates: the list's `autoRunAgents`, a resolvable non-human agent with `autoExecute`, and `policy.enabled`. `autoRunAgents` alone is true in many seeded lists and is NOT sufficient.
- Firestore root `runs/` collection is an audit trail — run docs are never deleted. Run ids are deterministic (`run_${cardId}_r${cardRevision}_a${attempt}`) so duplicate enqueues abort inside a transaction.
- Claiming a run is a transaction that flips `queued → running` with a 90s lease AND increments the budget (`increment(1)`) in the same transaction. Leader election between tabs (BroadcastChannel) is an optimization only; the lease is the correctness mechanism.
- Policy lives at `users/{uid}.autonomy` and is the global kill switch. Ships disabled: `enabled: false`, `requireApprovalForFirstRunOfGoal: true`, `maxRunsTotal: 25`, `maxConcurrentRuns: 2` (also `maxRunsPerHour: 30`, `maxAttemptsPerCard: 3`). `budget.runsUsed` is owned by the claim transaction — never write it directly.
- `executor.ts` is the seam between engine and execution (`AgentExecutor` / `HttpAgentExecutor`); a server-side executor can later claim runs through the same contract.
- `src/features/runs/` — `AutonomyPill` (self-contained navbar pill, hidden when signed out), `RunConsoleDrawer`, `AutonomyContext` (publishes the engine API from `WorkspaceProvider`).

### Client API calls

All client AI calls go through `apiPost` (`src/lib/api/client.ts`), which attaches the Firebase ID token as `Authorization: Bearer` and retries once with a forced-fresh token on 401. Bare `fetch('/api/...')` calls fail now that auth is enforced by default.

### Firestore

- `firestore.rules` covers `boards`/`lists`/`cards`/`goals`/`activity`, plus `runs/` and `threads/` + `messages/` (all `ownerUid`-scoped).
- `firestore.indexes.json` includes two `runs` indexes (`ownerUid+queuedAt`, `ownerUid+status`).

### Styling

Dark theme by convention: Slate 900 background, Slate 800 cards/borders, Indigo/Purple interactive accents. Styling combines Tailwind CSS v4 utility classes with base tokens in `src/index.css`. Avoid introducing generic/light color palettes.

### Path aliasing

`@/*` resolves to the repo root in both `vite.config.ts` and `tsconfig.json` (e.g. `@/src/...`).

### Environment variables

See `.env.example`. Key vars: `GEMINI_API_KEY` (server-side Gemini access), `APP_URL`, `AUTH_REQUIRED` (defaults to enforced; set `false` for local dev only). Firebase client config vars are `VITE_FIREBASE_*` / `NEXT_PUBLIC_FIREBASE_*` (see `src/lib/firebase.ts` for the full list and fallback behavior).

## Repo conventions

- Commit messages follow Conventional Commits (`fix(scope): ...`, `feat: ...`).
- This repo maintains a nested `AGENTS.md` hierarchy (root, `src/`, `src/components/`, `src/context/`, `src/hooks/`, `src/lib/`, `src/lib/autonomy/`, `src/lib/orchestrator/`, `src/server/`, `src/features/`, `src/features/runs/`, `src/features/orchestrator/`, `functions/`, `docs/`) documenting per-directory ownership and contracts. When working in one of these directories, check for a local `AGENTS.md` — it may have more specific, current guidance than this file.
- The `.agents/` directory is a large, mostly self-contained "AG Kit" agent-tooling framework (agents/skills/workflows for the Google Antigravity IDE). It is not part of the application and generally does not need to be read or modified for normal feature work in `src/` or `functions/`.
