# src/features DOX

## Purpose

The `src/features/` directory contains feature-specific React UI, kept separate from the generic chrome in `src/components/`. Each subfolder pairs with a domain library under `src/lib/`.

## Ownership

- `goals/` — goal home/cards and plan preview (with `src/lib/goals/`). No child doc yet.
- `agents/` — agent picker and registry modal (with `src/lib/agents/`). No child doc yet.
- `orchestrator/` — orchestrator dock UI (with `src/lib/orchestrator/`).
- `runs/` — autonomy status UI (with `src/lib/autonomy/`).

## Local Contracts

- Feature UI reads/mutates workspace state through `useWorkspace()` and `useUiState()`, never directly.
- Shared primitives come from `src/components/ui/`; icons from `lucide-react`.

## Work Guidance

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- [src/features/orchestrator/AGENTS.md](file:///Users/po/Desktop/kaybee/src/features/orchestrator/AGENTS.md): Orchestrator dock — right-rail conversation UI, composer, proposal cards.
- [src/features/runs/AGENTS.md](file:///Users/po/Desktop/kaybee/src/features/runs/AGENTS.md): Autonomy UI — navbar pill, run console drawer, engine context.
