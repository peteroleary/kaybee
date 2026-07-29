import { describe, expect, it } from 'vitest';
import type { CardItemData, InteractiveWidget } from '../../types';
import {
  buildCardRunPatch,
  CARD_OUTPUT_MAX_BYTES,
  mergeWidgetsById,
  resolveExecutionStatus,
  resolveWorkStatus,
  truncateForCard,
} from './runResult';

function makeCard(overrides: Partial<CardItemData> = {}): CardItemData {
  const now = new Date(0).toISOString();
  return {
    id: 'card-1',
    title: 'Card',
    description: '',
    entityType: 'agent',
    status: 'in_progress',
    progress: 40,
    rbacRole: 'contributor',
    widgets: [],
    subtasks: [],
    tags: [],
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const toggle = (id: string, value: boolean): InteractiveWidget => ({ id, type: 'toggle', label: id, value });

describe('mergeWidgetsById', () => {
  it('replaces by id, appends unknown ids, preserves the rest', () => {
    const existing = [toggle('a', false), toggle('b', false)];
    const updates = [toggle('b', true), toggle('c', true)];
    expect(mergeWidgetsById(existing, updates)).toEqual([toggle('a', false), toggle('b', true), toggle('c', true)]);
  });
});

describe('resolveWorkStatus / resolveExecutionStatus', () => {
  it('maps outcomes to work status without conflating run state', () => {
    expect(resolveWorkStatus('success', null)).toBe('completed');
    expect(resolveWorkStatus('success', { requiresApproval: true })).toBe('in_review');
    expect(resolveWorkStatus('error', null)).toBe('failed');
    expect(resolveWorkStatus('cancelled', null)).toBeNull();

    expect(resolveExecutionStatus('success')).toBe('success');
    expect(resolveExecutionStatus('error')).toBe('error');
    expect(resolveExecutionStatus('cancelled')).toBe('idle');
  });
});

describe('buildCardRunPatch', () => {
  it('keeps a legitimate suggestedProgress of 0 (no || 100 coercion)', () => {
    const patch = buildCardRunPatch({
      card: makeCard(),
      outcome: 'success',
      output: 'done',
      suggestedProgress: 0,
      updatedWidgets: null,
      agentRequiresApproval: false,
      runId: 'run_1',
      now: 1_000,
    });
    expect(patch.progress).toBe(0);
    expect(patch.status).toBe('completed');
    expect(patch.executionStatus).toBe('success');
  });

  it('omits progress entirely when suggestedProgress is null', () => {
    const patch = buildCardRunPatch({
      card: makeCard(),
      outcome: 'success',
      output: 'done',
      suggestedProgress: null,
      updatedWidgets: null,
      agentRequiresApproval: false,
      runId: 'run_1',
      now: 1_000,
    });
    expect(patch).not.toHaveProperty('progress');
  });

  it('marks failed work on error without touching progress', () => {
    const patch = buildCardRunPatch({
      card: makeCard(),
      outcome: 'error',
      output: 'boom',
      suggestedProgress: null,
      updatedWidgets: null,
      agentRequiresApproval: false,
      runId: 'run_1',
      now: 1_000,
    });
    expect(patch.status).toBe('failed');
    expect(patch.executionStatus).toBe('error');
    expect(patch).not.toHaveProperty('progress');
  });

  it('routes successful runs of approval-gated agents to in_review', () => {
    const patch = buildCardRunPatch({
      card: makeCard(),
      outcome: 'success',
      output: null,
      suggestedProgress: null,
      updatedWidgets: null,
      agentRequiresApproval: true,
      runId: 'run_1',
      now: 1_000,
    });
    expect(patch.status).toBe('in_review');
    expect(patch.executionStatus).toBe('success');
  });

  it('merges updated widgets by id', () => {
    const patch = buildCardRunPatch({
      card: makeCard({ widgets: [toggle('a', false)] }),
      outcome: 'success',
      output: null,
      suggestedProgress: null,
      updatedWidgets: [toggle('a', true)],
      agentRequiresApproval: false,
      runId: 'run_1',
      now: 1_000,
    });
    expect(patch.widgets).toEqual([toggle('a', true)]);
  });
});

describe('truncateForCard', () => {
  it('caps the card-side projection at 8KB', () => {
    const big = 'x'.repeat(CARD_OUTPUT_MAX_BYTES + 500);
    expect(truncateForCard(big).length).toBe(CARD_OUTPUT_MAX_BYTES + 1);
    expect(truncateForCard('short')).toBe('short');
  });
});
