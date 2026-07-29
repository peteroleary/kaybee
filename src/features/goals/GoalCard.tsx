import React, { useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown, ChevronUp, ExternalLink, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Panel } from '../../components/ui/Panel';
import { cn } from '../../lib/cn';
import { useUiState } from '../../state/UiStateProvider';
import { useWorkspace } from '../../state/WorkspaceProvider';
import type { UserGoal } from '../../types';
import { decomposeGoal } from './api';
import { PlanPreview } from './PlanPreview';

interface GoalCardProps {
  goal: UserGoal;
}

const PLAN_STATUS_TONE: Record<UserGoal['planStatus'], BadgeTone> = {
  none: 'neutral',
  proposed: 'accent',
  applied: 'ok',
  stale: 'warn',
};

const PLAN_STATUS_LABEL: Record<UserGoal['planStatus'], string> = {
  none: 'No plan yet',
  proposed: 'Plan proposed',
  applied: 'Plan applied',
  stale: 'Plan may be stale',
};

export const GoalCard: React.FC<GoalCardProps> = ({ goal }) => {
  const workspace = useWorkspace();
  const ui = useUiState();
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(goal.planStatus === 'proposed' || goal.planStatus === 'stale');

  const board = goal.boardId ? workspace.boards.find(b => b.id === goal.boardId) ?? null : null;
  const isCompleted = goal.status === 'completed';
  const hasReviewablePlan = (goal.planStatus === 'proposed' || goal.planStatus === 'stale') && !!goal.plan;

  const handleDecompose = async () => {
    setIsDecomposing(true);
    setDecomposeError(null);
    try {
      const plan = await decomposeGoal({ title: goal.title, description: goal.description, outcome: goal.outcome }, board);
      workspace.handleProposeGoalPlan(goal.id, plan);
      setPreviewOpen(true);
    } catch (err) {
      setDecomposeError(err instanceof Error ? err.message : 'Failed to decompose goal.');
    } finally {
      setIsDecomposing(false);
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await workspace.handleApplyGoalPlan(goal);
      setPreviewOpen(false);
    } finally {
      setIsApplying(false);
    }
  };

  const handleDiscard = () => {
    workspace.handleDiscardGoalPlan(goal.id);
    setPreviewOpen(false);
  };

  const handleOpenBoard = () => {
    if (!goal.boardId) return;
    workspace.setActiveBoardId(goal.boardId);
    ui.setAppMode('board');
  };

  return (
    <Panel className={cn('p-4 space-y-3', isCompleted && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cn('text-sm font-semibold text-fg', isCompleted && 'line-through')}>{goal.title}</h3>
          {goal.description && <p className="text-xs text-fg-muted mt-0.5 line-clamp-2">{goal.description}</p>}
          <div className="flex items-center gap-1.5 text-xs text-fg-faint mt-1.5">
            <Calendar className="w-3 h-3" />
            <span>Created {new Date(goal.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge tone={PLAN_STATUS_TONE[goal.planStatus]}>{PLAN_STATUS_LABEL[goal.planStatus]}</Badge>
          <IconButton aria-label={`Delete goal "${goal.title}"`} variant="danger" onClick={() => workspace.handleDeleteGoal(goal.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-fg-muted">
            Progress{goal.progressDetail ? ` — ${goal.progressDetail.completed}/${goal.progressDetail.total} cards done` : ''}
          </span>
          <span className="text-fg font-medium">{goal.progress}%</span>
        </div>
        <div className="h-1.5 bg-bg-2 rounded-full overflow-hidden">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${goal.progress}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(goal.planStatus === 'none' || goal.planStatus === 'applied') && (
          <Button variant="secondary" size="sm" onClick={handleDecompose} disabled={isDecomposing}>
            {isDecomposing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{goal.planStatus === 'applied' ? 'Propose more work' : 'Decompose with AI'}</span>
          </Button>
        )}

        {hasReviewablePlan && (
          <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(v => !v)}>
            {previewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{previewOpen ? 'Hide plan' : 'Review plan'}</span>
          </Button>
        )}

        {goal.boardId && (
          <Button variant="ghost" size="sm" onClick={handleOpenBoard}>
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open board</span>
          </Button>
        )}

        {!isCompleted && goal.progress >= 100 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => workspace.handleSaveGoal({ ...goal, status: 'completed', updatedAt: new Date().toISOString() })}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark complete</span>
          </Button>
        )}
      </div>

      {decomposeError && <p className="text-xs text-err">{decomposeError}</p>}

      {previewOpen && hasReviewablePlan && goal.plan && (
        <PlanPreview plan={goal.plan} board={board} onApply={handleApply} onDiscard={handleDiscard} applying={isApplying} />
      )}
    </Panel>
  );
};
