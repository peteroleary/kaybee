import { BoardTemplate } from '../../data/templates';
import { PlanProposal } from '../../shared/contracts/goalPlan';
import {
  ActivityLog,
  BoardData,
  CardItemData,
  ListConfig,
  UserGoal,
} from '../../types';
import { ApplyPlanOptions, AppliedRefs, BoardPatch, BoardSummary, CardPatch, ListPatch } from './types';

export type Unsubscribe = () => void;

export interface CreateBoardInput {
  name: string;
  category: BoardData['category'];
  description?: string;
  icon?: string;
  rbacRole?: BoardData['rbacRole'];
  lists?: ListConfig[];
}

export interface CreateListInput extends Partial<Omit<ListConfig, 'id' | 'cards'>> {
  title: string;
  listType: ListConfig['listType'];
  homogenousType: ListConfig['homogenousType'];
  color: string;
  icon: string;
  autoRunAgents: boolean;
  rbacRole: ListConfig['rbacRole'];
  cards?: CardItemData[];
}

export interface CreateCardInput extends Partial<Omit<CardItemData, 'id' | 'createdAt' | 'updatedAt'>> {
  title: string;
  description: string;
  entityType: CardItemData['entityType'];
  rbacRole: CardItemData['rbacRole'];
  priority: CardItemData['priority'];
}

export interface WorkspaceRepository {
  readonly kind: 'memory' | 'firestore';

  /** Full BoardData (with lists + cards) for every board owned by this user. */
  subscribeAllBoards(cb: (boards: BoardData[]) => void): Unsubscribe;
  subscribeBoardSummaries(cb: (b: BoardSummary[]) => void): Unsubscribe;
  subscribeBoard(boardId: string, cb: (b: BoardData | null) => void): Unsubscribe;
  subscribeGoals(cb: (g: UserGoal[]) => void): Unsubscribe;
  subscribeActivity(limit: number, cb: (a: ActivityLog[]) => void): Unsubscribe;
  subscribeTemplates(cb: (t: BoardTemplate[]) => void): Unsubscribe;
  subscribeTagColors(cb: (colors: Record<string, string>) => void): Unsubscribe;

  createBoard(input: CreateBoardInput): Promise<string>;
  updateBoard(boardId: string, patch: BoardPatch): Promise<void>;
  deleteBoard(boardId: string): Promise<void>;

  createList(boardId: string, input: CreateListInput, at?: 'start' | 'end'): Promise<string>;
  updateList(listId: string, patch: ListPatch): Promise<void>;
  deleteList(listId: string): Promise<void>;

  createCard(boardId: string, listId: string, input: CreateCardInput): Promise<string>;
  updateCard(cardId: string, patch: CardPatch): Promise<void>;
  /** `position` is a 0-based insertion index within the target list's card order, not a raw storage position. */
  moveCard(cardId: string, targetListId: string, position: number): Promise<void>;
  deleteCard(cardId: string): Promise<void>;

  saveGoal(goal: UserGoal): Promise<string>;
  deleteGoal(goalId: string): Promise<void>;
  /**
   * Materializes a persisted PlanProposal (via shared/plan/normalize's
   * materializePlan) into real lists/cards on `opts.boardId`, writing them in
   * as few batches as Firestore's 500-op batch cap allows. Pure creation —
   * never mutates existing lists/cards, and never touches the goal doc
   * itself (callers are responsible for persisting planStatus/appliedRefs —
   * see src/lib/goals/applyPlan.ts).
   */
  applyPlan(plan: PlanProposal, opts: ApplyPlanOptions): Promise<AppliedRefs>;

  saveTemplate(template: BoardTemplate): Promise<string>;
  updateTagColor(tag: string, colorKey: string): Promise<void>;
  /** Bulk-renames a tag across every card owned by this user, on every board. */
  renameTag(oldTag: string, newTag: string): Promise<void>;
  /** Bulk-removes a tag from every card owned by this user, on every board. */
  deleteTag(tag: string): Promise<void>;

  logActivity(entry: Omit<ActivityLog, 'id'>): Promise<void>;
}
