# src/lib DOX

## Purpose

The `src/lib/` directory contains core client library initializations, external SDK instances, and API helper utilities.

## Ownership

- Firebase Web SDK initialization (`src/lib/firebase.ts`).
- Auth helper utilities (`signInWithGoogle`, `signOutUser`).
- Firestore database instance export (`db`).

## Local Contracts

- **Firebase SDK**: Standard Firebase v11 JS SDK.
- **Config**: Reads `import.meta.env.VITE_FIREBASE_*` and `import.meta.env.NEXT_PUBLIC_FIREBASE_*` with fallback default credentials for `kaybee-503713`.
- **Exports**: `app`, `auth`, `db`, `googleProvider`, `signInWithGoogle`, `signOutUser`.

## Work Guidance

- Never hardcode secret API keys.
- Wrap Firebase auth and database operations in async `try/catch` blocks with clear error logging.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/lib/`.
