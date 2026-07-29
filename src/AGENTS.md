# src DOX

## Purpose

The `src/` directory owns the frontend web application built with React 19, TypeScript, Vite, and Tailwind CSS, providing an interactive Kanban & AI Orchestration environment.

## Ownership

- Main application entry points (`src/main.tsx`, `src/App.tsx`).
- Core data models and TypeScript types (`src/types.ts`).
- UI styling tokens (`src/index.css`).
- Firebase client integration (`src/lib/firebase.ts`) and Auth Context (`src/context/AuthContext.tsx`).

## Local Contracts

- **Framework**: React 19 + Vite + TypeScript.
- **Styling**: Vanilla CSS tokens in `src/index.css` paired with Tailwind CSS utilities. Avoid generic color palettes; use dark theme tokens (Slate/Indigo/Purple).
- **Environment Variables**: Access Firebase keys via `import.meta.env.VITE_FIREBASE_*` or `import.meta.env.NEXT_PUBLIC_FIREBASE_*`.

## Work Guidance

- Components must be functional React components with explicit TypeScript interfaces.
- Keep local UI state in component hooks; expose global session state through React context.
- Handle missing environment variables gracefully using fallbacks in `src/lib/firebase.ts`.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)
- **Dev Server**: `pnpm dev`

## Child DOX Index

- [src/components/AGENTS.md](file:///Users/po/Desktop/kaybee/src/components/AGENTS.md): Reusable UI components, modals, navbar, and canvas widgets.
- [src/context/AGENTS.md](file:///Users/po/Desktop/kaybee/src/context/AGENTS.md): Global React Context providers (Firebase Authentication session state).
- [src/features/AGENTS.md](file:///Users/po/Desktop/kaybee/src/features/AGENTS.md): Feature-specific UI (goals, agents, orchestrator dock, autonomy runs) paired with `src/lib/` domain libraries.
- [src/hooks/AGENTS.md](file:///Users/po/Desktop/kaybee/src/hooks/AGENTS.md): Reserved for component/feature-scoped custom hooks (currently empty; global state moved to `src/state/`).
- [src/lib/AGENTS.md](file:///Users/po/Desktop/kaybee/src/lib/AGENTS.md): Firebase Web SDK initialization, Auth helpers, and API clients.
- [src/server/AGENTS.md](file:///Users/po/Desktop/kaybee/src/server/AGENTS.md): Modular Express backend server routes and Gemini AI integration.

