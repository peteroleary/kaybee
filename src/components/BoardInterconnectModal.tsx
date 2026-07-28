import React, { useState } from 'react';
import { X, GitFork, ArrowRight, Plus, Zap, Trash2 } from 'lucide-react';
import { BoardData, FeedForwardConnection } from '../types';
import { Modal } from './ui/Modal';

interface BoardInterconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardData[];
  onAddConnection: (connection: FeedForwardConnection) => void;
  onRemoveConnection: (boardId: string, connectionId: string) => void;
}

export const BoardInterconnectModal: React.FC<BoardInterconnectModalProps> = ({
  isOpen,
  onClose,
  boards,
  onAddConnection,
  onRemoveConnection,
}) => {
  if (!isOpen) return null;

  const [sourceBoardId, setSourceBoardId] = useState(boards[0]?.id || '');
  const [sourceListId, setSourceListId] = useState('');
  const [targetBoardId, setTargetBoardId] = useState(boards[1]?.id || boards[0]?.id || '');
  const [targetListId, setTargetListId] = useState('');

  const sourceBoard = boards.find(b => b.id === sourceBoardId);
  const targetBoard = boards.find(b => b.id === targetBoardId);

  const handleCreateRule = () => {
    if (!sourceBoardId || !sourceListId || !targetBoardId || !targetListId) return;

    const sourceList = sourceBoard?.lists.find(l => l.id === sourceListId);
    const targetList = targetBoard?.lists.find(l => l.id === targetListId);

    const newRule: FeedForwardConnection = {
      id: `ff-${Date.now()}`,
      sourceBoardId,
      sourceListId,
      targetBoardId,
      targetListId,
      condition: 'on_complete',
      targetBoardName: targetBoard?.name,
      targetListName: targetList?.title,
    };

    onAddConnection(newRule);
    setSourceListId('');
    setTargetListId('');
  };

  // Collect all active connections across all boards
  const allConnections = boards.flatMap(b => 
    (b.feedForwardConnections || []).map(conn => ({ ...conn, currentBoardName: b.name, boardId: b.id }))
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Board Interconnectivity & Feed-Forward Router</h2>
              <p className="text-xs text-slate-300">Feed list outputs automatically across multi-level project boards.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Create Rule Form */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-4 backdrop-blur-md">
            <div className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Create Cross-Board Feed-Forward Rule</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Source Board */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Source Board</label>
                <select
                  value={sourceBoardId}
                  onChange={(e) => {
                    setSourceBoardId(e.target.value);
                    setSourceListId('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                >
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Source List */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Source List</label>
                <select
                  value={sourceListId}
                  onChange={(e) => setSourceListId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                >
                  <option value="">Select List...</option>
                  {sourceBoard?.lists.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>

              {/* Target Board */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Target Board</label>
                <select
                  value={targetBoardId}
                  onChange={(e) => {
                    setTargetBoardId(e.target.value);
                    setTargetListId('');
                  }}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                >
                  {boards.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Target List */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400">Target List</label>
                <select
                  value={targetListId}
                  onChange={(e) => setTargetListId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
                >
                  <option value="">Select List...</option>
                  {targetBoard?.lists.map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCreateRule}
              disabled={!sourceListId || !targetListId}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg transition-colors border border-white/10"
            >
              <Plus className="w-4 h-4" />
              <span>Establish Feed-Forward Connection</span>
            </button>
          </div>

          {/* Existing Connection Rules */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Interconnectivity Graph ({allConnections.length})
            </label>

            <div className="space-y-2">
              {allConnections.map((conn) => {
                const sB = boards.find(b => b.id === conn.sourceBoardId);
                const sL = sB?.lists.find(l => l.id === conn.sourceListId);
                const tB = boards.find(b => b.id === conn.targetBoardId);
                const tL = tB?.lists.find(l => l.id === conn.targetListId);

                return (
                  <div key={conn.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 text-xs backdrop-blur-md">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex flex-col">
                        <span className="font-bold text-indigo-300 truncate">{sB?.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{sL?.title}</span>
                      </div>

                      <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />

                      <div className="flex flex-col">
                        <span className="font-bold text-purple-300 truncate">{tB?.name}</span>
                        <span className="text-xs text-slate-400 font-mono">{tL?.title}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-xs font-mono border border-emerald-500/30">
                        {conn.condition}
                      </span>
                      <button
                        onClick={() => onRemoveConnection(conn.boardId, conn.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                        title="Remove Connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {allConnections.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-white/10 rounded-xl backdrop-blur-sm">
                  No cross-board feed-forward connections defined yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-200 font-medium text-xs transition-colors">
            Close
          </button>
        </div>
    </Modal>
  );
};
