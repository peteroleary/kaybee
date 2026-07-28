import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  align?: 'center' | 'top';
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, className, align = 'center' }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const getFocusable = (): HTMLElement[] => {
      if (!panelRef.current) return [];
      return Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    };

    const raf = requestAnimationFrame(() => {
      const focusable = getFocusable();
      (focusable[0] || panelRef.current)?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = getFocusable();
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center p-4',
        align === 'top' ? 'items-start pt-16 sm:pt-24' : 'items-center'
      )}
    >
      <motion.div
        className="absolute inset-0 bg-black/60"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.12 }}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className={cn(
          'relative w-full bg-bg-1 border border-line rounded-surface flex flex-col overflow-hidden',
          className
        )}
      >
        {children}
      </motion.div>
    </div>
  );
};
