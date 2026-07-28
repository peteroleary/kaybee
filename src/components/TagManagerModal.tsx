import React, { useState } from 'react';
import { 
  Tag, 
  X, 
  Search, 
  Edit2, 
  Trash2, 
  Check, 
  Filter, 
  Palette, 
  Plus, 
  Sparkles,
  Layers
} from 'lucide-react';
import { BoardData } from '../types';
import { getTagStyle, PRESET_TAG_COLORS } from '../data/tagsAndThemes';
import { Modal } from './ui/Modal';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardData[];
  selectedTagFilter: string | null;
  onSelectTagFilter: (tag: string | null) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTag: (tag: string) => void;
  customTagColors: Record<string, string>;
  onUpdateTagColor: (tag: string, colorKey: string) => void;
}

export const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  boards,
  selectedTagFilter,
  onSelectTagFilter,
  onRenameTag,
  onDeleteTag,
  customTagColors,
  onUpdateTagColor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editInputValue, setEditInputValue] = useState('');
  const [colorPickerOpenTag, setColorPickerOpenTag] = useState<string | null>(null);
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [newTagColor, setNewTagColor] = useState('indigo');
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (!isOpen) return null;

  // Extract all unique tags and compute occurrences across all boards
  const tagStatsMap: Record<string, { count: number; boardsCount: Set<string>; originalName: string }> = {};

  boards.forEach(b => {
    b.lists.forEach(l => {
      l.cards.forEach(c => {
        c.tags?.forEach(t => {
          const trimmed = t.trim();
          if (!trimmed) return;
          const key = trimmed.toLowerCase();
          if (!tagStatsMap[key]) {
            tagStatsMap[key] = {
              count: 0,
              boardsCount: new Set<string>(),
              originalName: trimmed
            };
          }
          tagStatsMap[key].count += 1;
          tagStatsMap[key].boardsCount.add(b.name);
        });
      });
    });
  });

  const allTagsList = Object.keys(tagStatsMap).map(key => ({
    key,
    name: tagStatsMap[key].originalName,
    count: tagStatsMap[key].count,
    boardsCount: tagStatsMap[key].boardsCount.size
  })).sort((a, b) => b.count - a.count);

  // Filter tags based on search
  const filteredTags = allTagsList.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (tagName: string) => {
    setEditingTag(tagName);
    setEditInputValue(tagName);
    setColorPickerOpenTag(null);
    setConfirmDeleteTag(null);
  };

  const handleSaveRename = (oldTag: string) => {
    const trimmed = editInputValue.trim().replace(/^#/, '');
    if (trimmed && trimmed !== oldTag) {
      onRenameTag(oldTag, trimmed);
    }
    setEditingTag(null);
    setEditInputValue('');
  };

  const handleCreateNewTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTagInput.trim().replace(/^#/, '');
    if (!trimmed) return;
    onUpdateTagColor(trimmed, newTagColor);
    setNewTagInput('');
    setShowCreateForm(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Tag Manager & Hashtag Filters</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/30">
                  {allTagsList.length} Global Tags
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                View, filter, rename, delete, and customize tag aesthetics across all boards
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Close Tag Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Banner if active */}
        {selectedTagFilter && (
          <div className="px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Active Board Filter:</span>
              <span className="px-2.5 py-1 rounded-md bg-indigo-600 text-white font-bold flex items-center gap-1.5 shadow-sm">
                <span>#{selectedTagFilter}</span>
              </span>
            </div>
            <button
              onClick={() => onSelectTagFilter(null)}
              className="text-indigo-300 hover:text-white font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Toolbar: Search + Create Tag Trigger */}
        <div className="p-4 bg-white/5 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags by name..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showCreateForm ? 'Cancel' : 'New Tag'}</span>
          </button>
        </div>

        {/* Create Tag Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateNewTag} className="p-4 bg-indigo-950/30 border-b border-indigo-500/30 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-200">Tag Name:</span>
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              placeholder="e.g. backend, priority-1, client"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-400 flex-1 min-w-[150px]"
              autoFocus
            />

            <span className="text-xs font-bold text-slate-200">Color:</span>
            <div className="flex items-center gap-1.5">
              {Object.keys(PRESET_TAG_COLORS).slice(0, 8).map(key => {
                const preset = PRESET_TAG_COLORS[key];
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setNewTagColor(key)}
                    className={`w-5 h-5 rounded-full border transition-all ${
                      newTagColor === key ? 'ring-2 ring-white scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  />
                );
              })}
            </div>

            <button
              type="submit"
              disabled={!newTagInput.trim()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-colors ml-auto"
            >
              Add Tag Palette
            </button>
          </form>
        )}

        {/* Tag List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Tag className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium">No tags found</p>
              <p className="text-xs text-slate-500">
                {searchQuery ? `No tags matching "${searchQuery}"` : 'Cards on your board have not been assigned hashtags yet.'}
              </p>
            </div>
          ) : (
            filteredTags.map((t) => {
              const isSelected = selectedTagFilter?.toLowerCase() === t.key;
              const isEditing = editingTag === t.name;
              const isColorPickerOpen = colorPickerOpenTag === t.name;
              const isConfirmingDelete = confirmDeleteTag === t.name;
              const tagStyle = getTagStyle(t.name, customTagColors);

              return (
                <div
                  key={t.key}
                  className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isSelected 
                      ? 'bg-indigo-950/50 border-indigo-500/60 shadow-lg ring-1 ring-indigo-500/40' 
                      : 'bg-white/5 hover:bg-white/10 border-white/10'
                  }`}
                >
                  {/* Left: Tag Preview & Stats */}
                  <div className="flex items-center gap-3 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm font-bold text-slate-400">#</span>
                        <input
                          type="text"
                          value={editInputValue}
                          onChange={(e) => setEditInputValue(e.target.value)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-indigo-400 text-xs text-white focus:outline-none font-semibold"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(t.name);
                            if (e.key === 'Escape') setEditingTag(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRename(t.name)}
                          className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                          title="Save Rename"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingTag(null)}
                          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Styled Tag Badge */}
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 shrink-0 ${tagStyle.bg} ${tagStyle.text} ${tagStyle.border}`}>
                          <span className={`w-2 h-2 rounded-full ${tagStyle.dot}`} />
                          <span>#{t.name}</span>
                        </span>

                        {/* Occurrence Stats */}
                        <div className="text-xs text-slate-400 flex items-center gap-2 pl-2 border-l border-white/10">
                          <span className="font-semibold text-slate-200">{t.count} card{t.count !== 1 ? 's' : ''}</span>
                          <span className="text-slate-600">•</span>
                          <span>{t.boardsCount} board{t.boardsCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions (Filter, Color Picker, Rename, Delete) */}
                  <div className="flex items-center gap-1.5 self-end md:self-auto shrink-0">
                    
                    {/* Toggle Board Filter */}
                    <button
                      onClick={() => onSelectTagFilter(isSelected ? null : t.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md' 
                          : 'bg-white/5 hover:bg-white/15 border-white/10 text-slate-300 hover:text-white'
                      }`}
                      title={isSelected ? 'Clear Filter' : `Filter active board by #${t.name}`}
                    >
                      <Filter className="w-3 h-3" />
                      <span>{isSelected ? 'Filtering' : 'Filter'}</span>
                    </button>

                    {/* Color Picker Toggle */}
                    <button
                      onClick={() => {
                        setColorPickerOpenTag(isColorPickerOpen ? null : t.name);
                        setEditingTag(null);
                        setConfirmDeleteTag(null);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-purple-300 hover:text-purple-200 transition-colors"
                      title="Change Tag Color Palette"
                    >
                      <Palette className="w-3.5 h-3.5" />
                    </button>

                    {/* Rename Button */}
                    <button
                      onClick={() => handleStartRename(t.name)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-amber-300 hover:text-amber-200 transition-colors"
                      title="Rename Tag Globally"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Button */}
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/40 p-1 rounded-lg">
                        <span className="text-xs text-rose-200 font-bold px-1">Delete?</span>
                        <button
                          onClick={() => {
                            onDeleteTag(t.name);
                            setConfirmDeleteTag(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDeleteTag(null)}
                          className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmDeleteTag(t.name);
                          setColorPickerOpenTag(null);
                          setEditingTag(null);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete Tag Globally from All Cards"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Inline Color Picker Panel */}
                  {isColorPickerOpen && (
                    <div className="w-full pt-2 border-t border-white/10 flex items-center justify-between gap-2 mt-1">
                      <span className="text-xs text-slate-400 font-semibold">Select Color Aesthetic:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.keys(PRESET_TAG_COLORS).map(colorKey => {
                          const preset = PRESET_TAG_COLORS[colorKey];
                          const isCurrent = customTagColors[t.key] === colorKey;
                          return (
                            <button
                              key={colorKey}
                              onClick={() => {
                                onUpdateTagColor(t.name, colorKey);
                                setColorPickerOpenTag(null);
                              }}
                              className={`w-6 h-6 rounded-full border transition-all flex items-center justify-center ${
                                isCurrent ? 'ring-2 ring-white scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                              }`}
                              style={{ backgroundColor: preset.hex }}
                              title={`${preset.name} palette`}
                            >
                              {isCurrent && <Check className="w-3 h-3 text-white drop-shadow" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Changes automatically sync globally across all boards</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
          >
            Done
          </button>
        </div>
    </Modal>
  );
};
