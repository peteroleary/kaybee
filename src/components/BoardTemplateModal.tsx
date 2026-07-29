import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Workflow,
  Bot,
  CheckSquare,
  Zap,
  Plus,
  Check,
  Clock,
  ShieldCheck,
  BookmarkPlus
} from 'lucide-react';
import {
  BOARD_TEMPLATES,
  AGENT_TEMPLATES,
  CARD_TEMPLATES,
  WORKFLOW_TEMPLATES,
  ROUTINE_TEMPLATES,
  BoardTemplate
} from '../data/templates';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface BoardTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: BoardTemplate, mode: 'create_new' | 'apply_current') => void;
  activeBoardName: string;
  customTemplates?: BoardTemplate[];
  onOpenSaveTemplateModal?: () => void;
}

type TemplateTab = 'boards' | 'agents' | 'cards' | 'workflows' | 'routines';

export const BoardTemplateModal: React.FC<BoardTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  activeBoardName,
  customTemplates = [],
  onOpenSaveTemplateModal
}) => {
  const [activeTab, setActiveTab] = useState<TemplateTab>('boards');
  const allBoardTemplates = [...customTemplates, ...BOARD_TEMPLATES];
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate>(allBoardTemplates[0] || BOARD_TEMPLATES[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const categories = ['all', 'Core Engineering', 'Agent Swarms', 'Human Operations'];

  const filteredBoardTemplates = allBoardTemplates.filter(tpl => {
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tpl.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || tpl.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Workflow': return <Workflow className="w-5 h-5 text-indigo-400" />;
      case 'CheckSquare': return <CheckSquare className="w-5 h-5 text-emerald-400" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'Bot': return <Bot className="w-5 h-5 text-purple-400" />;
      case 'ShieldCheck': return <ShieldCheck className="w-5 h-5 text-rose-400" />;
      case 'Clock': return <Clock className="w-5 h-5 text-amber-400" />;
      default: return <Layers className="w-5 h-5 text-purple-400" />;
    }
  };

  const handleInstantiateItem = (item: any, type: 'agent' | 'card' | 'workflow' | 'routine') => {
    let convertedBoardTemplate: BoardTemplate;
    if (type === 'agent') {
      convertedBoardTemplate = {
        id: `tpl-agent-${Date.now()}`,
        name: `${item.name} Workspace`,
        category: 'Agent Swarms',
        description: item.description,
        icon: 'Bot',
        tags: item.tags,
        lists: [
          {
            title: item.name,
            listType: 'homogenous',
            homogenousType: 'agents_only',
            color: 'purple',
            icon: 'Bot',
            autoRunAgents: true,
            rbacRole: 'ai_operator',
            cards: [
              {
                id: `c-ag-${Date.now()}`,
                title: item.name,
                description: item.description,
                entityType: 'agent',
                status: 'in_progress',
                progress: 50,
                rbacRole: 'ai_operator',
                priority: 'high',
                tags: item.tags,
                widgets: item.widgets || [],
                subtasks: [],
                prompt: item.defaultPrompt,
                createdAt: 'Today',
                updatedAt: 'Just now'
              }
            ]
          }
        ]
      };
    } else if (type === 'workflow') {
      convertedBoardTemplate = {
        id: `tpl-wf-${Date.now()}`,
        name: item.name,
        category: 'Core Engineering',
        description: item.description,
        icon: 'Workflow',
        tags: item.tags,
        lists: item.stages.map((st: any, idx: number) => ({
          title: st.title,
          listType: st.listType,
          homogenousType: 'none',
          color: idx === 0 ? 'slate' : idx === 1 ? 'indigo' : 'emerald',
          icon: 'Workflow',
          autoRunAgents: st.autoRunAgents,
          rbacRole: 'contributor',
          cards: []
        }))
      };
    } else if (type === 'routine') {
      convertedBoardTemplate = {
        id: `tpl-rt-${Date.now()}`,
        name: item.name,
        category: 'Agent Swarms',
        description: item.description,
        icon: 'Zap',
        tags: item.tags,
        lists: [
          {
            title: 'Routine Automation Pipeline',
            listType: 'pipeline',
            homogenousType: 'none',
            color: 'amber',
            icon: 'Zap',
            autoRunAgents: true,
            rbacRole: 'ai_operator',
            cards: [
              {
                id: `c-rt-${Date.now()}`,
                title: item.name,
                description: item.description,
                entityType: 'routine',
                status: 'todo',
                progress: 0,
                rbacRole: 'ai_operator',
                priority: 'medium',
                tags: item.tags,
                widgets: item.widgets || [],
                subtasks: [],
                prompt: item.prompt,
                createdAt: 'Today',
                updatedAt: 'Today'
              }
            ]
          }
        ]
      };
    } else {
      // card
      convertedBoardTemplate = {
        id: `tpl-card-${Date.now()}`,
        name: `${item.name} Card Studio`,
        category: 'Human Operations',
        description: item.description,
        icon: 'CheckSquare',
        tags: item.tags,
        lists: [
          {
            title: 'Tasks & Deliverables',
            listType: 'kanban',
            homogenousType: 'none',
            color: 'indigo',
            icon: 'CheckSquare',
            autoRunAgents: false,
            rbacRole: 'contributor',
            cards: [
              {
                id: `c-card-${Date.now()}`,
                title: item.defaultTitle,
                description: item.defaultDescription,
                entityType: item.entityType,
                status: 'todo',
                progress: 0,
                rbacRole: 'contributor',
                priority: item.priority,
                tags: item.tags,
                widgets: item.widgets || [],
                subtasks: [],
                prompt: item.prompt,
                createdAt: 'Today',
                updatedAt: 'Today'
              }
            ]
          }
        ]
      };
    }
    onSelectTemplate(convertedBoardTemplate, 'apply_current');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Unified Template Hub</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-normal border border-indigo-500/30">
                  Boards • Agents • Workflows • Cards • Routines
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Instantly populate your Kanban workspace with pre-designed lists, card routines, and multi-agent roles.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenSaveTemplateModal && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenSaveTemplateModal();
                }}
                className="font-bold"
                title="Save current board state as a new reusable template"
              >
                <BookmarkPlus className="w-4 h-4 text-indigo-200" />
                <span className="hidden sm:inline">Save Board as Template</span>
              </Button>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-6 py-2 border-b border-white/10 bg-white/5 flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('boards')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'boards' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Boards ({BOARD_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'agents' 
                ? 'bg-purple-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Agent Swarms ({AGENT_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workflows')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'workflows' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Workflows ({WORKFLOW_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'cards' 
                ? 'bg-emerald-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Cards ({CARD_TEMPLATES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('routines')}
            className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'routines' 
                ? 'bg-amber-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Routines ({ROUTINE_TEMPLATES.length})</span>
          </button>
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'boards' && (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            {/* Left Column: Template Cards List */}
            <div className="md:col-span-5 p-4 space-y-3 overflow-y-auto border-r border-white/10 custom-scrollbar">
              {filteredBoardTemplates.map(tpl => {
                const isSelected = selectedTemplate.id === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 shadow-lg ring-1 ring-indigo-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-white/10 border border-white/10">
                          {getIcon(tpl.icon)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100">{tpl.name}</h3>
                          <span className="text-xs text-indigo-300 font-mono">{tpl.category}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="p-1 rounded-full bg-indigo-500 text-white">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {tpl.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Template Details & Actions */}
            <div className="md:col-span-7 p-6 space-y-5 overflow-y-auto bg-slate-950/40 backdrop-blur-md flex flex-col justify-between custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30">
                    {getIcon(selectedTemplate.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">{selectedTemplate.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                        {selectedTemplate.lists.length} Lists
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedTemplate.description}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Included Lists & Card Structures
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {selectedTemplate.lists.map((list, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          <span className="font-semibold text-slate-200">{list.title}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono capitalize">
                            {list.listType.replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-xs">
                          {list.cards.length} Initial Cards
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  onClick={() => onSelectTemplate(selectedTemplate, 'apply_current')}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 font-medium text-xs transition-all flex items-center justify-center gap-2"
                >
                  <span>Apply to Current Board</span>
                  <span className="text-xs opacity-70 truncate max-w-[120px]">({activeBoardName})</span>
                </button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onSelectTemplate(selectedTemplate, 'create_new')}
                  className="w-full sm:w-auto font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Board from Template</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar">
            {AGENT_TEMPLATES.map(agent => (
              <div key={agent.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{agent.name}</h3>
                      <span className="text-xs text-purple-300 font-mono">{agent.role}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{agent.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map(c => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleInstantiateItem(agent, 'agent')}
                  className="w-full px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Instantiate Agent Swarm List</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
            {WORKFLOW_TEMPLATES.map(wf => (
              <div key={wf.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      <Workflow className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{wf.name}</h3>
                      <span className="text-xs text-cyan-300 font-mono">{wf.category} Pipeline</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{wf.description}</p>
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pipeline Stages:</span>
                    {wf.stages.map((st, i) => (
                      <div key={i} className="text-xs text-slate-300 bg-white/5 p-1.5 rounded border border-white/5 flex items-center justify-between">
                        <span>{st.title}</span>
                        <span className="text-xs text-cyan-300 font-mono">{st.listType}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleInstantiateItem(wf, 'workflow')}
                  className="w-full px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Apply Workflow Pipeline</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
            {CARD_TEMPLATES.map(card => (
              <div key={card.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{card.name}</h3>
                      <span className="text-xs text-emerald-300 font-mono capitalize">Entity: {card.entityType}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{card.description}</p>
                </div>

                <button
                  onClick={() => handleInstantiateItem(card, 'card')}
                  className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Insert Card Template to Board</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Routines Tab */}
        {activeTab === 'routines' && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto custom-scrollbar">
            {ROUTINE_TEMPLATES.map(rt => (
              <div key={rt.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 backdrop-blur-md flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100">{rt.name}</h3>
                      <span className="text-xs text-amber-300 font-mono">{rt.triggerInterval}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rt.description}</p>
                </div>

                <button
                  onClick={() => handleInstantiateItem(rt, 'routine')}
                  className="w-full px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Deploy Routine Pipeline</span>
                </button>
              </div>
            ))}
          </div>
        )}
    </Modal>
  );
};

