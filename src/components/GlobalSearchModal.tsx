import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Layers, 
  Workflow, 
  CheckSquare, 
  Tag, 
  ArrowRight, 
  Bot, 
  User, 
  Sparkles,
  Command,
  CornerDownLeft
} from 'lucide-react';
import { BoardData, CardItemData, ListConfig } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: BoardData[];
  onSelectSearchResult: (type: 'board' | 'list' | 'card', boardId: string, listId?: string, card?: CardItemData) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  boards,
  onSelectSearchResult
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search indexing
  const matchedBoards: BoardData[] = [];
  const matchedLists: { list: ListConfig; board: BoardData }[] = [];
  const matchedCards: { card: CardItemData; list: ListConfig; board: BoardData }[] = [];

  const trimmedQuery = query.trim().toLowerCase();

  if (trimmedQuery.length > 0) {
    boards.forEach(b => {
      // Board title/category/description match
      if (
        b.name.toLowerCase().includes(trimmedQuery) ||
        b.category.toLowerCase().includes(trimmedQuery) ||
        b.description.toLowerCase().includes(trimmedQuery)
      ) {
        matchedBoards.push(b);
      }

      b.lists.forEach(l => {
        // List title match
        if (l.title.toLowerCase().includes(trimmedQuery) || l.listType.toLowerCase().includes(trimmedQuery)) {
          matchedLists.push({ list: l, board: b });
        }

        l.cards.forEach(c => {
          // Card title, description, or tag match
          const matchesTitle = c.title.toLowerCase().includes(trimmedQuery);
          const matchesDesc = c.description.toLowerCase().includes(trimmedQuery);
          const matchesTags = c.tags.some(t => t.toLowerCase().includes(trimmedQuery));
          const matchesPrompt = c.prompt && c.prompt.toLowerCase().includes(trimmedQuery);

          if (matchesTitle || matchesDesc || matchesTags || matchesPrompt) {
            matchedCards.push({ card: c, list: l, board: b });
          }
        });
      });
    });
  }

  const totalResults = matchedBoards.length + matchedLists.length + matchedCards.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ring-1 ring-white/10">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 bg-white/5 gap-3">
          <Search className="w-5 h-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cards, lists, tags, or boards across entire workspace..."
            className="w-full bg-transparent text-slate-100 placeholder:text-slate-500 text-sm font-medium focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-mono border border-white/10"
          >
            ESC
          </button>
        </div>

        {/* Results List */}
        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {trimmedQuery.length === 0 && (
            <div className="py-8 text-center space-y-2">
              <Command className="w-8 h-8 text-indigo-400 mx-auto opacity-50" />
              <p className="text-xs text-slate-400">
                Type keywords to search cards, tags, lists, or board titles.
              </p>
              <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono pt-2">
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Ctrl + K</span>
                <span>or</span>
                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">Ctrl + N</span>
                <span>for quick shortcuts</span>
              </div>
            </div>
          )}

          {trimmedQuery.length > 0 && totalResults === 0 && (
            <div className="py-12 text-center text-slate-400 text-xs">
              No cards, lists, or boards matching "<span className="text-indigo-300">{query}</span>"
            </div>
          )}

          {/* Cards Section */}
          {matchedCards.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Matching Cards ({matchedCards.length})</span>
                <span className="text-indigo-400 font-mono">Tasks & Routines</span>
              </div>
              <div className="space-y-1.5">
                {matchedCards.slice(0, 10).map(({ card, list, board }) => (
                  <div
                    key={card.id}
                    onClick={() => {
                      onSelectSearchResult('card', board.id, list.id, card);
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                          {card.title}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30 shrink-0 capitalize">
                          {card.entityType}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {card.description}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-1">
                        <span>Board: {board.name}</span>
                        <span>•</span>
                        <span>List: {list.title}</span>
                      </div>
                    </div>
                    <CornerDownLeft className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lists Section */}
          {matchedLists.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Lists ({matchedLists.length})
              </div>
              <div className="space-y-1.5">
                {matchedLists.slice(0, 5).map(({ list, board }) => (
                  <div
                    key={list.id}
                    onClick={() => {
                      onSelectSearchResult('list', board.id, list.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Workflow className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                          {list.title}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Board: {board.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      {list.cards.length} cards
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boards Section */}
          {matchedBoards.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Matching Boards ({matchedBoards.length})
              </div>
              <div className="space-y-1.5">
                {matchedBoards.map((board) => (
                  <div
                    key={board.id}
                    onClick={() => {
                      onSelectSearchResult('board', board.id);
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Layers className="w-4 h-4 text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-purple-300 transition-colors">
                          {board.name}
                        </span>
                        <span className="text-[10px] text-slate-400 block">{board.category}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                      {board.lists.length} lists
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>{totalResults} results indexed</span>
          <span>Press ESC or click outside to dismiss</span>
        </div>
      </div>
    </div>
  );
};
