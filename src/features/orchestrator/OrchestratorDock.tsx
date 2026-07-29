import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, MessageSquarePlus, PanelRightClose, PanelRightOpen, Sparkles } from 'lucide-react';
import { IconButton } from '../../components/ui/IconButton';
import { fieldControlClasses } from '../../components/ui/Field';
import { cn } from '../../lib/cn';
import { useUiState } from '../../state/UiStateProvider';
import { useWorkspace } from '../../state/WorkspaceProvider';
import type { OrchestratorMessage } from '../../lib/orchestrator/types';
import { Composer } from './Composer';
import { ProposalCard } from './ProposalCard';
import { useOrchestrator } from './OrchestratorProvider';

/**
 * Orchestrator dock — the right rail that replaces OrchestratorModal. A
 * persistent, multi-turn conversation (threads/ + messages/ via the thread
 * store) where every AI response lands as a pending PlanProposal and nothing
 * mutates the workspace until the user applies it. Collapsed (48px) ↔
 * expanded (400px); lives at the App level so it survives board switches.
 */
export const OrchestratorDock: React.FC = () => {
  const ui = useUiState();
  const workspace = useWorkspace();
  const orch = useOrchestrator();

  const [prompt, setPrompt] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [orch.messages.length, orch.sending]);

  if (!ui.dockOpen) {
    return (
      <div className="w-12 shrink-0 border-l border-line bg-bg-1 flex flex-col items-center py-2 gap-1">
        <IconButton aria-label="Expand Orchestrator dock" title="Orchestrator" onClick={ui.toggleDock}>
          <Sparkles className="w-4 h-4 text-accent-hi" />
        </IconButton>
      </div>
    );
  }

  const goalBoard = orch.activeThread?.goalId
    ? (() => {
        const goal = workspace.goals.find(g => g.id === orch.activeThread?.goalId);
        return goal?.boardId ? workspace.boards.find(b => b.id === goal.boardId) ?? null : null;
      })()
    : null;

  const handleSend = () => {
    const text = prompt;
    setPrompt('');
    orch.send(text);
  };

  const handleRefine = (message: OrchestratorMessage) => {
    orch.refineProposal(message);
    setPrompt('Refine the plan above: ');
  };

  const activeGoals = workspace.goals.filter(g => g.status === 'active');

  return (
    <aside className="w-100 shrink-0 border-l border-line bg-bg-1 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-line shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-hi" />
          <span className="text-sm font-semibold text-fg">Orchestrator</span>
        </div>
        <IconButton aria-label="Collapse Orchestrator dock" title="Collapse" onClick={ui.toggleDock}>
          <PanelRightClose className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Thread selector */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line shrink-0">
        <select
          value={orch.activeThread?.id ?? ''}
          onChange={e => {
            if (e.target.value) orch.selectThread(e.target.value);
            else orch.createThread();
          }}
          className={cn(fieldControlClasses, 'py-1.5 text-xs')}
          title="Conversation thread"
        >
          <option value="">New conversation…</option>
          {orch.threads.map(thread => (
            <option key={thread.id} value={thread.id}>
              {thread.title}
            </option>
          ))}
        </select>
        <IconButton aria-label="Start new conversation" title="New conversation" onClick={orch.createThread}>
          <MessageSquarePlus className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Goal link */}
      {orch.activeThread && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-line shrink-0">
          <span className="text-xs text-fg-muted shrink-0">Goal:</span>
          <select
            value={orch.activeThread.goalId ?? ''}
            onChange={e => orch.setThreadGoal(e.target.value || null)}
            className={cn(fieldControlClasses, 'py-1.5 text-xs')}
            title="Goal this thread plans against (created on first apply if unset)"
          >
            <option value="">Create on apply</option>
            {activeGoals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-3">
        {orch.messages.length === 0 && (
          <div className="text-xs text-fg-muted space-y-2 pt-4">
            <p className="flex items-center gap-1.5 text-fg">
              <PanelRightOpen className="w-3.5 h-3.5 text-accent-hi" />
              <span className="font-medium">What are you trying to accomplish?</span>
            </p>
            <p>
              Describe a goal or a board change. The Orchestrator proposes a plan — nothing lands on a board until
              you review and apply it.
            </p>
          </div>
        )}

        {orch.messages.map(message => (
          <div key={message.id} className={cn('space-y-2', message.role === 'user' && 'flex justify-end')}>
            {message.role === 'user' ? (
              <div className="max-w-[85%] rounded-surface bg-accent/15 border border-accent/30 px-3 py-2 text-sm text-fg">
                {message.text}
              </div>
            ) : (
              <div className="space-y-2">
                {message.text && <p className="text-xs text-fg-muted leading-relaxed">{message.text}</p>}
                {message.proposal && (
                  <ProposalCard
                    message={message}
                    board={goalBoard}
                    applying={orch.applying}
                    onApply={(plan, andRun) => orch.applyProposal(message, plan, andRun)}
                    onDiscard={() => orch.discardProposal(message)}
                    onRefine={() => handleRefine(message)}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        {orch.sending && <p className="text-xs text-fg-faint">Orchestrator is thinking…</p>}
      </div>

      {orch.error && (
        <div className="mx-3 mb-2 p-2.5 rounded-control bg-err/10 border border-err/30 text-err text-xs flex items-center gap-2 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{orch.error}</span>
        </div>
      )}

      {/* Composer */}
      <div className="px-3 pb-3 shrink-0">
        <Composer value={prompt} onChange={setPrompt} onSend={handleSend} sending={orch.sending} />
      </div>
    </aside>
  );
};
