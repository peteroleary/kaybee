import React, { useState } from 'react';
import { Plus, Sparkles, Target } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Field, fieldControlClasses } from '../../components/ui/Field';
import { Panel } from '../../components/ui/Panel';
import { cn } from '../../lib/cn';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { useOrchestrator } from '../orchestrator/OrchestratorProvider';
import type { UserGoal } from '../../types';
import { AttentionQueue } from './AttentionQueue';
import { GoalCard } from './GoalCard';

/**
 * Goal-first landing surface. Shown as the App.tsx "Section 2" content
 * whenever UiStateProvider's appMode is 'home' — either because the user has
 * zero goals (see App.tsx's one-time default) or they clicked the Navbar's
 * Goals button. Replaces the old GoalCanvasModal.
 */
export function GoalHome() {
  const workspace = useWorkspace();
  const orchestrator = useOrchestrator();
  const { goals } = workspace;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('');

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');

  const handleCreateGoal = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const now = new Date().toISOString();
    const goal: UserGoal = {
      id: `goal-${Date.now()}`,
      title: trimmedTitle,
      description: description.trim(),
      outcome: outcome.trim() || `Successfully complete: ${trimmedTitle}`,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      boardIds: [],
      boardId: null,
      planStatus: 'none',
      plan: null,
      appliedRefs: null,
      agentIds: [],
      progress: 0,
      progressDetail: null,
    };

    workspace.handleSaveGoal(goal);
    // Goal-first flow: open an orchestrator thread linked to this goal and
    // ask for a plan immediately — the proposal waits in the dock for review;
    // nothing lands on a board until the user applies it there.
    orchestrator
      .startGoalThread(goal)
      .catch(err => console.error('Failed to start orchestrator thread for goal:', err));
    setTitle('');
    setDescription('');
    setOutcome('');
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-0">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2 text-accent-hi">
            <Target className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Goal-Oriented Workspace</span>
          </div>
          <h1 className="text-xl font-semibold text-fg">What are you trying to accomplish?</h1>
          <p className="text-sm text-fg-muted">
            Describe a goal in plain language. AI proposes a plan of lists and cards for review — nothing lands on a
            board until you apply it.
          </p>
        </header>

        <Panel className="p-5 space-y-4">
          <Field label="Goal title" htmlFor="goal-home-title">
            <input
              id="goal-home-title"
              className={fieldControlClasses}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) handleCreateGoal();
              }}
              placeholder="e.g., Launch Mobile App v2.0"
            />
          </Field>

          <Field label="Description" htmlFor="goal-home-description">
            <textarea
              id="goal-home-description"
              className={cn(fieldControlClasses, 'resize-none')}
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What needs to be accomplished?"
            />
          </Field>

          <Field label="Success outcome (optional)" htmlFor="goal-home-outcome">
            <input
              id="goal-home-outcome"
              className={fieldControlClasses}
              value={outcome}
              onChange={e => setOutcome(e.target.value)}
              placeholder="e.g., App deployed to App Store with 4.5+ rating"
            />
          </Field>

          <Button variant="primary" onClick={handleCreateGoal} disabled={!title.trim()}>
            <Plus className="w-4 h-4" />
            <span>Create Goal</span>
          </Button>
        </Panel>

        <AttentionQueue />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent-hi" />
            <span>Active Goals</span>
          </h2>          {activeGoals.length === 0 ? (
            <Panel className="p-6 text-center text-sm text-fg-muted">No active goals yet. Create one above to get started.</Panel>
          ) : (
            <div className="space-y-3">
              {activeGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          )}
        </section>

        {completedGoals.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-fg-muted">Completed Goals</h2>
            <div className="space-y-2">
              {completedGoals.map(goal => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
