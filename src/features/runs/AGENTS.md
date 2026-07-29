# src/features/runs DOX

## Purpose

The `src/features/runs/` directory is the user-facing UI of the autonomy engine (`src/lib/autonomy/`): live run status in the navbar and a run console drawer.

## Ownership

- `AutonomyPill.tsx` — self-contained navbar pill: live autonomy status + Pause All, renders its own run console drawer. Hidden when signed out (the engine needs Firestore, which needs auth).
- `RunConsoleDrawer.tsx` — drawer listing queued/running/finished runs with per-run cancel.
- `AutonomyContext.tsx` — publishes the `AutonomyEngineApi` (mounted by `WorkspaceProvider` via `useRunEngine`) so chrome-level UI reads run state without owning the engine lifecycle. Defaults to a disabled, no-op API.

## Local Contracts

- UI consumes the engine only through `useAutonomy()`; it never touches `runs/` Firestore docs or the run store directly.
- Policy changes (including Pause All) go through the engine API's `setAutonomyEnabled` / `savePolicy`.

## Work Guidance

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/features/runs/`.
