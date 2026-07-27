import React, { useRef, useState } from 'react';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Compass, 
  Maximize2, 
  Sparkles,
  GitFork,
  Filter,
  X,
  Tag,
  Mic,
  BarChart3,
  Palette,
  Archive,
  Flame,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { BoardData, CardItemData, ListConfig, RBACRole } from '../types';
import { ListColumn } from './ListColumn';
import { BOARD_THEMES, getTagStyle } from '../data/tagsAndThemes';

interface BoardCanvasProps {
  board: BoardData;
  onUpdateCardWidget: (cardId: string, widgetId: string, newValue: any) => void;
  onOpenCardDetail: (card: CardItemData) => void;
  onRunAgentTask: (card: CardItemData) => void;
  onAddCard: (listId: string) => void;
  onSendChatMessage: (listId: string, messageText: string) => void;
  onOpenListSettings: (list: ListConfig) => void;
  onDeleteList?: (listId: string) => void;
  onDeleteCard?: (cardId: string, listId?: string) => void;
  onAddList: (direction: 'left' | 'right') => void;
  onMoveCard?: (cardId: string, sourceListId: string, targetListId: string) => void;
  onOpenVoiceModal: () => void;
  onOpenAnalyticsModal: () => void;
  onOpenThemeModal: () => void;
  onOpenAutoArchiveModal: () => void;
  smartFilterActive?: boolean;
  currentRole: RBACRole;
  zoomLevel: number;
  onUpdateCard?: (updatedCard: CardItemData) => void;
  isHeatmapActive?: boolean;
  selectedTagFilter?: string | null;
  onSelectTagFilter?: (tag: string | null) => void;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  board,
  onUpdateCardWidget,
  onOpenCardDetail,
  onRunAgentTask,
  onAddCard,
  onSendChatMessage,
  onOpenListSettings,
  onDeleteList,
  onDeleteCard,
  onAddList,
  onMoveCard,
  onOpenVoiceModal,
  onOpenAnalyticsModal,
  onOpenThemeModal,
  onOpenAutoArchiveModal,
  smartFilterActive = false,
  currentRole,
  zoomLevel,
  onUpdateCard,
  isHeatmapActive: externalHeatmapActive,
  selectedTagFilter: externalTagFilter,
  onSelectTagFilter,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [internalTagFilter, setInternalTagFilter] = useState<string | null>(null);
  const [internalHeatmapActive, setInternalHeatmapActive] = useState(false);

  const selectedTagFilter = externalTagFilter !== undefined ? externalTagFilter : internalTagFilter;
  const isHeatmapActive = externalHeatmapActive !== undefined ? externalHeatmapActive : internalHeatmapActive;

  // Find active board theme
  const activeTheme = BOARD_THEMES.find(t => t.id === board.theme) || BOARD_THEMES[0];

  // Extract all unique tags across cards on this board
  const allBoardTagsSet = new Set<string>();
  board.lists.forEach(l => {
    l.cards.forEach(c => {
      c.tags?.forEach(t => allBoardTagsSet.add(t));
    });
  });
  const allBoardTags = Array.from(allBoardTagsSet);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.altKey) { // Middle click or Alt+click for panning
      setIsPanning(true);
      setStartX(e.pageX - (containerRef.current?.offsetLeft || 0));
      setScrollLeft(containerRef.current?.scrollLeft || 0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const scrollToList = (index: number) => {
    if (containerRef.current) {
      const listWidth = 380;
      containerRef.current.scrollTo({
        left: index * listWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleGuardedMoveCard = (cardId: string, sourceListId: string, targetListId: string) => {
    if (!onMoveCard) return;

    const targetList = board.lists.find(l => l.id === targetListId);
    const targetIsCompleted = targetList?.title.toLowerCase().includes('done') || 
                              targetList?.title.toLowerCase().includes('completed') || 
                              targetList?.title.toLowerCase().includes('archive');

    if (targetIsCompleted) {
      // Find card being moved
      let sourceCard: CardItemData | undefined;
      board.lists.forEach(l => {
        const found = l.cards.find(c => c.id === cardId);
        if (found) sourceCard = found;
      });

      if (sourceCard?.dependsOnCardIds && sourceCard.dependsOnCardIds.length > 0) {
        const allCards = board.lists.flatMap(l => l.cards);
        const incompletePrereqs: string[] = [];

        sourceCard.dependsOnCardIds.forEach(depId => {
          const depCard = allCards.find(c => c.id === depId);
          if (depCard && depCard.progress < 100) {
            incompletePrereqs.push(depCard.title);
          }
        });

        if (incompletePrereqs.length > 0) {
          alert(`🚫 MOVE BLOCKED BY DEPENDENCIES!\n\nCannot move task "${sourceCard.title}" to "${targetList?.title}" because the following prerequisite task(s) are not completed yet:\n\n• ${incompletePrereqs.join('\n• ')}\n\nPlease complete the dependencies first before marking this card as finished.`);
          return;
        }
      }
    }

    onMoveCard(cardId, sourceListId, targetListId);
  };

  // Helper to compute list velocity score for heatmap layer
  const getListVelocity = (list: ListConfig) => {
    if (list.cards.length === 0) return { score: 0, level: 'low', color: 'border-slate-700/50', bg: 'bg-slate-900/40' };
    const avgProgress = list.cards.reduce((acc, c) => acc + (c.progress || 0), 0) / list.cards.length;
    const completedCount = list.cards.filter(c => c.progress === 100).length;
    const score = Math.round((avgProgress * 0.6) + ((completedCount / list.cards.length) * 40));

    if (score >= 70) return { score, level: 'high', label: '🔥 High Velocity', color: 'border-rose-500/80 ring-2 ring-rose-500/50 shadow-rose-500/20', bg: 'bg-rose-950/30' };
    if (score >= 40) return { score, level: 'med', label: '⚡ Med Velocity', color: 'border-amber-500/80 ring-2 ring-amber-500/50 shadow-amber-500/20', bg: 'bg-amber-950/30' };
    return { score, level: 'low', label: '❄️ Low Velocity', color: 'border-cyan-500/50 ring-1 ring-cyan-500/30', bg: 'bg-cyan-950/20' };
  };

  // Filter cards per list if a tag filter is selected, or collapse empty lists if Smart Filter is active
  let processedLists = board.lists.map(list => {
    if (!selectedTagFilter) return list;
    return {
      ...list,
      cards: list.cards.filter(card => 
        card.tags?.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase())
      )
    };
  });

  if (smartFilterActive) {
    processedLists = processedLists.filter(list => list.cards.length > 0);
  }

  return (
    <div id="board-canvas-container" className={`relative flex-1 ${activeTheme.canvasBg} transition-all duration-500 overflow-hidden flex flex-col`}>
      
      {/* Main Horizontal Infinite Scroll Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 min-h-0 overflow-x-auto p-4 flex gap-6 items-stretch custom-scrollbar select-none transition-transform origin-top-left ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left', width: `${100 / zoomLevel}%` }}
      >
        {/* Far Left Infinite Expansion Trigger */}
        <div className="flex-shrink-0 self-center">
          <button
            onClick={() => onAddList('left')}
            className="h-96 w-14 rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-white/10 backdrop-blur-sm text-slate-400 hover:text-indigo-300 flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider rotate-90">Left +1</span>
          </button>
        </div>

        {/* Board List Columns */}
        {processedLists.map((list) => {
          const vel = getListVelocity(list);
          return (
            <div key={list.id} className="relative group h-full flex flex-col min-h-0">
              {isHeatmapActive && (
                <div className={`absolute -top-3 left-3 right-3 z-20 py-1 px-3 rounded-t-lg backdrop-blur-md text-[10px] font-bold font-mono text-white flex items-center justify-between border-t border-x shadow-lg transition-all ${vel.bg} ${vel.color}`}>
                  <span>{vel.label}</span>
                  <span>{vel.score}% Velocity</span>
                </div>
              )}
              <div className={`flex-1 flex flex-col min-h-0 transition-all duration-300 rounded-2xl ${isHeatmapActive ? `pt-4 rounded-t-none ${vel.color}` : ''}`}>
                <ListColumn
                  list={list}
                  onUpdateCardWidget={onUpdateCardWidget}
                  onOpenCardDetail={onOpenCardDetail}
                  onRunAgentTask={onRunAgentTask}
                  onAddCard={onAddCard}
                  onSendChatMessage={onSendChatMessage}
                  onOpenListSettings={onOpenListSettings}
                  onDeleteList={onDeleteList}
                  onDeleteCard={onDeleteCard}
                  onMoveCard={handleGuardedMoveCard}
                  onTagClick={(tag) => onSelectTagFilter ? onSelectTagFilter(tag) : setInternalTagFilter(tag)}
                  currentRole={currentRole}
                  onUpdateCard={onUpdateCard}
                />
              </div>
            </div>
          );
        })}

        {/* Far Right Infinite Expansion Trigger */}
        <div className="flex-shrink-0 self-center">
          <button
            onClick={() => onAddList('right')}
            className="h-96 w-14 rounded-2xl border-2 border-dashed border-white/15 hover:border-indigo-400/50 hover:bg-white/10 backdrop-blur-sm text-slate-400 hover:text-indigo-300 flex flex-col items-center justify-center gap-2 transition-all group"
          >
            <Plus className="w-5 h-5 group-hover:scale-125 transition-transform" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider -rotate-90">Right +1</span>
          </button>
        </div>
      </div>

      {/* Bottom Minimap & Canvas Navigator Bar */}
      <div className="p-3 bg-black/30 backdrop-blur-md border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Lists Navigator:</span>
          {board.lists.map((l, idx) => (
            <button
              key={l.id}
              onClick={() => scrollToList(idx)}
              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-indigo-600/30 hover:border-indigo-400/40 border border-white/10 backdrop-blur-md text-slate-200 font-medium whitespace-nowrap transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>{l.title}</span>
              <span className="text-[10px] text-slate-400 font-mono">({l.cards.length})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Board: {board.name}</span>
          <span>•</span>
          <span>Theme: {activeTheme.name}</span>
        </div>
      </div>
    </div>
  );
};

