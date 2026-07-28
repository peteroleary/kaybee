import { describe, expect, it } from 'vitest';
import { CardItemData } from '../../types';
import { diffCardPatch } from './cardDiff';

function makeCard(overrides: Partial<CardItemData> = {}): CardItemData {
  return {
    id: 'card-1',
    title: 'Original title',
    description: 'Original description',
    entityType: 'task',
    status: 'todo',
    progress: 0,
    rbacRole: 'contributor',
    widgets: [],
    subtasks: [],
    tags: ['a'],
    priority: 'medium',
    createdAt: '2h ago',
    updatedAt: 'Just now',
    ...overrides,
  };
}

describe('diffCardPatch', () => {
  it('returns an empty patch and no revision bump when nothing changed', () => {
    const card = makeCard();
    const result = diffCardPatch(card, { ...card });
    expect(result.patch).toEqual({});
    expect(result.bumpRevision).toBe(false);
  });

  it('never includes id, createdAt, updatedAt, ownerUid, or revision even if they differ', () => {
    const original = makeCard({ revision: 1 });
    const updated = makeCard({
      id: 'card-1',
      createdAt: 'Just now',
      updatedAt: '5m ago',
      revision: 99,
      // @ts-expect-error ownerUid is not part of CardItemData but guard anyway
      ownerUid: 'someone-else',
    });

    const result = diffCardPatch(original, updated);
    expect(result.patch).not.toHaveProperty('id');
    expect(result.patch).not.toHaveProperty('createdAt');
    expect(result.patch).not.toHaveProperty('updatedAt');
    expect(result.patch).not.toHaveProperty('ownerUid');
    expect(result.patch).not.toHaveProperty('revision');
  });

  it('flags a semantic field change (title) and includes it in the patch', () => {
    const original = makeCard();
    const updated = makeCard({ title: 'New title' });
    const result = diffCardPatch(original, updated);
    expect(result.patch.title).toBe('New title');
    expect(result.bumpRevision).toBe(true);
  });

  it('does not bump revision for a non-semantic field change (progress)', () => {
    const original = makeCard();
    const updated = makeCard({ progress: 50 });
    const result = diffCardPatch(original, updated);
    expect(result.patch.progress).toBe(50);
    expect(result.bumpRevision).toBe(false);
  });

  it('flags widgets array changes as semantic even though only contents differ', () => {
    const original = makeCard({ widgets: [{ id: 'w1', type: 'toggle', label: 'x', value: false }] });
    const updated = makeCard({ widgets: [{ id: 'w1', type: 'toggle', label: 'x', value: true }] });
    const result = diffCardPatch(original, updated);
    expect(result.bumpRevision).toBe(true);
    expect(result.patch.widgets).toEqual(updated.widgets);
  });

  it('does not include unchanged fields in the patch', () => {
    const original = makeCard();
    const updated = makeCard({ progress: 25 });
    const result = diffCardPatch(original, updated);
    expect(Object.keys(result.patch)).toEqual(['progress']);
  });
});
