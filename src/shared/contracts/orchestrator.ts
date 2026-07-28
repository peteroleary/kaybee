import { z } from 'zod';
import { AGENT_CAPABILITY_IDS } from '../agentCapabilities';
import { PlanProposalSchema } from './goalPlan';

export const OrchestratorResponseSchema = z.object({
  summary: z.string(),
  proposal: PlanProposalSchema,
});

export type OrchestratorResponse = z.infer<typeof OrchestratorResponseSchema>;

export function describePlanSchemaForPrompt(): string {
  const capabilities = AGENT_CAPABILITY_IDS.join(' | ');
  return `Return valid JSON matching this schema:
{
  "summary": "Short explanation of the plan",
  "proposal": {
    "summary": "string",
    "newLists": [
      {
        "title": "string",
        "listType": "kanban" | "chat_feed" | "homogenous" | "heterogeneous" | "pipeline",
        "homogenousType": "humans_only" | "agents_only" | "none",
        "color": "string (e.g. indigo, purple, emerald, amber, rose, cyan)",
        "icon": "string (lucide-react icon name)",
        "autoRunAgents": boolean,
        "cards": [
          {
            "key": "string (unique within this response, used for dependsOn references)",
            "title": "string",
            "description": "string",
            "entityType": "task" | "human" | "agent" | "routine" | "human_team" | "agent_swarm" | "troop",
            "priority": "low" | "medium" | "high" | "urgent",
            "tags": ["string"],
            "prompt": "string (optional)",
            "assignedAgentType": "string (optional)",
            "dependsOn": ["string (keys of other cards in this response)"]
          }
        ]
      }
    ],
    "newCards": [
      {
        "targetListTitle": "string (title of an existing or newly created list)",
        "key": "string",
        "title": "string",
        "description": "string",
        "entityType": "task" | "human" | "agent" | "routine" | "human_team" | "agent_swarm" | "troop",
        "priority": "low" | "medium" | "high" | "urgent",
        "tags": ["string"],
        "prompt": "string (optional)",
        "assignedAgentType": "string (optional)",
        "dependsOn": ["string"]
      }
    ],
    "suggestedAgents": [${capabilities}],
    "notes": ["string"]
  }
}`;
}
