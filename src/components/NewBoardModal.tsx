import React, { useState } from 'react';
import { Layers, X } from 'lucide-react';
import { BoardData } from '../types';
import { Modal } from './ui/Modal';

interface NewBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoard: (name: string, category: BoardData['category']) => void;
}

export const NewBoardModal: React.FC<NewBoardModalProps> = ({ isOpen, onClose, onCreateBoard }) => {
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardCategory, setNewBoardCategory] = useState<BoardData['category']>('Core Engineering');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!newBoardName.trim()) return;
    onCreateBoard(newBoardName, newBoardCategory);
    setNewBoardName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 space-y-4">
<div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>Create New Evolutionary Board</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Board Name</label>
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="e.g. Q4 Autonomous AI Release"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={newBoardCategory}
              onChange={(e) => setNewBoardCategory(e.target.value as BoardData['category'])}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-100 text-xs"
            >
              <option value="Core Engineering">Core Engineering</option>
              <option value="Executive Overview">Executive Overview</option>
              <option value="Agent Swarms">Agent Swarms</option>
              <option value="Human Operations">Human Operations</option>
              <option value="Cross-Functional">Cross-Functional</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!newBoardName.trim()}
            className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hi text-white font-semibold text-xs transition-colors"
          >
            Initialize Board
          </button>
        </div>
    </Modal>
  );
};
