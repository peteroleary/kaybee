import { useEffect } from 'react';
import { useWorkspace } from './WorkspaceProvider';
import { useUiState } from './UiStateProvider';

// Keyboard Shortcuts System (Ctrl+N: Add Card, Ctrl+K: Search, Ctrl+L: Activity, Ctrl+T: Templates)
export function useKeyboardShortcuts() {
  const { activeBoard } = useWorkspace();
  const ui = useUiState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        ui.openModal('createCard', activeBoard?.lists[0]?.id || null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (ui.isOpen('search')) {
          ui.closeModal('search');
        } else {
          ui.openModal('search');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        ui.toggleActivity();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        ui.openModal('boardTemplate');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBoard, ui]);
}
