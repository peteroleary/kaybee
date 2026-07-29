import type { OrchestratorMessage, ProposalState } from './types';

export type ProposalAction = 'apply' | 'refine' | 'discard' | 'supersede';

const TRANSITIONS: Record<ProposalState, Partial<Record<ProposalAction, ProposalState>>> = {
  pending: {
    apply: 'applied',
    refine: 'refined',
    discard: 'discarded',
    supersede: 'superseded',
  },
  applied: {},
  refined: {},
  discarded: {},
  superseded: {},
};

/**
 * The proposal state machine. Only 'pending' proposals can transition; every
 * other state is terminal. Illegal transitions throw rather than silently
 * no-op, because a proposal that was already applied must never be
 * re-applied by a stale click.
 */
export function nextProposalState(state: ProposalState, action: ProposalAction): ProposalState {
  const next = TRANSITIONS[state][action];
  if (!next) {
    throw new Error(`Illegal proposal transition: cannot ${action} a ${state} proposal`);
  }
  return next;
}

export interface SupersedeResult {
  /** Ids of messages whose pending proposal must be marked superseded. */
  messageIds: string[];
}

/**
 * When a new pending proposal lands in a thread, every earlier pending
 * proposal in that thread is superseded — the thread reads as a history of
 * decisions, and only the newest plan remains applicable.
 */
export function findSupersededByNewProposal(messages: OrchestratorMessage[]): SupersedeResult {
  return {
    messageIds: messages.filter(m => m.proposal?.state === 'pending').map(m => m.id),
  };
}
