import type { AgentCapabilityId } from '../../shared/agentCapabilities';
import type { ModelId } from '../../shared/models';
import type { EntityType } from '../../types';

export type ActorKind = 'agent' | 'human';

export interface AgentDoc {
  id: string;
  ownerUid: string;
  kind: ActorKind;
  /** Stable, lowercase-kebab identifier — the AI binding key used to resolve assignment hints. */
  slug: string;
  name: string;
  description: string;
  avatar?: string;
  /** Keeps CardDelegate rendering compatible (see CardItem.tsx isAgentCard). */
  entityType: EntityType;
  capabilities: AgentCapabilityId[];
  status: 'idle' | 'busy' | 'offline';
  /** Agent-only: whether this actor can run without a human kicking it off. */
  autoExecute: boolean;
  requiresApproval: boolean;
  model: ModelId;
  systemPrompt: string;
  isBuiltIn: boolean;
  lastExecutionAt: string | null;
  runCount: number;
  createdAt: string;
  updatedAt: string;
}
