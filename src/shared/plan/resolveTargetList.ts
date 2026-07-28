export type TargetListResolution =
  | { kind: 'existing'; listId: string }
  | { kind: 'create'; title: string };

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value: string): Set<string> =>
  new Set(normalize(value).split(' ').filter(Boolean));

const tokenOverlap = (a: Set<string>, b: Set<string>): number => {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
};

export function resolveTargetList(
  title: string | undefined,
  lists: Array<{ id: string; title: string }>,
): TargetListResolution {
  const trimmed = (title ?? '').trim();

  if (!trimmed) {
    return { kind: 'create', title: 'Inbox' };
  }

  const exactMatch = lists.find((l) => l.title.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) {
    return { kind: 'existing', listId: exactMatch.id };
  }

  const normalizedTitle = normalize(trimmed);
  const normalizedMatch = lists.find((l) => normalize(l.title) === normalizedTitle);
  if (normalizedMatch) {
    return { kind: 'existing', listId: normalizedMatch.id };
  }

  const targetTokens = tokenize(trimmed);
  let bestMatch: { id: string; score: number } | null = null;
  for (const list of lists) {
    const score = tokenOverlap(targetTokens, tokenize(list.title));
    if (score >= 0.6 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: list.id, score };
    }
  }
  if (bestMatch) {
    return { kind: 'existing', listId: bestMatch.id };
  }

  return { kind: 'create', title: trimmed };
}
