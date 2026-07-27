import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  Activity, 
  ShieldCheck, 
  Plus, 
  ChevronDown, 
  Mic, 
  Search, 
  Layout, 
  BarChart3, 
  Filter, 
  Network, 
  Download, 
  Flame, 
  Palette, 
  Archive, 
  ListPlus, 
  GitFork, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Tag,
  X
} from 'lucide-react';
import { BoardData, RBACRole } from '../types';
import { getTagStyle } from '../data/tagsAndThemes';

interface NavbarProps {
  boards: BoardData[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onOpenOrchestrator: () => void;
  onOpenInterconnect: () => void;
  onOpenNewBoard: () => void;
  onOpenSearch: () => void;
  onOpenTemplates: () => void;
  onOpenVoice?: () => void;
  onOpenAnalytics?: () => void;
  onOpenOverviewMap?: () => void;
  onExportBoardImage?: () => void;
  smartFilterActive?: boolean;
  onToggleSmartFilter?: () => void;
  isHeatmapActive?: boolean;
  onToggleHeatmap?: () => void;
  onOpenThemeModal?: () => void;
  onOpenAutoArchiveModal?: () => void;
  onAddList?: () => void;
  selectedTagFilter?: string | null;
  onSelectTagFilter?: (tag: string | null) => void;
  onOpenTagManagerModal?: () => void;
  currentRole: RBACRole;
  onChangeRole: (role: RBACRole) => void;
  zoomLevel: number;
  onChangeZoom: (delta: number) => void;
  onResetPan: () => void;
  onToggleActivity: () => void;
  activityCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onOpenOrchestrator,
  onOpenInterconnect,
  onOpenNewBoard,
  onOpenSearch,
  onOpenTemplates,
  onOpenVoice,
  onOpenAnalytics,
  onOpenOverviewMap,
  onExportBoardImage,
  smartFilterActive,
  onToggleSmartFilter,
  isHeatmapActive,
  onToggleHeatmap,
  onOpenThemeModal,
  onOpenAutoArchiveModal,
  onAddList,
  selectedTagFilter,
  onSelectTagFilter,
  onOpenTagManagerModal,
  currentRole,
  onChangeRole,
  zoomLevel,
  onChangeZoom,
  onResetPan,
  onToggleActivity,
  activityCount
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  // Extract all unique tags across cards on active board
  const allBoardTagsSet = new Set<string>();
  activeBoard.lists.forEach(l => {
    l.cards.forEach(c => {
      c.tags?.forEach(t => allBoardTagsSet.add(t));
    });
  });
  const allBoardTags = Array.from(allBoardTagsSet);

  const roleColors: Record<RBACRole, string> = {
    admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    contributor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    ai_operator: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  };

  return (
    <header className="sticky top-0 z-40 h-12 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 text-slate-100 px-3 flex items-center justify-between gap-2 shadow-2xl shrink-0">
      
      {/* Left Group: Brand Mark & Board Dropdown & Search */}
      <div className="flex items-center gap-2">
        {/* Brand Mark */}
        <div 
          className="w-8 h-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 rounded-lg flex items-center justify-center font-black text-sm text-white shadow-md shadow-indigo-500/20 cursor-default"
          title="KB3.0 EVO-KANBAN Master Environment"
        >
          K
        </div>

        {/* Board Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-slate-100 transition-colors"
            title={`Active Board: ${activeBoard.name}. Click to switch boards.`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">{activeBoard.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Boards ({boards.length})
              </div>
              {boards.map(board => (
                <button
                  key={board.id}
                  onClick={() => {
                    onSelectBoard(board.id);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/10 transition-colors ${
                    board.id === activeBoardId ? 'bg-indigo-600/30 text-indigo-200 font-semibold border-l-2 border-indigo-400' : 'text-slate-200'
                  }`}
                >
                  <span className="truncate">{board.name}</span>
                  {board.id === activeBoardId && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  )}
                </button>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1 px-1">
                <button
                  onClick={() => {
                    onOpenNewBoard();
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-indigo-300 hover:bg-indigo-500/20 rounded-lg flex items-center gap-2"
                  title="Create New Board"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Board</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Search Icon Button */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Search Cards, Lists, Tags (Ctrl + K)"
        >
          <Search className="w-3.5 h-3.5 text-indigo-400" />
        </button>
      </div>

      {/* Middle Group: Icon-Only Action Tools with Hover Labels */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar px-1">
        
        {/* Add List Tool */}
        {onAddList && (
          <button
            onClick={onAddList}
            className="p-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 transition-all shadow-sm"
            title="Add New Column / List to Canvas"
          >
            <ListPlus className="w-4 h-4 text-indigo-300" />
          </button>
        )}

        {/* Velocity Heatmap Layer Toggle */}
        {onToggleHeatmap && (
          <button
            onClick={onToggleHeatmap}
            className={`p-2 rounded-lg border transition-all ${
              isHeatmapActive
                ? 'bg-rose-500/30 border-rose-500/60 text-rose-200 shadow-md shadow-rose-500/20'
                : 'bg-white/10 hover:bg-rose-500/20 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Toggle Velocity Heatmap Layer"
          >
            <Flame className={`w-4 h-4 ${isHeatmapActive ? 'text-rose-400 animate-bounce' : 'text-slate-400'}`} />
          </button>
        )}

        {/* Smart Filter Toggle */}
        {onToggleSmartFilter && (
          <button
            onClick={onToggleSmartFilter}
            className={`p-2 rounded-lg border transition-all ${
              smartFilterActive
                ? 'bg-amber-500/30 border-amber-500/60 text-amber-200 shadow-md shadow-amber-500/20'
                : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="Smart Filter: Collapse Inactive Lists"
          >
            <Filter className={`w-4 h-4 ${smartFilterActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
          </button>
        )}

        {/* AI Orchestrator Trigger */}
        <button
          onClick={onOpenOrchestrator}
          className="p-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-white/20 text-white shadow-md shadow-indigo-600/30 transition-all"
          title="AI Orchestrator Routine Engine (Gemini)"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
        </button>

        {/* Board Router / Interconnect Trigger */}
        <button
          onClick={onOpenInterconnect}
          className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 border border-white/10 text-slate-300 hover:text-purple-300 transition-colors"
          title="Board Interconnectivity & Feed-Forward Router"
        >
          <GitFork className="w-4 h-4 text-purple-400" />
        </button>

        {/* Overview Map & Dependency Graph */}
        {onOpenOverviewMap && (
          <button
            onClick={onOpenOverviewMap}
            className="p-2 rounded-lg bg-white/10 hover:bg-indigo-500/20 border border-white/10 text-slate-300 hover:text-indigo-300 transition-colors"
            title="Overview Map & Dependency Graph"
          >
            <Network className="w-4 h-4 text-indigo-400" />
          </button>
        )}

        {/* Voice Listener Trigger */}
        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/20 border border-white/10 text-slate-300 hover:text-rose-300 transition-colors"
            title="Voice-to-Action Listener"
          >
            <Mic className="w-4 h-4 text-rose-400" />
          </button>
        )}

        {/* Analytics Dashboard Trigger */}
        {onOpenAnalytics && (
          <button
            onClick={onOpenAnalytics}
            className="p-2 rounded-lg bg-white/10 hover:bg-cyan-500/20 border border-white/10 text-slate-300 hover:text-cyan-300 transition-colors"
            title="Analytics Telemetry Dashboard"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </button>
        )}

        {/* Board Theme Trigger */}
        {onOpenThemeModal && (
          <button
            onClick={onOpenThemeModal}
            className="p-2 rounded-lg bg-white/10 hover:bg-purple-500/20 border border-white/10 text-slate-300 hover:text-purple-300 transition-colors"
            title="Change Board Theme & Background Canvas"
          >
            <Palette className="w-4 h-4 text-purple-400" />
          </button>
        )}

        {/* Auto-Archive Rules Trigger */}
        {onOpenAutoArchiveModal && (
          <button
            onClick={onOpenAutoArchiveModal}
            className="p-2 rounded-lg bg-white/10 hover:bg-amber-500/20 border border-white/10 text-slate-300 hover:text-amber-300 transition-colors"
            title="Auto-Archive Routine Rules"
          >
            <Archive className="w-4 h-4 text-amber-400" />
          </button>
        )}

        {/* Templates Library */}
        <button
          onClick={onOpenTemplates}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Board Template Library"
        >
          <Layout className="w-4 h-4 text-indigo-400" />
        </button>

        {/* Export High-Res Board Snapshot */}
        {onExportBoardImage && (
          <button
            onClick={onExportBoardImage}
            className="p-2 rounded-lg bg-white/10 hover:bg-emerald-500/20 border border-white/10 text-slate-300 hover:text-emerald-300 transition-colors"
            title="Export High-Resolution Board Image"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Tag / Hashtag Filter Modal Trigger Button */}
        <button
          onClick={onOpenTagManagerModal}
          className={`p-2 rounded-lg border transition-all relative ${
            selectedTagFilter
              ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200 shadow-md shadow-indigo-500/20 ring-1 ring-indigo-500/50'
              : 'bg-white/10 hover:bg-indigo-500/20 border-white/10 text-slate-300 hover:text-indigo-300'
          }`}
          title={selectedTagFilter ? `Active Tag Filter: #${selectedTagFilter}. Click to manage tags & filters.` : "Filter & Manage Hashtag Tags"}
        >
          <Tag className={`w-4 h-4 ${selectedTagFilter ? 'text-indigo-300' : 'text-indigo-400'}`} />
          {selectedTagFilter && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse border border-slate-900" />
          )}
        </button>
      </div>

      {/* Right Group: Zoom Controls, RBAC Role Selector & Activity Feed */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Canvas Zoom Widget */}
        <div className="flex items-center bg-white/10 border border-white/10 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onChangeZoom(-0.1)}
            className="p-1 text-slate-300 hover:bg-white/15 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono text-[11px] text-indigo-300 font-bold">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => onChangeZoom(0.1)}
            className="p-1 text-slate-300 hover:bg-white/15 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetPan}
            className="p-1 text-slate-400 hover:text-slate-200 border-l border-white/10 transition-colors"
            title="Reset Canvas Position (100%)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* RBAC Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className={`p-1.5 rounded-lg border text-xs backdrop-blur-md transition-colors flex items-center gap-1 ${roleColors[currentRole]}`}
            title={`Role: ${currentRole.replace('_', ' ').toUpperCase()}`}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-44 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                RBAC Access Level
              </div>
              {(['admin', 'contributor', 'ai_operator', 'viewer'] as RBACRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    onChangeRole(role);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs capitalize flex items-center justify-between hover:bg-white/10 ${
                    currentRole === role ? 'font-bold text-indigo-300 bg-indigo-500/20' : 'text-slate-300'
                  }`}
                >
                  <span>{role.replace('_', ' ')}</span>
                  {currentRole === role && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Real-Time Telemetry & Activity Feed */}
        <button
          onClick={onToggleActivity}
          className="relative p-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 hover:text-white transition-colors"
          title="Activity Telemetry Feed"
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          {activityCount > 0 && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-indigo-500 text-[9px] font-bold text-white flex items-center justify-center border border-slate-900">
              {activityCount > 9 ? '9+' : activityCount}
            </span>
          )}
        </button>
      </div>

    </header>
  );
};

