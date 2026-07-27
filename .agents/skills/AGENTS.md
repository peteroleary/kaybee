# .agents/skills DOX

## Purpose

The `.agents/skills/` directory houses modular capabilities, instructions, reference guides, and helper scripts for specialized developer workflows.

## Ownership

- Core engineering skills (`clean-code`, `frontend-design`, `firebase-firestore`, `api-patterns`, `testing-patterns`).
- Helper validation scripts (Python/Node AST checkers, linters, accessibility tools).

## Local Contracts

- Each skill directory must contain a `SKILL.md` with YAML frontmatter (`name`, `description`).
- Keep `SKILL.md` under 500 lines; place extended reference documentation in `references/`.

## Work Guidance

- Always announce active skills before using them (`📚 Using skill: @[skill-name]...`).

## Verification

- **Doctor Check**: `node .agents/hooks/antigravity-doctor.mjs`

## Child DOX Index

- No nested child directories in `.agents/skills/`.
