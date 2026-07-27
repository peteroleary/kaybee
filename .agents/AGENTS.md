# .agents DOX

## Purpose

The `.agents/` directory provides the AG Kit workspace contract, declaring specialist agent personas, reusable skills, multi-agent workflows, safety hooks, and persistent memory for AI subagents.

## Ownership

- Agent definitions (`.agents/agent/`).
- Reusable agent skills (`.agents/skills/`).
- Task & multi-agent workflows (`.agents/workflows/`).
- Pre-tool safety hooks (`.agents/hooks/`, `.agents/hooks.json`).
- Persistent memory index (`.agents/memory/`).

## Local Contracts

- **AG Kit Contract**: Defined by `.agents/antigravity.json` and `.agents/manifest.json`.
- **Safety Gate**: `node .agents/hooks/validate-tool-call.mjs` acts as the `PreToolUse` matcher for command execution safety.
- **Skill Discovery**: Skills in `.agents/skills/` are automatically loaded based on task classification.

## Work Guidance

- Always announce active skills and agent personas before generating complex code or architecture.
- Do not edit `.agents/manifest.lock.json` manually; use `ag-kit` CLI commands.

## Verification

- **Contract Doctor**: `node .agents/hooks/antigravity-doctor.mjs`

## Child DOX Index

- [.agents/agent/AGENTS.md](file:///Users/po/Desktop/kaybee/.agents/agent/AGENTS.md): Specialist agent persona definitions (frontend-specialist, backend-specialist, orchestrator, etc.).
- [.agents/skills/AGENTS.md](file:///Users/po/Desktop/kaybee/.agents/skills/AGENTS.md): Domain skills library (clean-code, firebase-firestore, frontend-design, etc.).
- [.agents/workflows/AGENTS.md](file:///Users/po/Desktop/kaybee/.agents/workflows/AGENTS.md): Task workflow automation shortcuts (/plan, /orchestrate, /create, etc.).
