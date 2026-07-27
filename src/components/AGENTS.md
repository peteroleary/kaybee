# src/components DOX

## Purpose

The `src/components/` directory contains all modular React UI components, canvas renders, navigation headers, and modal dialogs.

## Ownership

- Navbar (`Navbar.tsx`) with Firebase Auth status and canvas toolbars.
- Board canvas (`BoardCanvas.tsx`) and card detail renders (`CardDetailModal.tsx`).
- Feature modals (AI Orchestrator, Analytics, Interconnect, Voice, Theme, Tag Manager).

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
