import React, { useState } from 'react';
import { 
  X, 
  BookmarkPlus, 
  Sparkles, 
  Layers, 
  Workflow, 
  CheckSquare, 
  Bot, 
  Zap, 
  GitFork, 
  Check, 
  Tag
} from 'lucide-react';
import { BoardData } from '../types';
import { BoardTemplate } from '../data/templates';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoard: BoardData;
  onSaveTemplate: (newTemplate: BoardTemplate) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  isOpen,
  onClose,
  activeBoard,
  onSaveTemplate
}) => {
  const [templateName, setTemplateName] = useState(`${activeBoard.name} Template`);
  const [category, setCategory] = useState<'Core Engineering' | 'Executive Overview' | 'Agent Swarms' | 'Human Operations' | 'Cross-Functional'>('Core Engineering');
  const [description, setDescription] = useState(`Custom template snapshot captured from "${activeBoard.name}" with ${activeBoard.lists.length} lists and active automation rules.`);
  const [icon, setIcon] = useState<string>('Workflow');
  const [tagInput, setTagInput] = useState('Custom, Snapshot, Workflow');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const totalCards = activeBoard.lists.reduce((acc, l) => acc + l.cards.length, 0);
  const totalAutomations = (activeBoard.feedForwardConnections ? activeBoard.feedForwardConnections.length : 0) +
    activeBoard.lists.filter(l => l.feedForwardTargetBoardId).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;

    const parsedTags = tagInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const newTemplate: BoardTemplate = {
      id: `tpl-user-${Date.now()}`,
      name: templateName.trim(),
      category,
      description: description.trim(),
      icon,
      tags: parsedTags.length > 0 ? parsedTags : ['Custom', 'User Template'],
      lists: activeBoard.lists.map(l => ({
        title: l.title,
        listType: l.listType,
        homogenousType: l.homogenousType,
        color: l.color,
        icon: l.icon,
        feedForwardTargetBoardId: l.feedForwardTargetBoardId,
        feedForwardTargetListId: l.feedForwardTargetListId,
        autoRunAgents: l.autoRunAgents,
        isTwoColumns: l.isTwoColumns,
        width: l.width,
        autoSortByPriority: l.autoSortByPriority,
        rbacRole: l.rbacRole,
        cards: l.cards.map(c => ({
          ...c,
          id: `c-tpl-${Math.random().toString(36).substr(2, 9)}`
        }))
      }))
    };

    onSaveTemplate(newTemplate);
    setIsSavedSuccess(true);
    setTimeout(() => {
      setIsSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const icons = [
    { id: 'Workflow', label: 'Workflow', icon: Workflow },
    { id: 'Layers', label: 'Layers', icon: Layers },
    { id: 'CheckSquare', label: 'CheckSquare', icon: CheckSquare },
    { id: 'Bot', label: 'Agent Bot', icon: Bot },
    { id: 'Sparkles', label: 'Sparkles', icon: Sparkles },
    { id: 'Zap', label: 'Routine', icon: Zap }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Save Board as Template</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                  Custom Template Builder
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Capture active lists, cards, widgets, and automation rules as a reusable template
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh] custom-scrollbar">
          
          {/* Active Board Snapshot Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 space-y-2">
            <div className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider flex items-center justify-between">
              <span>Captured Snapshot Stats</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Ready to freeze</span>
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-lg font-black text-white">{activeBoard.lists.length}</div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Lists / Columns</div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-lg font-black text-indigo-300">{totalCards}</div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Total Cards</div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="text-lg font-black text-cyan-300">{totalAutomations}</div>
                <div className="text-[10px] text-slate-400 uppercase font-mono">Automations</div>
              </div>
            </div>
          </div>

          {/* Template Title */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Template Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Executive Sprint & Swarm Template"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Category & Icon Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e: any) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="Core Engineering">Core Engineering</option>
                <option value="Executive Overview">Executive Overview</option>
                <option value="Agent Swarms">Agent Swarms</option>
                <option value="Human Operations">Human Operations</option>
                <option value="Cross-Functional">Cross-Functional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Icon Symbol</label>
              <div className="flex items-center gap-1.5">
                {icons.map((ic) => {
                  const IconComp = ic.icon;
                  return (
                    <button
                      type="button"
                      key={ic.id}
                      onClick={() => setIcon(ic.id)}
                      className={`p-2 rounded-xl border transition-all ${
                        icon === ic.id
                          ? 'bg-indigo-600/40 border-indigo-500 text-white shadow-md shadow-indigo-500/30 ring-1 ring-indigo-400'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                      title={ic.label}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Template Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of how this template should be used..."
              className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tags (comma-separated)</span>
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Engineering, Sprint, AI Swarm"
              className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
            />
          </div>

          {/* Success Banner */}
          {isSavedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Template saved successfully! Available in Template Library.</span>
            </div>
          )}

          {/* Submit Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-colors"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={isSavedSuccess || !templateName.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:opacity-90 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Save Custom Template</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
