import { describe, expect, it } from 'vitest';
import type { CardItemData } from '../../types';
import {
  CardSnapshot,
  MAX_FEED_FORWARD_HOPS,
  sanitizeRoutedClone,
  shouldFeedForward,
} from './feedForward';

function snap(overrides: Partial<CardSnapshot> = {}): CardSnapshot {
  return {
    id: 'card-1',
    listId: 'src-list',
    status: 'in_progress',
    priority: 'medium',
    executionStatus: 'idle',
    hopCount: 0,
    ...overrides,
  };
}

describe('shouldFeedForward', () => {
  it('on_complete fires on the edge, not the level', () => {
    const done = snap({ status: 'completed' });
    expect(shouldFeedForward('on_complete', snap(), done)).toBe(true);
    // Already completed in both snapshots: no re-fire.
    expect(shouldFeedForward('on_complete', done, done)).toBe(false);
    // No previous snapshot (baseline / card already done at load): no fire.
    expect(shouldFeedForward('on_complete', undefined, done)).toBe(false);
  });

  it('on_urgent fires on the priority crossing only', () => {
    const urgent = snap({ priority: 'urgent' });
    expect(shouldFeedForward('on_urgent', snap(), urgent)).toBe(true);
    expect(shouldFeedForward('on_urgent', snap({ priority: 'high' }), urgent)).toBe(true);
    expect(shouldFeedForward('on_urgent', urgent, urgent)).toBe(false);
  });

  it('always fires only when the card enters the list', () => {
    // Moved in from another list.
    expect(shouldFeedForward('always', snap({ listId: 'elsewhere' }), snap())).toBe(true);
    // Already there: no fire.
    expect(shouldFeedForward('always', snap(), snap())).toBe(false);
    // Newly seen (created in the list).
    expect(shouldFeedForward('always', undefined, snap())).toBe(true);
  });

  it('on_agent_approval fires on the executionStatus crossing to success', () => {
    const succeeded = snap({ executionStatus: 'success' });
    expect(shouldFeedForward('on_agent_approval', snap({ executionStatus: 'running' }), succeeded)).toBe(true);
    expect(shouldFeedForward('on_agent_approval', succeeded, succeeded)).toBe(false);
  });

  it('hopCount cap blocks every condition at MAX_FEED_FORWARD_HOPS', () => {
    const capped = snap({ status: 'completed', priority: 'urgent', executionStatus: 'success', hopCount: MAX_FEED_FORWARD_HOPS });
    expect(shouldFeedForward('on_complete', snap(), capped)).toBe(false);
    expect(shouldFeedForward('on_urgent', snap(), capped)).toBe(false);
    expect(shouldFeedForward('always', undefined, capped)).toBe(false);
    expect(shouldFeedForward('on_agent_approval', snap(), capped)).toBe(false);
    expect(shouldFeedForward('on_complete', snap(), snap({ status: 'completed', hopCount: MAX_FEED_FORWARD_HOPS - 1 }))).toBe(true);
  });
});

describe('sanitizeRoutedClone', () => {
  const source: CardItemData = {
    id: 'card-1',
    title: 'Research competitors',
    description: 'Find the top five competitors.',
    entityType: 'agent',
    status: 'completed',
    progress: 100,
    rbacRole: 'contributor',
    widgets: [
      { id: 'w1', type: 'prompt_runner', label: 'Run it', value: '' },
      { id: 'w2', type: 'toggle', label: 'Verified', value: true },
    ],
    subtasks: [{ id: 's1', text: 'step', completed: true }],
    tags: ['Research'],
    priority: 'high',
    createdAt: 'Just now',
    updatedAt: 'Just now',
    targetBoardFeedId: 'board-2',
    assignedAgentId: 'agent-1',
    assignmentHint: 'analysis',
    dependsOnCardIds: ['card-0'],
    executionStatus: 'success',
    lastExecutionOutput: 'The top five competitors are…',
    lineage: null,
  };

  it('clears the auto-loop surfaces and resets work state', () => {
    const clone = sanitizeRoutedClone(source);
    // No targetBoardFeedId key at all — the clone can never route further.
    expect('targetBoardFeedId' in clone).toBe(false);
    expect(clone.assignedAgentId).toBeNull();
    expect(clone.dependsOnCardIds).toEqual([]);
    expect(clone.executionStatus).toBe('idle');
    expect(clone.status).toBe('todo');
    expect(clone.progress).toBe(0);
    expect('lastExecutionOutput' in clone).toBe(false);
  });

  it('strips prompt_runner widgets (not manually re-runnable), keeps the rest', () => {
    const clone = sanitizeRoutedClone(source);
    expect(clone.widgets?.map(w => w.id)).toEqual(['w2']);
  });

  it('advances lineage hopCount and preserves the root', () => {
    const first = sanitizeRoutedClone(source);
    expect(first.lineage).toEqual({ rootCardId: 'card-1', hopCount: 1 });
    const second = sanitizeRoutedClone({ ...source, id: 'card-2', lineage: first.lineage });
    expect(second.lineage).toEqual({ rootCardId: 'card-1', hopCount: 2 });
  });

  it('resets subtasks and keeps payload fields', () => {
    const clone = sanitizeRoutedClone(source);
    expect(clone.subtasks).toEqual([{ id: 's1', text: 'step', completed: false }]);
    expect(clone.title).toBe('[Routed] Research competitors');
    expect(clone.tags).toEqual(['Research']);
    expect(clone.priority).toBe('high');
  });
});
