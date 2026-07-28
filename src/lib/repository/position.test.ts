import { describe, expect, it } from 'vitest';
import {
  MIN_GAP,
  POSITION_GAP,
  initialPositions,
  midpointPosition,
  needsRenormalization,
  planInsert,
  renormalizePositions,
} from './position';

describe('midpointPosition', () => {
  it('returns the base gap when the list is empty', () => {
    expect(midpointPosition(null, null)).toBe(POSITION_GAP);
  });

  it('prepends before the first item by halving its position', () => {
    expect(midpointPosition(null, 1024)).toBe(512);
  });

  it('appends after the last item by adding a full gap', () => {
    expect(midpointPosition(1024, null)).toBe(1024 + POSITION_GAP);
  });

  it('splits the gap between two neighbors', () => {
    expect(midpointPosition(1024, 2048)).toBe(1536);
  });
});

describe('needsRenormalization', () => {
  it('is false when either neighbor is missing (prepend/append)', () => {
    expect(needsRenormalization(null, 100)).toBe(false);
    expect(needsRenormalization(100, null)).toBe(false);
  });

  it('is false when the gap comfortably fits a midpoint', () => {
    expect(needsRenormalization(1024, 2048)).toBe(false);
  });

  it('is true once the gap collapses below 2 * MIN_GAP', () => {
    expect(needsRenormalization(10, 10 + MIN_GAP * 2 - 0.5)).toBe(true);
    expect(needsRenormalization(10, 10 + MIN_GAP * 2)).toBe(false);
  });
});

describe('initialPositions / renormalizePositions', () => {
  it('spaces items evenly by POSITION_GAP starting at POSITION_GAP', () => {
    expect(initialPositions(3)).toEqual([1024, 2048, 3072]);
    expect(renormalizePositions(3)).toEqual(initialPositions(3));
  });

  it('returns an empty array for zero items', () => {
    expect(initialPositions(0)).toEqual([]);
  });
});

describe('planInsert', () => {
  it('inserts into an empty list at the base gap', () => {
    const plan = planInsert([], 0);
    expect(plan.position).toBe(POSITION_GAP);
    expect(plan.renormalizedPositions).toBeNull();
  });

  it('prepends at index 0', () => {
    const plan = planInsert([1024, 2048], 0);
    expect(plan.position).toBe(512);
    expect(plan.renormalizedPositions).toBeNull();
  });

  it('appends at the end index', () => {
    const plan = planInsert([1024, 2048], 2);
    expect(plan.position).toBe(2048 + POSITION_GAP);
    expect(plan.renormalizedPositions).toBeNull();
  });

  it('clamps out-of-range indexes', () => {
    const plan = planInsert([1024, 2048], 99);
    expect(plan.position).toBe(2048 + POSITION_GAP);
  });

  it('renormalizes when the target gap has collapsed', () => {
    // Positions 10 and 10.5 are too close to split cleanly.
    const plan = planInsert([10, 10.5, 2000], 1);
    expect(plan.renormalizedPositions).toEqual([1024, 2048, 3072]);
    // After renormalizing, inserting at index 1 sits between the new 1st/2nd slots.
    expect(plan.position).toBe((1024 + 2048) / 2);
  });
});
