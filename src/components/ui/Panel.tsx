import React from 'react';
import { cn } from '../../lib/cn';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ className, children, ...props }) => {
  return (
    <div className={cn('bg-bg-2 border border-line rounded-surface', className)} {...props}>
      {children}
    </div>
  );
};
