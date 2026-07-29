# src/lib DOX

## Purpose

The `src/lib/` directory contains core client library initializations, external SDK instances, API helper utilities, and domain libraries (agents, goals, autonomy, orchestrator, persistence).

## Ownership

- Firebase Web SDK initialization (`src/lib/firebase.ts`).
- Auth helper utilities (`signInWithGoogle`, `signOutUser`).
- Firestore database instance export (`db`).
- `api/` — `apiPost`, the single HTTP client for `/api/*` (attaches the Firebase ID token).
- `agents/`, `goals/` — agent registry/assignment and goal plan/progress helpers (no child docs yet).
- `repository/` — `WorkspaceRepository` interface plus memory and Firestore implementations (no child doc yet).

## Local Contracts

- **Firebase SDK**: Standard Firebase v11 JS SDK.
- **Config**: Reads `import.meta.env.VITE_FIREBASE_*` and `import.meta.env.NEXT_PUBLIC_FIREBASE_*` with fallback default credentials for `kaybee-503713`.
- **Exports**: `app`, `auth`, `db`, `googleProvider`, `signInWithGoogle`, `signOutUser`.
- **API calls**: All client calls to `/api/*` go through `apiPost` (`api/client.ts`); bare `fetch` fails now that server auth is enforced by default.

## Work Guidance

- Never hardcode secret API keys.
- Wrap Firebase auth and database operations in async `try/catch` blocks with clear error logging.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)
- **Unit Tests**: `pnpm test` (`vitest run`) — `*.test.ts` files live next to source in the domain libraries.

## Child DOX Index

- [src/lib/autonomy/AGENTS.md](file:///Users/po/Desktop/kaybee/src/lib/autonomy/AGENTS.md): Autonomy run engine — eligibility gates, transactional lease/budget claims, deterministic run ids, feed-forward cloning.
- [src/lib/orchestrator/AGENTS.md](file:///Users/po/Desktop/kaybee/src/lib/orchestrator/AGENTS.md): Orchestrator conversation core — capped context builder, proposal state machine, thread/message persistence.
