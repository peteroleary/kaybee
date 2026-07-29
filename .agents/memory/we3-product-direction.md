---
type: project
created: 2026-07-29
updated: 2026-07-29
---

# We3 Product Direction

Decisions made with the user in the 2026-07-29 brainstorming session. These supersede earlier framing where noted.

## Identity

- Product and company name is **We3** (pronounced "we three") = customer + AI + me, "we three get business done together". `kaybee` is only the repo title — do not use it as the product name in UI copy.
- Brand source of truth: `docs/BRAND.md` (we3.live, tagline "You, Me, and AI — In This Together", confident/direct/no-gimmicks voice).

## Product Strategy

- **"Effective" = goals finished by agents.** Judge UI changes by whether they shorten the goal → plan → agent runs → goal done loop or surface where it is stuck.
- **Two personas, not full multi-user**: the owner (full control) and a customer guest (views progress and interacts via comments — not a board editor). Do not build teams/RBAC machinery beyond this.
- **Boards are views of a goal** (goal-centric IA). This supersedes the earlier settled decision "goal-first entry but keep the board shell" — the user explicitly chose the structural direction.
- The 4-increment simplification shipped 2026-07-29 (each committed to main): (1) global navbar slimmed, board actions in a board-only toolbar; (2) attention queue on goal home; (3) goal context bar over goal-owned boards; (4) guest share links.

## Guest Sharing Model

- Snapshot-based: `goalShares/{token}` (unguessable token IS the capability) carries a denormalized board snapshot + `comments/` subcollection. Guests never read owner-scoped collections.
- Rules: GET one share doc by id only (never list); comment creates are shape-checked and die with the parent share. Owner refreshes snapshots on demand — a live-synced guest view (e.g. Cloud Function trigger) is a possible future upgrade, not built.
