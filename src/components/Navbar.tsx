import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Activity,
  Plus,
  ChevronDown,
  Search,
  Target,
  LogIn,
  LogOut,
  User as UserIcon,
  Bot
} from 'lucide-react';
import { BoardData } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/Button';
import { IconButton } from './ui/IconButton';
import { AutonomyPill } from '../features/runs/AutonomyPill';

/**
 * Global navigation only: brand, board switching, search, and the
 * agents-finish-goals loop (Orchestrator, Goals, Agent Registry, autonomy,
 * activity, account). Every board-scoped action lives in BoardToolbar, which
 * App renders only while a board is visible.
 */
interface NavbarProps {
  boards: BoardData[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onOpenOrchestrator: () => void;
  onOpenNewBoard: () => void;
  onOpenSearch: () => void;
  onToggleActivity: () => void;
  activityCount: number;
  onOpenGoalCanvas?: () => void;
  onOpenAgentRegistry?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onOpenOrchestrator,
  onOpenNewBoard,
  onOpenSearch,
  onToggleActivity,
  activityCount,
  onOpenGoalCanvas,
  onOpenAgentRegistry
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, signInWithGoogle, signOutUser } = useAuth();

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  return (
    <header className="sticky top-0 z-40 h-12 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 flex items-center justify-between gap-2 shrink-0">

      {/* Left Group: Brand Mark & Board Dropdown & Search */}
      <div className="flex items-center gap-2">
        {/* Brand Mark */}
        <div
          className="h-7 px-1.5 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm cursor-default"
          title="We3 — You, Me, and AI, in this together"
        >
          W3
        </div>

        {/* Board Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-colors"
            title={activeBoard ? `Active Board: ${activeBoard.name}. Click to switch boards.` : 'No boards yet — create one'}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">{activeBoard?.name ?? 'No boards'}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Boards ({boards.length})
              </div>
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => {
                    onSelectBoard(board.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-800 transition-colors ${
                    board.id === activeBoardId ? 'bg-indigo-600/20 text-indigo-300 font-semibold border-l-2 border-indigo-500' : 'text-slate-300'
                  }`}
                >
                  <span className="truncate">{board.name}</span>
                  {board.id === activeBoardId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </button>
              ))}
              <div className="border-t border-slate-800 mt-1 pt-1 px-1 space-y-0.5">
                <button
                  onClick={() => {
                    onOpenNewBoard();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                  title="Create New Board"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span>New Board</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search Icon Button */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          title="Search Cards, Lists, Tags (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Right Group: the agents-finish-goals loop + account */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* AI Orchestrator Dock Trigger — the single primary action */}
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenOrchestrator}
          title="Orchestrator: multi-turn planning dock (proposes plans, applies nothing until you confirm)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">Orchestrator</span>
        </Button>

        {/* Goal Home — secondary action */}
        {onOpenGoalCanvas && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenGoalCanvas}
            title="Goals: define outcomes and review AI-proposed plans"
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Goals</span>
          </Button>
        )}

        {/* Agent Registry Trigger */}
        {onOpenAgentRegistry && (
          <IconButton
            onClick={onOpenAgentRegistry}
            title="Agent Registry: Manage assignable agents and people"
            aria-label="Agent Registry: Manage assignable agents and people"
          >
            <Bot className="w-3.5 h-3.5" />
          </IconButton>
        )}

        {/* Autonomy status + Pause All (self-contained; hidden when signed out) */}
        <AutonomyPill />

        {/* Real-Time Telemetry & Activity Feed */}
        <button
          onClick={onToggleActivity}
          className="relative p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          title="Activity Log"
        >
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          {activityCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-xs font-bold text-white flex items-center justify-center border border-slate-900">
              {activityCount > 9 ? '9+' : activityCount}
            </span>
          )}
        </button>

        {/* Firebase Authentication Widget */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-6 h-6 rounded-full border border-indigo-500/50"
                title={user.email || user.displayName || 'Firebase Authenticated User'}
              />
            ) : (
              <div
                className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300"
                title={user.email || 'Firebase Authenticated User'}
              >
                <UserIcon className="w-3 h-3" />
              </div>
            )}
            <button
              onClick={() => signOutUser()}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 border border-slate-700/60 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition-colors"
              title="Sign Out (Firebase Auth)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => signInWithGoogle()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-colors"
            title="Sign in with Google (Firebase Auth)"
          >
            <LogIn className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
