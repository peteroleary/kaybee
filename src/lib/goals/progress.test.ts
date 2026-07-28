import { describe, expect, it } from 'vitest';
import { computeGoalProgress } from './progress';

describe('computeGoalProgress', () => {
  it('returns all zeros for an empty array', () => {
    expect(computeGoalProgress([])).toEqual({
      percent: 0,
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      failed: 0,
      waitingOnHuman: 0,
    });
  });

  it('returns 100 percent when all cards are completed', () => {
    const result = computeGoalProgress([
      { status: 'completed', progress: 100 },
      { status: 'completed', progress: 40 },
    ]);
    expect(result.percent).toBe(100);
    expect(result.completed).toBe(2);
  });

  it('averages mixed partial progress', () => {
    const result = computeGoalProgress([
      { status: 'in_progress', progress: 50 },
      { status: 'todo', progress: 0 },
      { status: 'completed', progress: 100 },
      { status: 'completed', progress: 100 },
    ]);
    // (0.5 + 0 + 1 + 1) / 4 = 0.625 -> 63%
    expect(result.percent).toBe(63);
  });

  it('makes a failed card contribute 0 regardless of its progress value', () => {
    const result = computeGoalProgress([
      { status: 'failed', progress: 90 },
      { status: 'completed', progress: 100 },
    ]);
    // (0 + 1) / 2 = 0.5 -> 50%
    expect(result.percent).toBe(50);
    expect(result.failed).toBe(1);
  });
});
