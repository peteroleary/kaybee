import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { CARD_TEMPLATES, CardTemplate } from '../data/templates';
import { CardItemData, EntityType, ListConfig } from '../types';
import { autoSuggestTags } from '../utils/nlpAutoTag';
import { Modal } from './ui/Modal';

interface CreateCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string | null;
  lists: ListConfig[];
  onCreateCard: (targetListId: string, cardData: Partial<CardItemData>) => void;
}

export const CreateCardModal: React.FC<CreateCardModalProps> = ({
  isOpen,
  onClose,
  listId,
  lists,
  onCreateCard
}) => {
  const [selectedListId, setSelectedListId] = useState<string>(listId || lists[0]?.id || '');
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(CARD_TEMPLATES[0]);
  const [title, setTitle] = useState(CARD_TEMPLATES[0].defaultTitle);
  const [description, setDescription] = useState(CARD_TEMPLATES[0].defaultDescription);
  const [entityType, setEntityType] = useState<EntityType>(CARD_TEMPLATES[0].entityType);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>(CARD_TEMPLATES[0].priority);
  const [prompt, setPrompt] = useState(CARD_TEMPLATES[0].prompt || '');
  const [tagsInput, setTagsInput] = useState(CARD_TEMPLATES[0].tags.join(', '));

  React.useEffect(() => {
    if (listId) {
      setSelectedListId(listId);
    } else if (lists.length > 0) {
      setSelectedListId(lists[0].id);
    }
  }, [listId, lists]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tpl: CardTemplate | null) => {
    setSelectedTemplate(tpl);
    if (tpl) {
      setTitle(tpl.defaultTitle);
      setDescription(tpl.defaultDescription);
      setEntityType(tpl.entityType);
      setPriority(tpl.priority);
      setPrompt(tpl.prompt || '');
      setTagsInput(tpl.tags.join(', '));
    } else {
      setTitle('');
      setDescription('');
      setEntityType('task');
      setPriority('medium');
      setPrompt('');
      setTagsInput('');
    }
  };

  const handleCreate = () => {
    if (!title.trim() || !selectedListId) return;

    const userTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    // Run NLP Auto-tagging routine
    const finalTags = autoSuggestTags(title, description, userTags);

    const widgets = selectedTemplate ? [...selectedTemplate.widgets] : [
      {
        id: `w-${Date.now()}`,
        type: 'toggle',
        label: 'Requires Agent Verification',
        value: false
      }
    ];

    onCreateCard(selectedListId, {
      title,
      description,
      entityType,
      priority,
      prompt,
      tags: finalTags,
      widgets,
      status: 'todo',
      progress: 0,
      subtasks: []
    });

    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Create New Card</span>
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  With Templates
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Choose a pre-populated card template or customize a new task routine.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
          {/* Card Template Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Select Card Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handleApplyTemplate(null)}
                className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                  selectedTemplate === null
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/20'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
                }`}
              >
                <span className="font-bold block">Blank Card</span>
                <span className="text-xs opacity-75">Start scratch</span>
              </button>

              {CARD_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedTemplate?.id === tpl.id
                      ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 ring-1 ring-indigo-400/50'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10 border-white/10'
                  }`}
                >
                  <span className="font-bold block truncate">{tpl.name}</span>
                  <span className="text-xs text-slate-400 block truncate">{tpl.tags.join(', ')}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Target List Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Target List
              </label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {lists.map(l => (
                  <option key={l.id} value={l.id}>{l.title} ({l.listType})</option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Card Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Card title..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Card description..."
                className="w-full h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
              />
            </div>

            {/* Row: Entity Type & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Entity Type
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as EntityType)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-slate-200 text-xs"
                >
                  <option value="task">Task</option>
                  <option value="human">Human</option>
                  <option value="agent">AI Agent</option>
                  <option value="routine">Routine</option>
                  <option value="troop">Troop (Hybrid)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-xl text-slate-200 text-xs capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Bug, Triage, Security"
                className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none"
              />
            </div>

            {/* Agent Prompt Field if applicable */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Agent Prompt Routine (Optional)</span>
              </label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Execute code diagnostic and generate test cases..."
                className="w-full px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-200 text-xs focus:outline-none placeholder:text-purple-300/50"
              />
            </div>

            {/* Template Widgets Preview */}
            {selectedTemplate && selectedTemplate.widgets.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Pre-configured Widgets Included ({selectedTemplate.widgets.length})
                </span>
                <div className="space-y-1">
                  {selectedTemplate.widgets.map((w, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="font-medium">{w.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono capitalize">
                        {w.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hi disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Card</span>
          </button>
        </div>
    </Modal>
  );
};
