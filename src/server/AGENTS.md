# src/server DOX

## Purpose

The `src/server/` directory contains modular Express backend server logic, API endpoints, and AI client wrappers.

## Ownership

- `src/server/routes.ts`: Express API route definitions and router setup.
- `src/server/api/gemini.ts`: Google Gemini AI API integration helper (`@google/genai`).

## Local Contracts

- Server entry point: `server.ts`.
- Routes use Express `Router`.
- AI endpoints parse prompts and return structured JSON responses.

## Work Guidance

- Do not expose server-only API keys to the browser client.
- Handle API failures gracefully with HTTP error codes.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/server/`.
