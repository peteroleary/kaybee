import type { z } from "zod";

const RAW_TRUNCATE_LENGTH = 2000;

export class ModelResponseError extends Error {
  constructor(
    public context: string,
    public issues: unknown,
    public raw: string
  ) {
    super(`Model response validation failed for ${context}`);
    this.name = "ModelResponseError";
  }
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    return fenced[1].trim();
  }
  return trimmed;
}

function truncate(raw: string): string {
  if (raw.length <= RAW_TRUNCATE_LENGTH) return raw;
  return `${raw.slice(0, RAW_TRUNCATE_LENGTH)}... [truncated ${raw.length - RAW_TRUNCATE_LENGTH} chars]`;
}

/**
 * Parses a raw model response string as JSON and validates it against a Zod schema.
 * Strips ```json fences if present. Throws ModelResponseError on parse or validation
 * failure, carrying the raw text (truncated) for server-side logging.
 */
export function parseModelJson<T>(raw: string | undefined, schema: z.ZodType<T>, ctx: string): T {
  const rawText = raw ?? "";
  const cleaned = stripJsonFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned || "{}");
  } catch (err) {
    throw new ModelResponseError(ctx, { parseError: err instanceof Error ? err.message : String(err) }, truncate(rawText));
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new ModelResponseError(ctx, result.error.issues, truncate(rawText));
  }

  return result.data;
}
