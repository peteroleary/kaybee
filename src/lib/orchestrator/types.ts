import type { PlanProposal } from '../../shared/contracts/goalPlan';

/**
 * Lifecycle of a plan proposal attached to a thread message. 'pending' is the
 * only state that can still mutate the workspace; every other state is a
 * terminal record of the decision the user made, so the thread reads as a
 * history of decisions.
 */
export type ProposalState = 'pending' | 'applied' | 'refined' | 'discarded' | 'superseded';

export interface ProposalRecord {
  id: string;
  plan: PlanProposal;
  state: ProposalState;
  createdAt: string;
}

export type MessageRole = 'user' | 'assistant';

export interface OrchestratorMessage {
  id: string;
  role: MessageRole;
  text: string;
  /** Present on assistant messages that proposed a plan. Null otherwise. */
  proposal: ProposalRecord | null;
  createdAt: string;
}

export interface OrchestratorThread {
  id: string;
  title: string;
  /** Goal this thread plans against. Null until a goal is linked/created. */
  goalId: string | null;
  /** Rolling heuristic summary sent back to the model with each turn. */
  summary: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  role: MessageRole;
  text: string;
}
