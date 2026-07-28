import { useState, useCallback } from 'react';
import { BoardData, CardItemData, ListConfig, FeedForwardConnection, ActivityLog, RBACRole } from '../types';

interface UseBoardStateReturn {
  boards: BoardData[];
  activeBoardId: string;
  activeBoard: BoardData;
  currentRole: RBACRole;
  zoomLevel: number;
  activities: ActivityLog[];
  setBoards: React.Dispatch<React.SetStateAction<BoardData[]>>;
  setActiveBoardId: (id: string) => void;
  setCurrentRole: (role: RBACRole) => void;
  setZoomLevel: (zoom: number) => void;
  logActivity: (action: string, cardTitle?: string) => void;
  handleMoveCard: (cardId: string, sourceListId: string, targetListId: string) => void;
  handleUpdateCardWidget: (cardId: string, widgetId: string, newValue: any) => void;
  handleTriggerCrossBoardFeed: (card: CardItemData) => void;
  handleApplyOrchestratorResult: (data: any) => void;
  handleAddCard: (listId: string) => void;
  handleSendChatMessage: (listId: string, messageText: string) => void;
  handleAddList: (direction: 'left' | 'right') => void;
  handleDeleteList: (listId: string) => void;
  handleDeleteCard: (cardId: string) => void;
  handleUpdateList: (updatedList: ListConfig) => void;
  handleToggleTwoColumns: (listId: string) => void;
  handleResizeListWidth: (listId: string, width: number) => void;
  handleUpdateCard: (updatedCard: CardItemData) => void;
  handleCreateBoard: (name: string, category: BoardData['category']) => void;
  handleAddConnection: (connection: FeedForwardConnection) => void;
  handleRemoveConnection: (boardId: string, connectionId: string) => void;
  handleSelectBoardTheme: (themeId: string) => void;
  handleRunAutoArchive: (daysThreshold: number) => void;
  handleExportBoardImage: () => void;
}

export function useBoardState(
  initialBoards: BoardData[],
  initialRoleId: string
): UseBoardStateReturn {
  const [boards, setBoards] = useState<BoardData[]>(initialBoards);
  const [activeBoardId, setActiveBoardId] = useState<string>(initialBoards[0].id);
  const [currentRole, setCurrentRole] = useState<RBACRole>(initialRoleId as RBACRole);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
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

  const logActivity = useCallback((action: string, cardTitle?: string) => {
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
  }, [currentRole, activeBoard.name]);

  const handleMoveCard = useCallback((cardId: string, sourceListId: string, targetListId: string) => {
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
  }, [activeBoardId, logActivity]);

  const handleUpdateCardWidget = useCallback((cardId: string, widgetId: string, newValue: any) => {
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
  }, [activeBoardId, logActivity]);

  const handleTriggerCrossBoardFeed = useCallback((card: CardItemData) => {
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
  }, [activeBoard.name, boards, logActivity]);

  const handleApplyOrchestratorResult = useCallback((data: any) => {
    if (!data) return;

    setBoards(prevBoards =>
      prevBoards.map(board => {
        if (board.id !== activeBoardId) return board;

        let updatedLists = [...board.lists];

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
  }, [activeBoardId]);

  const handleAddCard = useCallback((listId: string) => {
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
  }, [activeBoardId, logActivity]);

  const handleSendChatMessage = useCallback((listId: string, messageText: string) => {
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
  }, [activeBoardId, currentRole, logActivity]);

  const handleAddList = useCallback((direction: 'left' | 'right') => {
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
  }, [activeBoardId, activeBoard.lists.length, logActivity]);

  const handleDeleteList = useCallback((listId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== activeBoardId) return b;
      return { ...b, lists: b.lists.filter(l => l.id !== listId) };
    }));
    logActivity('Deleted list from board');
  }, [activeBoardId, logActivity]);

  const handleDeleteCard = useCallback((cardId: string) => {
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
    logActivity('Deleted card from board');
  }, [activeBoardId, logActivity]);

  const handleUpdateList = useCallback((updatedList: ListConfig) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === updatedList.id ? updatedList : l)
      } : b)
    );
    logActivity(`Updated list config: "${updatedList.title}"`);
  }, [activeBoardId, logActivity]);

  const handleToggleTwoColumns = useCallback((listId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, isTwoColumns: !l.isTwoColumns } : l)
      } : b)
    );
  }, [activeBoardId]);

  const handleResizeListWidth = useCallback((listId: string, width: number) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? {
        ...b,
        lists: b.lists.map(l => l.id === listId ? { ...l, width } : l)
      } : b)
    );
  }, [activeBoardId]);

  const handleUpdateCard = useCallback((updatedCard: CardItemData) => {
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
  }, [activeBoardId, logActivity]);

  const handleCreateBoard = useCallback((name: string, category: BoardData['category']) => {
    const createdBoard: BoardData = {
      id: `board-${Date.now()}`,
      name,
      description: 'Custom KB3.0 workspace created by user.',
      icon: 'Layers',
      category,
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
    logActivity(`Created new custom board: "${createdBoard.name}"`);
  }, [logActivity]);

  const handleAddConnection = useCallback((connection: FeedForwardConnection) => {
    setBoards(prev =>
      prev.map(b => b.id === connection.sourceBoardId ? {
        ...b,
        feedForwardConnections: [...(b.feedForwardConnections || []), connection]
      } : b)
    );
    logActivity('Established cross-board feed-forward connection');
  }, [logActivity]);

  const handleRemoveConnection = useCallback((boardId: string, connectionId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === boardId ? {
        ...b,
        feedForwardConnections: (b.feedForwardConnections || []).filter(c => c.id !== connectionId)
      } : b)
    );
  }, []);

  const handleSelectBoardTheme = useCallback((themeId: string) => {
    setBoards(prev =>
      prev.map(b => b.id === activeBoardId ? { ...b, theme: themeId } : b)
    );
    logActivity(`Updated background theme to "${themeId}" for board "${activeBoard.name}"`);
  }, [activeBoardId, activeBoard.name, logActivity]);

  const handleRunAutoArchive = useCallback((daysThreshold: number) => {
    setBoards(prev => {
      return prev.map(b => {
        if (b.id !== activeBoardId) return b;

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

        updatedLists[archiveListIndex] = {
          ...updatedLists[archiveListIndex],
          cards: [...updatedLists[archiveListIndex].cards, ...cardsToArchive]
        };

        return { ...b, lists: updatedLists };
      });
    });

    logActivity(`Executed Auto-Archive routine (Moved completed cards to Archive list on ${activeBoard.name})`);
  }, [activeBoardId, activeBoard.name, logActivity]);

  const handleExportBoardImage = useCallback(async () => {
    const { toPng } = await import('html-to-image');
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
  }, [activeBoard.name, logActivity]);

  return {
    boards,
    activeBoardId,
    activeBoard,
    currentRole,
    zoomLevel,
    activities,
    setBoards,
    setActiveBoardId,
    setCurrentRole,
    setZoomLevel,
    logActivity,
    handleMoveCard,
    handleUpdateCardWidget,
    handleTriggerCrossBoardFeed,
    handleApplyOrchestratorResult,
    handleAddCard,
    handleSendChatMessage,
    handleAddList,
    handleDeleteList,
    handleDeleteCard,
    handleUpdateList,
    handleToggleTwoColumns,
    handleResizeListWidth,
    handleUpdateCard,
    handleCreateBoard,
    handleAddConnection,
    handleRemoveConnection,
    handleSelectBoardTheme,
    handleRunAutoArchive,
    handleExportBoardImage,
  };
}
