import React from 'react';
import { Pause, Play, X } from 'lucide-react';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { AgentRun, RunStatus } from '../../lib/autonomy/types';
import { useAutonomy } from './AutonomyContext';

interface RunConsoleDrawerProps {
  open: boolean;
  onClose(): void;
}

const STATUS_TONE: Record<RunStatus, BadgeTone> = {
  queued: 'neutral',
  running: 'accent',
  success: 'ok',
  error: 'err',
  cancelled: 'neutral',
  interrupted: 'warn',
};

function formatTime(epochMs: number | null): string {
  if (!epochMs) return '—';
  return new Date(epochMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const RunRow: React.FC<{ run: AgentRun; onCancel(runId: string): void }> = ({ run, onCancel }) => {
  const cancellable = run.status === 'queued' || run.status === 'running';
  return (
    <div className="px-4 py-2.5 border-b border-line flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-fg font-medium truncate">{run.cardTitle}</span>
        <Badge tone={STATUS_TONE[run.status]}>{run.status}</Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-fg-faint font-mono">
        <span>
          attempt {run.attempt} · {run.trigger} · {formatTime(run.startedAt ?? run.queuedAt)}
        </span>
        {cancellable && (
          <button onClick={() => onCancel(run.id)} className="text-fg-muted hover:text-err transition-colors">
            Cancel
          </button>
        )}
      </div>
      {run.error && <div className="text-xs text-err leading-snug">{run.error.message}</div>}
    </div>
  );
};

/** Run console: recent runs, budget, blocked cards ("why isn't this
 *  running?"), and the global Pause All / Resume kill switch. */
export const RunConsoleDrawer: React.FC<RunConsoleDrawerProps> = ({ open, onClose }) => {
  const autonomy = useAutonomy();
  if (!open) return null;

  const { policy, runs, runningCount, queuedCount, blocked, isLeader } = autonomy;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 w-[380px] max-w-full bg-bg-1 border-l border-line z-50 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-base font-semibold text-fg">Run console</h2>
          <IconButton aria-label="Close run console" onClick={onClose}>
            <X className="w-4 h-4" />
          </IconButton>
        </div>

        <div className="px-4 py-3 border-b border-line flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-fg-muted">
              {runningCount} running · {queuedCount} queued · budget {policy.budget.runsUsed}/
              {policy.budget.maxRunsTotal}
            </div>
            {policy.enabled ? (
              <Button size="sm" variant="secondary" onClick={() => autonomy.setAutonomyEnabled(false)}>
                <Pause className="w-3.5 h-3.5" />
                Pause All
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => autonomy.setAutonomyEnabled(true)}>
                <Play className="w-3.5 h-3.5" />
                Resume
              </Button>
            )}
          </div>
          <p className="text-xs text-fg-faint leading-snug">
            Agents run while KayBee is open{isLeader ? '' : ' (another tab is currently driving)'}.
            Pausing stops autonomous runs in every tab.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {blocked.length > 0 && (
            <div className="px-4 py-2 border-b border-line">
              <div className="text-xs font-semibold text-fg-muted mb-1">Waiting ({blocked.length})</div>
              {blocked.slice(0, 5).map(b => (
                <div key={b.cardId} className="flex items-center justify-between gap-2 text-xs text-fg-faint py-0.5">
                  <span className="truncate">{b.cardTitle}</span>
                  <span className="font-mono shrink-0">{b.reason}</span>
                </div>
              ))}
            </div>
          )}
          {runs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-fg-faint">
              No runs yet. Autonomy is opt-in per goal via “Apply &amp; Run”.
            </div>
          ) : (
            runs.map(run => <RunRow key={run.id} run={run} onCancel={id => void autonomy.cancelRun(id)} />)
          )}
        </div>
      </aside>
    </>
  );
};
