import React, { useMemo } from 'react';
import { CheckCircle2, ListPlus, User, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { materializePlan } from '../../shared/plan/normalize';
import type { PlanProposal } from '../../shared/contracts/goalPlan';
import type { BoardData } from '../../types';

interface PlanPreviewProps {
  plan: PlanProposal;
  /** The goal's current board, if it already owns one — used so the dry run
   *  can match cards against real existing lists via resolveTargetList
   *  instead of assuming every list is new. Pass null for a brand-new board. */
  board: BoardData | null;
  onApply: () => void;
  onDiscard: () => void;
  applying?: boolean;
}

/**
 * A pure, non-mutating dry run of `materializePlan` — the exact function
 * `applyPlan` uses for real — so the diff shown here ("+2 lists, +7 cards, 1
 * needs an agent") is guaranteed to match what Apply actually does. Nothing
 * here touches the repository.
 */
export const PlanPreview: React.FC<PlanPreviewProps> = ({ plan, board, onApply, onDiscard, applying }) => {
  const dryRun = useMemo(() => {
    let seq = 0;
    return materializePlan(plan, {
      boardId: board?.id ?? 'preview-board',
      goalId: null,
      existingLists: board ? board.lists.map((l, idx) => ({ id: l.id, title: l.title, position: idx })) : [],
      now: Date.now(),
      newId: prefix => `preview-${prefix}-${seq++}`,
    });
  }, [plan, board]);

  const cardCountByList = useMemo(() => {
    const counts = new Map<string, number>();
    dryRun.cards.forEach(c => counts.set(c.listId, (counts.get(c.listId) ?? 0) + 1));
    return counts;
  }, [dryRun.cards]);

  const needsAgentCount = dryRun.unresolvedAssignments.length;

  return (
    <div className="rounded-control border border-line bg-bg-2 p-3 space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">
          <ListPlus className="w-3 h-3" />
          <span>+{dryRun.lists.length} lists</span>
        </Badge>
        <Badge tone="accent">+{dryRun.cards.length} cards</Badge>
        {needsAgentCount > 0 && (
          <Badge tone="warn">
            <User className="w-3 h-3" />
            <span>
              {needsAgentCount} need{needsAgentCount === 1 ? 's' : ''} an agent
            </span>
          </Badge>
        )}
      </div>

      {plan.summary && <p className="text-xs text-fg-muted">{plan.summary}</p>}

      <ul className="space-y-1">
        {dryRun.lists.map(list => (
          <li key={list.id} className="flex items-center gap-2 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
            <span className="text-fg font-medium">{list.title}</span>
            <span className="text-fg-muted">({cardCountByList.get(list.id) ?? 0} cards)</span>
          </li>
        ))}
      </ul>

      {dryRun.warnings.length > 0 && (
        <ul className="space-y-1">
          {dryRun.warnings.map((w, idx) => (
            <li key={idx} className="text-xs text-warn">
              {w}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button variant="primary" size="sm" onClick={onApply} disabled={applying}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{applying ? 'Applying…' : 'Apply'}</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={onDiscard} disabled={applying}>
          <XCircle className="w-3.5 h-3.5" />
          <span>Discard</span>
        </Button>
      </div>
    </div>
  );
};
