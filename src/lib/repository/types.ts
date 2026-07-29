import { BoardData, CardItemData, ListConfig } from '../../types';
import { BoardTemplate } from '../../data/templates';

export interface OwnedDoc {
  id: string;
  ownerUid: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BoardDoc extends OwnedDoc, Omit<BoardData, 'id' | 'lists'> {
  position: number;
}

export interface ListDoc extends OwnedDoc, Omit<ListConfig, 'id' | 'cards'> {
  boardId: string;
  position: number;
}

export interface CardDoc extends OwnedDoc, Omit<CardItemData, 'id' | 'createdAt' | 'updatedAt'> {
  boardId: string;
  listId: string;
  position: number;
}

export interface BoardSummary {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BoardData['category'];
  theme?: string;
}

export type BoardPatch = Partial<Omit<BoardDoc, keyof OwnedDoc | 'id'>>;
export type ListPatch = Partial<Omit<ListDoc, keyof OwnedDoc | 'id'>>;
export type CardPatch = Partial<Omit<CardDoc, keyof OwnedDoc | 'id' | 'revision'>>;

export interface TemplateDoc extends OwnedDoc, Omit<BoardTemplate, 'id'> {}

export interface UserProfileDoc {
  ownerUid: string;
  seededAt?: string | Date | null;
  tagColors: Record<string, string>;
}

export interface ApplyPlanOptions {
  /** The board the plan's lists/cards are written to. */
  boardId: string;
  /** Goal these lists/cards are attributed to — stamped onto each generated card. */
  goalId: string;
  /** Injectable clock for deterministic tests; defaults to Date.now(). */
  now?: number;
}

export interface AppliedRefs {
  listIds: string[];
  cardIds: string[];
}
