import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BoardCanvas } from './components/BoardCanvas';
import { OrchestratorModal } from './components/OrchestratorModal';
import { CardDetailModal } from './components/CardDetailModal';
import { ListSettingsModal } from './components/ListSettingsModal';
import { BoardInterconnectModal } from './components/BoardInterconnectModal';
import { ActivityDrawer } from './components/ActivityDrawer';
import { BoardTemplateModal } from './components/BoardTemplateModal';
import { CreateCardModal } from './components/CreateCardModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AnalyticsDashboardModal } from './components/AnalyticsDashboardModal';
import { VoiceActionModal } from './components/VoiceActionModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { AutoArchiveModal } from './components/AutoArchiveModal';
import { OverviewMapModal } from './components/OverviewMapModal';
import { TagManagerModal } from './components/TagManagerModal';
import { SaveTemplateModal } from './components/SaveTemplateModal';
import { GoalCanvasModal } from './components/GoalCanvasModal';
import { toPng } from 'html-to-image';
import { INITIAL_BOARDS } from './data/initialData';
import { BOARD_TEMPLATES, BoardTemplate } from './data/templates';
import { BoardData, CardItemData, ListConfig, RBACRole, ActivityLog, FeedForwardConnection, UserGoal } from './types';
import { Plus, X, Layers, Cpu, Target } from 'lucide-react';

export default function App() {
  const [boards, setBoards] = useState<BoardData[]>(INITIAL_BOARDS);
  const [activeBoardId, setActiveBoardId] = useState<string>(INITIAL_BOARDS[0].id);
  const [currentRole, setCurrentRole] = useState<RBACRole>('admin');
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  // Modals & Panels State
  const [orchestratorOpen, setOrchestratorOpen] = useState(false);
  const [interconnectOpen, setInterconnectOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [boardTemplateModalOpen, setBoardTemplateModalOpen] = useState(false);
  const [createCardModalOpen, setCreateCardModalOpen] = useState(false);
  const [createCardListId, setCreateCardListId] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [autoArchiveModalOpen, setAutoArchiveModalOpen] = useState(false);
  const [overviewMapOpen, setOverviewMapOpen] = useState(false);
  const [tagManagerModalOpen, setTagManagerModalOpen] = useState(false);
  const [saveTemplateModalOpen, setSaveTemplateModalOpen] = useState(false);
  const [goalCanvasOpen, setGoalCanvasOpen] = useState(false);
  const [goals, setGoals] = useState<UserGoal[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('evo_kanban_goals') : null;
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customTemplates, setCustomTemplates] = useState<BoardTemplate[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('evo_kanban_custom_templates') : null;
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveTemplate = (newTemplate: BoardTemplate) => {
    setCustomTemplates(prev => {
      const updated = [newTemplate, ...prev];
      try {
        localStorage.setItem('evo_kanban_custom_templates', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    logActivity(`Saved current board snapshot as custom template: "${newTemplate.name}"`);
  };

  // Goal Management Handlers
  const handleSaveGoal = (goal: UserGoal) => {
    setGoals(prev => {
      const existingIndex = prev.findIndex(g => g.id === goal.id);
      let updated: UserGoal[];
      if (existingIndex >= 0) {
        updated = [...prev.slice(0, existingIndex), goal, ...prev.slice(existingIndex + 1)];
      } else {
        updated = [goal, ...prev];
      }
      try {
        localStorage.setItem('evo_kanban_goals', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    logActivity(`Goal ${goals.find(g => g.id === goal.id) ? 'updated' : 'created'}: "${goal.title}"`);
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals(prev => {
      const updated = prev.filter(g => g.id !== goalId);
      try {
        localStorage.setItem('evo_kanban_goals', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    logActivity('Deleted goal');
  };

  const handleDecomposeGoal = (goal: UserGoal) => {
    // This is called after AI decomposition - apply the lists to the board
    if (goal.decomposedLists && goal.decomposedLists.length > 0) {
      setBoards(prev => prev.map(b => {
        if (b.id !== activeBoardId) return b;
        const newLists = goal.decomposedLists!.map((nl: any, idx: number) => ({
          ...nl,
          id: `goal-list-${Date.now()}-${idx}`,
          cards: (nl.cards || []).map((c: any, cIdx: number) => ({
            ...c,
            id: `goal-card-${Date.now()}-${cIdx}`,
            createdAt: 'Just now',
            updatedAt: 'Just now',
            widgets: [],
            subtasks: []
          }))
        }));
        return { ...b, lists: [...b.lists, ...newLists] };
      }));
      logActivity(`Decomposed goal "${goal.title}" into ${goal.decomposedLists.length} lists with autonomous tasks`);
    }
  };
  const [customTagColors, setCustomTagColors] = useState<Record<string, string>>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('kb3_custom_tag_colors') : null;
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [smartFilterActive, setSmartFilterActive] = useState(false);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const handleRenameTag = (oldTag: string, newTag: string) => {
    const oldNorm = oldTag.trim().toLowerCase();
    const newNorm = newTag.trim().toLowerCase();
    if (!newNorm || oldNorm === newNorm) return;

    setBoards(prevBoards => 
      prevBoards.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          cards: list.cards.map(card => {
            if (!card.tags || card.tags.length === 0) return card;
            const updatedTags = card.tags.map(t => 
              t.trim().toLowerCase() === oldNorm ? newTag.trim() : t
            );
            return { ...card, tags: updatedTags };
          })
        }))
      }))
    );

    if (selectedTagFilter?.trim().toLowerCase() === oldNorm) {
      setSelectedTagFilter(newTag.trim());
    }

    if (customTagColors[oldNorm]) {
      setCustomTagColors(prev => {
        const next = { ...prev };
        next[newNorm] = next[oldNorm];
        delete next[oldNorm];
        try { localStorage.setItem('kb3_custom_tag_colors', JSON.stringify(next)); } catch {}
        return next;
      });
    }

    logActivity(`Renamed tag #${oldTag} to #${newTag} globally across all boards`);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const norm = tagToDelete.trim().toLowerCase();
    setBoards(prevBoards => 
      prevBoards.map(board => ({
        ...board,
        lists: board.lists.map(list => ({
          ...list,
          cards: list.cards.map(card => {
            if (!card.tags || card.tags.length === 0) return card;
            const updatedTags = card.tags.filter(t => t.trim().toLowerCase() !== norm);
            return { ...card, tags: updatedTags };
          })
        }))
      }))
    );

    if (selectedTagFilter?.trim().toLowerCase() === norm) {
      setSelectedTagFilter(null);
    }

    logActivity(`Deleted tag #${tagToDelete} globally across all boards`);
  };

  const handleUpdateTagColor = (tag: string, colorKey: string) => {
    const norm = tag.trim().toLowerCase();
    setCustomTagColors(prev => {
      const next = { ...prev, [norm]: colorKey };
      try { localStorage.setItem('kb3_custom_tag_colors', JSON.stringify(next)); } catch {}
      return next;
    });
    logActivity(`Updated palette for tag #${tag}`);
  };
  const [selectedCard, setSelectedCard] = useState<CardItemData | null>(null);
  const [selectedList, setSelectedList] = useState<ListConfig | null>(null);
  const [newBoardModalOpen, setNewBoardModalOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardCategory, setNewBoardCategory] = useState<'Core Engineering' | 'Executive Overview' | 'Agent Swarms' | 'Human Operations' | 'Cross-Functional'>('Core Engineering');

  // Activity Log
  const [activities, setActivities] = useState<ActivityLog[]>([
    {
      id: 'act-1',
      timestamp: '10:45 AM',
      actor: { name: 'Orchestrator Agent', isAgent: true },
      action: 'Initialized KB3.0 Evolutionary Kanban Environment with 3 Boards',
      boardName: 'KB3.0 Core Product Lab'
    }
  ]);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const logActivity = (action: string, cardTitle?: string) => {
    const log: ActivityLog = {
      id: `act-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actor: {
        name: currentRole === 'ai_operator' ? 'Gemini AI Operator' : 'User (Human)',
        isAgent: currentRole === 'ai_operator',
      },
      action,
      boardName: activeBoard.name,
      cardTitle
    };
    setActivities(prev => [log, ...prev]);
  };

  // Keyboard Shortcuts System (Ctrl+N: Add Card, Ctrl+K: Search, Ctrl+L: Activity, Ctrl+T: Templates)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const targetTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCreateCardListId(activeBoard.lists[0]?.id || null);
        setCreateCardModalOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setActivityOpen(prev => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setBoardTemplateModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeBoard]);

  // Handle Search Result Selection
  const handleSelectSearchResult = (
    type: 'board' | 'list' | 'card',
    boardId: string,
    listId?: string,
    card?: CardItemData
  ) => {
    setActiveBoardId(boardId);
    if (card) {
      setSelectedCard(card);
    }
    logActivity(`Navigated via Global Search to ${type}: ${card?.title || boardId}`);
  };

  // Handle Board Template Selection
  const handleSelectBoardTemplate = (template: BoardTemplate, mode: 'create_new' | 'apply_current') => {
    const generateListsWithIds = (): ListConfig[] => {
      return template.lists.map((l, idx) => ({
        ...l,
        id: `tpl-list-${Date.now()}-${idx}`,
        cards: l.cards.map((c, cIdx) => ({
          ...c,
          id: `tpl-card-${Date.now()}-${cIdx}`,
          createdAt: 'Just now',
          updatedAt: 'Just now'
        }))
      }));
    };

    if (mode === 'create_new') {
      const newBoard: BoardData = {
        id: `board-tpl-${Date.now()}`,
        name: template.name,
        description: template.description,
        icon: template.icon,
        category: template.category,
        lists: generateListsWithIds(),
        feedForwardConnections: [],
        rbacRole: 'admin'
      };
      setBoards(prev => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
      logActivity(`Created board from template: "${template.name}"`);
    } else {
      setBoards(prev => prev.map(b => {
        if (b.id !== activeBoardId) return b;
        return {
          ...b,
          lists: [...b.lists, ...generateListsWithIds()]
        };
      }));
      logActivity(`Applied template "${template.name}" to active board`);
    }

    setBoardTemplateModalOpen(false);
  };

  // Handle Create Card with Template Data
  const handleCreateCardWithData = (targetListId: string, cardData: Partial<CardItemData>) => {
    const newCard: CardItemData = {
      id: `card-${Date.now()}`,
      title: cardData.title || 'New Collaborative Task',
      description: cardData.description || '',
      entityType: cardData.entityType || 'task',
      status: 'todo',
      progress: 0,
      rbacRole: 'contributor',
      priority: cardData.priority || 'medium',
      tags: cardData.tags || ['New'],
      widgets: cardData.widgets || [],
      prompt: cardData.prompt || '',
      subtasks: [],
      createdAt: 'Just now',
      updatedAt: 'Just now'
    };

    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === targetListId ? { ...l, cards: [...l.cards, newCard] } : l)
      } : b)
    );

    logActivity(`Created card: "${newCard.title}"`, newCard.title);
  };

  // Move Card between lists (Drag & Drop)
  const handleMoveCard = (cardId: string, sourceListId: string, targetListId: string) => {
    setBoards(prevBoards =>
      prevBoards.map(board => {
        if (board.id !== activeBoardId) return board;

        let movedCard: CardItemData | null = null;
        const updatedLists = board.lists.map(list => {
          if (list.id === sourceListId) {
            const cardIndex = list.cards.findIndex(c => c.id === cardId);
            if (cardIndex !== -1) {
              movedCard = list.cards[cardIndex];
              return {
                ...list,
                cards: list.cards.filter(c => c.id !== cardId)
              };
            }
          }
          return list;
        });

        if (!movedCard) return board;

        const finalLists = updatedLists.map(list => {
          if (list.id === targetListId) {
            const isChatFeed = list.listType === 'chat_feed';
            return {
              ...list,
              cards: isChatFeed ? [...list.cards, movedCard!] : [movedCard!, ...list.cards]
            };
          }
          return list;
        });

        return { ...board, lists: finalLists };
      })
    );

    logActivity('Moved card between lists');
  };

  // Update card interactive widget values
  const handleUpdateCardWidget = (cardId: string, widgetId: string, newValue: any) => {
    setBoards(prevBoards =>
      prevBoards.map(board => {
        if (board.id !== activeBoardId) return board;

        return {
          ...board,
          lists: board.lists.map(list => ({
            ...list,
            cards: list.cards.map(card => {
              if (card.id !== cardId) return card;

              const updatedWidgets = card.widgets.map(w =>
                w.id === widgetId ? { ...w, value: newValue } : w
              );

              return { ...card, widgets: updatedWidgets, updatedAt: 'Just now' };
            })
          }))
        };
      })
    );
    logActivity(`Updated widget parameter on card`, cardId);
  };

  // Run Agent Task using server endpoint
  const handleRunAgentTask = async (card: CardItemData) => {
    try {
      const res = await fetch('/api/agent-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardTitle: card.title,
          cardDescription: card.description,
          prompt: card.prompt || 'Execute card routine and evaluate widgets',
          widgets: card.widgets
        })
      });

      const data = await res.json();

      setBoards(prevBoards =>
        prevBoards.map(b => {
          if (b.id !== activeBoardId) return b;

          return {
            ...b,
            lists: b.lists.map(l => ({
              ...l,
              cards: l.cards.map(c => {
                if (c.id !== card.id) return c;

                return {
                  ...c,
                  status: 'completed',
                  progress: data.suggestedProgress || 100,
                  lastExecutionOutput: data.output,
                  updatedAt: 'Just now'
                };
              })
            }))
          };
        })
      );

      logActivity(`Executed Gemini Agent routine: "${card.title}"`, card.title);

      // Check feed-forward target routing
      if (card.targetBoardFeedId) {
        handleTriggerCrossBoardFeed(card);
      }
    } catch (err: any) {
      console.error('Failed to run agent task:', err);
    }
  };

  // Feed card output across boards
  const handleTriggerCrossBoardFeed = (card: CardItemData) => {
    if (!card.targetBoardFeedId) return;

    setBoards(prevBoards =>
      prevBoards.map(b => {
        if (b.id !== card.targetBoardFeedId) return b;

        const targetList = b.lists[0];
        if (!targetList) return b;

        const fedCard: CardItemData = {
          ...card,
          id: `fed-${Date.now()}`,
          title: `[Routed] ${card.title}`,
          description: `Automatically routed from ${activeBoard.name}. Output: ${card.lastExecutionOutput || 'Completed'}`,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        return {
          ...b,
          lists: b.lists.map(l => l.id === targetList.id ? { ...l, cards: [fedCard, ...l.cards] } : l)
        };
      })
    );

    const targetBoardObj = boards.find(b => b.id === card.targetBoardFeedId);
    logActivity(`Feed-Forward routed card "${card.title}" to ${targetBoardObj?.name || 'Executive Master'}`);
  };

  // Apply Orchestrator AI output
  const handleApplyOrchestratorResult = (data: any) => {
    if (!data) return;

    setBoards(prevBoards =>
      prevBoards.map(board => {
        if (board.id !== activeBoardId) return board;

        let updatedLists = [...board.lists];

        // Process new lists
        if (data.newLists && Array.isArray(data.newLists)) {
          const createdLists: ListConfig[] = data.newLists.map((nl: any, idx: number) => ({
            id: `list-gen-${Date.now()}-${idx}`,
            title: nl.title || 'AI Generated List',
            listType: nl.listType || 'kanban',
            homogenousType: nl.homogenousType || 'none',
            color: nl.color || 'indigo',
            icon: 'Sparkles',
            autoRunAgents: true,
            rbacRole: 'contributor',
            cards: (nl.cards || []).map((c: any, cIdx: number) => ({
              id: `card-gen-${Date.now()}-${cIdx}`,
              title: c.title || 'Generated Task',
              description: c.description || 'Auto-generated by Orchestrator Agent',
              entityType: c.entityType || 'agent',
              status: 'in_progress',
              progress: c.progress || 50,
              rbacRole: 'contributor',
              priority: c.priority || 'medium',
              tags: c.tags || ['Orchestrator'],
              widgets: c.widgets || [],
              subtasks: [],
              createdAt: 'Just now',
              updatedAt: 'Just now'
            }))
          }));
          updatedLists = [...updatedLists, ...createdLists];
        }

        // Process new individual cards
        if (data.newCards && Array.isArray(data.newCards)) {
          data.newCards.forEach((nc: any, cIdx: number) => {
            const targetListIdx = updatedLists.findIndex(
              l => l.title.toLowerCase().includes((nc.targetListTitle || '').toLowerCase())
            );

            const cardToAdd: CardItemData = {
              id: `card-gen-single-${Date.now()}-${cIdx}`,
              title: nc.title || 'AI Created Task',
              description: nc.description || 'Added by Orchestrator Agent',
              entityType: nc.entityType || 'task',
              status: 'todo',
              progress: nc.progress || 0,
              rbacRole: 'contributor',
              priority: nc.priority || 'high',
              tags: nc.tags || ['AI-Added'],
              widgets: nc.widgets || [],
              subtasks: [],
              createdAt: 'Just now',
              updatedAt: 'Just now'
            };

            if (targetListIdx !== -1) {
              updatedLists[targetListIdx] = {
                ...updatedLists[targetListIdx],
                cards: [...updatedLists[targetListIdx].cards, cardToAdd]
              };
            } else if (updatedLists.length > 0) {
              updatedLists[0] = {
                ...updatedLists[0],
                cards: [...updatedLists[0].cards, cardToAdd]
              };
            }
          });
        }

        return { ...board, lists: updatedLists };
      })
    );
  };

  // Add Card manually
  const handleAddCard = (listId: string) => {
    const newCard: CardItemData = {
      id: `card-${Date.now()}`,
      title: 'New Collaborative Task',
      description: 'Click card to configure interactive widgets and agent task prompts.',
      entityType: 'task',
      status: 'todo',
      progress: 0,
      rbacRole: 'contributor',
      priority: 'medium',
      tags: ['New'],
      widgets: [
        {
          id: `w-${Date.now()}`,
          type: 'toggle',
          label: 'Requires Agent Verification',
          value: false
        }
      ],
      subtasks: [],
      createdAt: 'Just now',
      updatedAt: 'Just now'
    };

    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l)
      } : b)
    );

    logActivity('Added new card to list');
  };

  // Send message in Chat Feed List
  const handleSendChatMessage = (listId: string, messageText: string) => {
    const chatCard: CardItemData = {
      id: `chat-${Date.now()}`,
      title: messageText.slice(0, 40) + (messageText.length > 40 ? '...' : ''),
      description: messageText,
      entityType: currentRole === 'ai_operator' ? 'agent' : 'human',
      status: 'completed',
      progress: 100,
      rbacRole: currentRole,
      priority: 'medium',
      tags: ['Chat-Message'],
      chatSender: {
        name: currentRole === 'ai_operator' ? 'Gemini Copilot' : 'User Member',
        role: currentRole.replace('_', ' '),
        isAgent: currentRole === 'ai_operator',
        avatar: currentRole === 'ai_operator' 
          ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      widgets: [],
      subtasks: [],
      createdAt: 'Just now',
      updatedAt: 'Just now'
    };

    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, cards: [...l.cards, chatCard] } : l)
      } : b)
    );

    logActivity(`Posted chat card: "${messageText.slice(0, 30)}..."`);
  };

  // Add List at Left or Right (Infinite Canvas expansion)
  const handleAddList = (direction: 'left' | 'right') => {
    const newList: ListConfig = {
      id: `list-${Date.now()}`,
      title: `New List ${activeBoard.lists.length + 1}`,
      listType: 'kanban',
      homogenousType: 'none',
      color: 'indigo',
      icon: 'Workflow',
      autoRunAgents: true,
      rbacRole: 'contributor',
      cards: []
    };

    setBoards(prev =>
      prev.map(b => {
        if (b.id !== activeBoardId) return b;
        const lists = direction === 'left' ? [newList, ...b.lists] : [...b.lists, newList];
        return { ...b, lists };
      })
    );

    logActivity(`Expanded canvas: Added list to the ${direction}`);
  };

  // Delete List from active board
  const handleDeleteList = (listId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== activeBoardId) return b;
      return { ...b, lists: b.lists.filter(l => l.id !== listId) };
    }));
    logActivity('Deleted list from board');
  };

  // Delete Card from active board
  const handleDeleteCard = (cardId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== activeBoardId) return b;
      return {
        ...b,
        lists: b.lists.map(l => ({
          ...l,
          cards: l.cards.filter(c => c.id !== cardId)
        }))
      };
    }));
    if (selectedCard?.id === cardId) {
      setSelectedCard(null);
    }
    logActivity('Deleted card from board');
  };

  // Update List settings
  const handleUpdateList = (updatedList: ListConfig) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === updatedList.id ? updatedList : l)
      } : b)
    );
    logActivity(`Updated list config: "${updatedList.title}"`);
  };

  // Toggle 2-column grid layout for list
  const handleToggleTwoColumns = (listId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, isTwoColumns: !l.isTwoColumns } : l)
      } : b)
    );
  };

  // Resize column width
  const handleResizeListWidth = (listId: string, width: number) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, width } : l)
      } : b)
    );
  };

  // Update Card detail
  const handleUpdateCard = (updatedCard: CardItemData) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => ({
          ...l,
          cards: l.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
        }))
      } : b)
    );
    logActivity(`Updated card details: "${updatedCard.title}"`, updatedCard.title);
  };

  // Create Custom Board
  const handleCreateBoard = () => {
    if (!newBoardName.trim()) return;

    const createdBoard: BoardData = {
      id: `board-${Date.now()}`,
      name: newBoardName,
      description: 'Custom KB3.0 workspace created by user.',
      icon: 'Layers',
      category: newBoardCategory,
      rbacRole: 'admin',
      feedForwardConnections: [],
      lists: [
        {
          id: `list-${Date.now()}-1`,
          title: 'Planning Feed',
          listType: 'chat_feed',
          homogenousType: 'none',
          color: 'indigo',
          icon: 'MessageSquare',
          autoRunAgents: true,
          rbacRole: 'contributor',
          cards: []
        },
        {
          id: `list-${Date.now()}-2`,
          title: 'Autonomous Swarms',
          listType: 'homogenous',
          homogenousType: 'agents_only',
          color: 'purple',
          icon: 'Bot',
          autoRunAgents: true,
          rbacRole: 'ai_operator',
          cards: []
        }
      ]
    };

    setBoards(prev => [...prev, createdBoard]);
    setActiveBoardId(createdBoard.id);
    setNewBoardModalOpen(false);
    setNewBoardName('');
    logActivity(`Created new custom board: "${createdBoard.name}"`);
  };

  // Add Cross-Board Connection
  const handleAddConnection = (connection: FeedForwardConnection) => {
    setBoards(prev =>
      prev.map(b => b.id === connection.sourceBoardId ? {
        ...b,
        feedForwardConnections: [...(b.feedForwardConnections || []), connection]
      } : b)
    );
    logActivity('Established cross-board feed-forward connection');
  };

  // Remove Cross-Board Connection
  const handleRemoveConnection = (boardId: string, connectionId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === boardId ? {
        ...b,
        feedForwardConnections: (b.feedForwardConnections || []).filter(c => c.id !== connectionId)
      } : b)
    );
  };

  // Change Active Board Theme
  const handleSelectBoardTheme = (themeId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? { ...b, theme: themeId } : b)
    );
    logActivity(`Updated background theme to "${themeId}" for board "${activeBoard.name}"`);
  };

  // Auto-Archive Routine: Move inactive completed cards (7+ days or on-demand) to Archive list
  const handleRunAutoArchive = (daysThreshold: number) => {
    setBoards(prev => {
      return prev.map(b => {
        if (b.id !== activeBoardId) return b;

        // Check if an "Archive" list already exists, otherwise create one
        let archiveListIndex = b.lists.findIndex(l => l.title.toLowerCase().includes('archive'));
        let lists = [...b.lists];

        if (archiveListIndex === -1) {
          const newArchiveList: ListConfig = {
            id: `list-archive-${Date.now()}`,
            title: 'Archive',
            listType: 'kanban',
            homogenousType: 'none',
            color: 'slate',
            icon: 'Archive',
            autoRunAgents: false,
            rbacRole: 'contributor',
            cards: []
          };
          lists.push(newArchiveList);
          archiveListIndex = lists.length - 1;
        }

        const cardsToArchive: CardItemData[] = [];

        // Collect completed cards from all other lists
        const updatedLists = lists.map((list, idx) => {
          if (idx === archiveListIndex) return list;

          const remainingCards: CardItemData[] = [];
          list.cards.forEach(card => {
            if (card.status === 'completed' || card.progress === 100) {
              cardsToArchive.push({ ...card, status: 'completed' });
            } else {
              remainingCards.push(card);
            }
          });

          return { ...list, cards: remainingCards };
        });

        // Add collected cards to the Archive list
        updatedLists[archiveListIndex] = {
          ...updatedLists[archiveListIndex],
          cards: [...updatedLists[archiveListIndex].cards, ...cardsToArchive]
        };

        return { ...b, lists: updatedLists };
      });
    });

    logActivity(`Executed Auto-Archive routine (Moved completed cards to Archive list on ${activeBoard.name})`);
  };

  // Voice Command Processing Routine
  const handleExecuteVoiceCommand = (commandText: string) => {
    const lower = commandText.toLowerCase();

    if (lower.includes('create') || lower.includes('feature') || lower.includes('add task') || lower.includes('new card')) {
      setCreateCardModalOpen(true);
      logActivity(`Voice Action: Opened Card Creation for phrase "${commandText}"`);
    } else if (lower.includes('done') || lower.includes('complete') || lower.includes('move')) {
      // Find first incomplete card and mark completed
      let moved = false;
      setBoards(prev => prev.map(b => {
        if (b.id !== activeBoardId) return b;
        let cardFound = false;
        const newLists = b.lists.map(l => {
          if (cardFound) return l;
          const newCards = l.cards.map(c => {
            if (!cardFound && c.status !== 'completed') {
              cardFound = true;
              moved = true;
              return { ...c, status: 'completed' as const, progress: 100 };
            }
            return c;
          });
          return { ...l, cards: newCards };
        });
        return { ...b, lists: newLists };
      }));
      if (moved) {
        logActivity(`Voice Action: Completed active work item via phrase "${commandText}"`);
      }
    } else if (lower.includes('search')) {
      setSearchModalOpen(true);
      logActivity('Voice Action: Triggered Global Search');
    } else if (lower.includes('analytics') || lower.includes('dashboard')) {
      setAnalyticsModalOpen(true);
      logActivity('Voice Action: Opened Telemetry Analytics Dashboard');
    } else if (lower.includes('template')) {
      setBoardTemplateModalOpen(true);
      logActivity('Voice Action: Opened Board Template Library');
    } else if (lower.includes('archive')) {
      handleRunAutoArchive(7);
      logActivity('Voice Action: Triggered Auto-Archive Routine');
    } else {
      logActivity(`Voice Command received: "${commandText}"`);
    }
  };

  const handleExportBoardImage = async () => {
    const el = document.getElementById('board-canvas-container') || document.body;
    try {
      const dataUrl = await toPng(el, { quality: 0.95, cacheBust: true });
      const a = document.createElement('a');
      a.download = `${activeBoard.name.replace(/\s+/g, '_')}_board_export.png`;
      a.href = dataUrl;
      a.click();
      logActivity(`Exported board high-resolution snapshot image (${activeBoard.name})`);
    } catch (err) {
      console.error('Board export failed:', err);
      alert(`Exporting high-resolution snapshot for ${activeBoard.name}...`);
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-[#020617] font-sans text-slate-100 overflow-hidden select-none">
      {/* Frosted Glass Background Ambient Glowing Orbs */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-cyan-600 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute top-[40%] left-[40%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[150px] opacity-40" />
      </div>

      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        {/* Section 1: Single Master Navbar */}
        <Navbar
          boards={boards}
          activeBoardId={activeBoardId}
          onSelectBoard={(id) => setActiveBoardId(id)}
          onOpenOrchestrator={() => setOrchestratorOpen(true)}
          onOpenInterconnect={() => setInterconnectOpen(true)}
          onOpenNewBoard={() => setNewBoardModalOpen(true)}
          onOpenSearch={() => setSearchModalOpen(true)}
          onOpenTemplates={() => setBoardTemplateModalOpen(true)}
          onOpenSaveTemplate={() => setSaveTemplateModalOpen(true)}
          onOpenVoice={() => setVoiceModalOpen(true)}
          onOpenAnalytics={() => setAnalyticsModalOpen(true)}
          onOpenOverviewMap={() => setOverviewMapOpen(true)}
          onExportBoardImage={handleExportBoardImage}
          smartFilterActive={smartFilterActive}
          onToggleSmartFilter={() => setSmartFilterActive(prev => !prev)}
          isHeatmapActive={isHeatmapActive}
          onToggleHeatmap={() => setIsHeatmapActive(prev => !prev)}
          onOpenThemeModal={() => setThemeModalOpen(true)}
          onOpenAutoArchiveModal={() => setAutoArchiveModalOpen(true)}
          onAddList={() => handleAddList('right')}
          selectedTagFilter={selectedTagFilter}
          onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
          onOpenTagManagerModal={() => setTagManagerModalOpen(true)}
          currentRole={currentRole}
          onChangeRole={(role) => setCurrentRole(role)}
          zoomLevel={zoomLevel}
          onChangeZoom={(delta) => setZoomLevel(prev => Math.min(1.25, Math.max(0.75, prev + delta)))}
          onResetPan={() => setZoomLevel(1.0)}
          onToggleActivity={() => setActivityOpen(!activityOpen)}
          activityCount={activities.length}
          onOpenGoalCanvas={() => setGoalCanvasOpen(true)}
        />

        {/* Section 2: Main Infinite Board Canvas */}
        <BoardCanvas
          board={activeBoard}
          onUpdateCardWidget={handleUpdateCardWidget}
          onOpenCardDetail={(card) => setSelectedCard(card)}
          onRunAgentTask={handleRunAgentTask}
          onToggleTwoColumns={handleToggleTwoColumns}
          onResizeListWidth={handleResizeListWidth}
          onAddCard={handleAddCard}
          onSendChatMessage={handleSendChatMessage}
          onOpenListSettings={(list) => setSelectedList(list)}
          onDeleteList={handleDeleteList}
          onDeleteCard={handleDeleteCard}
          onAddList={handleAddList}
          onMoveCard={handleMoveCard}
          onOpenVoiceModal={() => setVoiceModalOpen(true)}
          onOpenAnalyticsModal={() => setAnalyticsModalOpen(true)}
          onOpenThemeModal={() => setThemeModalOpen(true)}
          onOpenAutoArchiveModal={() => setAutoArchiveModalOpen(true)}
          smartFilterActive={smartFilterActive}
          isHeatmapActive={isHeatmapActive}
          selectedTagFilter={selectedTagFilter}
          onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
          currentRole={currentRole}
          zoomLevel={zoomLevel}
          onUpdateCard={handleUpdateCard}
        />


      </div>

      {/* AI Orchestrator Agent Modal */}
      <OrchestratorModal
        isOpen={orchestratorOpen}
        onClose={() => setOrchestratorOpen(false)}
        activeBoard={activeBoard}
        onApplyOrchestratorResult={handleApplyOrchestratorResult}
        onLogActivity={(msg) => logActivity(msg)}
      />

      {/* Board Template Library Modal */}
      <BoardTemplateModal
        isOpen={boardTemplateModalOpen}
        onClose={() => setBoardTemplateModalOpen(false)}
        onSelectTemplate={handleSelectBoardTemplate}
        activeBoardName={activeBoard.name}
        customTemplates={customTemplates}
        onOpenSaveTemplateModal={() => setSaveTemplateModalOpen(true)}
      />

      {/* Save Active Board as Template Modal */}
      <SaveTemplateModal
        isOpen={saveTemplateModalOpen}
        onClose={() => setSaveTemplateModalOpen(false)}
        activeBoard={activeBoard}
        onSaveTemplate={handleSaveTemplate}
      />

      {/* Template-based Card Creation Modal */}
      <CreateCardModal
        isOpen={createCardModalOpen}
        onClose={() => setCreateCardModalOpen(false)}
        lists={activeBoard.lists}
        defaultListId={createCardListId || undefined}
        onCreateCard={handleCreateCardWithData}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        boards={boards}
        onSelectSearchResult={handleSelectSearchResult}
      />

      {/* Analytics Dashboard Recharts Overlay */}
      <AnalyticsDashboardModal
        isOpen={analyticsModalOpen}
        onClose={() => setAnalyticsModalOpen(false)}
        boards={boards}
        activeBoardId={activeBoardId}
      />

      {/* Voice-to-Action Listener Modal */}
      <VoiceActionModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onExecuteVoiceCommand={handleExecuteVoiceCommand}
      />

      {/* Board Theme & Background Selector Modal */}
      <ThemeSelectorModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentThemeId={activeBoard.theme || 'indigo-nebula'}
        onSelectTheme={handleSelectBoardTheme}
        boardName={activeBoard.name}
      />

      {/* Auto-Archive Routine Modal */}
      <AutoArchiveModal
        isOpen={autoArchiveModalOpen}
        onClose={() => setAutoArchiveModalOpen(false)}
        board={activeBoard}
        onRunAutoArchive={handleRunAutoArchive}
      />

      {/* Overview Map & Dependency Graph Modal */}
      <OverviewMapModal
        isOpen={overviewMapOpen}
        onClose={() => setOverviewMapOpen(false)}
        boards={boards}
        activeBoardId={activeBoardId}
        onSelectCard={(card) => {
          setSelectedCard(card);
          setOverviewMapOpen(false);
        }}
      />

      {/* Global Tag Manager & Hashtag Filters Modal */}
      <TagManagerModal
        isOpen={tagManagerModalOpen}
        onClose={() => setTagManagerModalOpen(false)}
        boards={boards}
        selectedTagFilter={selectedTagFilter}
        onSelectTagFilter={(tag) => setSelectedTagFilter(tag)}
        onRenameTag={handleRenameTag}
        onDeleteTag={handleDeleteTag}
        customTagColors={customTagColors}
        onUpdateTagColor={handleUpdateTagColor}
      />

      {/* Card Detail Modal */}
      <CardDetailModal
        card={selectedCard}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        onUpdateCard={handleUpdateCard}
        onDeleteCard={handleDeleteCard}
        onRunAgentTask={handleRunAgentTask}
        availableBoards={boards}
      />

      {/* List Settings Modal */}
      <ListSettingsModal
        list={selectedList}
        isOpen={!!selectedList}
        onClose={() => setSelectedList(null)}
        onUpdateList={handleUpdateList}
        availableBoards={boards}
      />

      {/* Board Interconnectivity Modal */}
      <BoardInterconnectModal
        isOpen={interconnectOpen}
        onClose={() => setInterconnectOpen(false)}
        boards={boards}
        onAddConnection={handleAddConnection}
        onRemoveConnection={handleRemoveConnection}
      />

      {/* Activity Drawer */}
      <ActivityDrawer
        isOpen={activityOpen}
        onClose={() => setActivityOpen(false)}
        activities={activities}
      />

      {/* New Board Creation Modal */}
      {newBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900/80 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl p-6 space-y-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Create New Evolutionary Board</span>
              </h3>
              <button onClick={() => setNewBoardModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Q4 Autonomous AI Release"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                <select
                  value={newBoardCategory}
                  onChange={(e) => setNewBoardCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-slate-100 text-xs"
                >
                  <option value="Core Engineering">Core Engineering</option>
                  <option value="Executive Overview">Executive Overview</option>
                  <option value="Agent Swarms">Agent Swarms</option>
                  <option value="Human Operations">Human Operations</option>
                  <option value="Cross-Functional">Cross-Functional</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewBoardModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/25 transition-all"
              >
                Initialize Board
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
