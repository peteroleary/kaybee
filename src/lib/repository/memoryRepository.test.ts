import { describe, expect, it } from 'vitest';
import { createMemoryRepository } from './memoryRepository';
import { PlanProposalSchema } from '../../shared/contracts/goalPlan';
import type { BoardData, UserGoal } from '../../types';
import type { WorkspaceRepository } from './workspaceRepository';

function makeBoard(id: string): BoardData {
  return {
    id,
    name: 'Test Board',
    description: '',
    icon: 'Layers',
    category: 'Cross-Functional',
    lists: [],
    feedForwardConnections: [],
    rbacRole: 'admin',
  };
}

function makeGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    id: 'goal-1',
    title: 'Ship it',
    description: '',
    outcome: '',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    boardIds: [],
    boardId: null,
    planStatus: 'applied',
    plan: null,
    appliedRefs: null,
    agentIds: [],
    progress: 0,
    progressDetail: null,
    ...overrides,
  };
}

function getBoards(repo: WorkspaceRepository): BoardData[] {
  let boards: BoardData[] = [];
  repo.subscribeAllBoards(b => {
    boards = b;
  })();
  return boards;
}

function getGoals(repo: WorkspaceRepository): UserGoal[] {
  let goals: UserGoal[] = [];
  repo.subscribeGoals(g => {
    goals = g;
  })();
  return goals;
}

describe('memoryRepository.applyPlan', () => {
  it('writes the plan lists/cards onto the requested board and returns matching appliedRefs', async () => {
    const repo = createMemoryRepository([makeBoard('board-1'), makeBoard('board-2')]);
    const plan = PlanProposalSchema.parse({
      newLists: [{ title: 'Planning', cards: [{ title: 'Task A' }, { title: 'Task B' }] }],
    });

    const refs = await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });

    expect(refs.listIds).toHaveLength(1);
    expect(refs.cardIds).toHaveLength(2);

    const boards = getBoards(repo);
    const board1 = boards.find(b => b.id === 'board-1')!;
    const board2 = boards.find(b => b.id === 'board-2')!;

    expect(board1.lists).toHaveLength(1);
    expect(board1.lists[0].title).toBe('Planning');
    expect(board1.lists[0].cards.map(c => c.id).sort()).toEqual([...refs.cardIds].sort());
    expect(board1.lists[0].cards.every(c => c.goalId === 'goal-1')).toBe(true);

    // The other board is untouched.
    expect(board2.lists).toHaveLength(0);
  });

  it('rejects when the target board does not exist', async () => {
    const repo = createMemoryRepository([makeBoard('board-1')]);
    const plan = PlanProposalSchema.parse({});
    await expect(repo.applyPlan(plan, { boardId: 'missing-board', goalId: 'goal-1' })).rejects.toThrow();
  });

  it('chunks are irrelevant in memory but a large plan still applies atomically', async () => {
    const repo = createMemoryRepository([makeBoard('board-1')]);
    const plan = PlanProposalSchema.parse({
      newLists: [{ title: 'Big List', cards: Array.from({ length: 600 }, (_, i) => ({ title: `Card ${i}` })) }],
    });

    const refs = await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });
    expect(refs.cardIds).toHaveLength(600);
    expect(new Set(refs.cardIds).size).toBe(600);
  });
});

describe('memoryRepository goal progress recompute', () => {
  it('recomputes and persists goal.progress in the same call that changes a goal-linked card status/progress', async () => {
    const repo = createMemoryRepository([makeBoard('board-1')]);
    const plan = PlanProposalSchema.parse({
      newLists: [{ title: 'Work', cards: [{ title: 'A' }, { title: 'B' }] }],
    });
    const refs = await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });
    await repo.saveGoal(makeGoal({ id: 'goal-1', boardId: 'board-1' }));

    await repo.updateCard(refs.cardIds[0], { status: 'completed', progress: 100 });

    const goal = getGoals(repo).find(g => g.id === 'goal-1')!;
    expect(goal.progress).toBe(50);
    expect(goal.progressDetail).toEqual({
      percent: 50,
      total: 2,
      completed: 1,
      inProgress: 0,
      blocked: 0,
      failed: 0,
      waitingOnHuman: 0,
    });
  });

  it('does not touch goal progress when the patch has no goalId and does not touch status/progress', async () => {
    const repo = createMemoryRepository([makeBoard('board-1')]);
    const plan = PlanProposalSchema.parse({ newLists: [{ title: 'Work', cards: [{ title: 'A' }] }] });
    const refs = await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });
    await repo.saveGoal(makeGoal({ id: 'goal-1', boardId: 'board-1' }));

    await repo.updateCard(refs.cardIds[0], { title: 'Renamed' });

    const goal = getGoals(repo).find(g => g.id === 'goal-1')!;
    expect(goal.progress).toBe(0);
    expect(goal.progressDetail).toBeNull();
  });
});
