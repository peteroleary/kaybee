import React from 'react';
import { cn } from '../../lib/cn';

export type Status = 'idle' | 'running' | 'success' | 'error';

interface StatusDotProps {
  status: Status;
  className?: string;
  title?: string;
}

const statusClasses: Record<Status, string> = {
  idle: 'bg-fg-faint',
  running: 'bg-accent-hi animate-pulse',
  success: 'bg-ok',
  error: 'bg-err',
};

export const StatusDot: React.FC<StatusDotProps> = ({ status, className, title }) => {
  return (
    <span
      title={title}
      className={cn('inline-block w-1.5 h-1.5 rounded-full', statusClasses[status], className)}
    />
  );
};
