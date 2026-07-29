import { BoardTemplate } from '../../data/templates';
import { computeGoalProgress } from '../goals/progress';
import { materializePlan, type NormalizeContext } from '../../shared/plan/normalize';
import { PlanProposal } from '../../shared/contracts/goalPlan';
import { ActivityLog, BoardData, CardItemData, ListConfig, UserGoal } from '../../types';
import { INITIAL_BOARDS } from '../../data/initialData';
import { ApplyPlanOptions, AppliedRefs, BoardSummary } from './types';
import {
  CreateBoardInput,
  CreateCardInput,
  CreateListInput,
  Unsubscribe,
  WorkspaceRepository,
} from './workspaceRepository';

const GOALS_STORAGE_KEY = 'evo_kanban_goals';
const TEMPLATES_STORAGE_KEY = 'evo_kanban_custom_templates';
const TAG_COLORS_STORAGE_KEY = 'kb3_custom_tag_colors';

const SEED_ACTIVITY: ActivityLog[] = [
  {
    id: 'act-1',
    timestamp: '10:45 AM',
    actor: { name: 'Orchestrator Agent', isAgent: true },
    action: 'Initialized KB3.0 Evolutionary Kanban Environment with 3 Boards',
    boardName: 'KB3.0 Core Product Lab',
  },
];

function loadJson<T>(key: string, fallback: T): T {
  try {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function toSummary(board: BoardData): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    description: board.description,
    icon: board.icon,
    category: board.category,
    theme: board.theme,
  };
}

interface CardLocation {
  boardIdx: number;
  listIdx: number;
  cardIdx: number;
}

interface ListLocation {
  boardIdx: number;
  listIdx: number;
}

export function createMemoryRepository(seedBoards: BoardData[] = INITIAL_BOARDS): WorkspaceRepository {
  let boards: BoardData[] = seedBoards;
  let goals: UserGoal[] = loadJson<UserGoal[]>(GOALS_STORAGE_KEY, []);
  let templates: BoardTemplate[] = loadJson<BoardTemplate[]>(TEMPLATES_STORAGE_KEY, []);
  let tagColors: Record<string, string> = loadJson<Record<string, string>>(TAG_COLORS_STORAGE_KEY, {});
  let activities: ActivityLog[] = SEED_ACTIVITY;

  const allBoardsSubs = new Set<(b: BoardData[]) => void>();
  const boardSummarySubs = new Set<(b: BoardSummary[]) => void>();
  const boardSubs = new Map<string, Set<(b: BoardData | null) => void>>();
  const goalSubs = new Set<(g: UserGoal[]) => void>();
  const activitySubs = new Set<{ limit: number; cb: (a: ActivityLog[]) => void }>();
  const templateSubs = new Set<(t: BoardTemplate[]) => void>();
  const tagColorSubs = new Set<(c: Record<string, string>) => void>();

  const notifyAllBoards = () => {
    allBoardsSubs.forEach(cb => cb(boards));
  };

  const notifyBoardSummaries = () => {
    const summaries = boards.map(toSummary);
    boardSummarySubs.forEach(cb => cb(summaries));
  };

  const notifyBoard = (boardId: string) => {
    const subs = boardSubs.get(boardId);
    if (!subs || subs.size === 0) return;
    const board = boards.find(b => b.id === boardId) || null;
    subs.forEach(cb => cb(board));
  };

  const notifyAllBoardTargets = (boardId: string) => {
    notifyAllBoards();
    notifyBoardSummaries();
    notifyBoard(boardId);
  };

  const notifyGoals = () => {
    goalSubs.forEach(cb => cb(goals));
  };

  const notifyActivity = () => {
    activitySubs.forEach(({ limit, cb }) => cb(activities.slice(0, limit)));
  };

  const notifyTemplates = () => {
    templateSubs.forEach(cb => cb(templates));
  };

  const notifyTagColors = () => {
    tagColorSubs.forEach(cb => cb(tagColors));
  };

  const findListLocation = (listId: string): ListLocation | null => {
    for (let boardIdx = 0; boardIdx < boards.length; boardIdx++) {
      const listIdx = boards[boardIdx].lists.findIndex(l => l.id === listId);
      if (listIdx !== -1) return { boardIdx, listIdx };
    }
    return null;
  };

  const findCardLocation = (cardId: string): CardLocation | null => {
    for (let boardIdx = 0; boardIdx < boards.length; boardIdx++) {
      const lists = boards[boardIdx].lists;
      for (let listIdx = 0; listIdx < lists.length; listIdx++) {
        const cardIdx = lists[listIdx].cards.findIndex(c => c.id === cardId);
        if (cardIdx !== -1) return { boardIdx, listIdx, cardIdx };
      }
    }
    return null;
  };

  /**
   * Recomputes a goal's progress from every card currently tagged with its
   * id (across all boards) and persists the result onto the goal doc. Called
   * from updateCard whenever a patch touches `status`/`progress` on a card
   * that belongs to a goal — this is the "same write as the card change"
   * requirement from Phase 5: the in-memory board mutation and this goal
   * mutation happen synchronously, back to back, before either notification
   * fires.
   */
  const recomputeAndPersistGoalProgress = (goalId: string) => {
    const goalIdx = goals.findIndex(g => g.id === goalId);
    if (goalIdx === -1) return;
    const cardsForGoal = boards.flatMap(b => b.lists.flatMap(l => l.cards)).filter(c => c.goalId === goalId);
    const detail = computeGoalProgress(cardsForGoal);
    const updatedGoal: UserGoal = { ...goals[goalIdx], progress: detail.percent, progressDetail: detail };
    goals = [...goals.slice(0, goalIdx), updatedGoal, ...goals.slice(goalIdx + 1)];
    persistJson(GOALS_STORAGE_KEY, goals);
    notifyGoals();
  };

  return {
    kind: 'memory',

    subscribeAllBoards(cb): Unsubscribe {
      allBoardsSubs.add(cb);
      cb(boards);
      return () => allBoardsSubs.delete(cb);
    },

    subscribeBoardSummaries(cb): Unsubscribe {
      boardSummarySubs.add(cb);
      cb(boards.map(toSummary));
      return () => boardSummarySubs.delete(cb);
    },

    subscribeBoard(boardId, cb): Unsubscribe {
      if (!boardSubs.has(boardId)) boardSubs.set(boardId, new Set());
      const subs = boardSubs.get(boardId)!;
      subs.add(cb);
      cb(boards.find(b => b.id === boardId) || null);
      return () => subs.delete(cb);
    },

    subscribeGoals(cb): Unsubscribe {
      goalSubs.add(cb);
      cb(goals);
      return () => goalSubs.delete(cb);
    },

    subscribeActivity(limit, cb): Unsubscribe {
      const entry = { limit, cb };
      activitySubs.add(entry);
      cb(activities.slice(0, limit));
      return () => activitySubs.delete(entry);
    },

    subscribeTemplates(cb): Unsubscribe {
      templateSubs.add(cb);
      cb(templates);
      return () => templateSubs.delete(cb);
    },

    subscribeTagColors(cb): Unsubscribe {
      tagColorSubs.add(cb);
      cb(tagColors);
      return () => tagColorSubs.delete(cb);
    },

    async createBoard(input: CreateBoardInput) {
      const id = `board-${Date.now()}`;
      // Seed lists/cards (from board templates) always get fresh ids here,
      // mirroring firestoreRepository's discard-and-regenerate behavior —
      // callers must not rely on any id they set on these.
      const preparedLists: ListConfig[] = (input.lists ?? []).map((l, listIdx) => ({
        ...l,
        id: `${id}-list-${listIdx}`,
        cards: l.cards.map((c, cardIdx) => ({
          ...c,
          id: `${id}-list-${listIdx}-card-${cardIdx}`,
          createdAt: 'Just now',
          updatedAt: 'Just now',
        })),
      }));
      const board: BoardData = {
        id,
        name: input.name,
        description: input.description ?? 'Custom KB3.0 workspace created by user.',
        icon: input.icon ?? 'Layers',
        category: input.category,
        rbacRole: input.rbacRole ?? 'admin',
        feedForwardConnections: [],
        lists: preparedLists,
      };
      boards = [...boards, board];
      notifyAllBoardTargets(id);
      return id;
    },

    async updateBoard(boardId, patch) {
      boards = boards.map(b => (b.id === boardId ? { ...b, ...patch } : b));
      notifyAllBoardTargets(boardId);
    },

    async deleteBoard(boardId) {
      boards = boards.filter(b => b.id !== boardId);
      notifyAllBoardTargets(boardId);
    },

    async createList(boardId, input: CreateListInput, at = 'end') {
      const id = `list-${Date.now()}`;
      const { cards, ...listFields } = input;
      // Nested seed cards (from templates/goal decomposition/orchestrator
      // results) always get fresh ids here, mirroring firestoreRepository's
      // discard-and-regenerate behavior — callers must not rely on any id
      // they set on these.
      const preparedCards: CardItemData[] = (cards ?? []).map((c, idx) => ({
        ...c,
        id: `${id}-card-${idx}`,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      }));
      const list: ListConfig = {
        ...listFields,
        id,
        cards: preparedCards,
      };
      boards = boards.map(b => {
        if (b.id !== boardId) return b;
        const lists = at === 'start' ? [list, ...b.lists] : [...b.lists, list];
        return { ...b, lists };
      });
      notifyAllBoardTargets(boardId);
      return id;
    },

    async updateList(listId, patch) {
      const loc = findListLocation(listId);
      if (!loc) return;
      const boardId = boards[loc.boardIdx].id;
      boards = boards.map(b =>
        b.id === boardId
          ? { ...b, lists: b.lists.map(l => (l.id === listId ? { ...l, ...patch } : l)) }
          : b
      );
      notifyAllBoardTargets(boardId);
    },

    async deleteList(listId) {
      const loc = findListLocation(listId);
      if (!loc) return;
      const boardId = boards[loc.boardIdx].id;
      boards = boards.map(b =>
        b.id === boardId ? { ...b, lists: b.lists.filter(l => l.id !== listId) } : b
      );
      notifyAllBoardTargets(boardId);
    },

    async createCard(boardId, listId, input: CreateCardInput) {
      const id = `card-${Date.now()}`;
      const card: CardItemData = {
        status: 'todo',
        progress: 0,
        tags: [],
        widgets: [],
        prompt: '',
        subtasks: [],
        ...input,
        id,
        createdAt: 'Just now',
        updatedAt: 'Just now',
      };
      boards = boards.map(b =>
        b.id === boardId
          ? { ...b, lists: b.lists.map(l => (l.id === listId ? { ...l, cards: [...l.cards, card] } : l)) }
          : b
      );
      notifyAllBoardTargets(boardId);
      return id;
    },

    async updateCard(cardId, patch) {
      const loc = findCardLocation(cardId);
      if (!loc) return;
      const boardId = boards[loc.boardIdx].id;
      let patchedCard: CardItemData | null = null;
      boards = boards.map(b =>
        b.id === boardId
          ? {
              ...b,
              lists: b.lists.map(l => ({
                ...l,
                cards: l.cards.map(c => {
                  if (c.id !== cardId) return c;
                  const next = { ...c, ...patch, updatedAt: 'Just now' };
                  patchedCard = next;
                  return next;
                }),
              })),
            }
          : b
      );
      notifyAllBoardTargets(boardId);

      const touchesProgress = 'status' in patch || 'progress' in patch;
      if (touchesProgress && patchedCard && (patchedCard as CardItemData).goalId) {
        recomputeAndPersistGoalProgress((patchedCard as CardItemData).goalId as string);
      }
    },

    async moveCard(cardId, targetListId, position) {
      const loc = findCardLocation(cardId);
      if (!loc) return;
      const boardId = boards[loc.boardIdx].id;
      let movedCard: CardItemData | null = null;

      boards = boards.map(b => {
        if (b.id !== boardId) return b;

        const listsWithoutCard = b.lists.map(l => {
          const idx = l.cards.findIndex(c => c.id === cardId);
          if (idx === -1) return l;
          movedCard = l.cards[idx];
          return { ...l, cards: l.cards.filter(c => c.id !== cardId) };
        });

        if (!movedCard) return b;

        const finalLists = listsWithoutCard.map(l => {
          if (l.id !== targetListId) return l;
          const cards = [...l.cards];
          const insertAt = Math.max(0, Math.min(position, cards.length));
          cards.splice(insertAt, 0, movedCard!);
          return { ...l, cards };
        });

        return { ...b, lists: finalLists };
      });

      notifyAllBoardTargets(boardId);
    },

    async deleteCard(cardId) {
      const loc = findCardLocation(cardId);
      if (!loc) return;
      const boardId = boards[loc.boardIdx].id;
      boards = boards.map(b =>
        b.id === boardId
          ? { ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.filter(c => c.id !== cardId) })) }
          : b
      );
      notifyAllBoardTargets(boardId);
    },

    async saveGoal(goal) {
      const existingIndex = goals.findIndex(g => g.id === goal.id);
      if (existingIndex >= 0) {
        goals = [...goals.slice(0, existingIndex), goal, ...goals.slice(existingIndex + 1)];
      } else {
        goals = [goal, ...goals];
      }
      persistJson(GOALS_STORAGE_KEY, goals);
      notifyGoals();
      return goal.id;
    },

    async deleteGoal(goalId) {
      goals = goals.filter(g => g.id !== goalId);
      persistJson(GOALS_STORAGE_KEY, goals);
      notifyGoals();
    },

    async applyPlan(plan: PlanProposal, opts: ApplyPlanOptions): Promise<AppliedRefs> {
      const { boardId, goalId, now } = opts;
      const board = boards.find(b => b.id === boardId);
      if (!board) throw new Error(`applyPlan: board "${boardId}" not found`);

      let seq = 0;
      const newId = (prefix: string) => `${boardId}-plan-${prefix}-${Date.now()}-${seq++}`;

      const ctx: NormalizeContext = {
        boardId,
        goalId,
        // Memory boards don't track a numeric `position` field on ListConfig —
        // array order *is* position, so use the index.
        existingLists: board.lists.map((l, idx) => ({ id: l.id, title: l.title, position: idx })),
        now: now ?? Date.now(),
        newId,
      };

      const materialized = materializePlan(plan, ctx);

      const cardsByList = new Map<string, CardItemData[]>();
      materialized.cards.forEach(c => {
        const { boardId: _boardId, listId, position: _position, ...cardFields } = c;
        const card: CardItemData = { ...cardFields, createdAt: 'Just now', updatedAt: 'Just now' };
        const listCards = cardsByList.get(listId) ?? [];
        listCards.push(card);
        cardsByList.set(listId, listCards);
      });

      const newLists: ListConfig[] = materialized.lists.map(l => {
        const { boardId: _boardId, position: _position, ...listFields } = l;
        return { ...listFields, cards: cardsByList.get(l.id) ?? [] };
      });

      boards = boards.map(b => (b.id === boardId ? { ...b, lists: [...b.lists, ...newLists] } : b));
      notifyAllBoardTargets(boardId);

      return {
        listIds: materialized.lists.map(l => l.id),
        cardIds: materialized.cards.map(c => c.id),
      };
    },

    async saveTemplate(template) {
      templates = [template, ...templates];
      persistJson(TEMPLATES_STORAGE_KEY, templates);
      notifyTemplates();
      return template.id;
    },

    async updateTagColor(tag, colorKey) {
      const norm = tag.trim().toLowerCase();
      tagColors = { ...tagColors, [norm]: colorKey };
      persistJson(TAG_COLORS_STORAGE_KEY, tagColors);
      notifyTagColors();
    },

    async renameTag(oldTag, newTag) {
      const oldNorm = oldTag.trim().toLowerCase();
      const newNorm = newTag.trim().toLowerCase();
      if (!newNorm || oldNorm === newNorm) return;

      boards = boards.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          cards: list.cards.map(card => {
            if (!card.tags || card.tags.length === 0) return card;
            const updatedTags = card.tags.map(t => (t.trim().toLowerCase() === oldNorm ? newTag.trim() : t));
            return { ...card, tags: updatedTags };
          }),
        })),
      }));
      notifyAllBoards();
      notifyBoardSummaries();
      boards.forEach(b => notifyBoard(b.id));

      if (tagColors[oldNorm] !== undefined) {
        const next = { ...tagColors };
        next[newNorm] = next[oldNorm];
        delete next[oldNorm];
        tagColors = next;
        persistJson(TAG_COLORS_STORAGE_KEY, tagColors);
        notifyTagColors();
      }
    },

    async deleteTag(tagToDelete) {
      const norm = tagToDelete.trim().toLowerCase();
      boards = boards.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          cards: list.cards.map(card => {
            if (!card.tags || card.tags.length === 0) return card;
            const updatedTags = card.tags.filter(t => t.trim().toLowerCase() !== norm);
            return { ...card, tags: updatedTags };
          }),
        })),
      }));
      notifyAllBoards();
      notifyBoardSummaries();
      boards.forEach(b => notifyBoard(b.id));
    },

    async logActivity(entry) {
      const log: ActivityLog = { id: `act-${Date.now()}`, ...entry };
      activities = [log, ...activities];
      notifyActivity();
    },
  };
}
