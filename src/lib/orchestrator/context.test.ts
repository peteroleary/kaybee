import { describe, expect, it } from 'vitest';
import {
  MAX_AGENTS,
  MAX_CONTEXT_CHARS,
  MAX_GOALS,
  MAX_LISTS,
  MAX_CARD_TITLES_PER_LIST,
  MAX_RUNS,
  buildOrchestratorContext,
} from './context';
import type { AgentDoc } from '../agents/types';
import type { BoardData, UserGoal } from '../../types';

function makeBoard(listCount: number, cardsPerList: number, name = 'Board'): BoardData {
  return {
    id: `board-${name}`,
    name,
    lists: Array.from({ length: listCount }, (_, li) => ({
      id: `list-${li}`,
      title: `List ${li}`,
      listType: 'kanban',
      cards: Array.from({ length: cardsPerList }, (_, ci) => ({
        id: `card-${li}-${ci}`,
        title: `Card ${li}.${ci}`,
      })),
    })),
  } as unknown as BoardData;
}

function makeGoal(title: string): UserGoal {
  return {
    id: `goal-${title}`,
    title,
    status: 'active',
    progress: 42,
    planStatus: 'proposed',
    outcome: 'It works',
  } as unknown as UserGoal;
}

function makeAgent(name: string): AgentDoc {
  return {
    name,
    kind: 'agent',
    capabilities: ['code_quality'],
    autoExecute: true,
  } as unknown as AgentDoc;
}

describe('buildOrchestratorContext', () => {
  it('summarizes workspace counts and the active board', () => {
    const board = makeBoard(2, 3, 'Main');
    const context = buildOrchestratorContext({
      boards: [board],
      activeBoardId: board.id,
      goals: [makeGoal('Ship v2')],
      agents: [makeAgent('Research Agent')],
      autonomy: null,
      runs: [],
    });

    expect(context).toContain('Workspace: 1 boards, 2 lists, 6 cards, 1 active goals, 1 agents');
    expect(context).toContain('Active board: "Main" (2 lists, 6 cards)');
    expect(context).toContain('"Ship v2" — 42% — plan: proposed');
    expect(context).toContain('Research Agent [code_quality] (auto-execute)');
    expect(context).toContain('Autonomy: disabled');
  });

  it(`caps the active board at ${MAX_LISTS} lists`, () => {
    const board = makeBoard(MAX_LISTS + 8, 0);
    const context = buildOrchestratorContext({
      boards: [board],
      activeBoardId: board.id,
      goals: [],
      agents: [],
    });

    expect(context).toContain(`"List ${MAX_LISTS - 1}"`);
    expect(context).not.toContain(`"List ${MAX_LISTS}"`);
    expect(context).toContain(`+8 more lists`);
  });

  it(`caps card titles at ${MAX_CARD_TITLES_PER_LIST} per list`, () => {
    const board = makeBoard(1, MAX_CARD_TITLES_PER_LIST + 4);
    const context = buildOrchestratorContext({
      boards: [board],
      activeBoardId: board.id,
      goals: [],
      agents: [],
    });

    expect(context).toContain(`"Card 0.${MAX_CARD_TITLES_PER_LIST - 1}"`);
    expect(context).not.toContain(`"Card 0.${MAX_CARD_TITLES_PER_LIST}"`);
    expect(context).toContain('+4 more');
  });

  it(`caps goals at ${MAX_GOALS} and agents at ${MAX_AGENTS}`, () => {
    const context = buildOrchestratorContext({
      boards: [],
      activeBoardId: null,
      goals: Array.from({ length: MAX_GOALS + 3 }, (_, i) => makeGoal(`G${i}`)),
      agents: Array.from({ length: MAX_AGENTS + 5 }, (_, i) => makeAgent(`A${i}`)),
    });

    expect(context).toContain('"G9"');
    expect(context).not.toContain('"G10"');
    expect(context).toContain('+3 more goals');
    expect(context).toContain('A19');
    expect(context).not.toContain('A20');
    expect(context).toContain('+5 more agents');
  });

  it(`caps recent runs at ${MAX_RUNS}`, () => {
    const context = buildOrchestratorContext({
      boards: [],
      activeBoardId: null,
      goals: [],
      agents: [],
      runs: Array.from({ length: MAX_RUNS + 2 }, (_, i) => ({ id: `run-${i}`, status: 'success' })),
    });

    expect(context).toContain('run-4');
    expect(context).not.toContain('run-5');
  });

  it(`hard-caps total length at ${MAX_CONTEXT_CHARS} chars`, () => {
    const board = makeBoard(MAX_LISTS, MAX_CARD_TITLES_PER_LIST);
    // Agent capability lists are joined un-ellipsized, so 20 agents with
    // long capability names overflow the budget even after every other cap.
    const fatAgents = Array.from({ length: MAX_AGENTS }, (_, i) => ({
      ...makeAgent(`Agent ${i}`),
      capabilities: Array.from({ length: 30 }, (_, c) => `very_long_capability_name_${c}`),
    })) as unknown as AgentDoc[];

    const context = buildOrchestratorContext({
      boards: [board, makeBoard(50, 50, 'Huge')],
      activeBoardId: board.id,
      goals: Array.from({ length: 50 }, (_, i) => makeGoal('G'.repeat(500) + i)),
      agents: fatAgents,
    });

    expect(context.length).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
    expect(context).toContain('[context truncated to fit budget]');
  });

  it('handles an empty workspace', () => {
    const context = buildOrchestratorContext({
      boards: [],
      activeBoardId: null,
      goals: [],
      agents: [],
    });

    expect(context).toContain('Workspace: 0 boards, 0 lists, 0 cards, 0 active goals, 0 agents');
    expect(context).not.toContain('Active board:');
  });
});
