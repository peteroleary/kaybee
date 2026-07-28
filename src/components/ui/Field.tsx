import React from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({ label, htmlFor, className, children }) => {
  return (
    <div className={cn('space-y-1', className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
};

export const fieldControlClasses =
  'w-full px-3 py-2 bg-bg-2 border border-line rounded-control text-fg text-sm focus:outline-none focus:ring-1 focus:ring-accent';
