# src/hooks DOX

## Purpose

The `src/hooks/` directory contains custom React state hooks encapsulating complex UI and state management logic.

## Ownership

- `useBoardState.ts`: Central board state management hook handling board operations, card movements, activity logs, and feed-forward triggers.

## Local Contracts

- Hooks must return typed interfaces (e.g. `UseBoardStateReturn`).
- React state setters and callbacks must be wrapped with `useCallback` where performance critical.

## Work Guidance

- Keep UI components clean by delegating state mutation logic to custom hooks in this folder.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/hooks/`.
