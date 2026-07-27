import React, { useState } from 'react';
import { 
  User, 
  Bot, 
  Users, 
  Zap, 
  Workflow, 
  CheckSquare, 
  Play, 
  Pause,
  RotateCcw,
  Timer,
  Pin,
  Loader2, 
  Sliders, 
  ToggleLeft, 
  ToggleRight, 
  Plus, 
  Minus, 
  GitFork, 
  Clock, 
  AlertTriangle,
  Paperclip,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Tag,
  Link,
  Trash2,
  Lock
} from 'lucide-react';
import { CardItemData, EntityType, InteractiveWidget, RBACRole } from '../types';
import { getTagStyle } from '../data/tagsAndThemes';

interface CardItemProps {
  card: CardItemData;
  listId?: string;
  onUpdateCardWidget: (cardId: string, widgetId: string, newValue: any) => void;
  onOpenCardDetail: (card: CardItemData) => void;
  onRunAgentTask: (card: CardItemData) => void;
  onDeleteCard?: (cardId: string, listId?: string) => void;
  onTagClick?: (tag: string) => void;
  currentRole: RBACRole;
  onUpdateCard?: (updatedCard: CardItemData) => void;
}

export const CardItem: React.FC<CardItemProps> = ({
  card,
  listId,
  onUpdateCardWidget,
  onOpenCardDetail,
  onRunAgentTask,
  onDeleteCard,
  onTagClick,
  currentRole,
  onUpdateCard,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState<'stopwatch' | 'pomodoro'>('stopwatch');
  const [timerSeconds, setTimerSeconds] = useState(card.timeLoggerState?.elapsedSeconds || 0);

  React.useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (timerMode === 'pomodoro') {
            if (prev <= 1) {
              setTimerRunning(false);
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerMode]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateCard) {
      onUpdateCard({ ...card, isPinned: !card.isPinned });
    }
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerRunning(!timerRunning);
  };

  const handleResetTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerRunning(false);
    setTimerSeconds(timerMode === 'pomodoro' ? 1500 : 0);
  };

  const handleSwitchTimerMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerRunning(false);
    const nextMode = timerMode === 'stopwatch' ? 'pomodoro' : 'stopwatch';
    setTimerMode(nextMode);
    setTimerSeconds(nextMode === 'pomodoro' ? 1500 : 0);
  };

  const entityIcons: Record<EntityType, { icon: any; color: string; label: string }> = {
    task: { icon: CheckSquare, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', label: 'Task' },
    human: { icon: User, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', label: 'Human' },
    agent: { icon: Bot, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', label: 'AI Agent' },
    routine: { icon: Workflow, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', label: 'Routine' },
    human_team: { icon: Users, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', label: 'Human Team' },
    agent_swarm: { icon: Bot, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20', label: 'Agent Swarm' },
    troop: { icon: Zap, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', label: 'Troop (Hybrid)' },
  };

  const priorityColors: Record<string, string> = {
    low: 'bg-slate-700/50 text-slate-300',
    medium: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    high: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    urgent: 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse',
  };

  const EntityIcon = entityIcons[card.entityType]?.icon || CheckSquare;

  const handleRunAgent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(true);
    await onRunAgentTask(card);
    setIsRunning(false);
  };

  const totalLoggedSec = (card.timeLogs || []).reduce((acc, l) => acc + l.durationSeconds, 0);

  const isAgentCard = card.entityType === 'agent' || card.entityType === 'agent_swarm' || card.entityType === 'routine' || card.delegate?.type === 'agent' || card.delegate?.type === 'agent_swarm';

  const computeContributionScore = () => {
    let score = card.progress || 50;
    if (card.executionStatus === 'success') score += 15;
    if (card.subtasks && card.subtasks.length > 0) {
      const doneCount = card.subtasks.filter(s => s.completed).length;
      score += Math.round((doneCount / card.subtasks.length) * 15);
    }
    if (card.lastExecutionOutput) score += 10;
    return Math.min(99, Math.max(35, score));
  };

  const contributionScore = computeContributionScore();

  return (
    <div
      onClick={() => onOpenCardDetail(card)}
      draggable={true}
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id, sourceListId: listId }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
      className={`group relative bg-white/10 hover:bg-white/15 border backdrop-blur-md rounded-xl p-3.5 shadow-lg hover:shadow-2xl transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-3 ring-1 ${
        card.isPinned 
          ? 'border-amber-500/50 bg-amber-500/10 shadow-amber-500/10 ring-amber-500/30' 
          : 'border-white/10 hover:border-white/25 ring-white/5'
      } ${
        isDragging 
          ? 'scale-105 shadow-2xl rotate-1 z-30 opacity-90 ring-2 ring-indigo-400 border-indigo-400 bg-indigo-900/50 scale-[1.03]' 
          : 'hover:-translate-y-0.5'
      }`}
    >
      {/* Header Badges */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Pinned Badge Indicator if pinned */}
          {card.isPinned && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 backdrop-blur-sm shadow-sm" title="Pinned to top of list">
              <Pin className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Pinned</span>
            </span>
          )}

          {/* Entity Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border backdrop-blur-sm ${entityIcons[card.entityType]?.color}`}>
            <EntityIcon className="w-3 h-3" />
            <span>{entityIcons[card.entityType]?.label}</span>
          </span>

          {/* Priority Tag */}
          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border backdrop-blur-sm ${priorityColors[card.priority]}`}>
            {card.priority}
          </span>

          {/* AI Agent Contribution Score Badge */}
          {isAgentCard && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold backdrop-blur-sm shadow-sm" title="Dynamic AI Agent Contribution & Efficiency Score based on completion rate & orchestrator output">
              <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Score {contributionScore}%</span>
            </span>
          )}

          {/* Depends On Badge */}
          {card.dependsOnCardIds && card.dependsOnCardIds.length > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium backdrop-blur-sm" title={`Depends on ${card.dependsOnCardIds.length} prerequisite task(s)`}>
              <Link className="w-3 h-3 text-amber-400" />
              <span>{card.dependsOnCardIds.length} Deps</span>
            </span>
          )}

          {/* Time Logger Total Badge */}
          {totalLoggedSec > 0 && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium backdrop-blur-sm" title="Logged time">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{Math.floor(totalLoggedSec / 60)}m</span>
            </span>
          )}
        </div>

        {/* Action icons / Cross-Board Feed Link Indicator */}
        <div className="flex items-center gap-1">
          {/* Pin Button */}
          <button
            onClick={togglePin}
            className={`p-1 rounded-lg transition-colors ${
              card.isPinned 
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm' 
                : 'text-slate-400 hover:text-amber-300 hover:bg-white/10'
            }`}
            title={card.isPinned ? "Unpin Card" : "Pin Card to top of list"}
          >
            <Pin className={`w-3.5 h-3.5 ${card.isPinned ? 'fill-amber-400 text-amber-400' : ''}`} />
          </button>

          {card.targetBoardFeedId && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium backdrop-blur-sm" title="Feeds to another board">
              <GitFork className="w-3 h-3 text-purple-400" />
              <span>Routed</span>
            </span>
          )}

          {onDeleteCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete card "${card.title}"?`)) {
                  onDeleteCard(card.id, listId);
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-opacity"
              title="Delete Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Chat Sender info if chat card */}
      {card.chatSender && (
        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10 backdrop-blur-sm">
          <img
            src={card.chatSender.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120'}
            alt={card.chatSender.name}
            className="w-6 h-6 rounded-full object-cover border border-white/20"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1">
              <span className="truncate">{card.chatSender.name}</span>
              {card.chatSender.isAgent && (
                <span className="text-[9px] px-1 rounded bg-indigo-500/30 text-indigo-300">AI</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>{card.chatSender.role || 'Contributor'}</span>
              <span>{card.chatSender.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      {/* Card Title & Description */}
      <div>
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
          {card.title}
        </h4>
        {card.description && (
          <p className="text-xs text-slate-300 line-clamp-2 mt-1 leading-normal opacity-90">
            {card.description}
          </p>
        )}
      </div>

      {/* Visual Tag Badges Interface */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {card.tags.map((tag, idx) => {
            const style = getTagStyle(tag);
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border} hover:scale-105 transition-all shadow-sm cursor-pointer`}
                title={`Filter board by #${tag}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span>#{tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stopwatch or Pomodoro Timer Widget */}
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between p-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs backdrop-blur-md shadow-inner">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSwitchTimerMode}
            className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
              timerMode === 'pomodoro' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
            }`}
            title={`Mode: ${timerMode.toUpperCase()}. Click to switch.`}
          >
            <Timer className="w-3 h-3" />
            <span>{timerMode === 'pomodoro' ? 'Pomo (25m)' : 'Stopwatch'}</span>
          </button>
          <span className={`font-mono font-bold text-xs tracking-wider ${timerRunning ? 'text-emerald-400 animate-pulse' : 'text-slate-200'}`}>
            {formatTimer(timerSeconds)}
          </span>
          {timerRunning && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleTimer}
            className={`p-1.5 rounded-lg font-medium text-xs transition-colors flex items-center gap-1 ${
              timerRunning ? 'bg-amber-500/30 text-amber-200 border border-amber-500/40' : 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/50'
            }`}
            title={timerRunning ? "Pause Timer" : "Start Timer"}
          >
            {timerRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
          </button>
          <button
            onClick={handleResetTimer}
            className="p-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white border border-white/10 hover:bg-white/20 transition-colors"
            title="Reset Timer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Delegate Info */}
      {card.delegate && (
        <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {card.delegate.avatar ? (
              <img src={card.delegate.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Bot className="w-4 h-4 text-purple-400" />
            )}
            <span className="font-medium text-slate-200 text-[11px] truncate">{card.delegate.name}</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active</span>
          </span>
        </div>
      )}

      {/* Interactive Widgets Section */}
      {card.widgets && card.widgets.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-white/10">
          {card.widgets.map(w => {
            if (w.type === 'toggle') {
              const val = Boolean(w.value);
              return (
                <div
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCardWidget(card.id, w.id, !val);
                  }}
                  className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs cursor-pointer transition-colors backdrop-blur-sm"
                >
                  <span className="text-slate-200 font-medium text-[11px]">{w.label}</span>
                  {val ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                      <ToggleRight className="w-5 h-5 text-emerald-400" />
                      <span>ON</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 font-semibold text-[11px]">
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                      <span>OFF</span>
                    </span>
                  )}
                </div>
              );
            }

            if (w.type === 'slider') {
              const numVal = Number(w.value) || 0;
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg bg-white/5 border border-white/10 space-y-1 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-200">
                    <span>{w.label}</span>
                    <span className="font-mono text-indigo-300 font-bold">{numVal}{w.unit || ''}</span>
                  </div>
                  <input
                    type="range"
                    min={w.min || 0}
                    max={w.max || 100}
                    value={numVal}
                    onChange={(e) => onUpdateCardWidget(card.id, w.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                  />
                </div>
              );
            }

            if (w.type === 'stepper') {
              const numVal = Number(w.value) || 0;
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 text-xs backdrop-blur-sm">
                  <span className="text-slate-200 text-[11px] font-medium">{w.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateCardWidget(card.id, w.id, Math.max((w.min || 0), numVal - 1))}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-indigo-300 min-w-[20px] text-center">{numVal}</span>
                    <button
                      onClick={() => onUpdateCardWidget(card.id, w.id, Math.min((w.max || 100), numVal + 1))}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 text-slate-200"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            if (w.type === 'prompt_runner') {
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-1.5 backdrop-blur-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-300">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span>{w.label}</span>
                    </span>
                  </div>
                  <button
                    onClick={handleRunAgent}
                    disabled={isRunning}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg bg-purple-600/40 hover:bg-purple-600/60 border border-purple-400/40 text-purple-100 font-semibold text-xs transition-colors shadow-md shadow-purple-500/20"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-200" />
                        <span>Executing Gemini Task...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-purple-200 text-purple-200" />
                        <span>Run Agent Routine</span>
                      </>
                    )}
                  </button>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Progress Bar & Subtask Status */}
      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex-1 mr-3 space-y-1">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span>Progress</span>
            <span className="text-indigo-300 font-bold">{card.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                card.progress === 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-400 to-cyan-400'
              }`}
              style={{ width: `${card.progress}%` }}
            />
          </div>
        </div>

        {card.subtasks && card.subtasks.length > 0 && (
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-300">
            <CheckCircle2 className="w-3 h-3 text-indigo-400" />
            <span>{card.subtasks.filter(s => s.completed).length}/{card.subtasks.length}</span>
          </span>
        )}
      </div>

      {/* Execution Log Output snippet if available */}
      {card.lastExecutionOutput && (
        <div className="p-2 rounded-lg bg-white/5 border border-indigo-500/30 text-[10px] font-mono text-indigo-200 line-clamp-2 backdrop-blur-sm">
          <span className="text-slate-400 font-semibold">Gemini Log:</span> {card.lastExecutionOutput}
        </div>
      )}
    </div>
  );
};
