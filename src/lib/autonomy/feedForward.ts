import type { CreateCardInput } from '../repository/workspaceRepository';
import type { BoardData, CardItemData, FeedForwardConnection } from '../../types';

/** A routed clone may spawn at most this many generations of further clones. */
export const MAX_FEED_FORWARD_HOPS = 3;

/** The minimal per-card state the edge detector diffs between snapshots. */
export interface CardSnapshot {
  id: string;
  listId: string;
  status: CardItemData['status'];
  priority: CardItemData['priority'];
  executionStatus: CardItemData['executionStatus'];
  hopCount: number;
}

export function snapshotCard(card: CardItemData, listId: string): CardSnapshot {
  return {
    id: card.id,
    listId,
    status: card.status,
    priority: card.priority,
    executionStatus: card.executionStatus,
    hopCount: card.lineage?.hopCount ?? 0,
  };
}

export function snapshotBoards(boards: BoardData[]): Map<string, CardSnapshot> {
  const map = new Map<string, CardSnapshot>();
  for (const board of boards) {
    for (const list of board.lists) {
      for (const card of list.cards) {
        map.set(card.id, snapshotCard(card, list.id));
      }
    }
  }
  return map;
}

/**
 * Edge-triggered feed-forward predicate. Every condition fires on a
 * *transition* between two consecutive snapshots — never on level state, or
 * a live connection would re-route the same card on every engine tick.
 * The hop cap is the last line of defense against clone-spawn loops.
 */
export function shouldFeedForward(
  condition: FeedForwardConnection['condition'],
  prev: CardSnapshot | undefined,
  next: CardSnapshot,
): boolean {
  if (next.hopCount >= MAX_FEED_FORWARD_HOPS) return false;

  switch (condition) {
    case 'on_complete':
      return next.status === 'completed' && prev !== undefined && prev.status !== 'completed';
    case 'on_urgent':
      return next.priority === 'urgent' && prev !== undefined && prev.priority !== 'urgent';
    case 'always':
      // Fires when the card *enters* the source list (first sight there).
      return prev === undefined || prev.listId !== next.listId;
    case 'on_agent_approval':
      return (
        next.executionStatus === 'success' && prev !== undefined && prev.executionStatus !== 'success'
      );
  }
}

export interface FeedForwardEvent {
  connection: FeedForwardConnection;
  card: CardItemData;
}

/**
 * Diffs two card snapshots against every board's feed-forward connections and
 * returns the routing events to fire. `next` cards are looked up by id so the
 * event carries the full card for cloning.
 */
export function collectFeedForwardEvents(
  boards: BoardData[],
  prev: Map<string, CardSnapshot>,
  next: Map<string, CardSnapshot>,
): FeedForwardEvent[] {
  const events: FeedForwardEvent[] = [];

  for (const board of boards) {
    const connections = board.feedForwardConnections ?? [];
    if (connections.length === 0) continue;

    for (const connection of connections) {
      for (const [cardId, nextSnap] of next) {
        if (nextSnap.listId !== connection.sourceListId) continue;
        const prevSnap = prev.get(cardId);
        if (!shouldFeedForward(connection.condition, prevSnap, nextSnap)) continue;

        const sourceList = board.lists.find(l => l.id === connection.sourceListId);
        const card = sourceList?.cards.find(c => c.id === cardId);
        if (card) events.push({ connection, card });
      }
    }
  }

  return events;
}

export interface LegacyFeedForwardEvent {
  card: CardItemData;
  targetBoardId: string;
}

/**
 * Deprecation window for `card.targetBoardFeedId`: behaves as an implicit
 * `on_complete` connection to the target board's first list.
 */
export function collectLegacyFeedForwardEvents(
  prev: Map<string, CardSnapshot>,
  next: Map<string, CardSnapshot>,
  cardsById: Map<string, CardItemData>,
): LegacyFeedForwardEvent[] {
  const events: LegacyFeedForwardEvent[] = [];
  for (const [cardId, nextSnap] of next) {
    if (!shouldFeedForward('on_complete', prev.get(cardId), nextSnap)) continue;
    const card = cardsById.get(cardId);
    if (card?.targetBoardFeedId) {
      events.push({ card, targetBoardId: card.targetBoardFeedId });
    }
  }
  return events;
}

/**
 * Builds the create-input for a routed clone. The clone is deliberately NOT
 * a copy of the source card: it is fresh work with no way to re-route or
 * re-run itself —
 * - targetBoardFeedId / assignedAgentId / dependsOnCardIds cleared
 * - executionStatus reset to idle, work status/progress reset
 * - prompt_runner widgets stripped (a clone must not be manually re-runnable)
 * - lineage.hopCount incremented (and capped upstream at MAX_FEED_FORWARD_HOPS)
 * - execution artifacts (lastExecutionOutput, chat sender, time logs,
 *   comments) dropped
 */
export function sanitizeRoutedClone(card: CardItemData, opts?: { description?: string }): CreateCardInput {
  return {
    title: `[Routed] ${card.title}`,
    description: opts?.description ?? card.description,
    entityType: card.entityType,
    status: 'todo',
    progress: 0,
    rbacRole: card.rbacRole,
    priority: card.priority,
    tags: [...card.tags],
    prompt: card.prompt ?? '',
    widgets: (card.widgets ?? []).filter(w => w.type !== 'prompt_runner'),
    subtasks: (card.subtasks ?? []).map(s => ({ ...s, completed: false })),
    assignedAgentId: null,
    assignmentHint: card.assignmentHint ?? null,
    goalId: card.goalId ?? null,
    executionStatus: 'idle',
    dependsOnCardIds: [],
    lineage: {
      rootCardId: card.lineage?.rootCardId ?? card.id,
      hopCount: (card.lineage?.hopCount ?? 0) + 1,
    },
  };
}
