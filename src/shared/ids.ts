const fallbackId = (): string => {
  const random = Math.random().toString(36).slice(2);
  const time = Date.now().toString(36);
  return `${time}${random}`;
};

export const newId = (prefix: string): string => {
  const raw = globalThis.crypto?.randomUUID?.() ?? fallbackId();
  const stripped = raw.replace(/-/g, '').slice(0, 20);
  return `${prefix}_${stripped}`;
};
