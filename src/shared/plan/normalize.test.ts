import { describe, expect, it } from 'vitest';
import { PlanProposalSchema } from '../contracts/goalPlan';
import { materializePlan, type NormalizeContext } from './normalize';

const makeIdFactory = () => {
  let counter = 0;
  return (prefix: string) => `${prefix}_${++counter}`;
};

const baseCtx = (overrides: Partial<NormalizeContext> = {}): NormalizeContext => ({
  boardId: 'board-1',
  goalId: null,
  existingLists: [],
  now: 1_700_000_000_000,
  newId: makeIdFactory(),
  ...overrides,
});

describe('materializePlan', () => {
  it('generates unique ids across two lists each containing cards', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [
        { title: 'List A', cards: [{ title: 'Card A1' }, { title: 'Card A2' }] },
        { title: 'List B', cards: [{ title: 'Card B1' }, { title: 'Card B2' }] },
      ],
    });

    const result = materializePlan(plan, baseCtx());

    expect(result.lists).toHaveLength(2);
    expect(result.cards).toHaveLength(4);

    const listIds = result.lists.map((l) => l.id);
    const cardIds = result.cards.map((c) => c.id);
    expect(new Set(listIds).size).toBe(listIds.length);
    expect(new Set(cardIds).size).toBe(cardIds.length);
  });

  it('routes newCards into a list created earlier in the same call', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [{ title: 'Inbox', cards: [] }],
      newCards: [{ title: 'Loose Card', targetListTitle: 'Inbox' }],
    });

    const result = materializePlan(plan, baseCtx());

    expect(result.lists).toHaveLength(1);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].listId).toBe(result.lists[0].id);
  });

  it('resolves dependsOn draft-local keys to real generated card ids', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [
        {
          title: 'L1',
          cards: [
            { key: 'a', title: 'Card A' },
            { key: 'b', title: 'Card B', dependsOn: ['a'] },
          ],
        },
      ],
    });

    const result = materializePlan(plan, baseCtx());

    const cardA = result.cards.find((c) => c.title === 'Card A')!;
    const cardB = result.cards.find((c) => c.title === 'Card B')!;
    expect(cardB.dependsOnCardIds).toEqual([cardA.id]);
  });

  it('drops an unknown dependsOn key and records a warning', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [
        {
          title: 'L1',
          cards: [{ key: 'b', title: 'Card B', dependsOn: ['missing-key'] }],
        },
      ],
    });

    const result = materializePlan(plan, baseCtx());

    const cardB = result.cards.find((c) => c.title === 'Card B')!;
    expect(cardB.dependsOnCardIds).toBeUndefined();
    expect(result.warnings.some((w) => w.includes('missing-key'))).toBe(true);
  });

  it('surfaces assignedAgentType in unresolvedAssignments', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [
        {
          title: 'L1',
          cards: [{ title: 'Card A', assignedAgentType: 'testing' }],
        },
      ],
    });

    const result = materializePlan(plan, baseCtx());

    const cardA = result.cards.find((c) => c.title === 'Card A')!;
    expect(cardA.assignmentHint).toBe('testing');
    expect(result.unresolvedAssignments).toEqual([{ cardId: cardA.id, hint: 'testing' }]);
  });

  it('applies card and list defaults', () => {
    const plan = PlanProposalSchema.parse({
      newLists: [{ title: 'L1', cards: [{ title: 'Card A' }] }],
    });

    const result = materializePlan(plan, baseCtx());

    expect(result.lists[0].autoRunAgents).toBe(false);
    expect(result.lists[0].listType).toBe('kanban');
    expect(result.lists[0].homogenousType).toBe('none');
    expect(result.lists[0].color).toBe('indigo');
    expect(result.lists[0].icon).toBe('Sparkles');

    const card = result.cards[0];
    expect(card.status).toBe('todo');
    expect(card.progress).toBe(0);
    expect(card.widgets).toEqual([]);
    expect(card.subtasks).toEqual([]);
    expect(card.rbacRole).toBe('contributor');
    expect(card.executionStatus).toBe('idle');
    expect(card.revision).toBe(1);
    expect(card.tags).toEqual([]);
  });
});
