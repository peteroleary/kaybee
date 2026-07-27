# .agents/agent DOX

## Purpose

The `.agents/agent/` directory contains specialist AI agent markdown definitions used by the AG Kit intelligent routing system.

## Ownership

- 20 specialist role definitions (e.g. `frontend-specialist.md`, `backend-specialist.md`, `orchestrator.md`, `documentation-writer.md`).

## Local Contracts

- Frontmatter includes `name`, `description`, `tools`, `model`, `version`, and `skills`.
- Body contains core philosophy, mindset, decision trees, quality checklists, and usage rules.

## Work Guidance

- Keep agent definitions structured and operational.
- Preserve skill requirements in YAML frontmatter.

## Verification

- **Doctor Check**: `node .agents/hooks/antigravity-doctor.mjs`

## Child DOX Index

- No nested child directories in `.agents/agent/`.
