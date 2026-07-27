import React, { useState, useRef } from 'react';
import { 
  Plus, 
  MessageSquare, 
  Bot, 
  User, 
  Users, 
  Zap, 
  Workflow, 
  Settings, 
  Send, 
  Mic, 
  MicOff, 
  Paperclip, 
  GitFork, 
  MoreVertical,
  CheckCircle2,
  Trash2,
  LayoutGrid,
  Columns
} from 'lucide-react';
import { CardItemData, ListConfig, ListType, RBACRole } from '../types';
import { CardItem } from './CardItem';

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
  onMoveCard,
  onTagClick,
  currentRole,
  onUpdateCard,
}) => {
  const [chatText, setChatText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
          // Call transcribe API
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioData: base64Audio, mimeType: 'audio/webm' })
          });
          const data = await res.json();
          if (data.text) {
            onSendChatMessage(list.id, data.text);
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
      className={`flex-shrink-0 ${list.isTwoColumns ? 'w-80 md:w-[540px]' : 'w-80 md:w-96'} flex flex-col h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden select-none ring-1 ring-white/5 transition-all duration-300 ${
        isDragOver ? 'border-2 border-dashed border-indigo-400 bg-indigo-500/10 scale-[1.01] shadow-2xl ring-2 ring-indigo-500/40' : ''
      }`}
    >
      {/* Header */}
      <div className="p-3.5 border-b border-white/10 bg-white/5 flex flex-col gap-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-lg bg-white/10 border border-white/10 text-slate-200">
              <BadgeIcon className="w-4 h-4 text-indigo-400" />
            </span>
            <h3 className="text-sm font-bold text-slate-100 truncate">
              {list.title}
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 font-mono text-indigo-200 font-semibold border border-white/10">
              {list.cards.length}
            </span>
            {list.isTwoColumns && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                2-Col
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onToggleTwoColumns && (
              <button
                onClick={() => onToggleTwoColumns(list.id)}
                className={`p-1.5 rounded-lg border transition-colors ${
                  list.isTwoColumns 
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200' 
                    : 'text-slate-400 hover:text-white hover:bg-white/10 border-transparent'
                }`}
                title={list.isTwoColumns ? "Switch to single column layout" : "Switch to 2-column grid layout"}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onOpenListSettings(list)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="List Settings & Feed-Forward Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => onAddCard(list.id)}
              className="p-1.5 rounded-lg text-slate-200 hover:text-white bg-white/10 hover:bg-indigo-600/80 transition-colors border border-white/10"
              title="Add New Card"
            >
              <Plus className="w-4 h-4" />
            </button>
            {onDeleteList && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete list "${list.title}" and all its cards?`)) {
                    onDeleteList(list.id);
                  }
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                title="Delete List"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-Badges & Feed Forward Indicator */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border backdrop-blur-sm ${badgeInfo.bg} ${badgeInfo.text}`}>
              <span>{badgeInfo.label}</span>
            </span>

            {list.autoSortByPriority && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono text-[10px]" title="Auto-sorted by priority">
                <span>Priority Sorted</span>
              </span>
            )}
          </div>

          {list.feedForwardTargetBoardId && (
            <span className="flex items-center gap-1 text-purple-300 font-mono text-[10px]" title="Feeds to another board">
              <GitFork className="w-3 h-3 text-purple-400" />
              <span>Router Active</span>
            </span>
          )}
        </div>
      </div>

      {/* Cards Stream Area */}
      <div className={`flex-1 overflow-y-auto p-3 custom-scrollbar ${
        list.isTwoColumns ? 'grid grid-cols-1 md:grid-cols-2 gap-3 space-y-0' : 'space-y-3'
      }`}>
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
          <div className="py-12 px-4 text-center text-slate-400 text-xs border-2 border-dashed border-white/10 rounded-xl bg-white/5">
            No cards in this list yet. Click + above or use Orchestrator Agent to populate.
          </div>
        )}
      </div>

      {/* Sticky Bottom Composer for Chat Feed Lists */}
      {list.listType === 'chat_feed' && (
        <div className="p-3 border-t border-white/10 bg-slate-950/80 backdrop-blur-lg sticky bottom-0 z-10 space-y-2">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
            <span>Sticky Chat Composer</span>
            <span className="text-indigo-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Appends Card Stream</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              placeholder="Type message to convert to card..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />

            {/* Mic voice recorder button */}
            <button
              onClick={isRecording ? handleStopMic : handleStartMic}
              className={`p-2 rounded-xl transition-colors ${
                isRecording ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-slate-300 hover:bg-white/20 border border-white/10'
              }`}
              title={isRecording ? 'Stop Recording' : 'Record voice message'}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-indigo-400" />}
            </button>

            {/* Send Button */}
            <button
              onClick={handleSendChat}
              disabled={!chatText.trim()}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors shadow-md shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
