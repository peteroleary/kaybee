import { describe, expect, it, vi } from 'vitest';
import { applyGoalPlan } from './applyPlan';
import { PlanProposalSchema } from '../../shared/contracts/goalPlan';
import type { UserGoal } from '../../types';
import type { WorkspaceRepository } from '../repository/workspaceRepository';

function makeGoal(overrides: Partial<UserGoal> = {}): UserGoal {
  return {
    id: 'goal-1',
    title: 'Ship the thing',
    description: 'desc',
    outcome: 'outcome',
    status: 'active',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    boardIds: [],
    boardId: null,
    planStatus: 'proposed',
    plan: null,
    appliedRefs: null,
    agentIds: [],
    progress: 0,
    progressDetail: null,
    ...overrides,
  };
}

describe('applyGoalPlan', () => {
  it('creates a board when the goal has none, then applies the plan to that board', async () => {
    const createBoard = vi.fn().mockResolvedValue('board-new');
    const applyPlan = vi.fn().mockResolvedValue({ listIds: ['list-1', 'list-2'], cardIds: ['card-1', 'card-2', 'card-3'] });
    const repo = { createBoard, applyPlan } as unknown as WorkspaceRepository;

    const plan = PlanProposalSchema.parse({ newLists: [{ title: 'L1', cards: [{ title: 'C1' }] }] });
    const goal = makeGoal();

    const result = await applyGoalPlan(repo, goal, plan);

    expect(createBoard).toHaveBeenCalledTimes(1);
    expect(applyPlan).toHaveBeenCalledWith(plan, { boardId: 'board-new', goalId: 'goal-1' });
    expect(result.boardId).toBe('board-new');
    expect(result.appliedRefs).toEqual({ listIds: ['list-1', 'list-2'], cardIds: ['card-1', 'card-2', 'card-3'] });
  });

  it('reuses an existing goal.boardId instead of creating a new board', async () => {
    const createBoard = vi.fn();
    const applyPlan = vi.fn().mockResolvedValue({ listIds: [], cardIds: [] });
    const repo = { createBoard, applyPlan } as unknown as WorkspaceRepository;

    const plan = PlanProposalSchema.parse({});
    const goal = makeGoal({ boardId: 'board-existing' });

    const result = await applyGoalPlan(repo, goal, plan);

    expect(createBoard).not.toHaveBeenCalled();
    expect(applyPlan).toHaveBeenCalledWith(plan, { boardId: 'board-existing', goalId: 'goal-1' });
    expect(result.boardId).toBe('board-existing');
  });

  it('merges plan.suggestedAgents into goal.agentIds without duplicates', async () => {
    const repo = {
      createBoard: vi.fn(),
      applyPlan: vi.fn().mockResolvedValue({ listIds: [], cardIds: [] }),
    } as unknown as WorkspaceRepository;

    const plan = PlanProposalSchema.parse({ suggestedAgents: ['testing', 'security'] });
    const goal = makeGoal({ boardId: 'board-1', agentIds: ['testing'] });

    const result = await applyGoalPlan(repo, goal, plan);

    expect([...result.agentIds].sort()).toEqual(['security', 'testing']);
  });

  it('computes fresh progress from the newly-applied (all-todo) cards', async () => {
    const repo = {
      createBoard: vi.fn(),
      applyPlan: vi.fn().mockResolvedValue({ listIds: ['l1'], cardIds: ['c1', 'c2', 'c3', 'c4'] }),
    } as unknown as WorkspaceRepository;

    const plan = PlanProposalSchema.parse({});
    const goal = makeGoal({ boardId: 'board-1' });

    const result = await applyGoalPlan(repo, goal, plan);

    expect(result.progressDetail.total).toBe(4);
    expect(result.progressDetail.completed).toBe(0);
    expect(result.progress).toBe(0);
  });

  it('widens the denominator instead of discarding prior progress on a second apply', async () => {
    const repo = {
      createBoard: vi.fn(),
      applyPlan: vi.fn().mockResolvedValue({ listIds: ['l2'], cardIds: ['c5', 'c6'] }),
    } as unknown as WorkspaceRepository;

    const plan = PlanProposalSchema.parse({});
    const goal = makeGoal({
      boardId: 'board-1',
      progress: 100,
      progressDetail: { percent: 100, total: 2, completed: 2, inProgress: 0, blocked: 0, failed: 0, waitingOnHuman: 0 },
    });

    const result = await applyGoalPlan(repo, goal, plan);

    // 2 previously-completed cards + 2 fresh all-zero cards -> 4 total, 2 done -> 50%.
    expect(result.progressDetail.total).toBe(4);
    expect(result.progressDetail.completed).toBe(2);
    expect(result.progress).toBe(50);
  });
});
