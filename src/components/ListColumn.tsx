import React, { useState, useRef } from 'react';
import {
  Plus,
  MessageSquare,
  Bot,
  User,
  Zap,
  Workflow,
  Settings,
  Send,
  Mic,
  MicOff,
  GitFork,
  Trash2,
  LayoutGrid
} from 'lucide-react';
import { CardItemData, ListConfig, ListType, RBACRole } from '../types';
import { CardItem } from './CardItem';
import { apiPost } from '../lib/api/client';

interface ListColumnProps {
  list: ListConfig;
  onUpdateCardWidget: (cardId: string, widgetId: string, newValue: any) => void;
  onOpenCardDetail: (card: CardItemData) => void;
  onRunAgentTask: (card: CardItemData) => void;
  onAddCard: (listId: string, cardData?: Partial<CardItemData>) => void;
  onSendChatMessage: (listId: string, messageText: string, audioData?: string) => void;
  onOpenListSettings: (list: ListConfig) => void;
  onDeleteList?: (listId: string) => void;
  onDeleteCard?: (cardId: string, listId?: string) => void;
  onToggleTwoColumns?: (listId: string) => void;
  onResizeListWidth?: (listId: string, width: number) => void;
  onMoveCard?: (cardId: string, sourceListId: string, targetListId: string) => void;
  onTagClick?: (tag: string) => void;
  currentRole: RBACRole;
  onUpdateCard?: (updatedCard: CardItemData) => void;
}

export const ListColumn: React.FC<ListColumnProps> = ({
  list,
  onUpdateCardWidget,
  onOpenCardDetail,
  onRunAgentTask,
  onAddCard,
  onSendChatMessage,
  onOpenListSettings,
  onDeleteList,
  onDeleteCard,
  onToggleTwoColumns,
  onResizeListWidth,
  onMoveCard,
  onTagClick,
  currentRole,
  onUpdateCard,
}) => {
  const [chatText, setChatText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [currentWidth, setCurrentWidth] = useState<number | undefined>(list.width);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  // Keep local width state synchronized if list.width or isTwoColumns changes externally
  React.useEffect(() => {
    if (list.width !== undefined) {
      setCurrentWidth(list.width);
    }
  }, [list.width, list.isTwoColumns]);

  // Auto-scroll chat feed to bottom when new cards or messages are added
  React.useEffect(() => {
    if (list.listType === 'chat_feed' && cardsContainerRef.current) {
      cardsContainerRef.current.scrollTop = cardsContainerRef.current.scrollHeight;
    }
  }, [list.cards.length, list.listType]);

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const initialWidth = currentWidth || (list.isTwoColumns ? 540 : 384);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(280, Math.min(800, initialWidth + deltaX));
      setCurrentWidth(newWidth);
      if (onResizeListWidth) {
        onResizeListWidth(list.id, newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const PRIORITY_SCORES: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1
  };

  const displayCards = [...list.cards].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (list.autoSortByPriority) {
      const scoreA = PRIORITY_SCORES[a.priority] || 0;
      const scoreB = PRIORITY_SCORES[b.priority] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
    }

    return 0;
  });

  const listTypeBadges: Record<ListType, { label: string; bg: string; text: string; icon: any }> = {
    chat_feed: { label: 'Chat Feed List', bg: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-400', icon: MessageSquare },
    homogenous: { 
      label: list.homogenousType === 'agents_only' ? 'Homogenous: Agents' : 'Homogenous: Humans', 
      bg: list.homogenousType === 'agents_only' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-emerald-500/10 border-emerald-500/30', 
      text: list.homogenousType === 'agents_only' ? 'text-purple-400' : 'text-emerald-400', 
      icon: list.homogenousType === 'agents_only' ? Bot : User 
    },
    heterogeneous: { label: 'Heterogeneous Troop', bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Zap },
    kanban: { label: 'Kanban Stage', bg: 'bg-slate-700/50 border-slate-600', text: 'text-slate-300', icon: Workflow },
    pipeline: { label: 'Automated Pipeline', bg: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-400', icon: Workflow },
  };

  const badgeInfo = listTypeBadges[list.listType] || listTypeBadges.kanban;
  const BadgeIcon = badgeInfo.icon;

  const handleSendChat = () => {
    if (!chatText.trim()) return;
    onSendChatMessage(list.id, chatText);
    setChatText('');
  };

  const handleStartMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          try {
            const data = await apiPost<{ text?: string }>('/api/transcribe', {
              audioData: base64Audio,
              mimeType: 'audio/webm'
            });
            if (data.text) {
              onSendChatMessage(list.id, data.text);
            }
          } catch (err) {
            console.error('Transcribe error:', err);
          }
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
    }
  };

  const handleStopMic = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  return (
    <div 
      style={{ width: currentWidth ? `${currentWidth}px` : undefined }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        try {
          const rawData = e.dataTransfer.getData('application/json');
          if (rawData) {
            const { cardId, sourceListId } = JSON.parse(rawData);
            if (cardId && sourceListId && sourceListId !== list.id && onMoveCard) {
              onMoveCard(cardId, sourceListId, list.id);
            }
          }
        } catch (err) {
          console.error('Drop error:', err);
        }
      }}
      className={`relative flex-shrink-0 ${!currentWidth ? (list.isTwoColumns ? 'w-80 md:w-[540px]' : 'w-80 md:w-96') : ''} flex flex-col h-full bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg overflow-hidden select-none transition-all ${
        isResizing ? 'ring-1 ring-indigo-500' : ''
      } ${
        isDragOver ? 'border-indigo-500 bg-indigo-950/20 scale-[1.01]' : ''
      }`}
    >
      {/* Right Edge Column Resize Handle */}
      <div
        onMouseDown={handleMouseDownResize}
        onDoubleClick={() => {
          const resetWidth = list.isTwoColumns ? 540 : 384;
          setCurrentWidth(resetWidth);
          if (onResizeListWidth) onResizeListWidth(list.id, resetWidth);
        }}
        className="absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize hover:bg-indigo-500/20 group/resize z-30 transition-all flex items-center justify-center select-none"
        title="Drag to resize column width (Double-click to reset)"
      >
        <div className={`w-0.5 h-10 rounded-full transition-all ${isResizing ? 'bg-indigo-400' : 'bg-slate-700 group-hover/resize:bg-indigo-400'}`} />
      </div>
      {/* Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-xs font-bold text-slate-200 truncate">
              {list.title}
            </h3>
            <span className="text-xs px-2 py-0.2 rounded-full bg-slate-800 font-mono text-slate-300 font-medium border border-slate-700/60" title={`${list.cards.length} cards`}>
              {list.cards.length}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            {onToggleTwoColumns && (
              <button
                onClick={() => onToggleTwoColumns(list.id)}
                className={`p-1.5 rounded-lg transition-colors ${
                  list.isTwoColumns 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={list.isTwoColumns ? "Switch to single column" : "Switch to 2-column grid"}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => onOpenListSettings(list)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="List Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {list.listType !== 'chat_feed' && (
              <button
                onClick={() => onAddCard(list.id)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-indigo-600 transition-colors border border-slate-700/60"
                title="Add Card"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteList && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete list "${list.title}" and all its cards?`)) {
                    onDeleteList(list.id);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                title="Delete List"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-Badges & Router Status */}
        {(list.autoSortByPriority || list.feedForwardTargetBoardId) && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
            <div className="flex items-center gap-2">
              {list.autoSortByPriority && (
                <span className="font-mono text-slate-400">Auto-Sorted</span>
              )}
            </div>

            {list.feedForwardTargetBoardId && (
              <span className="flex items-center gap-1 text-indigo-400 font-mono">
                <GitFork className="w-3 h-3" />
                <span>Routed</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Cards Stream Area */}
      <div 
        ref={cardsContainerRef}
        className={`flex-1 overflow-y-auto p-2.5 custom-scrollbar ${
          list.isTwoColumns ? 'grid grid-cols-1 md:grid-cols-2 gap-2.5 space-y-0' : 'space-y-2.5'
        }`}
      >
        {displayCards.map(card => (
          <CardItem
            key={card.id}
            card={card}
            listId={list.id}
            onUpdateCardWidget={onUpdateCardWidget}
            onOpenCardDetail={onOpenCardDetail}
            onRunAgentTask={onRunAgentTask}
            onDeleteCard={onDeleteCard}
            onTagClick={onTagClick}
            currentRole={currentRole}
            onUpdateCard={onUpdateCard}
          />
        ))}

        {list.cards.length === 0 && (
          <div className="py-10 px-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg bg-slate-900/40">
            No cards in this list
          </div>
        )}
      </div>

      {/* Sticky Bottom Composer for Chat Feed Lists */}
      {list.listType === 'chat_feed' && (
        <div className="p-2.5 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Add item or message..."
              className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {/* Mic voice recorder button */}
            <button
              onClick={isRecording ? handleStopMic : handleStartMic}
              className={`p-1.5 rounded-lg transition-colors ${
                isRecording ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record voice message'}
            >
              {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendChat}
              disabled={!chatText.trim()}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
