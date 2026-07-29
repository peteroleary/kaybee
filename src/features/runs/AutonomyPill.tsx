import React, { useState } from 'react';
import { Pause } from 'lucide-react';
import { StatusDot } from '../../components/ui/StatusDot';
import { cn } from '../../lib/cn';
import { useAutonomy } from './AutonomyContext';
import { RunConsoleDrawer } from './RunConsoleDrawer';

/**
 * Navbar pill: live autonomy status + Pause All. Self-contained — reads the
 * engine from AutonomyContext and renders its own run-console drawer, so
 * wiring it in is a single `<AutonomyPill />`. Hidden when signed out (the
 * engine needs Firestore, which needs auth).
 */
export const AutonomyPill: React.FC = () => {
  const autonomy = useAutonomy();
  const [consoleOpen, setConsoleOpen] = useState(false);

  if (!autonomy.available) return null;

  const { policy, runningCount, queuedCount } = autonomy;
  const active = runningCount + queuedCount;

  return (
    <>
      <div className="flex items-center gap-1 rounded-control border border-line bg-bg-2 pl-2.5 pr-1 py-1">
        <button
          onClick={() => setConsoleOpen(true)}
          className="flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg transition-colors"
          title={
            policy.enabled
              ? 'Autonomy is on — open run console. Agents run while KayBee is open.'
              : 'Autonomy is paused — open run console'
          }
        >
          <StatusDot
            status={runningCount > 0 ? 'running' : 'idle'}
            className={cn(!policy.enabled && 'bg-warn')}
          />
          <span className="font-medium whitespace-nowrap">
            {policy.enabled ? `Running ${active}` : 'Autonomy paused'} · {policy.budget.runsUsed}/
            {policy.budget.maxRunsTotal} budget
          </span>
        </button>
        {policy.enabled && (
          <button
            onClick={() => autonomy.setAutonomyEnabled(false)}
            className="p-1 rounded-control text-fg-faint hover:text-warn transition-colors"
            title="Pause All — stops autonomous runs in every tab"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <RunConsoleDrawer open={consoleOpen} onClose={() => setConsoleOpen(false)} />
    </>
  );
};
