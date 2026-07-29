# src/components DOX

## Purpose

The `src/components/` directory contains generic React UI chrome: canvas renders, navigation header, modal dialogs, and shared `ui/` primitives. Feature-specific UI lives under `src/features/`.

## Ownership

- Navbar (`Navbar.tsx`) with Firebase Auth status, canvas toolbars, the Orchestrator dock trigger (primary action), and the embedded `AutonomyPill`.
- Board canvas (`BoardCanvas.tsx`) and card detail renders (`CardDetailModal.tsx`).
- Feature modals (Analytics, Interconnect, Voice, Theme, Tag Manager).

## Local Contracts

- **Icons**: Use `lucide-react` for icon consistency.
- **Props**: Every component must declare a TypeScript interface (e.g. `NavbarProps`).
- **Theme**: Slate 900 background, Slate 800 cards/borders, Indigo/Purple interactive highlights.

## Work Guidance

- Components must support responsive mobile and desktop screen sizes.
- Interactive controls must provide tooltips (`title` attributes) for accessibility.

## Verification

- **Type Check**: `npm run lint` (`tsc --noEmit`)

## Child DOX Index

- No nested child directories in `src/components/`.
