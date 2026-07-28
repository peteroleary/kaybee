import React, { useState } from 'react';
import { X, Settings, GitFork } from 'lucide-react';
import { ListConfig, ListType, HomogenousType, BoardData } from '../types';
import { Modal } from './ui/Modal';

interface ListSettingsModalProps {
  list: ListConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateList: (updatedList: ListConfig) => void;
  availableBoards: BoardData[];
}

export const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  list,
  isOpen,
  onClose,
  onUpdateList,
  availableBoards,
}) => {
  if (!isOpen || !list) return null;

  const [editedList, setEditedList] = useState<ListConfig>({ ...list });

  const handleSave = () => {
    onUpdateList(editedList);
    onClose();
  };

  const selectedTargetBoard = availableBoards.find(b => b.id === editedList.feedForwardTargetBoardId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">List Configuration & Routing</h2>
              <p className="text-xs text-slate-300">Evolve list structure and configure feed-forward targets.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* List Title */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">List Title</label>
            <input
              type="text"
              value={editedList.title}
              onChange={(e) => setEditedList({ ...editedList, title: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* List Type Selector */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evolutionary List Paradigm</label>
            <select
              value={editedList.listType}
              onChange={(e) => setEditedList({ ...editedList, listType: e.target.value as ListType })}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="chat_feed">Chat Feed List (Sticky Composer + Messages as Cards)</option>
              <option value="homogenous">Homogenous Personnel List (All Humans or All Agents)</option>
              <option value="heterogeneous">Heterogeneous Troop List (Mixed Humans + Agents + Swarms)</option>
              <option value="kanban">Standard Kanban Stage</option>
              <option value="pipeline">Automated Workflow Pipeline</option>
            </select>
          </div>

          {/* Homogenous Type Config if Homogenous List */}
          {editedList.listType === 'homogenous' && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2 backdrop-blur-md">
              <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Homogenous Constraint</label>
              <select
                value={editedList.homogenousType}
                onChange={(e) => setEditedList({ ...editedList, homogenousType: e.target.value as HomogenousType })}
                className="w-full px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
              >
                <option value="agents_only">Personnel: AI Agents Only</option>
                <option value="humans_only">Personnel: Humans Only</option>
              </select>
            </div>
          )}

          {/* Cross-Board Feed-Forward Target Configuration */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
              <GitFork className="w-4 h-4 text-purple-400" />
              <span>Cross-Board Feed-Forward Routing</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              When cards in this list complete, automatically feed them to another high-level project board.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Target Board</label>
                <select
                  value={editedList.feedForwardTargetBoardId || ''}
                  onChange={(e) => setEditedList({ ...editedList, feedForwardTargetBoardId: e.target.value || undefined })}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                >
                  <option value="">None (Standalone List)</option>
                  {availableBoards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {selectedTargetBoard && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Target List</label>
                  <select
                    value={editedList.feedForwardTargetListId || ''}
                    onChange={(e) => setEditedList({ ...editedList, feedForwardTargetListId: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                  >
                    <option value="">Select Target List...</option>
                    {selectedTargetBoard.lists.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 2-Column Grid Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs backdrop-blur-md">
            <div className="flex flex-col">
              <span className="font-medium text-slate-200">2-Column Cards Grid Layout</span>
              <span className="text-xs text-slate-400">Expand list width and organize cards into a 2-column grid.</span>
            </div>
            <input
              type="checkbox"
              checked={!!editedList.isTwoColumns}
              onChange={(e) => setEditedList({ ...editedList, isTwoColumns: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-indigo-500 focus:ring-0 w-4 h-4"
            />
          </div>

          {/* Auto-sort by Priority Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs backdrop-blur-md">
            <div className="flex flex-col">
              <span className="font-medium text-slate-200">Auto-sort Cards by Priority</span>
              <span className="text-xs text-slate-400">Automatically reorders cards whenever priority updates (Urgent &gt; High &gt; Medium &gt; Low).</span>
            </div>
            <input
              type="checkbox"
              checked={!!editedList.autoSortByPriority}
              onChange={(e) => setEditedList({ ...editedList, autoSortByPriority: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-indigo-500 focus:ring-0 w-4 h-4"
            />
          </div>

          {/* Auto-Run Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 text-xs backdrop-blur-md">
            <span className="font-medium text-slate-200">Auto-Execute AI Agent Routines</span>
            <input
              type="checkbox"
              checked={editedList.autoRunAgents}
              onChange={(e) => setEditedList({ ...editedList, autoRunAgents: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-indigo-500 focus:ring-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 font-medium text-xs transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hi text-white font-semibold text-xs transition-colors">
            Save List Config
          </button>
        </div>
    </Modal>
  );
};
