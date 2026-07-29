import React, { useState } from 'react';
import {
  User,
  Bot,
  Users,
  Zap,
  Workflow,
  CheckSquare,
  Play,
  Pin,
  Loader2,
  ToggleLeft,
  ToggleRight,
  Plus,
  Minus,
  GitFork,
  Clock,
  CheckCircle2,
  Sparkles,
  Link,
  Trash2,
} from 'lucide-react';
import { CardItemData, EntityType, InteractiveWidget, RBACRole } from '../types';
import { getTagStyle } from '../data/tagsAndThemes';
import { StatusDot, Status } from './ui/StatusDot';
import { Button } from './ui/Button';

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

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateCard) {
      onUpdateCard({ ...card, isPinned: !card.isPinned });
    }
  };

  const entityIcons: Record<EntityType, { icon: any; label: string }> = {
    task: { icon: CheckSquare, label: 'Task' },
    human: { icon: User, label: 'Human' },
    agent: { icon: Bot, label: 'AI Agent' },
    routine: { icon: Workflow, label: 'Routine' },
    human_team: { icon: Users, label: 'Team' },
    agent_swarm: { icon: Bot, label: 'Swarm' },
    troop: { icon: Zap, label: 'Troop' },
  };

  const priorityColors: Record<string, string> = {
    low: 'text-fg-faint',
    medium: 'text-fg-muted',
    high: 'text-warn',
    urgent: 'text-err',
  };

  const EntityIcon = entityIcons[card.entityType]?.icon || CheckSquare;

  const handleRunAgent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(true);
    await onRunAgentTask(card);
    setIsRunning(false);
  };

  const totalLoggedSec = (card.timeLogs || []).reduce((acc, l) => acc + l.durationSeconds, 0);

  const isAgentCard =
    card.entityType === 'agent' ||
    card.entityType === 'agent_swarm' ||
    card.entityType === 'routine' ||
    card.delegate?.type === 'agent' ||
    card.delegate?.type === 'agent_swarm';

  const runStatus: Status = card.executionStatus === 'running'
    ? 'running'
    : card.executionStatus === 'success'
    ? 'success'
    : card.executionStatus === 'error'
    ? 'error'
    : 'idle';

  const isMessageCard = Boolean(card.chatSender) || (card.tags && card.tags.includes('Chat-Message'));

  const isCustomized = Boolean(
    (card.widgets && card.widgets.length > 0) ||
    (card.subtasks && card.subtasks.length > 0) ||
    card.delegate ||
    (card.dependsOnCardIds && card.dependsOnCardIds.length > 0) ||
    (card.timeLogs && card.timeLogs.length > 0) ||
    card.isPinned ||
    (card.priority === 'urgent' || card.priority === 'high') ||
    (card.tags && card.tags.filter(t => t !== 'Chat-Message' && t !== 'New').length > 0) ||
    card.lastExecutionOutput ||
    (card.attachments && card.attachments.length > 0)
  );

  if (isMessageCard && !isCustomized) {
    return (
      <div
        onClick={() => onOpenCardDetail(card)}
        draggable={true}
        onDragStart={(e) => {
          setIsDragging(true);
          e.dataTransfer.setData('application/json', JSON.stringify({ cardId: card.id, sourceListId: listId }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setIsDragging(false)}
        className={`group relative bg-bg-2 hover:bg-bg-3 border border-line rounded-control p-3 transition-colors cursor-grab active:cursor-grabbing flex flex-col gap-1.5 ${
          isDragging ? 'opacity-60 border-accent' : ''
        }`}
      >
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          {onDeleteCard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete message "${card.title}"?`)) {
                  onDeleteCard(card.id, listId);
                }
              }}
              className="p-1 rounded text-fg-muted hover:text-err transition-colors"
              title="Delete Message"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {card.chatSender ? (
          <div className="flex items-center gap-2 pr-6">
            <img
              src={card.chatSender.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120'}
              alt={card.chatSender.name}
              className="w-5 h-5 rounded-full object-cover border border-line"
            />
            <div className="flex items-center justify-between flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs font-semibold text-fg truncate">{card.chatSender.name}</span>
                {card.chatSender.isAgent && (
                  <span className="text-xs px-1 rounded bg-accent/20 text-accent-hi font-medium">AI</span>
                )}
              </div>
              <span className="text-xs text-fg-faint font-mono flex-shrink-0 ml-2">{card.chatSender.timestamp}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-fg-muted pr-6">
            <span className="font-semibold text-fg-muted">{card.title}</span>
            <span className="font-mono">{card.createdAt || 'Just now'}</span>
          </div>
        )}

        <div className="text-xs text-fg leading-relaxed break-words">
          {card.description || card.title}
        </div>
      </div>
    );
  }

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
      className={`group relative bg-bg-2 hover:bg-bg-3 border rounded-control p-3 transition-colors cursor-grab active:cursor-grabbing flex flex-col gap-2 ${
        card.isPinned ? 'border-accent/50' : 'border-line hover:border-line-strong'
      } ${isDragging ? 'opacity-60 border-accent' : ''}`}
    >
      {/* Title & Description */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-fg group-hover:text-accent-hi transition-colors line-clamp-2 leading-snug">
          {card.title}
        </h4>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={togglePin}
            className={`p-1 rounded-control transition-colors ${
              card.isPinned ? 'text-accent-hi' : 'text-fg-faint hover:text-fg-muted'
            }`}
            title={card.isPinned ? 'Unpin Card' : 'Pin Card to top of list'}
          >
            <Pin className={`w-3.5 h-3.5 ${card.isPinned ? 'fill-current' : ''}`} />
          </button>
          {card.targetBoardFeedId && (
            <span className="p-1 text-accent-hi" title="Feeds to another board">
              <GitFork className="w-3 h-3" />
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
              className="opacity-0 group-hover:opacity-100 p-1 rounded-control text-fg-faint hover:text-err transition-opacity"
              title="Delete Card"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {card.description && (
        <p className="text-xs text-fg-muted line-clamp-2 leading-normal">
          {card.description}
        </p>
      )}

      {/* Status line: entity + assignee + run state */}
      <div className="flex items-center gap-1.5 text-xs text-fg-muted">
        <EntityIcon className="w-3 h-3 shrink-0" />
        <span>{entityIcons[card.entityType]?.label}</span>
        {card.delegate && (
          <>
            <span className="text-fg-faint">&middot;</span>
            <span className="truncate">{card.delegate.name}</span>
          </>
        )}
        <span className="text-fg-faint">&middot;</span>
        <span className={`uppercase font-semibold ${priorityColors[card.priority]}`}>{card.priority}</span>
        {isAgentCard && (
          <>
            <span className="text-fg-faint">&middot;</span>
            <StatusDot status={runStatus} title={`Run state: ${runStatus}`} />
          </>
        )}
      </div>

      {/* Secondary meta: dependencies + logged time */}
      {((card.dependsOnCardIds && card.dependsOnCardIds.length > 0) || totalLoggedSec > 0) && (
        <div className="flex items-center gap-3 text-xs text-fg-faint font-mono">
          {card.dependsOnCardIds && card.dependsOnCardIds.length > 0 && (
            <span className="flex items-center gap-1" title={`Depends on ${card.dependsOnCardIds.length} prerequisite task(s)`}>
              <Link className="w-3 h-3" />
              <span>{card.dependsOnCardIds.length}</span>
            </span>
          )}
          {totalLoggedSec > 0 && (
            <span className="flex items-center gap-1" title="Logged time">
              <Clock className="w-3 h-3" />
              <span>{Math.floor(totalLoggedSec / 60)}m</span>
            </span>
          )}
        </div>
      )}

      {/* Chat Sender info if chat card */}
      {card.chatSender && (
        <div className="flex items-center gap-2 bg-bg-1 p-2 rounded-control border border-line">
          <img
            src={card.chatSender.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120'}
            alt={card.chatSender.name}
            className="w-6 h-6 rounded-full object-cover border border-line"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-fg flex items-center gap-1">
              <span className="truncate">{card.chatSender.name}</span>
              {card.chatSender.isAgent && (
                <span className="text-xs px-1 rounded bg-accent/20 text-accent-hi">AI</span>
              )}
            </div>
            <div className="text-xs text-fg-faint flex items-center justify-between">
              <span>{card.chatSender.role || 'Contributor'}</span>
              <span>{card.chatSender.timestamp}</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Tag Badges */}
      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {card.tags.map((tag, idx) => {
            const style = getTagStyle(tag);
            return (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-control text-xs font-semibold border ${style.bg} ${style.text} ${style.border} transition-colors cursor-pointer`}
                title={`Filter board by #${tag}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span>#{tag}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Delegate Info */}
      {card.delegate && (
        <div className="flex items-center justify-between p-2 rounded-control bg-bg-1 border border-line text-xs">
          <div className="flex items-center gap-2">
            {card.delegate.avatar ? (
              <img src={card.delegate.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <Bot className="w-4 h-4 text-accent-hi" />
            )}
            <span className="font-medium text-fg truncate">{card.delegate.name}</span>
          </div>
          <span className="flex items-center gap-1 text-ok font-mono">
            <StatusDot status="running" />
            <span>Active</span>
          </span>
        </div>
      )}

      {/* Interactive Widgets */}
      {card.widgets && card.widgets.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-line">
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
                  className="flex items-center justify-between p-2 rounded-control bg-bg-1 hover:bg-bg-3 border border-line text-xs cursor-pointer transition-colors"
                >
                  <span className="text-fg font-medium">{w.label}</span>
                  {val ? (
                    <span className="flex items-center gap-1 text-ok font-semibold">
                      <ToggleRight className="w-5 h-5" />
                      <span>ON</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-fg-muted font-semibold">
                      <ToggleLeft className="w-5 h-5" />
                      <span>OFF</span>
                    </span>
                  )}
                </div>
              );
            }

            if (w.type === 'slider') {
              const numVal = Number(w.value) || 0;
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="p-2 rounded-control bg-bg-1 border border-line space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-fg">
                    <span>{w.label}</span>
                    <span className="font-mono text-accent-hi font-bold">{numVal}{w.unit || ''}</span>
                  </div>
                  <input
                    type="range"
                    min={w.min || 0}
                    max={w.max || 100}
                    value={numVal}
                    onChange={(e) => onUpdateCardWidget(card.id, w.id, Number(e.target.value))}
                    className="w-full h-1.5 bg-bg-3 rounded-full appearance-none cursor-pointer accent-accent"
                  />
                </div>
              );
            }

            if (w.type === 'stepper') {
              const numVal = Number(w.value) || 0;
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="flex items-center justify-between p-2 rounded-control bg-bg-1 border border-line text-xs">
                  <span className="text-fg font-medium">{w.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateCardWidget(card.id, w.id, Math.max((w.min || 0), numVal - 1))}
                      className="p-1 rounded-control bg-bg-3 hover:bg-line-strong text-fg"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-accent-hi min-w-[20px] text-center">{numVal}</span>
                    <button
                      onClick={() => onUpdateCardWidget(card.id, w.id, Math.min((w.max || 100), numVal + 1))}
                      className="p-1 rounded-control bg-bg-3 hover:bg-line-strong text-fg"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            }

            if (w.type === 'prompt_runner') {
              return (
                <div key={w.id} onClick={(e) => e.stopPropagation()} className="p-2 rounded-control bg-bg-1 border border-line space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-accent-hi" />
                      <span>{w.label}</span>
                    </span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunAgent}
                    disabled={isRunning || card.executionStatus === 'running'}
                    className="w-full font-semibold disabled:opacity-60"
                  >
                    {isRunning || card.executionStatus === 'running' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Executing Gemini Task...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Run Agent Routine</span>
                      </>
                    )}
                  </Button>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* Progress Bar & Subtask Status */}
      <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-fg-muted">
        <div className="flex-1 mr-3 space-y-1">
          <div className="flex items-center justify-between font-mono text-xs">
            <span>Progress</span>
            <span className="text-accent-hi font-bold">{card.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-bg-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${card.progress === 100 ? 'bg-ok' : 'bg-accent'}`}
              style={{ width: `${card.progress}%` }}
            />
          </div>
        </div>

        {card.subtasks && card.subtasks.length > 0 && (
          <span className="flex items-center gap-1 font-mono text-xs text-fg-muted">
            <CheckCircle2 className="w-3 h-3 text-accent-hi" />
            <span>{card.subtasks.filter(s => s.completed).length}/{card.subtasks.length}</span>
          </span>
        )}
      </div>

      {/* Execution Log Output snippet if available */}
      {card.lastExecutionOutput && (
        <div className="p-2 rounded-control bg-bg-1 border border-line text-xs font-mono text-accent-hi line-clamp-2">
          <span className="text-fg-faint font-semibold">Gemini Log:</span> {card.lastExecutionOutput}
        </div>
      )}
    </div>
  );
};
