import React, { useMemo, useState } from 'react';
import { Play, Pencil } from 'lucide-react';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PlanPreview } from '../goals/PlanPreview';
import { AgentPicker } from '../agents/AgentPicker';
import { useAgents } from '../../state/AgentProvider';
import type { OrchestratorMessage, ProposalState } from '../../lib/orchestrator/types';
import type { PlanProposal } from '../../shared/contracts/goalPlan';
import type { BoardData } from '../../types';

interface ProposalCardProps {
  message: OrchestratorMessage;
  /** The goal's board if the thread's goal already owns one (dry-run matches against real lists). */
  board: BoardData | null;
  applying: boolean;
  onApply(plan: PlanProposal, andRun: boolean): void;
  onDiscard(): void;
  onRefine(): void;
}

const STATE_TONE: Record<ProposalState, BadgeTone> = {
  pending: 'accent',
  applied: 'ok',
  refined: 'neutral',
  discarded: 'neutral',
  superseded: 'warn',
};

const STATE_LABEL: Record<ProposalState, string> = {
  pending: 'Pending review',
  applied: 'Applied',
  refined: 'Refined',
  discarded: 'Discarded',
  superseded: 'Superseded',
};

function rewriteHint(plan: PlanProposal, hint: string, slug: string): PlanProposal {
  const rewrite = <T extends { assignedAgentType?: string }>(draft: T): T =>
    draft.assignedAgentType === hint ? { ...draft, assignedAgentType: slug } : draft;
  return {
    ...plan,
    newLists: plan.newLists.map(list => ({ ...list, cards: list.cards.map(rewrite) })),
    newCards: plan.newCards.map(rewrite),
  };
}

/**
 * One proposal in the thread. Pending proposals render the Phase 5
 * PlanPreview dry-run (Apply / Discard) plus the dock's two extra decisions
 * (Apply & Run, Refine) and inline pickers for hints the agent registry
 * can't resolve. Terminal proposals collapse to a labeled record so the
 * thread reads as a history of decisions.
 */
export const ProposalCard: React.FC<ProposalCardProps> = ({ message, board, applying, onApply, onDiscard, onRefine }) => {
  const { agents, resolveAssignment } = useAgents();
  const proposal = message.proposal;
  const [editedPlan, setEditedPlan] = useState<PlanProposal | null>(null);

  const plan = editedPlan ?? proposal?.plan;

  const unresolvedHints = useMemo(() => {
    if (!plan) return [];
    const hints = new Set<string>();
    const collect = (hint?: string) => {
      if (hint && resolveAssignment(hint).confidence === 'unresolved') hints.add(hint);
    };
    plan.newLists.forEach(list => list.cards.forEach(card => collect(card.assignedAgentType)));
    plan.newCards.forEach(card => collect(card.assignedAgentType));
    return Array.from(hints);
  }, [plan, resolveAssignment]);

  if (!proposal || !plan) return null;

  if (proposal.state !== 'pending') {
    const listCount = plan.newLists.length;
    const cardCount = plan.newLists.reduce((n, l) => n + l.cards.length, 0) + plan.newCards.length;
    return (
      <div className="rounded-control border border-line bg-bg-2 px-3 py-2 flex items-center gap-2 text-xs text-fg-muted">
        <Badge tone={STATE_TONE[proposal.state]}>{STATE_LABEL[proposal.state]}</Badge>
        <span className="truncate">
          +{listCount} lists, +{cardCount} cards
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PlanPreview
        plan={plan}
        board={board}
        onApply={() => onApply(plan, false)}
        onDiscard={onDiscard}
        applying={applying}
      />

      {unresolvedHints.length > 0 && (
        <div className="rounded-control border border-warn/30 bg-warn/5 p-3 space-y-2">
          <p className="text-xs text-warn font-medium">
            {unresolvedHints.length} assignment{unresolvedHints.length === 1 ? '' : 's'} the registry can't resolve —
            pick an agent or leave unassigned:
          </p>
          {unresolvedHints.map(hint => (
            <div key={hint} className="flex items-center gap-2 text-xs">
              <span className="text-fg-muted truncate max-w-32" title={hint}>
                “{hint}”
              </span>
              <AgentPicker
                agents={agents}
                assignedAgentId={null}
                onAssign={agent => {
                  if (!agent) return;
                  setEditedPlan(rewriteHint(plan, hint, agent.slug));
                }}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onApply(plan, true)} disabled={applying}>
          <Play className="w-3.5 h-3.5" />
          <span>Apply & Run</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefine} disabled={applying}>
          <Pencil className="w-3.5 h-3.5" />
          <span>Refine</span>
        </Button>
      </div>
    </div>
  );
};
