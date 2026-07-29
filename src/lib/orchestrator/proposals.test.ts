import { describe, expect, it } from 'vitest';
import { findSupersededByNewProposal, nextProposalState, type ProposalAction } from './proposals';
import type { OrchestratorMessage, ProposalState } from './types';
import { PlanProposalSchema, type PlanProposal } from '../../shared/contracts/goalPlan';

const emptyPlan: PlanProposal = PlanProposalSchema.parse({});

function makeMessage(id: string, state: ProposalState | null): OrchestratorMessage {
  return {
    id,
    role: 'assistant',
    text: '',
    proposal: state
      ? { id: `prop-${id}`, plan: emptyPlan, state, createdAt: new Date().toISOString() }
      : null,
    createdAt: new Date().toISOString(),
  };
}

describe('nextProposalState', () => {
  it.each([
    ['apply', 'applied'],
    ['refine', 'refined'],
    ['discard', 'discarded'],
    ['supersede', 'superseded'],
  ] as Array<[ProposalAction, ProposalState]>)('pending + %s -> %s', (action, expected) => {
    expect(nextProposalState('pending', action)).toBe(expected);
  });

  it.each(['applied', 'refined', 'discarded', 'superseded'] as ProposalState[])(
    'terminal state %s rejects every action',
    state => {
      for (const action of ['apply', 'refine', 'discard', 'supersede'] as ProposalAction[]) {
        expect(() => nextProposalState(state, action)).toThrow(`cannot ${action} a ${state} proposal`);
      }
    }
  );
});

describe('findSupersededByNewProposal', () => {
  it('returns only messages whose proposal is still pending', () => {
    const messages = [
      makeMessage('m1', 'applied'),
      makeMessage('m2', 'pending'),
      makeMessage('m3', null),
      makeMessage('m4', 'discarded'),
      makeMessage('m5', 'pending'),
    ];

    expect(findSupersededByNewProposal(messages).messageIds).toEqual(['m2', 'm5']);
  });

  it('returns nothing when no proposal is pending', () => {
    const messages = [makeMessage('m1', 'superseded'), makeMessage('m2', null)];
    expect(findSupersededByNewProposal(messages).messageIds).toEqual([]);
  });
});
