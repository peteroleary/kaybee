import type { CardItemData } from '../../types';

export interface GoalProgress {
  percent: number;
  total: number;
  completed: number;
  inProgress: number;
  blocked: number;
  failed: number;
  waitingOnHuman: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function computeGoalProgress(
  cards: Array<
    Pick<CardItemData, 'status' | 'progress'> & { assigneeKind?: 'agent' | 'human' | null }
  >,
): GoalProgress {
  const total = cards.length;

  if (total === 0) {
    return {
      percent: 0,
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      failed: 0,
      waitingOnHuman: 0,
    };
  }

  let completed = 0;
  let inProgress = 0;
  let blocked = 0;
  let failed = 0;
  let waitingOnHuman = 0;
  let contributionSum = 0;

  for (const card of cards) {
    switch (card.status) {
      case 'completed':
        completed += 1;
        break;
      case 'failed':
        failed += 1;
        break;
      case 'in_progress':
        inProgress += 1;
        break;
      case 'in_review':
        blocked += 1;
        break;
      default:
        break;
    }

    if (card.assigneeKind === 'human' && card.status !== 'completed') {
      waitingOnHuman += 1;
    }

    const contribution =
      card.status === 'completed' ? 1 : card.status === 'failed' ? 0 : clamp(card.progress, 0, 100) / 100;
    contributionSum += contribution;
  }

  const percent = Math.round((contributionSum / total) * 100);

  return { percent, total, completed, inProgress, blocked, failed, waitingOnHuman };
}
