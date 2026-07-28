import { z } from 'zod';
import type { InteractiveWidget } from '../../types';

export const AgentRunRequestSchema = z.object({
  runId: z.string().min(1),
  cardId: z.string().min(1),
  agentId: z.string().nullable().default(null),
  cardTitle: z.string().min(1).max(300),
  cardDescription: z.string().max(5_000).default(''),
  prompt: z.string().max(20_000).default(''),
  systemPrompt: z.string().max(8_000).optional(),
  model: z.string().optional(),
  widgets: z.array(z.any()).max(50).default([]),
  upstream: z
    .array(
      z.object({
        cardId: z.string(),
        title: z.string(),
        output: z.string().max(20_000),
      }),
    )
    .max(10)
    .default([]),
  goal: z
    .object({ title: z.string(), outcome: z.string() })
    .nullable()
    .default(null),
});

export type AgentRunRequest = z.infer<typeof AgentRunRequestSchema>;

export type RunErrorCode =
  | 'invalid_input'
  | 'provider_error'
  | 'timeout'
  | 'rate_limited'
  | 'budget_exhausted'
  | 'internal'
  | 'aborted';

export interface RunErrorInfo {
  code: RunErrorCode;
  message: string;
  retryable: boolean;
}

export type AgentRunApiResponse =
  | {
      ok: true;
      output: string;
      suggestedProgress: number | null;
      updatedWidgets: InteractiveWidget[];
      usage: { model: string; estimatedTokens: number };
    }
  | { ok: false; error: RunErrorInfo };
