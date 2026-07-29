# We3 Core Data Schemas

```typescript
// Card Schema
export interface Card {
  id: string;
  listId: string;
  title: string;
  description?: string;
  assignedAgentId?: string;
  status: 'idle' | 'eligible' | 'running' | 'completed' | 'blocked' | 'needs_approval';
  payload?: Record<string, any>;
  feedForwardContext?: Record<string, any>;
  position: number;
}

// Goal Plan Contract
export interface GoalPlan {
  id: string;
  goalPrompt: string;
  proposedSteps: Array<{
    stepId: string;
    title: string;
    targetListTitle: string;
    suggestedAgent: string;
    requiresHumanApproval: boolean;
  }>;
  status: 'draft' | 'approved' | 'executing' | 'completed';
}