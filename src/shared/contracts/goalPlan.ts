import { z } from 'zod';
import { AGENT_CAPABILITY_IDS } from '../agentCapabilities';

export const EntityTypeSchema = z.enum([
  'task',
  'human',
  'agent',
  'routine',
  'human_team',
  'agent_swarm',
  'troop',
]);

export const ListTypeSchema = z.enum([
  'kanban',
  'chat_feed',
  'homogenous',
  'heterogeneous',
  'pipeline',
]);

export const HomogenousTypeSchema = z.enum(['humans_only', 'agents_only', 'none']);

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const CardDraftSchema = z.object({
  key: z.string().default(''),
  title: z.string().min(1),
  description: z.string().default(''),
  entityType: EntityTypeSchema.default('task'),
  priority: PrioritySchema.default('medium'),
  tags: z.array(z.string()).default([]),
  prompt: z.string().optional(),
  assignedAgentType: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
});

export type CardDraft = z.infer<typeof CardDraftSchema>;

export const ListDraftSchema = z.object({
  title: z.string().min(1),
  listType: ListTypeSchema.default('kanban'),
  homogenousType: HomogenousTypeSchema.default('none'),
  color: z.string().default('indigo'),
  icon: z.string().default('Sparkles'),
  autoRunAgents: z.boolean().default(false),
  cards: z.array(CardDraftSchema).default([]),
});

export type ListDraft = z.infer<typeof ListDraftSchema>;

export const PlanCardDraftSchema = CardDraftSchema.extend({
  targetListTitle: z.string().default(''),
});

export type PlanCardDraft = z.infer<typeof PlanCardDraftSchema>;

export const AgentCapabilityIdSchema = z.enum(
  AGENT_CAPABILITY_IDS as [string, ...string[]],
);

export const PlanProposalSchema = z.object({
  summary: z.string().default(''),
  newLists: z.array(ListDraftSchema).default([]),
  newCards: z.array(PlanCardDraftSchema).default([]),
  suggestedAgents: z.array(AgentCapabilityIdSchema).default([]),
  notes: z.array(z.string()).default([]),
});

export type PlanProposal = z.infer<typeof PlanProposalSchema>;
