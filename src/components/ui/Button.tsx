import React from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hi disabled:opacity-40',
  secondary: 'bg-bg-2 text-fg border border-line hover:bg-bg-3 disabled:opacity-40',
  ghost: 'text-fg-muted hover:text-fg hover:bg-bg-2 disabled:opacity-40',
  danger: 'bg-bg-2 text-err border border-err/30 hover:bg-err/10 disabled:opacity-40',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...props
}) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium transition-colors',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
