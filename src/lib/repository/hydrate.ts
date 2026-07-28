import { BoardData, CardItemData, ListConfig } from '../../types';
import { BoardDoc, CardDoc, ListDoc } from './types';

export function formatCardTimestamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function cardDocToItem(doc: CardDoc): CardItemData {
  const { boardId, listId, position, ownerUid, createdAt, updatedAt, ...rest } = doc;
  return {
    ...rest,
    createdAt: formatCardTimestamp(createdAt),
    updatedAt: formatCardTimestamp(updatedAt),
  };
}

function listDocToConfig(doc: ListDoc, cards: CardItemData[]): ListConfig {
  const { boardId, position, ownerUid, createdAt, updatedAt, ...rest } = doc;
  return { ...rest, cards };
}

export function hydrateBoard(board: BoardDoc, lists: ListDoc[], cards: CardDoc[]): BoardData {
  const { ownerUid, createdAt, updatedAt, position, ...boardRest } = board;

  const sortedLists = [...lists].sort((a, b) => a.position - b.position);

  return {
    ...boardRest,
    lists: sortedLists.map(list => {
      const listCards = cards
        .filter(c => c.listId === list.id)
        .sort((a, b) => a.position - b.position)
        .map(cardDocToItem);
      return listDocToConfig(list, listCards);
    }),
  };
}
