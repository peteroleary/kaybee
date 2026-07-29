import React, { useState } from 'react';
import {
  Archive,
  BarChart3,
  BookmarkPlus,
  Download,
  Flame,
  Filter,
  GitFork,
  Layout,
  ListPlus,
  Mic,
  Network,
  Palette,
  RotateCcw,
  ShieldCheck,
  Tag,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RBACRole } from '../types';
import { IconButton } from './ui/IconButton';

/**
 * Board-context toolbar: every action that only makes sense while looking at
 * a board. Rendered by App only when a board is visible, which keeps the
 * global Navbar down to navigation + the agents-finish-goals loop.
 */
interface BoardToolbarProps {
  onAddList?: () => void;
  isHeatmapActive?: boolean;
  onToggleHeatmap?: () => void;
  smartFilterActive?: boolean;
  onToggleSmartFilter?: () => void;
  selectedTagFilter?: string | null;
  onOpenTagManagerModal?: () => void;
  onOpenOverviewMap?: () => void;
  onOpenInterconnect: () => void;
  onOpenAnalytics?: () => void;
  onOpenVoice?: () => void;
  onOpenThemeModal?: () => void;
  onOpenAutoArchiveModal?: () => void;
  onOpenTemplates: () => void;
  onOpenSaveTemplate?: () => void;
  onExportBoardImage?: () => void;
  zoomLevel: number;
  onChangeZoom: (delta: number) => void;
  onResetPan: () => void;
  currentRole: RBACRole;
  onChangeRole: (role: RBACRole) => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  onAddList,
  isHeatmapActive,
  onToggleHeatmap,
  smartFilterActive,
  onToggleSmartFilter,
  selectedTagFilter,
  onOpenTagManagerModal,
  onOpenOverviewMap,
  onOpenInterconnect,
  onOpenAnalytics,
  onOpenVoice,
  onOpenThemeModal,
  onOpenAutoArchiveModal,
  onOpenTemplates,
  onOpenSaveTemplate,
  onExportBoardImage,
  zoomLevel,
  onChangeZoom,
  onResetPan,
  currentRole,
  onChangeRole,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  return (
    <div className="h-10 shrink-0 bg-slate-900/80 border-b border-slate-800 text-slate-100 px-3 flex items-center justify-between gap-2">
      {/* Board editing + views */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
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

        {onToggleHeatmap && (
          <button
            onClick={onToggleHeatmap}
            className={`p-1.5 rounded-lg border transition-colors ${
              isHeatmapActive
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isHeatmapActive ? 'Velocity Heatmap Active' : 'Toggle Velocity Heatmap Layer'}
          >
            <Flame className="w-3.5 h-3.5" />
          </button>
        )}

        {onToggleSmartFilter && (
          <button
            onClick={onToggleSmartFilter}
            className={`p-1.5 rounded-lg border transition-colors ${
              smartFilterActive
                ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={smartFilterActive ? 'Smart Filter Active' : 'Smart Filter: Collapse Inactive Lists'}
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onOpenTagManagerModal}
          className={`p-1.5 rounded-lg border transition-colors relative ${
            selectedTagFilter
              ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300'
              : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
          title={selectedTagFilter ? `Active Tag Filter: #${selectedTagFilter}` : 'Filter & Manage Hashtags'}
        >
          <Tag className="w-3.5 h-3.5" />
          {selectedTagFilter && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 border border-slate-900" />
          )}
        </button>

        <div className="w-px h-4 bg-slate-700/60 mx-1" />

        {onOpenOverviewMap && (
          <IconButton
            onClick={onOpenOverviewMap}
            title="Overview Map & Dependency Graph"
            aria-label="Overview Map & Dependency Graph"
          >
            <Network className="w-3.5 h-3.5" />
          </IconButton>
        )}

        <IconButton
          onClick={onOpenInterconnect}
          title="Board Interconnectivity & Feed-Forward Router"
          aria-label="Board Interconnectivity & Feed-Forward Router"
        >
          <GitFork className="w-3.5 h-3.5" />
        </IconButton>

        {onOpenAnalytics && (
          <IconButton
            onClick={onOpenAnalytics}
            title="Analytics Telemetry Dashboard"
            aria-label="Analytics Telemetry Dashboard"
          >
            <BarChart3 className="w-3.5 h-3.5" />
          </IconButton>
        )}

        {onOpenVoice && (
          <IconButton
            onClick={onOpenVoice}
            title="Voice-to-Action Listener"
            aria-label="Voice-to-Action Listener"
          >
            <Mic className="w-3.5 h-3.5" />
          </IconButton>
        )}

        <div className="w-px h-4 bg-slate-700/60 mx-1" />

        {onOpenThemeModal && (
          <IconButton
            onClick={onOpenThemeModal}
            title="Change Board Theme & Background Canvas"
            aria-label="Change Board Theme & Background Canvas"
          >
            <Palette className="w-3.5 h-3.5" />
          </IconButton>
        )}

        {onOpenAutoArchiveModal && (
          <IconButton
            onClick={onOpenAutoArchiveModal}
            title="Auto-Archive Routine Rules"
            aria-label="Auto-Archive Routine Rules"
          >
            <Archive className="w-3.5 h-3.5" />
          </IconButton>
        )}

        <IconButton
          onClick={onOpenTemplates}
          title="Board Template Library"
          aria-label="Board Template Library"
        >
          <Layout className="w-3.5 h-3.5" />
        </IconButton>

        {onOpenSaveTemplate && (
          <IconButton
            onClick={onOpenSaveTemplate}
            title="Save Active Board Layout as Custom Template"
            aria-label="Save Active Board Layout as Custom Template"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
          </IconButton>
        )}

        {onExportBoardImage && (
          <IconButton
            onClick={onExportBoardImage}
            title="Export High-Resolution Board Image"
            aria-label="Export High-Resolution Board Image"
          >
            <Download className="w-3.5 h-3.5" />
          </IconButton>
        )}
      </div>

      {/* Canvas zoom + access level */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => onChangeZoom(-0.1)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 font-mono text-xs text-slate-300 font-medium">{Math.round(zoomLevel * 100)}%</span>
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
              <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
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
      </div>
    </div>
  );
};
