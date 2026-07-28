import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'accent' | 'ok' | 'warn' | 'err';

interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
  title?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-bg-2 text-fg-muted border-line',
  accent: 'bg-accent/15 text-accent-hi border-accent/30',
  ok: 'bg-ok/15 text-ok border-ok/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  err: 'bg-err/15 text-err border-err/30',
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', className, children, title }) => {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-control text-xs font-medium border',
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
};
