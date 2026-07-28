import type { CardItemData, ListConfig } from '../../types';
import {
  CardDraftSchema,
  ListDraftSchema,
  type CardDraft,
  type ListDraft,
  type PlanProposal,
} from '../contracts/goalPlan';
import { resolveTargetList } from './resolveTargetList';

const POSITION_GAP = 1024;

export interface NormalizeContext {
  boardId: string;
  goalId: string | null;
  existingLists: Array<{ id: string; title: string; position: number }>;
  now: number;
  newId: (prefix: string) => string;
}

export type NormalizedList = Omit<ListConfig, 'cards'> & {
  boardId: string;
  position: number;
};

export type NormalizedCard = CardItemData & {
  boardId: string;
  listId: string;
  position: number;
  goalId: string | null;
  assignmentHint: string | null;
};

export interface MaterializedPlan {
  lists: NormalizedList[];
  cards: NormalizedCard[];
  unresolvedAssignments: Array<{ cardId: string; hint: string }>;
  warnings: string[];
}

export function normalizeListDraft(raw: unknown): ListDraft {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const title =
    typeof obj.title === 'string' && obj.title.trim().length > 0 ? obj.title : 'Untitled List';
  return ListDraftSchema.parse({ ...obj, title });
}

export function normalizeCardDraft(raw: unknown): CardDraft {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const title =
    typeof obj.title === 'string' && obj.title.trim().length > 0 ? obj.title : 'Untitled Card';
  return CardDraftSchema.parse({ ...obj, title });
}

const buildDefaultList = (
  ctx: NormalizeContext,
  title: string,
  position: number,
): NormalizedList => ({
  id: ctx.newId('list'),
  title,
  listType: 'kanban',
  homogenousType: 'none',
  color: 'indigo',
  icon: 'Sparkles',
  autoRunAgents: false,
  rbacRole: 'contributor',
  boardId: ctx.boardId,
  position,
});

export function materializePlan(plan: PlanProposal, ctx: NormalizeContext): MaterializedPlan {
  const warnings: string[] = [];
  const unresolvedAssignments: Array<{ cardId: string; hint: string }> = [];
  const lists: NormalizedList[] = [];

  const maxExistingListPosition = ctx.existingLists.reduce(
    (max, l) => Math.max(max, l.position),
    -POSITION_GAP,
  );
  let nextListPosition = maxExistingListPosition + POSITION_GAP;

  const listRefsForResolution: Array<{ id: string; title: string }> = ctx.existingLists.map(
    (l) => ({ id: l.id, title: l.title }),
  );

  interface PendingCard {
    draft: CardDraft;
    listId: string;
  }
  const pendingCards: PendingCard[] = [];

  for (const rawList of plan.newLists) {
    const listDraft = normalizeListDraft(rawList);
    const listId = ctx.newId('list');
    const normalizedList: NormalizedList = {
      id: listId,
      title: listDraft.title,
      listType: listDraft.listType,
      homogenousType: listDraft.homogenousType,
      color: listDraft.color,
      icon: listDraft.icon,
      autoRunAgents: listDraft.autoRunAgents,
      rbacRole: 'contributor',
      boardId: ctx.boardId,
      position: nextListPosition,
    };
    nextListPosition += POSITION_GAP;
    lists.push(normalizedList);
    listRefsForResolution.push({ id: listId, title: listDraft.title });

    for (const rawCard of listDraft.cards) {
      const cardDraft = normalizeCardDraft(rawCard);
      pendingCards.push({ draft: cardDraft, listId });
    }
  }

  for (const rawCard of plan.newCards) {
    const cardDraft = normalizeCardDraft(rawCard);
    const resolution = resolveTargetList(rawCard.targetListTitle, listRefsForResolution);

    let listId: string;
    if (resolution.kind === 'existing') {
      listId = resolution.listId;
    } else {
      const newList = buildDefaultList(ctx, resolution.title, nextListPosition);
      nextListPosition += POSITION_GAP;
      lists.push(newList);
      listRefsForResolution.push({ id: newList.id, title: newList.title });
      listId = newList.id;
    }

    pendingCards.push({ draft: cardDraft, listId });
  }

  const cardIdByKey = new Map<string, string>();
  const generatedCards: Array<{ draft: CardDraft; listId: string; id: string }> = [];
  for (const pc of pendingCards) {
    const id = ctx.newId('card');
    generatedCards.push({ draft: pc.draft, listId: pc.listId, id });
    if (pc.draft.key) {
      cardIdByKey.set(pc.draft.key, id);
    }
  }

  const nowIso = new Date(ctx.now).toISOString();
  const positionByList = new Map<string, number>();
  const cards: NormalizedCard[] = [];

  for (const gc of generatedCards) {
    const position = positionByList.get(gc.listId) ?? 0;
    positionByList.set(gc.listId, position + POSITION_GAP);

    const dependsOnCardIds: string[] = [];
    for (const depKey of gc.draft.dependsOn) {
      const resolvedId = cardIdByKey.get(depKey);
      if (resolvedId) {
        dependsOnCardIds.push(resolvedId);
      } else {
        warnings.push(`Card "${gc.draft.title}" depends on unknown key "${depKey}" — dropped.`);
      }
    }

    const assignmentHint =
      gc.draft.assignedAgentType && gc.draft.assignedAgentType.trim().length > 0
        ? gc.draft.assignedAgentType
        : null;
    if (assignmentHint) {
      unresolvedAssignments.push({ cardId: gc.id, hint: assignmentHint });
    }

    cards.push({
      id: gc.id,
      title: gc.draft.title,
      description: gc.draft.description,
      entityType: gc.draft.entityType,
      status: 'todo',
      progress: 0,
      rbacRole: 'contributor',
      widgets: [],
      subtasks: [],
      prompt: gc.draft.prompt,
      executionStatus: 'idle',
      tags: gc.draft.tags,
      priority: gc.draft.priority,
      createdAt: nowIso,
      updatedAt: nowIso,
      dependsOnCardIds: dependsOnCardIds.length > 0 ? dependsOnCardIds : undefined,
      revision: 1,
      boardId: ctx.boardId,
      listId: gc.listId,
      position,
      goalId: ctx.goalId,
      assignmentHint,
    });
  }

  return { lists, cards, unresolvedAssignments, warnings };
}
