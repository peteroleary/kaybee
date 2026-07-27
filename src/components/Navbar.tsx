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
  BookmarkPlus,
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
  onOpenSaveTemplate?: () => void;
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
  onOpenSaveTemplate,
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
    <header className="sticky top-0 z-40 h-12 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 flex items-center justify-between gap-2 shrink-0">
      
      {/* Left Group: Brand Mark & Board Dropdown & Search */}
      <div className="flex items-center gap-2">
        {/* Brand Mark */}
        <div 
          className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm cursor-default"
          title="KB Master Board Environment"
        >
          K
        </div>

        {/* Board Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-200 transition-colors"
            title={`Active Board: ${activeBoard.name}. Click to switch boards.`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">{activeBoard.name}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
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

                {onOpenSaveTemplate && (
                  <button
                    onClick={() => {
                      onOpenSaveTemplate();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg flex items-center gap-2"
                    title="Save active board as a reusable template"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Save Board as Template</span>
                  </button>
                )}
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

      {/* Middle Group: Clean Toolbar Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar px-1">
        
        {/* Add List Tool */}
        {onAddList && (
          <button
            onClick={onAddList}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-colors"
            title="Add New Column / List to Canvas"
          >
            <ListPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Add List</span>
          </button>
        )}

        {/* Velocity Heatmap Layer Toggle */}
        {onToggleHeatmap && (
          <button
            onClick={onToggleHeatmap}
            className={`p-1.5 rounded-lg border transition-colors ${
              isHeatmapActive
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isHeatmapActive ? "Velocity Heatmap Active" : "Toggle Velocity Heatmap Layer"}
          >
            <Flame className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Smart Filter Toggle */}
        {onToggleSmartFilter && (
          <button
            onClick={onToggleSmartFilter}
            className={`p-1.5 rounded-lg border transition-colors ${
              smartFilterActive
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={smartFilterActive ? "Smart Filter Active" : "Smart Filter: Collapse Inactive Lists"}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        )}

        {/* AI Orchestrator Trigger */}
        <button
          onClick={onOpenOrchestrator}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
          title="AI Orchestrator Routine Engine (Gemini)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Orchestrator</span>
        </button>

        {/* Board Router / Interconnect Trigger */}
        <button
          onClick={onOpenInterconnect}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          title="Board Interconnectivity & Feed-Forward Router"
        >
          <GitFork className="w-3.5 h-3.5" />
        </button>

        {/* Overview Map & Dependency Graph */}
        {onOpenOverviewMap && (
          <button
            onClick={onOpenOverviewMap}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Overview Map & Dependency Graph"
          >
            <Network className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Voice Listener Trigger */}
        {onOpenVoice && (
          <button
            onClick={onOpenVoice}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Voice-to-Action Listener"
          >
            <Mic className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Analytics Dashboard Trigger */}
        {onOpenAnalytics && (
          <button
            onClick={onOpenAnalytics}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Analytics Telemetry Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Board Theme Trigger */}
        {onOpenThemeModal && (
          <button
            onClick={onOpenThemeModal}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Change Board Theme & Background Canvas"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Auto-Archive Rules Trigger */}
        {onOpenAutoArchiveModal && (
          <button
            onClick={onOpenAutoArchiveModal}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Auto-Archive Routine Rules"
          >
            <Archive className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Templates Library */}
        <button
          onClick={onOpenTemplates}
          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
          title="Board Template Library"
        >
          <Layout className="w-3.5 h-3.5" />
        </button>

        {/* Save as Template Tool */}
        {onOpenSaveTemplate && (
          <button
            onClick={onOpenSaveTemplate}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Save Active Board Layout as Custom Template"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Export High-Res Board Snapshot */}
        {onExportBoardImage && (
          <button
            onClick={onExportBoardImage}
            className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors"
            title="Export High-Resolution Board Image"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Tag / Hashtag Filter Modal Trigger Button */}
        <button
          onClick={onOpenTagManagerModal}
          className={`p-1.5 rounded-lg border transition-colors relative ${
            selectedTagFilter
              ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
          title={selectedTagFilter ? `Active Tag Filter: #${selectedTagFilter}` : "Filter & Manage Hashtags"}
        >
          <Tag className="w-3.5 h-3.5" />
          {selectedTagFilter && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 border border-slate-900" />
          )}
        </button>
      </div>

      {/* Right Group: Zoom Controls, RBAC Role Selector & Activity Feed */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Canvas Zoom Widget */}
        <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onChangeZoom(-0.1)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono text-[11px] text-slate-300 font-medium">{Math.round(zoomLevel * 100)}%</span>
          <button
            onClick={() => onChangeZoom(0.1)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetPan}
            className="p-1 text-slate-500 hover:text-slate-300 border-l border-slate-700 transition-colors"
            title="Reset Canvas Position (100%)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* RBAC Role Selector */}
        <div className="relative">
          <button
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="p-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
            title={`Role: ${currentRole.replace('_', ' ').toUpperCase()}`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          </button>

          {roleDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-40 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden py-1">
              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Access Level
              </div>
              {(['admin', 'contributor', 'ai_operator', 'viewer'] as RBACRole[]).map(role => (
                <button
                  key={role}
                  onClick={() => {
                    onChangeRole(role);
                    setRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs capitalize flex items-center justify-between hover:bg-slate-800 ${
                    currentRole === role ? 'font-semibold text-indigo-300 bg-indigo-600/20' : 'text-slate-300'
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
          className="relative p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition-colors"
          title="Activity Log"
        >
          <Activity className="w-3.5 h-3.5 text-slate-400" />
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

