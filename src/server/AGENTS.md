# src/server DOX

## Purpose

The `src/server/` directory contains modular Express backend server logic, API endpoints, and AI client wrappers.

## Ownership

- `src/server/routes.ts`: Express API route definitions and router setup.
- `src/server/api/gemini.ts`: Google Gemini AI API integration helper (`@google/genai`).
- `src/server/api/parse.ts`: Zod validation of model responses.
- `src/server/middleware/auth.ts`: Firebase ID token verification (`requireAuth`).
- `src/server/middleware/rateLimit.ts`: Request rate limiting.

## Local Contracts

- Server entry point: `server.ts`.
- Routes use Express `Router`.
- AI endpoints parse prompts and return structured JSON responses.
- **`/api/orchestrate`**: request `{threadId, message, context, history, summary?}` (`message` string required); response is exactly `{summary, proposal}` — no top-level `newLists`/`newCards`.
- **Auth is enforced by default**: `requireAuth()` rejects requests without a valid Firebase ID token (401) unless `AUTH_REQUIRED=false` — a local-dev-only escape hatch, never deploy with it.

## Work Guidance

- Do not expose server-only API keys to the browser client.
- Handle API failures gracefully with HTTP error codes.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- `api/` and `middleware/` are small flat helper folders with no child docs; they are covered by this doc.
