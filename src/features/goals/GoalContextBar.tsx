import React from 'react';
import { ArrowLeft, MessageSquare, Target } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useAutonomy } from '../runs/AutonomyContext';
import { useOrchestrator } from '../orchestrator/OrchestratorProvider';
import { useUiState } from '../../state/UiStateProvider';
import { ShareControl } from '../share/ShareControl';
import type { UserGoal } from '../../types';

/**
 * Goal context bar — rendered between the board toolbar and the canvas
 * whenever the board being viewed belongs to a goal (goal.boardId). This is
 * what makes a board a *view of a goal* rather than the shell: the goal's
 * progress, its live run state, and its orchestrator thread sit one click
 * above the cards. Derived entirely from existing subscriptions — no state
 * of its own.
 */
export function GoalContextBar({ goal }: { goal: UserGoal }) {
  const autonomy = useAutonomy();
  const orchestrator = useOrchestrator();
  const ui = useUiState();

  const goalRuns = autonomy.runs.filter(r => r.goalId === goal.id);
  const running = goalRuns.filter(r => r.status === 'running' || r.status === 'queued').length;
  const failed = goalRuns.filter(r => r.status === 'error').length;

  const openThread = () => {
    const thread = orchestrator.threads.find(t => t.goalId === goal.id);
    if (thread) orchestrator.selectThread(thread.id);
    ui.setDockOpen(true);
  };

  return (
    <div className="shrink-0 px-3 py-2 border-b border-line bg-bg-1 flex items-center gap-3 text-xs">
      <button
        onClick={() => ui.setAppMode('home')}
        className="flex items-center gap-1 text-fg-faint hover:text-fg transition-colors shrink-0"
        title="Back to goals"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Goals</span>
      </button>

      <div className="flex items-center gap-2 min-w-0">
        <Target className="w-3.5 h-3.5 text-accent-hi shrink-0" />
        <span className="font-semibold text-fg truncate">{goal.title}</span>
      </div>

      <div className="flex items-center gap-2 shrink-0" title={`Goal progress — ${goal.progress}%`}>
        <div className="w-24 h-1.5 rounded-full bg-bg-3 overflow-hidden">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="text-fg-muted font-medium">{goal.progress}%</span>
      </div>

      <span className="text-fg-faint shrink-0">
        {running > 0 && <span className="text-ok">{running} running · </span>}
        {failed > 0 && <span className="text-err">{failed} failed · </span>}
        {goalRuns.length} run{goalRuns.length === 1 ? '' : 's'}
      </span>

      <div className="flex-1" />

      <ShareControl goal={goal} />

      <Button variant="ghost" size="sm" onClick={openThread} title="Open this goal's orchestrator thread">
        <MessageSquare className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Thread</span>
      </Button>
    </div>
  );
}
