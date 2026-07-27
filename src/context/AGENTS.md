# src/context DOX

## Purpose

The `src/context/` directory provides React Context providers and custom state hooks for global application context.

## Ownership

- `AuthContext.tsx`: Manages Firebase Authentication state (`user`, `loading`, `signInWithGoogle`, `signOutUser`).
- Custom hook: `useAuth()`.

## Local Contracts

- Must wrap top-level application component in `src/main.tsx` using `<AuthProvider>`.
- `onAuthStateChanged` updates `user` state and sets `loading: false` when initialized.

## Work Guidance

- Keep context providers focused and light. Avoid heavy computations inside context render loops.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/context/`.
