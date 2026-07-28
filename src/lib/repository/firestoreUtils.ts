export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) out[key] = obj[key];
  });
  return out as T;
}

export function chunk<T>(items: T[], size = 450): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
