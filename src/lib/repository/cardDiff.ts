import { CardItemData } from '../../types';
import { CardPatch } from './types';

/** Fields whose change should bump `CardDoc.revision`. */
export const SEMANTIC_CARD_FIELDS: (keyof CardItemData)[] = [
  'title',
  'description',
  'prompt',
  'widgets',
  'dependsOnCardIds',
  'assignedAgentId',
];

/**
 * Fields that must never be sent as part of a patch, regardless of whether
 * they appear to differ between the hydrated original and the edited copy.
 * `createdAt`/`updatedAt` are display strings on the hydrated shape (e.g.
 * "Just now", "5m ago") — never real timestamps — and `id`/`ownerUid` are
 * identity fields the repository controls.
 */
const NEVER_PATCH_FIELDS: ReadonlySet<string> = new Set(['id', 'createdAt', 'updatedAt', 'ownerUid', 'revision']);

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

export interface CardDiffResult {
  patch: CardPatch;
  bumpRevision: boolean;
}

/**
 * Computes a whitelisted patch of only the fields that changed between a
 * hydrated card as originally loaded and the (possibly hydrated, possibly
 * user-edited) copy handed back by a component. Never includes
 * `id`/`createdAt`/`updatedAt`/`ownerUid`/`revision` — those are owned by
 * the repository.
 */
export function diffCardPatch(original: CardItemData, updated: CardItemData): CardDiffResult {
  const patch: Record<string, unknown> = {};
  let bumpRevision = false;

  (Object.keys(updated) as (keyof CardItemData)[]).forEach(key => {
    if (NEVER_PATCH_FIELDS.has(key as string)) return;

    const before = original[key];
    const after = updated[key];
    if (deepEqual(before, after)) return;

    patch[key] = after;
    if (SEMANTIC_CARD_FIELDS.includes(key)) bumpRevision = true;
  });

  return { patch: patch as CardPatch, bumpRevision };
}
