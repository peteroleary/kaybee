# functions DOX

## Purpose

The `functions/` directory contains Firebase Cloud Functions (v2 HTTPS endpoints, Firestore triggers, background tasks) written in TypeScript.

## Ownership

- Main functions entry point (`functions/src/index.ts`).
- Serverless dependencies (`functions/package.json`).
- TypeScript & ESLint configurations (`tsconfig.json`, `.eslintrc.js`).

## Local Contracts

- **Runtime**: Node.js 18 / 20 runtime on Cloud Functions v2.
- **Dependencies**: `firebase-functions`, `firebase-admin`.
- **Target Project**: `kaybee-503713`.

## Work Guidance

- Build functions using `npm --prefix functions run build` before deployment.
- Keep function handlers decoupled from external side effects.

## Verification

- **Build**: `cd functions && npm run build`
- **Lint**: `cd functions && npm run lint`

## Child DOX Index

- No nested child directories in `functions/`.
