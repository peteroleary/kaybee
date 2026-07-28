import React from 'react';
import { cn } from '../../lib/cn';

export type IconButtonVariant = 'default' | 'active' | 'danger';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  variant?: IconButtonVariant;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'bg-bg-2 border border-line text-fg-muted hover:text-fg hover:bg-bg-3',
  active: 'bg-accent/20 border border-accent/40 text-accent-hi',
  danger: 'bg-bg-2 border border-line text-fg-muted hover:text-err hover:border-err/40',
};

export const IconButton: React.FC<IconButtonProps> = ({
  variant = 'default',
  className,
  children,
  title,
  ...props
}) => {
  return (
    <button
      title={title}
      className={cn(
        'relative p-1.5 rounded-control transition-colors disabled:opacity-40',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
