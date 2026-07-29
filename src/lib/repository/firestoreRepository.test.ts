import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanProposalSchema } from '../../shared/contracts/goalPlan';

let autoIdCounter = 0;
let createdBatches: Array<{ set: ReturnType<typeof vi.fn>; commit: ReturnType<typeof vi.fn> }> = [];

vi.mock('../firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => {
  const collection = (_db: unknown, name: string) => ({ __collection: name });

  const doc = (first: unknown, ...rest: unknown[]) => {
    if (first && typeof first === 'object' && '__collection' in (first as Record<string, unknown>)) {
      const collectionName = (first as { __collection: string }).__collection;
      const id = (rest[0] as string | undefined) ?? `auto-${autoIdCounter++}`;
      return { __collection: collectionName, id };
    }
    const [collectionName, id] = rest as [string, string | undefined];
    return { __collection: collectionName, id: id ?? `auto-${autoIdCounter++}` };
  };

  const query = (...args: unknown[]) => ({ __query: args });
  const where = (...args: unknown[]) => ({ __where: args });
  const orderBy = (...args: unknown[]) => ({ __orderBy: args });
  const limit = (...args: unknown[]) => ({ __limit: args });

  // No existing lists on any board in these tests — materializePlan treats
  // every list in the plan as new.
  const getDocs = async (_q: unknown) => ({ docs: [] as unknown[] });
  const getDoc = async (_ref: unknown) => ({ exists: () => false, data: () => undefined });

  const writeBatch = (_db: unknown) => {
    const batch = {
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    };
    createdBatches.push(batch);
    return batch;
  };

  return {
    addDoc: vi.fn(),
    collection,
    deleteDoc: vi.fn(),
    deleteField: vi.fn(),
    doc,
    getDoc,
    getDocs,
    increment: (n: number) => ({ __increment: n }),
    onSnapshot: vi.fn(() => () => {}),
    orderBy,
    query,
    serverTimestamp: () => '__server_timestamp__',
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    where,
    writeBatch,
    limit,
  };
});

import { createFirestoreRepository } from './firestoreRepository';

describe('firestoreRepository.applyPlan', () => {
  beforeEach(() => {
    createdBatches = [];
    autoIdCounter = 0;
  });

  it('chunks writes across multiple batches once a plan exceeds ~450 docs', async () => {
    const repo = createFirestoreRepository('uid-1');

    const plan = PlanProposalSchema.parse({
      newLists: [
        {
          title: 'Big List',
          cards: Array.from({ length: 700 }, (_, i) => ({ title: `Card ${i}` })),
        },
      ],
    });

    const refs = await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });

    expect(refs.listIds).toHaveLength(1);
    expect(refs.cardIds).toHaveLength(700);

    // 1 list + 700 cards = 701 items; chunk() defaults to groups of 450 -> 2 batches.
    expect(createdBatches.length).toBe(2);
    const totalSetCalls = createdBatches.reduce((sum, b) => sum + b.set.mock.calls.length, 0);
    expect(totalSetCalls).toBe(701);
    createdBatches.forEach(b => expect(b.commit).toHaveBeenCalledTimes(1));
  });

  it('does not chunk a small plan (single batch)', async () => {
    const repo = createFirestoreRepository('uid-1');
    const plan = PlanProposalSchema.parse({ newLists: [{ title: 'Small', cards: [{ title: 'One' }, { title: 'Two' }] }] });

    await repo.applyPlan(plan, { boardId: 'board-1', goalId: 'goal-1' });

    expect(createdBatches.length).toBe(1);
  });

  it('writes lists/cards stamped with the requested board and goal', async () => {
    const repo = createFirestoreRepository('uid-1');
    const plan = PlanProposalSchema.parse({ newLists: [{ title: 'Only List', cards: [{ title: 'Only Card' }] }] });

    await repo.applyPlan(plan, { boardId: 'board-42', goalId: 'goal-7' });

    expect(createdBatches).toHaveLength(1);
    const [{ set }] = createdBatches;
    const listCall = set.mock.calls.find(([, data]: [unknown, Record<string, unknown>]) => data.title === 'Only List');
    const cardCall = set.mock.calls.find(([, data]: [unknown, Record<string, unknown>]) => data.title === 'Only Card');

    expect(listCall?.[1]).toMatchObject({ boardId: 'board-42', ownerUid: 'uid-1' });
    expect(cardCall?.[1]).toMatchObject({
      boardId: 'board-42',
      goalId: 'goal-7',
      ownerUid: 'uid-1',
      status: 'todo',
      progress: 0,
    });
  });
});
