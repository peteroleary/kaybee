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
- Clean: `pnpm clean`
- There is no test runner configured anywhere in the app (`src/`, `functions/`) — do not assume Jest/Vitest exist.

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
- `src/server/api/gemini.ts` — wraps `@google/genai` calls (`callOrchestrator`, `callTranscribe`, `callAgentRun`, `callSmartSuggestions`, `callGoalDecomposition`) used by the routes above. `GEMINI_API_KEY` is read server-side only; never expose it to the client.
- Firebase (`functions/`) is a largely unused scaffold at present — new AI/API endpoints should go in `src/server/`, not `functions/`, unless the user asks to migrate to Cloud Functions.

### Frontend: board state and data model

- `src/App.tsx` is the main application shell (large, ~1200 lines) — it composes the board canvas, navbar, and the various feature modals.
- `src/hooks/useBoardState.ts` is the central state hook: board/list/card CRUD, card movement, activity logging, and feed-forward triggers between boards. UI components should delegate state mutation here rather than manipulating board data directly.
- `src/types.ts` defines the core data model, read this before touching board/card logic:
  - `BoardData` → `ListConfig[]` → `CardItemData[]`
  - `EntityType` distinguishes `task | human | agent | routine | human_team | agent_swarm | troop` cards
  - `UserGoal` / `AgentDefinition` back the goal-oriented and autonomous-agent UX
  - `FeedForwardConnection` models board-to-board automation
- `src/data/` holds seed content: `initialData.ts` (default boards), `templates.ts` (board templates), `tagsAndThemes.ts` (theme tokens).
- `src/components/` — one component per feature area, mostly modals (`OrchestratorModal`, `GoalCanvasModal`, `AnalyticsDashboardModal`, `BoardInterconnectModal`, `VoiceActionModal`, `CardDetailModal`, etc.) plus `Navbar.tsx` and `BoardCanvas.tsx`. Every component declares an explicit TypeScript props interface. Icons come from `lucide-react`.
- `src/context/AuthContext.tsx` — Firebase Auth context (`user`, `loading`, `signInWithGoogle`, `signOutUser`), wraps the app in `src/main.tsx`.
- `src/lib/firebase.ts` — Firebase Web SDK init; exports `app`, `auth`, `db`, `googleProvider`. Reads config from `import.meta.env.VITE_FIREBASE_*` (falls back to `NEXT_PUBLIC_FIREBASE_*`, then hardcoded defaults for project `kaybee-503713`).
- `src/utils/nlpAutoTag.ts` — lightweight auto-tagging logic for cards.

### Styling

Dark theme by convention: Slate 900 background, Slate 800 cards/borders, Indigo/Purple interactive accents. Styling combines Tailwind CSS v4 utility classes with base tokens in `src/index.css`. Avoid introducing generic/light color palettes.

### Path aliasing

`@/*` resolves to the repo root in both `vite.config.ts` and `tsconfig.json` (e.g. `@/src/...`).

### Environment variables

See `.env.example`. Key vars: `GEMINI_API_KEY` (server-side Gemini access), `APP_URL`. Firebase client config vars are `VITE_FIREBASE_*` / `NEXT_PUBLIC_FIREBASE_*` (see `src/lib/firebase.ts` for the full list and fallback behavior).

## Repo conventions

- Commit messages follow Conventional Commits (`fix(scope): ...`, `feat: ...`).
- This repo maintains a nested `AGENTS.md` hierarchy (root, `src/`, `src/components/`, `src/context/`, `src/hooks/`, `src/lib/`, `src/server/`, `functions/`, `docs/`) documenting per-directory ownership and contracts. When working in one of these directories, check for a local `AGENTS.md` — it may have more specific, current guidance than this file.
- The `.agents/` directory is a large, mostly self-contained "AG Kit" agent-tooling framework (agents/skills/workflows for the Google Antigravity IDE). It is not part of the application and generally does not need to be read or modified for normal feature work in `src/` or `functions/`.
