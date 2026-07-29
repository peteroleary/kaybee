import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Bot, 
  User, 
  Users, 
  Zap, 
  Workflow, 
  CheckSquare, 
  Plus, 
  Trash2, 
  Play, 
  Loader2, 
  GitFork, 
  Paperclip, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  ListTodo,
  Link,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Lock,
  Unlock,
  MessageSquare,
  Reply,
  Send,
  CornerDownRight
} from 'lucide-react';
import { CardItemData, EntityType, InteractiveWidget, WidgetType, BoardData, CardComment, CardDelegate } from '../types';
import { TimeLoggerWidget } from './TimeLoggerWidget';
import { Modal } from './ui/Modal';
import { AgentPicker } from '../features/agents/AgentPicker';
import { useAgents } from '../state/AgentProvider';
import { AgentDoc } from '../lib/agents/types';
import { apiPost } from '../lib/api/client';

interface CardDetailModalProps {
  card: CardItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCard: (updatedCard: CardItemData) => void;
  onRunAgentTask: (card: CardItemData) => void;
  onDeleteCard?: (cardId: string) => void;
  availableBoards: BoardData[];
}

export const CardDetailModal: React.FC<CardDetailModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdateCard,
  onRunAgentTask,
  onDeleteCard,
  availableBoards,
}) => {
  if (!isOpen || !card) return null;

  const { agents } = useAgents();
  const [editedCard, setEditedCard] = useState<CardItemData>({ ...card });
  const [isRunning, setIsRunning] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>('toggle');
  const [newWidgetLabel, setNewWidgetLabel] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDependencyId, setSelectedDependencyId] = useState('');
  
  // Comment Thread State
  const [newCommentText, setNewCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState('Alex Rivera');
  const [isCommentAgent, setIsCommentAgent] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSubtaskProgressChange = (id: string, progress: number) => {
    const updated = editedCard.subtasks.map(s => {
      if (s.id === id) {
        return {
          ...s,
          progress,
          completed: progress === 100
        };
      }
      return s;
    });
    const avgProgress = updated.length > 0 
      ? Math.round(updated.reduce((sum, item) => sum + (item.progress ?? (item.completed ? 100 : 0)), 0) / updated.length)
      : editedCard.progress;

    setEditedCard({
      ...editedCard,
      subtasks: updated,
      progress: avgProgress
    });
  };

  const handleAddComment = (parentId?: string) => {
    const textToAdd = parentId ? replyText : newCommentText;
    if (!textToAdd.trim()) return;

    const newComment: CardComment = {
      id: `comment-${Date.now()}`,
      author: isCommentAgent ? 'Gemini Orchestrator' : commentAuthor || 'Collaborator',
      avatar: isCommentAgent ? undefined : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
      isAgent: isCommentAgent,
      content: textToAdd.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      parentId
    };

    setEditedCard({
      ...editedCard,
      comments: [...(editedCard.comments || []), newComment]
    });

    if (parentId) {
      setReplyParentId(null);
      setReplyText('');
    } else {
      setNewCommentText('');
    }
  };
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    summary?: string;
    suggestedSubtasks?: { id: string; text: string; completed: boolean }[];
    suggestedWidgets?: InteractiveWidget[];
    suggestedWorkflow?: { name: string; agentRole: string; description: string; suggestedTags: string[] } | null;
  } | null>(null);

  const isAgentCard = editedCard.entityType === 'agent' || editedCard.entityType === 'agent_swarm' || editedCard.entityType === 'routine' || editedCard.delegate?.type === 'agent';
  
  const computeContributionScore = () => {
    let score = editedCard.progress || 50;
    if (editedCard.executionStatus === 'success') score += 15;
    if (editedCard.subtasks && editedCard.subtasks.length > 0) {
      const doneCount = editedCard.subtasks.filter(s => s.completed).length;
      score += Math.round((doneCount / editedCard.subtasks.length) * 15);
    }
    if (editedCard.lastExecutionOutput) score += 10;
    return Math.min(99, Math.max(35, score));
  };
  const contributionScore = computeContributionScore();

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    try {
      const data = await apiPost<{
        summary?: string;
        suggestedSubtasks?: { id: string; text: string; completed: boolean }[];
        suggestedWidgets?: InteractiveWidget[];
        suggestedWorkflow?: { name: string; agentRole: string; description: string; suggestedTags: string[] } | null;
      }>('/api/smart-suggestions', {
        title: editedCard.title,
        description: editedCard.description,
        entityType: editedCard.entityType,
        priority: editedCard.priority,
        tags: editedCard.tags
      });
      setSuggestions(data);
    } catch (err) {
      console.error('Smart suggestions error:', err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleApplySuggestedSubtasks = () => {
    if (!suggestions?.suggestedSubtasks) return;
    const existingTexts = new Set(editedCard.subtasks.map(s => s.text.toLowerCase()));
    const newItems = suggestions.suggestedSubtasks.filter(s => !existingTexts.has(s.text.toLowerCase()));
    setEditedCard({
      ...editedCard,
      subtasks: [...editedCard.subtasks, ...newItems]
    });
  };

  const handleApplySuggestedWidgets = () => {
    if (!suggestions?.suggestedWidgets) return;
    setEditedCard({
      ...editedCard,
      widgets: [...editedCard.widgets, ...suggestions.suggestedWidgets]
    });
  };

  const handleApplySuggestedWorkflow = () => {
    if (!suggestions?.suggestedWorkflow) return;
    const wf = suggestions.suggestedWorkflow;
    const newTags = Array.from(new Set([...editedCard.tags, ...wf.suggestedTags]));
    setEditedCard({
      ...editedCard,
      entityType: 'agent',
      delegate: {
        id: `delegate-${Date.now()}`,
        name: wf.agentRole,
        type: 'agent',
        status: 'active',
        capabilities: ['Auto-Execution', 'Code Analysis', 'Workflow Optimization']
      },
      tags: newTags,
      prompt: `Execute ${wf.name}: ${wf.description}`
    });
  };

  // Collect all available cards across boards for the dependency dropdown
  const allCardsList: { id: string; title: string; boardName: string; status: string }[] = [];
  availableBoards.forEach(b => {
    b.lists.forEach(l => {
      l.cards.forEach(c => {
        if (c.id !== card.id) {
          allCardsList.push({ id: c.id, title: c.title, boardName: b.name, status: c.status });
        }
      });
    });
  });

  const entityOptions: { value: EntityType; label: string }[] = [
    { value: 'task', label: 'Single Task' },
    { value: 'human', label: 'Single Human' },
    { value: 'agent', label: 'AI Agent' },
    { value: 'routine', label: 'Automated Routine' },
    { value: 'human_team', label: 'Team of Humans' },
    { value: 'agent_swarm', label: 'Swarm of AI Agents' },
    { value: 'troop', label: 'Troop (Hybrid Human + Agent)' },
  ];

  const handleSave = () => {
    onUpdateCard(editedCard);
    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const sub = { id: `sub-${Date.now()}`, text: newSubtask, completed: false };
    setEditedCard({
      ...editedCard,
      subtasks: [...editedCard.subtasks, sub]
    });
    setNewSubtask('');
  };

  const handleToggleSubtask = (id: string) => {
    const updated = editedCard.subtasks.map(s => {
      if (s.id === id) {
        const nextCompleted = !s.completed;
        return {
          ...s,
          completed: nextCompleted,
          progress: nextCompleted ? 100 : 0
        };
      }
      return s;
    });
    const avgProgress = updated.length > 0 
      ? Math.round(updated.reduce((sum, item) => sum + (item.progress ?? (item.completed ? 100 : 0)), 0) / updated.length)
      : editedCard.progress;

    setEditedCard({
      ...editedCard,
      subtasks: updated,
      progress: avgProgress
    });
  };

  const handleAddWidget = () => {
    if (!newWidgetLabel.trim()) return;
    const widget: InteractiveWidget = {
      id: `w-${Date.now()}`,
      type: newWidgetType,
      label: newWidgetLabel,
      value: newWidgetType === 'toggle' ? true : newWidgetType === 'slider' ? 50 : newWidgetType === 'stepper' ? 1 : ''
    };
    setEditedCard({
      ...editedCard,
      widgets: [...editedCard.widgets, widget]
    });
    setNewWidgetLabel('');
  };

  const handleDeleteWidget = (id: string) => {
    setEditedCard({
      ...editedCard,
      widgets: editedCard.widgets.filter(w => w.id !== id)
    });
  };

  const handleMoveWidget = (index: number, direction: 'up' | 'down') => {
    const widgets = [...editedCard.widgets];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;
    const temp = widgets[index];
    widgets[index] = widgets[targetIndex];
    widgets[targetIndex] = temp;
    setEditedCard({ ...editedCard, widgets });
  };

  const handleToggleMetadataField = (field: string) => {
    const hidden = editedCard.hiddenMetadataFields || [];
    const isHidden = hidden.includes(field);
    const updatedHidden = isHidden ? hidden.filter(f => f !== field) : [...hidden, field];
    setEditedCard({ ...editedCard, hiddenMetadataFields: updatedHidden });
  };

  const handleAddDependency = () => {
    if (!selectedDependencyId) return;
    const currentDeps = editedCard.dependsOnCardIds || [];
    if (!currentDeps.includes(selectedDependencyId)) {
      setEditedCard({
        ...editedCard,
        dependsOnCardIds: [...currentDeps, selectedDependencyId]
      });
    }
    setSelectedDependencyId('');
  };

  const handleRemoveDependency = (depId: string) => {
    const currentDeps = editedCard.dependsOnCardIds || [];
    setEditedCard({
      ...editedCard,
      dependsOnCardIds: currentDeps.filter(id => id !== depId)
    });
  };

  const handleAssignAgent = (agent: AgentDoc | null) => {
    const delegate: CardDelegate | undefined = agent
      ? {
          id: agent.id,
          name: agent.name,
          type: agent.entityType,
          avatar: agent.avatar,
          role: agent.kind === 'human' ? 'Human' : 'Agent',
          status: agent.status,
        }
      : undefined;
    setEditedCard({
      ...editedCard,
      assignedAgentId: agent?.id ?? null,
      delegate,
    });
  };

  const handleRunTask = async () => {
    setIsRunning(true);
    await onRunAgentTask(editedCard);
    setIsRunning(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Card Studio & Interactivity Config</h2>
                {isAgentCard && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-bg-2 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold" title="Dynamic AI Agent Contribution & Efficiency Score">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Contribution Score: {contributionScore}%</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">Configure widgets, subtasks, entity types, and agent prompt runners.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Smart Suggestion Engine Trigger Banner */}
          <div className="p-4 rounded-2xl bg-bg-2 border border-line flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">Gemini Smart Suggestion Engine</span>
              </div>
              <button
                onClick={handleGenerateSuggestions}
                disabled={isGeneratingSuggestions}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingSuggestions ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Content...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze & Suggest</span>
                  </>
                )}
              </button>
            </div>

            {suggestions && (
              <div className="space-y-3 pt-2 border-t border-white/10 text-xs">
                <p className="text-indigo-200 font-medium">{suggestions.summary}</p>
                
                {suggestions.suggestedSubtasks && suggestions.suggestedSubtasks.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Suggested Subtasks ({suggestions.suggestedSubtasks.length})</span>
                      <span className="text-xs text-slate-400">{suggestions.suggestedSubtasks.map(s => s.text).join(' • ')}</span>
                    </div>
                    <button
                      onClick={handleApplySuggestedSubtasks}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-semibold text-xs whitespace-nowrap transition-colors"
                    >
                      + Add Subtasks
                    </button>
                  </div>
                )}

                {suggestions.suggestedWidgets && suggestions.suggestedWidgets.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Suggested Interactive Widgets ({suggestions.suggestedWidgets.length})</span>
                      <span className="text-xs text-slate-400">{suggestions.suggestedWidgets.map(w => w.label).join(', ')}</span>
                    </div>
                    <button
                      onClick={handleApplySuggestedWidgets}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold text-xs whitespace-nowrap transition-colors"
                    >
                      + Attach Widgets
                    </button>
                  </div>
                )}

                {suggestions.suggestedWorkflow && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-200 block">Suggested Agent Workflow</span>
                      <span className="text-xs text-slate-400">{suggestions.suggestedWorkflow.name} ({suggestions.suggestedWorkflow.agentRole})</span>
                    </div>
                    <button
                      onClick={handleApplySuggestedWorkflow}
                      className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold text-xs whitespace-nowrap transition-colors"
                    >
                      + Attach Workflow
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Title & Entity Type Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Card Title</label>
              <input
                type="text"
                value={editedCard.title}
                onChange={(e) => setEditedCard({ ...editedCard, title: e.target.value })}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Entity Type</label>
              <select
                value={editedCard.entityType}
                onChange={(e) => setEditedCard({ ...editedCard, entityType: e.target.value as EntityType })}
                className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                {entityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Agent / Person */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned To</label>
            <AgentPicker agents={agents} assignedAgentId={editedCard.assignedAgentId} onAssign={handleAssignAgent} />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
            <textarea
              value={editedCard.description}
              onChange={(e) => setEditedCard({ ...editedCard, description: e.target.value })}
              className="w-full h-20 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none backdrop-blur-md"
            />
          </div>

          {/* Priority & Progress Slider */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Priority</label>
              <select
                value={editedCard.priority}
                onChange={(e) => setEditedCard({ ...editedCard, priority: e.target.value as any })}
                className="w-full px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs capitalize"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <span>Progress</span>
                <span className="text-indigo-300 font-mono">{editedCard.progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={editedCard.progress}
                onChange={(e) => setEditedCard({ ...editedCard, progress: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
              />
            </div>
          </div>

          {/* Depends On Prerequisite Links */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
                <Link className="w-4 h-4 text-amber-400" />
                <span>Card Dependencies ('Depends On' Links)</span>
              </div>
              <span className="text-xs text-amber-300 font-mono">
                {(editedCard.dependsOnCardIds || []).length} Prerequisites
              </span>
            </div>

            {/* List of current dependencies */}
            {(editedCard.dependsOnCardIds || []).length > 0 && (
              <div className="space-y-1.5">
                {editedCard.dependsOnCardIds?.map(depId => {
                  const targetCard = allCardsList.find(c => c.id === depId);
                  const isDone = targetCard?.status === 'completed';
                  return (
                    <div key={depId} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/10 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                        <span className="font-semibold text-slate-200 truncate">
                          {targetCard ? targetCard.title : `Card #${depId.slice(0, 8)}`}
                        </span>
                        {targetCard && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                            {targetCard.boardName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-mono ${isDone ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                          {isDone ? 'Completed' : 'Blocking'}
                        </span>
                        <button
                          onClick={() => handleRemoveDependency(depId)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Dependency Selector */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={selectedDependencyId}
                onChange={(e) => setSelectedDependencyId(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs focus:outline-none"
              >
                <option value="">Select prerequisite card...</option>
                {allCardsList
                  .filter(c => !(editedCard.dependsOnCardIds || []).includes(c.id))
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.boardName}] {c.title} ({c.status})
                    </option>
                  ))
                }
              </select>
              <button
                onClick={handleAddDependency}
                disabled={!selectedDependencyId}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-amber-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link Prerequisite</span>
              </button>
            </div>
          </div>

          {/* Time Logger Widget Section */}
          {!(editedCard.hiddenMetadataFields || []).includes('time_logger') && (
            <TimeLoggerWidget
              card={editedCard}
              onUpdateCard={(updated) => setEditedCard(updated)}
            />
          )}

          {/* Interactive Widgets & Layout Edit Mode Config */}
          <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span>Interactive Widgets ({editedCard.widgets?.length || 0})</span>
              </label>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                  isEditMode 
                    ? 'bg-indigo-500/30 border-indigo-500/50 text-indigo-200' 
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Done Editing Widgets' : 'Edit Widgets Mode'}</span>
              </button>
            </div>

            {/* Metadata Fields Visibility Toggle Drawer in Edit Mode */}
            {isEditMode && (
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/20 space-y-2">
                <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Toggle Metadata Fields Visibility:
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'subtasks', label: 'Subtasks Checklist' },
                    { id: 'time_logger', label: 'Time Logger Widget' },
                    { id: 'gemini_terminal', label: 'Gemini Agent Terminal' },
                  ].map(field => {
                    const isHidden = (editedCard.hiddenMetadataFields || []).includes(field.id);
                    return (
                      <button
                        key={field.id}
                        onClick={() => handleToggleMetadataField(field.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                          isHidden 
                            ? 'bg-slate-900/80 border-rose-500/30 text-rose-300' 
                            : 'bg-indigo-500/20 border-indigo-500/30 text-indigo-200'
                        }`}
                      >
                        {isHidden ? <EyeOff className="w-3 h-3 text-rose-400" /> : <Eye className="w-3 h-3 text-emerald-400" />}
                        <span className="truncate">{field.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Existing Widgets List with Reorder buttons */}
            <div className="space-y-2">
              {editedCard.widgets?.map((w, idx) => (
                <div key={w.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {isEditMode && (
                      <div className="flex items-center gap-0.5 mr-1">
                        <button
                          onClick={() => handleMoveWidget(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-400"
                          title="Move Widget Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleMoveWidget(idx, 'down')}
                          disabled={idx === (editedCard.widgets?.length || 0) - 1}
                          className="p-1 rounded hover:bg-white/10 disabled:opacity-30 text-slate-400"
                          title="Move Widget Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono capitalize border border-indigo-500/30">
                      {w.type}
                    </span>
                    <span className="text-xs font-medium text-slate-200">{w.label}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteWidget(w.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Widget Form */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 backdrop-blur-md">
              <select
                value={newWidgetType}
                onChange={(e) => setNewWidgetType(e.target.value as WidgetType)}
                className="px-2.5 py-1.5 bg-slate-900/90 border border-white/10 rounded-lg text-slate-200 text-xs"
              >
                <option value="toggle">Toggle</option>
                <option value="slider">Slider</option>
                <option value="stepper">Stepper (+/-)</option>
                <option value="prompt_runner">Prompt Runner</option>
                <option value="time_logger">Time Logger</option>
              </select>

              <input
                type="text"
                value={newWidgetLabel}
                onChange={(e) => setNewWidgetLabel(e.target.value)}
                placeholder="Widget label (e.g. Confidence Score)"
                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-xs focus:outline-none"
              />

              <button
                onClick={handleAddWidget}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1 shadow-md shadow-indigo-500/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Widget</span>
              </button>
            </div>
          </div>

          {/* Subtasks Section with Per-Subtask Progress Bars */}
          {!(editedCard.hiddenMetadataFields || []).includes('subtasks') && (
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-400" />
                  <span>Subtasks & Granular Progress</span>
                </label>
                <span className="text-xs font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  Overall {editedCard.progress}%
                </span>
              </div>

              <div className="space-y-2.5">
                {editedCard.subtasks?.map(s => {
                  const itemProgress = s.progress ?? (s.completed ? 100 : 0);
                  return (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={s.completed}
                            onChange={() => handleToggleSubtask(s.id)}
                            className="rounded bg-slate-900 border-white/20 text-indigo-500 focus:ring-0 cursor-pointer"
                          />
                          <span className={`font-medium text-slate-200 truncate ${s.completed ? 'line-through text-slate-400 opacity-60' : ''}`}>
                            {s.text}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-indigo-300 text-xs min-w-[36px] text-right">
                          {itemProgress}%
                        </span>
                      </div>

                      {/* Granular Subtask Progress Bar & Slider */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-200 ${
                              itemProgress === 100 ? 'bg-emerald-400' : 'bg-indigo-500'
                            }`}
                            style={{ width: `${itemProgress}%` }}
                          />
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={itemProgress}
                          onChange={(e) => handleSubtaskProgressChange(s.id, Number(e.target.value))}
                          className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                          title="Adjust subtask progress"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="Add new subtask item..."
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-xs focus:outline-none"
                />
                <button
                  onClick={handleAddSubtask}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
                >
                  Add Subtask
                </button>
              </div>
            </div>
          )}

          {/* Nested Comment Threads Section */}
          <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span>Collaborative Discussion Threads ({editedCard.comments?.length || 0})</span>
              </label>
              
              {/* Commenter Role Toggle */}
              <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCommentAgent(false)}
                  className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                    !isCommentAgent ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>Human</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCommentAgent(true)}
                  className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${
                    isCommentAgent ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bot className="w-3 h-3" />
                  <span>AI Agent</span>
                </button>
              </div>
            </div>

            {/* Comment Thread List (Top level + Nested) */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
              {(!editedCard.comments || editedCard.comments.length === 0) ? (
                <div className="text-center py-6 text-slate-400 text-xs italic">
                  No discussion comments yet. Start a thread below!
                </div>
              ) : (
                editedCard.comments
                  .filter(c => !c.parentId)
                  .map(topComment => {
                    const childReplies = editedCard.comments.filter(c => c.parentId === topComment.id);
                    return (
                      <div key={topComment.id} className="p-3 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                        {/* Top level comment item */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {topComment.isAgent ? (
                              <div className="p-1 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300">
                                <Bot className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <img
                                src={topComment.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                                alt=""
                                className="w-5 h-5 rounded-full object-cover border border-white/20"
                              />
                            )}
                            <span className="text-xs font-bold text-slate-200">{topComment.author || topComment.authorName || 'Collaborator'}</span>
                            {topComment.isAgent && (
                              <span className="px-1.5 py-0.2 bg-purple-500/30 text-purple-300 text-xs rounded font-mono font-bold">AI</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{topComment.timestamp}</span>
                        </div>

                        <p className="text-xs text-slate-300 pl-7 leading-relaxed">{topComment.content || topComment.text}</p>

                        <div className="pl-7 pt-1 flex items-center justify-between text-xs">
                          <button
                            onClick={() => setReplyParentId(replyParentId === topComment.id ? null : topComment.id)}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
                          >
                            <Reply className="w-3 h-3" />
                            <span>Reply</span>
                          </button>
                        </div>

                        {/* Inline Reply Form */}
                        {replyParentId === topComment.id && (
                          <div className="ml-7 mt-2 p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                            <CornerDownRight className="w-3.5 h-3.5 text-indigo-400" />
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(topComment.id)}
                              placeholder={`Reply to ${topComment.author}...`}
                              className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none"
                            />
                            <button
                              onClick={() => handleAddComment(topComment.id)}
                              className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-500"
                            >
                              <Send className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Child Replies */}
                        {childReplies.length > 0 && (
                          <div className="ml-6 space-y-2 pt-2 border-l-2 border-indigo-500/30 pl-3">
                            {childReplies.map(reply => (
                              <div key={reply.id} className="p-2 rounded-lg bg-white/5 border border-white/5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    {reply.isAgent ? (
                                      <Bot className="w-3 h-3 text-purple-400" />
                                    ) : (
                                      <User className="w-3 h-3 text-emerald-400" />
                                    )}
                                    <span className="text-xs font-bold text-slate-200">{reply.author || reply.authorName || 'Collaborator'}</span>
                                    {reply.isAgent && (
                                      <span className="px-1 bg-purple-500/30 text-purple-300 text-xs rounded font-mono">AI</span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400">{reply.timestamp}</span>
                                </div>
                                <p className="text-xs text-slate-300 pl-4">{reply.content || reply.text}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Top Level Add Comment Form */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder={isCommentAgent ? "Post AI Agent insight comment..." : "Post human comment..."}
                className="flex-1 px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={() => handleAddComment()}
                className={`px-3 py-2 rounded-xl text-xs font-semibold text-white shadow-md flex items-center gap-1.5 transition-all ${
                  isCommentAgent ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Post</span>
              </button>
            </div>
          </div>

          {/* Gemini Agent Execution Terminal */}
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                <Bot className="w-4 h-4 text-purple-400" />
                <span>Gemini Autonomous Execution Terminal</span>
              </div>
              <button
                onClick={handleRunTask}
                disabled={isRunning}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-purple-500/20"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing Task...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Run Gemini Agent Routine</span>
                  </>
                )}
              </button>
            </div>

            {editedCard.lastExecutionOutput && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-indigo-200 leading-relaxed">
                <div className="text-xs text-slate-400 font-bold mb-1">RUN LOG OUTPUT:</div>
                {editedCard.lastExecutionOutput}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-slate-300 font-medium text-xs transition-colors">
              Cancel
            </button>
            {onDeleteCard && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete card "${editedCard.title}"?`)) {
                    onDeleteCard(editedCard.id);
                    onClose();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Card</span>
              </button>
            )}
          </div>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hi text-white font-semibold text-xs transition-colors">
            Save Card Changes
          </button>
        </div>
    </Modal>
  );
};
