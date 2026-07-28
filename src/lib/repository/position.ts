export const POSITION_GAP = 1024;
export const MIN_GAP = 1;

export function positionAtIndex(index: number): number {
  return (index + 1) * POSITION_GAP;
}

export function initialPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => positionAtIndex(i));
}

export function midpointPosition(before: number | null, after: number | null): number {
  if (before == null && after == null) return POSITION_GAP;
  if (before == null) return after! / 2;
  if (after == null) return before + POSITION_GAP;
  return (before + after) / 2;
}

export function needsRenormalization(before: number | null, after: number | null): boolean {
  if (before == null || after == null) return false;
  return after - before < MIN_GAP * 2;
}

export function renormalizePositions(count: number): number[] {
  return initialPositions(count);
}

export interface InsertPlan {
  position: number;
  renormalizedPositions: number[] | null;
}

/**
 * Computes the position to insert a new item at `index` (0-based) into a
 * list whose current items have `sortedPositions` (ascending). If the
 * neighboring gap has collapsed below MIN_GAP*2, returns a full
 * `renormalizedPositions` array (evenly spaced) that the caller must write
 * back to the existing items before/along with the insert.
 */
export function planInsert(sortedPositions: number[], index: number): InsertPlan {
  const clamped = Math.max(0, Math.min(index, sortedPositions.length));
  const before = clamped > 0 ? sortedPositions[clamped - 1] : null;
  const after = clamped < sortedPositions.length ? sortedPositions[clamped] : null;

  if (needsRenormalization(before, after)) {
    const renormalizedPositions = renormalizePositions(sortedPositions.length);
    const newBefore = clamped > 0 ? renormalizedPositions[clamped - 1] : null;
    const newAfter = clamped < renormalizedPositions.length ? renormalizedPositions[clamped] : null;
    return { position: midpointPosition(newBefore, newAfter), renormalizedPositions };
  }

  return { position: midpointPosition(before, after), renormalizedPositions: null };
}
