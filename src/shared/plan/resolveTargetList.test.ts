import { describe, expect, it } from 'vitest';
import { resolveTargetList } from './resolveTargetList';

const lists = [
  { id: 'l1', title: 'Planning & Research' },
  { id: 'l2', title: 'Development' },
  { id: 'l3', title: 'Testing & QA' },
];

describe('resolveTargetList', () => {
  it('matches an exact title', () => {
    expect(resolveTargetList('Development', lists)).toEqual({ kind: 'existing', listId: 'l2' });
  });

  it('matches case-insensitively', () => {
    expect(resolveTargetList('development', lists)).toEqual({ kind: 'existing', listId: 'l2' });
  });

  it('matches after punctuation/whitespace normalization', () => {
    expect(resolveTargetList('Planning & Research!!', lists)).toEqual({
      kind: 'existing',
      listId: 'l1',
    });
    expect(resolveTargetList('  testing   qa  ', lists)).toEqual({
      kind: 'existing',
      listId: 'l3',
    });
  });

  it('matches fuzzily when token overlap is at or above threshold', () => {
    expect(resolveTargetList('Testing & QA Stage', lists)).toEqual({
      kind: 'existing',
      listId: 'l3',
    });
    expect(resolveTargetList('Planning and Research', lists)).toEqual({
      kind: 'existing',
      listId: 'l1',
    });
  });

  it('does not match fuzzily when token overlap is below threshold', () => {
    expect(resolveTargetList('Deployment Pipeline', lists)).toEqual({
      kind: 'create',
      title: 'Deployment Pipeline',
    });
  });

  it('returns create Inbox for an empty string title (regression for the includes bug)', () => {
    expect(resolveTargetList('', lists)).toEqual({ kind: 'create', title: 'Inbox' });
  });

  it('returns create Inbox for a whitespace-only title', () => {
    expect(resolveTargetList('   ', lists)).toEqual({ kind: 'create', title: 'Inbox' });
  });

  it('returns create Inbox for an undefined title', () => {
    expect(resolveTargetList(undefined, lists)).toEqual({ kind: 'create', title: 'Inbox' });
  });

  it('returns create when there are no lists at all', () => {
    expect(resolveTargetList('Anything', [])).toEqual({ kind: 'create', title: 'Anything' });
  });
});
