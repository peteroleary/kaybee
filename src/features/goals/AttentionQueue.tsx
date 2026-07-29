import React from 'react';
import { AlertTriangle, Ban, FileText, PauseCircle, Play, XCircle } from 'lucide-react';
import { Panel } from '../../components/ui/Panel';
import { Button } from '../../components/ui/Button';
import { useAutonomy } from '../runs/AutonomyContext';
import { useWorkspace } from '../../state/WorkspaceProvider';
import { useUiState } from '../../state/UiStateProvider';

interface AttentionItem {
  key: string;
  icon: React.ReactNode;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * "What needs me right now" — the home-surface answer to agents finishing
 * goals. Aggregates only already-subscribed state (autonomy policy, runs,
 * blocked cards, goals) so it adds no new listeners: global pause, goals
 * awaiting first-run approval, failed runs, blocked cards, and plans
 * proposed but never reviewed. Renders nothing when nothing needs attention.
 */
export function AttentionQueue() {
  const autonomy = useAutonomy();
  const workspace = useWorkspace();
  const ui = useUiState();

  const items: AttentionItem[] = [];

  if (autonomy.available && !autonomy.policy.enabled && workspace.goals.some(g => g.status === 'active')) {
    items.push({
      key: 'paused',
      icon: <PauseCircle className="w-4 h-4 text-warn" />,
      text: 'Agents are paused globally — no cards will run until resumed.',
      actionLabel: 'Resume agents',
      onAction: () => void autonomy.setAutonomyEnabled(true),
    });
  }

  const awaitingApproval = workspace.goals.filter(
    g => g.status === 'active' && g.planStatus === 'applied' && g.autonomy?.enabled !== true
  );
  if (autonomy.available && autonomy.policy.requireApprovalForFirstRunOfGoal) {
    for (const goal of awaitingApproval) {
      items.push({
        key: `approve-${goal.id}`,
        icon: <Play className="w-4 h-4 text-accent-hi" />,
        text: `"${goal.title}" has an applied plan but agents haven't been approved to run it.`,
        actionLabel: 'Approve runs',
        onAction: () =>
          workspace.handleSaveGoal({ ...goal, autonomy: { enabled: true }, updatedAt: new Date().toISOString() }),
      });
    }
  }

  const failedRuns = autonomy.runs.filter(r => r.status === 'error');
  for (const run of failedRuns.slice(0, 3)) {
    items.push({
      key: `failed-${run.id}`,
      icon: <XCircle className="w-4 h-4 text-err" />,
      text: `Run failed on "${run.cardTitle}"${run.error ? `: ${run.error.message}` : '.'}`,
      actionLabel: 'Open board',
      onAction: () => {
        workspace.setActiveBoardId(run.boardId);
        ui.setAppMode('board');
      },
    });
  }

  if (autonomy.blocked.length > 0) {
    const byReason = new Map<string, number>();
    for (const b of autonomy.blocked) {
      const reason = b.reason.replace(/_/g, ' ');
      byReason.set(reason, (byReason.get(reason) ?? 0) + 1);
    }
    items.push({
      key: 'blocked',
      icon: <Ban className="w-4 h-4 text-fg-muted" />,
      text: `${autonomy.blocked.length} card${autonomy.blocked.length === 1 ? '' : 's'} not runnable — ${Array.from(
        byReason.entries()
      )
        .map(([reason, count]) => `${count}× ${reason}`)
        .join(', ')}.`,
    });
  }

  for (const goal of workspace.goals.filter(g => g.status === 'active' && g.planStatus === 'proposed')) {
    items.push({
      key: `proposed-${goal.id}`,
      icon: <FileText className="w-4 h-4 text-accent-hi" />,
      text: `A plan for "${goal.title}" is waiting for your review.`,
    });
  }

  if (items.length === 0) return null;

  return (
    <Panel className="p-4 space-y-2.5">
      <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warn" />
        <span>Needs your attention</span>
      </h2>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item.key} className="flex items-center gap-2.5 text-sm text-fg-muted">
            <span className="shrink-0">{item.icon}</span>
            <span className="flex-1 min-w-0">{item.text}</span>
            {item.actionLabel && item.onAction && (
              <Button variant="secondary" size="sm" onClick={item.onAction}>
                {item.actionLabel}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
