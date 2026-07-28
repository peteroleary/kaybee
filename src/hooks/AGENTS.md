# src/hooks DOX

## Purpose

The `src/hooks/` directory is reserved for custom React hooks encapsulating complex UI logic local to a single feature or component tree.

## Ownership

- Currently empty. The former board-state hook here was a stale, unused duplicate of the logic that actually lived in `src/App.tsx`, and was deleted as part of the Phase 1 state-seam refactor.
- Global board/workspace state now lives in `src/state/WorkspaceProvider.tsx` (`useWorkspace()`), and modal/UI-panel state lives in `src/state/UiStateProvider.tsx` (`useUiState()`). Neither is a "hook" in this directory's sense — they are context providers under `src/state/`.

## Local Contracts

- Hooks placed here must return typed interfaces (e.g. `UseXReturn`).
- React state setters and callbacks must be wrapped with `useCallback` where performance critical.

## Work Guidance

- Prefer `src/state/WorkspaceProvider.tsx` / `useWorkspace()` for any board, card, or list mutation — do not reintroduce a parallel board-state hook here.
- Use this folder only for hooks scoped to a single component or feature, not global app state.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/hooks/`.
