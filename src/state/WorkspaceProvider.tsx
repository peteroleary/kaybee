import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { INITIAL_BOARDS } from '../data/initialData';
import { BoardTemplate } from '../data/templates';
import { bootstrapWorkspace } from '../lib/repository/bootstrap';
import { diffCardPatch } from '../lib/repository/cardDiff';
import { createFirestoreRepository } from '../lib/repository/firestoreRepository';
import { createMemoryRepository } from '../lib/repository/memoryRepository';
import { WorkspaceRepository } from '../lib/repository/workspaceRepository';
import { newId } from '../shared/ids';
import {
  ActivityLog,
  BoardData,
  CardItemData,
  FeedForwardConnection,
  ListConfig,
  RBACRole,
  UserGoal,
} from '../types';
import { useUiState } from './UiStateProvider';

export interface WorkspaceApi {
  boards: BoardData[];
  activeBoard: BoardData;
  activeBoardId: string;
  goals: UserGoal[];
  customTemplates: BoardTemplate[];
  customTagColors: Record<string, string>;
  activities: ActivityLog[];
  currentRole: RBACRole;
  setBoards: React.Dispatch<React.SetStateAction<BoardData[]>>;
  setActiveBoardId(id: string): void;
  setCurrentRole(role: RBACRole): void;
  logActivity(action: string, cardTitle?: string): void;
  handleSaveTemplate(newTemplate: BoardTemplate): void;
  handleSaveGoal(goal: UserGoal): void;
  handleDeleteGoal(goalId: string): void;
  handleDecomposeGoal(goal: UserGoal): void;
  handleRenameTag(oldTag: string, newTag: string): void;
  handleDeleteTag(tagToDelete: string): void;
  handleUpdateTagColor(tag: string, colorKey: string): void;
  handleSelectSearchResult(
    type: 'board' | 'list' | 'card',
    boardId: string,
    listId?: string,
    card?: CardItemData
  ): void;
  handleSelectBoardTemplate(template: BoardTemplate, mode: 'create_new' | 'apply_current'): void;
  handleCreateCardWithData(targetListId: string, cardData: Partial<CardItemData>): void;
  handleMoveCard(cardId: string, sourceListId: string, targetListId: string): void;
  handleUpdateCardWidget(cardId: string, widgetId: string, newValue: any): void;
  handleRunAgentTask(card: CardItemData): Promise<void>;
  handleTriggerCrossBoardFeed(card: CardItemData): void;
  handleApplyOrchestratorResult(data: any): void;
  handleAddCard(listId: string): void;
  handleSendChatMessage(listId: string, messageText: string): void;
  handleAddList(direction: 'left' | 'right'): void;
  handleDeleteList(listId: string): void;
  handleDeleteCard(cardId: string): void;
  handleUpdateList(updatedList: ListConfig): void;
  handleToggleTwoColumns(listId: string): void;
  handleResizeListWidth(listId: string, width: number): void;
  handleUpdateCard(updatedCard: CardItemData): void;
  handleCreateBoard(name: string, category: BoardData['category']): void;
  handleAddConnection(connection: FeedForwardConnection): void;
  handleRemoveConnection(boardId: string, connectionId: string): void;
  handleSelectBoardTheme(themeId: string): void;
  handleRunAutoArchive(daysThreshold: number): void;
  handleExecuteVoiceCommand(commandText: string): void;
  handleExportBoardImage(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null);

function logError(action: string) {
  return (err: unknown) => console.error(`Failed to ${action}:`, err);
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ui = useUiState();
  const { user } = useAuth();

  const memoryRepository = useMemo(() => createMemoryRepository(), []);
  const [repository, setRepository] = useState<WorkspaceRepository>(memoryRepository);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [boardsLoaded, setBoardsLoaded] = useState(false);

  // Seeded synchronously with INITIAL_BOARDS (the memory repository's default)
  // so the very first render matches today's behavior exactly — no flash
  // before the subscription effect below fires.
  const [boards, setBoards] = useState<BoardData[]>(INITIAL_BOARDS);
  const boardsRef = useRef<BoardData[]>(boards);
  useEffect(() => {
    boardsRef.current = boards;
  }, [boards]);

  const [activeBoardId, setActiveBoardId] = useState<string>(INITIAL_BOARDS[0]?.id ?? '');
  const [currentRole, setCurrentRole] = useState<RBACRole>('admin');
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [customTemplates, setCustomTemplates] = useState<BoardTemplate[]>([]);
  const [customTagColors, setCustomTagColors] = useState<Record<string, string>>({});
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Signed-out -> memory repository (today's exact behavior). Signed-in -> seed
  // once (guarded by a transaction on users/{uid}.seededAt) then switch to Firestore.
  useEffect(() => {
    if (!user) {
      setRepository(memoryRepository);
      setBootstrapping(false);
      return;
    }

    let cancelled = false;
    setBootstrapping(true);

    const currentBoards = boardsRef.current;
    const hasLocalEdits = JSON.stringify(currentBoards) !== JSON.stringify(INITIAL_BOARDS);
    let seedBoards: BoardData[] | undefined;
    if (hasLocalEdits && typeof window !== 'undefined') {
      const wantsImport = window.confirm(
        'You made changes to your board before signing in. Import them into your account as your starting workspace?'
      );
      if (wantsImport) seedBoards = currentBoards;
    }

    bootstrapWorkspace(user.uid, seedBoards)
      .catch(err => console.error('Failed to bootstrap workspace:', err))
      .finally(() => {
        if (cancelled) return;
        setRepository(createFirestoreRepository(user.uid));
        setBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    setBoardsLoaded(false);
    const unsub = repository.subscribeAllBoards(next => {
      setBoards(next);
      setBoardsLoaded(true);
    });
    return unsub;
  }, [repository]);

  useEffect(() => repository.subscribeGoals(setGoals), [repository]);
  useEffect(() => repository.subscribeTemplates(setCustomTemplates), [repository]);
  useEffect(() => repository.subscribeTagColors(setCustomTagColors), [repository]);
  useEffect(() => repository.subscribeActivity(200, setActivities), [repository]);

  useEffect(() => {
    if (boards.length === 0) return;
    if (!boards.some(b => b.id === activeBoardId)) {
      setActiveBoardId(boards[0].id);
    }
  }, [boards, activeBoardId]);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  const findCard = useCallback(
    (cardId: string): CardItemData | null => {
      for (const board of boards) {
        for (const list of board.lists) {
          const found = list.cards.find(c => c.id === cardId);
          if (found) return found;
        }
      }
      return null;
    },
    [boards]
  );

  const logActivity = useCallback(
    (action: string, cardTitle?: string) => {
      const entry: Omit<ActivityLog, 'id'> = {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actor: {
          name: currentRole === 'ai_operator' ? 'Gemini AI Operator' : 'User (Human)',
          isAgent: currentRole === 'ai_operator',
        },
        action,
        boardName: activeBoard?.name ?? '',
        cardTitle,
      };
      repository.logActivity(entry).catch(logError('log activity'));
    },
    [currentRole, activeBoard, repository]
  );

  const handleSaveTemplate = useCallback(
    (newTemplate: BoardTemplate) => {
      repository.saveTemplate(newTemplate).catch(logError('save template'));
      logActivity(`Saved current board snapshot as custom template: "${newTemplate.name}"`);
    },
    [logActivity, repository]
  );

  const handleSaveGoal = useCallback(
    (goal: UserGoal) => {
      const isUpdate = goals.some(g => g.id === goal.id);
      repository.saveGoal(goal).catch(logError('save goal'));
      logActivity(`Goal ${isUpdate ? 'updated' : 'created'}: "${goal.title}"`);
    },
    [goals, logActivity, repository]
  );

  const handleDeleteGoal = useCallback(
    (goalId: string) => {
      repository.deleteGoal(goalId).catch(logError('delete goal'));
      logActivity('Deleted goal');
    },
    [logActivity, repository]
  );

  const handleDecomposeGoal = useCallback(
    (goal: UserGoal) => {
      if (goal.decomposedLists && goal.decomposedLists.length > 0) {
        goal.decomposedLists.forEach((nl: any) => {
          const cards: CardItemData[] = (nl.cards || []).map((c: any) => ({
            id: '',
            createdAt: '',
            updatedAt: '',
            widgets: [],
            subtasks: [],
            ...c,
          }));
          repository
            .createList(activeBoardId, { ...nl, cards }, 'end')
            .catch(logError('decompose goal into list'));
        });
        logActivity(`Decomposed goal "${goal.title}" into ${goal.decomposedLists.length} lists with autonomous tasks`);
      }
    },
    [activeBoardId, logActivity, repository]
  );

  const handleRenameTag = useCallback(
    (oldTag: string, newTag: string) => {
      const oldNorm = oldTag.trim().toLowerCase();
      const newNorm = newTag.trim().toLowerCase();
      if (!newNorm || oldNorm === newNorm) return;

      repository.renameTag(oldTag, newTag).catch(logError('rename tag'));

      if (ui.selectedTagFilter?.trim().toLowerCase() === oldNorm) {
        ui.setSelectedTagFilter(newTag.trim());
      }

      logActivity(`Renamed tag #${oldTag} to #${newTag} globally across all boards`);
    },
    [ui, logActivity, repository]
  );

  const handleDeleteTag = useCallback(
    (tagToDelete: string) => {
      const norm = tagToDelete.trim().toLowerCase();
      repository.deleteTag(tagToDelete).catch(logError('delete tag'));

      if (ui.selectedTagFilter?.trim().toLowerCase() === norm) {
        ui.setSelectedTagFilter(null);
      }

      logActivity(`Deleted tag #${tagToDelete} globally across all boards`);
    },
    [ui, logActivity, repository]
  );

  const handleUpdateTagColor = useCallback(
    (tag: string, colorKey: string) => {
      repository.updateTagColor(tag, colorKey).catch(logError('update tag color'));
      logActivity(`Updated palette for tag #${tag}`);
    },
    [logActivity, repository]
  );

  const handleSelectSearchResult = useCallback(
    (type: 'board' | 'list' | 'card', boardId: string, listId?: string, card?: CardItemData) => {
      setActiveBoardId(boardId);
      if (card) {
        ui.openModal('cardDetail', card);
      }
      logActivity(`Navigated via Global Search to ${type}: ${card?.title || boardId}`);
    },
    [ui, logActivity]
  );

  const handleSelectBoardTemplate = useCallback(
    (template: BoardTemplate, mode: 'create_new' | 'apply_current') => {
      const listsForRepo: ListConfig[] = template.lists.map(l => ({ ...l, id: newId('list') }));

      if (mode === 'create_new') {
        repository
          .createBoard({
            name: template.name,
            category: template.category,
            description: template.description,
            icon: template.icon,
            rbacRole: 'admin',
            lists: listsForRepo,
          })
          .then(id => setActiveBoardId(id))
          .catch(logError('create board from template'));
        logActivity(`Created board from template: "${template.name}"`);
      } else {
        listsForRepo.forEach(l => {
          const { cards, ...listFields } = l;
          repository.createList(activeBoardId, { ...listFields, cards }, 'end').catch(logError('apply template list'));
        });
        logActivity(`Applied template "${template.name}" to active board`);
      }

      ui.closeModal('boardTemplate');
    },
    [activeBoardId, logActivity, ui, repository]
  );

  const handleCreateCardWithData = useCallback(
    (targetListId: string, cardData: Partial<CardItemData>) => {
      repository
        .createCard(activeBoardId, targetListId, {
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
        })
        .catch(logError('create card'));

      logActivity(`Created card: "${cardData.title || 'New Collaborative Task'}"`, cardData.title);
    },
    [activeBoardId, logActivity, repository]
  );

  const handleMoveCard = useCallback(
    (cardId: string, _sourceListId: string, targetListId: string) => {
      const targetList = activeBoard?.lists.find(l => l.id === targetListId);
      const index = targetList?.listType === 'chat_feed' ? targetList.cards.length : 0;
      repository.moveCard(cardId, targetListId, index).catch(logError('move card'));
      logActivity('Moved card between lists');
    },
    [activeBoard, logActivity, repository]
  );

  const handleUpdateCardWidget = useCallback(
    (cardId: string, widgetId: string, newValue: any) => {
      const card = findCard(cardId);
      if (!card) return;
      const updatedWidgets = card.widgets.map(w => (w.id === widgetId ? { ...w, value: newValue } : w));
      repository.updateCard(cardId, { widgets: updatedWidgets }).catch(logError('update widget'));
      logActivity('Updated widget parameter on card', cardId);
    },
    [findCard, logActivity, repository]
  );

  const handleTriggerCrossBoardFeed = useCallback(
    (card: CardItemData) => {
      if (!card.targetBoardFeedId) return;

      const targetBoard = boards.find(b => b.id === card.targetBoardFeedId);
      const targetList = targetBoard?.lists[0];
      if (!targetBoard || !targetList) return;

      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...cardFields } = card;
      repository
        .createCard(targetBoard.id, targetList.id, {
          ...cardFields,
          title: `[Routed] ${card.title}`,
          description: `Automatically routed from ${activeBoard?.name ?? ''}. Output: ${card.lastExecutionOutput || 'Completed'}`,
        })
        .catch(logError('route card cross-board'));

      logActivity(`Feed-Forward routed card "${card.title}" to ${targetBoard.name || 'Executive Master'}`);
    },
    [activeBoard, boards, logActivity, repository]
  );

  // Run Agent Task using server endpoint. Kept byte-for-byte on the network
  // call (including its known res.ok / suggestedProgress bugs) per Phase 2
  // scope — only the persistence call at the end is repository-routed.
  const handleRunAgentTask = useCallback(
    async (card: CardItemData) => {
      try {
        const res = await fetch('/api/agent-run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardTitle: card.title,
            cardDescription: card.description,
            prompt: card.prompt || 'Execute card routine and evaluate widgets',
            widgets: card.widgets,
          }),
        });

        const data = await res.json();

        await repository.updateCard(card.id, {
          status: 'completed',
          progress: data.suggestedProgress || 100,
          lastExecutionOutput: data.output,
        });

        logActivity(`Executed Gemini Agent routine: "${card.title}"`, card.title);

        if (card.targetBoardFeedId) {
          handleTriggerCrossBoardFeed(card);
        }
      } catch (err: any) {
        console.error('Failed to run agent task:', err);
      }
    },
    [logActivity, handleTriggerCrossBoardFeed, repository]
  );

  const handleApplyOrchestratorResult = useCallback(
    (data: any) => {
      if (!data) return;

      (async () => {
        const createdLists: { id: string; title: string }[] = [];

        if (data.newLists && Array.isArray(data.newLists)) {
          for (const nl of data.newLists) {
            const cards: CardItemData[] = (nl.cards || []).map((c: any) => ({
              id: '',
              createdAt: '',
              updatedAt: '',
              subtasks: [],
              title: c.title || 'Generated Task',
              description: c.description || 'Auto-generated by Orchestrator Agent',
              entityType: c.entityType || 'agent',
              status: 'in_progress',
              progress: c.progress || 50,
              rbacRole: 'contributor',
              priority: c.priority || 'medium',
              tags: c.tags || ['Orchestrator'],
              widgets: c.widgets || [],
              ...c,
            }));
            const listId = await repository.createList(
              activeBoardId,
              {
                title: nl.title || 'AI Generated List',
                listType: nl.listType || 'kanban',
                homogenousType: nl.homogenousType || 'none',
                color: nl.color || 'indigo',
                icon: 'Sparkles',
                autoRunAgents: true,
                rbacRole: 'contributor',
                cards,
              },
              'end'
            );
            createdLists.push({ id: listId, title: nl.title || 'AI Generated List' });
          }
        }

        if (data.newCards && Array.isArray(data.newCards)) {
          const availableLists = [
            ...(activeBoard?.lists.map(l => ({ id: l.id, title: l.title })) ?? []),
            ...createdLists,
          ];
          for (const nc of data.newCards) {
            const target = availableLists.find(l => l.title.toLowerCase().includes((nc.targetListTitle || '').toLowerCase()));
            const targetListId = target?.id ?? availableLists[0]?.id;
            if (!targetListId) continue;
            await repository.createCard(activeBoardId, targetListId, {
              title: nc.title || 'AI Created Task',
              description: nc.description || 'Added by Orchestrator Agent',
              entityType: nc.entityType || 'task',
              status: 'todo',
              progress: nc.progress || 0,
              rbacRole: 'contributor',
              priority: nc.priority || 'high',
              tags: nc.tags || ['AI-Added'],
              widgets: nc.widgets || [],
            });
          }
        }
      })().catch(logError('apply orchestrator result'));
    },
    [activeBoardId, activeBoard, repository]
  );

  const handleAddCard = useCallback(
    (listId: string) => {
      repository
        .createCard(activeBoardId, listId, {
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
              id: newId('w'),
              type: 'toggle',
              label: 'Requires Agent Verification',
              value: false,
            },
          ],
        })
        .catch(logError('add card'));

      logActivity('Added new card to list');
    },
    [activeBoardId, logActivity, repository]
  );

  const handleSendChatMessage = useCallback(
    (listId: string, messageText: string) => {
      repository
        .createCard(activeBoardId, listId, {
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
            avatar:
              currentRole === 'ai_operator'
                ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=120'
                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          widgets: [],
        })
        .catch(logError('send chat message'));

      logActivity(`Posted chat card: "${messageText.slice(0, 30)}..."`);
    },
    [activeBoardId, currentRole, logActivity, repository]
  );

  const handleAddList = useCallback(
    (direction: 'left' | 'right') => {
      repository
        .createList(
          activeBoardId,
          {
            title: `New List ${(activeBoard?.lists.length ?? 0) + 1}`,
            listType: 'kanban',
            homogenousType: 'none',
            color: 'indigo',
            icon: 'Workflow',
            autoRunAgents: true,
            rbacRole: 'contributor',
          },
          direction === 'left' ? 'start' : 'end'
        )
        .catch(logError('add list'));

      logActivity(`Expanded canvas: Added list to the ${direction}`);
    },
    [activeBoardId, activeBoard, logActivity, repository]
  );

  const handleDeleteList = useCallback(
    (listId: string) => {
      repository.deleteList(listId).catch(logError('delete list'));
      logActivity('Deleted list from board');
    },
    [logActivity, repository]
  );

  const handleDeleteCard = useCallback(
    (cardId: string) => {
      repository.deleteCard(cardId).catch(logError('delete card'));
      const currentCard = ui.modalPayload<CardItemData>('cardDetail');
      if (currentCard?.id === cardId) {
        ui.closeModal('cardDetail');
      }
      logActivity('Deleted card from board');
    },
    [logActivity, ui, repository]
  );

  const handleUpdateList = useCallback(
    (updatedList: ListConfig) => {
      const { id, cards: _cards, ...patch } = updatedList;
      repository.updateList(id, patch).catch(logError('update list'));
      logActivity(`Updated list config: "${updatedList.title}"`);
    },
    [logActivity, repository]
  );

  const handleToggleTwoColumns = useCallback(
    (listId: string) => {
      const list = activeBoard?.lists.find(l => l.id === listId);
      if (!list) return;
      repository.updateList(listId, { isTwoColumns: !list.isTwoColumns }).catch(logError('toggle two columns'));
    },
    [activeBoard, repository]
  );

  const handleResizeListWidth = useCallback(
    (listId: string, width: number) => {
      repository.updateList(listId, { width }).catch(logError('resize list'));
    },
    [repository]
  );

  const handleUpdateCard = useCallback(
    (updatedCard: CardItemData) => {
      const original = findCard(updatedCard.id);
      if (original) {
        const { patch } = diffCardPatch(original, updatedCard);
        if (Object.keys(patch).length > 0) {
          repository.updateCard(updatedCard.id, patch).catch(logError('update card'));
        }
      }
      logActivity(`Updated card details: "${updatedCard.title}"`, updatedCard.title);
    },
    [findCard, logActivity, repository]
  );

  const handleCreateBoard = useCallback(
    (name: string, category: BoardData['category']) => {
      if (!name.trim()) return;

      const lists: ListConfig[] = [
        {
          id: newId('list'),
          title: 'Planning Feed',
          listType: 'chat_feed',
          homogenousType: 'none',
          color: 'indigo',
          icon: 'MessageSquare',
          autoRunAgents: true,
          rbacRole: 'contributor',
          cards: [],
        },
        {
          id: newId('list'),
          title: 'Autonomous Swarms',
          listType: 'homogenous',
          homogenousType: 'agents_only',
          color: 'purple',
          icon: 'Bot',
          autoRunAgents: true,
          rbacRole: 'ai_operator',
          cards: [],
        },
      ];

      repository
        .createBoard({
          name,
          category,
          description: 'Custom KB3.0 workspace created by user.',
          icon: 'Layers',
          rbacRole: 'admin',
          lists,
        })
        .then(id => setActiveBoardId(id))
        .catch(logError('create board'));

      logActivity(`Created new custom board: "${name}"`);
    },
    [logActivity, repository]
  );

  const handleAddConnection = useCallback(
    (connection: FeedForwardConnection) => {
      const board = boards.find(b => b.id === connection.sourceBoardId);
      const nextConnections = [...(board?.feedForwardConnections || []), connection];
      repository.updateBoard(connection.sourceBoardId, { feedForwardConnections: nextConnections }).catch(logError('add connection'));
      logActivity('Established cross-board feed-forward connection');
    },
    [boards, logActivity, repository]
  );

  const handleRemoveConnection = useCallback(
    (boardId: string, connectionId: string) => {
      const board = boards.find(b => b.id === boardId);
      const nextConnections = (board?.feedForwardConnections || []).filter(c => c.id !== connectionId);
      repository.updateBoard(boardId, { feedForwardConnections: nextConnections }).catch(logError('remove connection'));
    },
    [boards, repository]
  );

  const handleSelectBoardTheme = useCallback(
    (themeId: string) => {
      repository.updateBoard(activeBoardId, { theme: themeId }).catch(logError('select board theme'));
      logActivity(`Updated background theme to "${themeId}" for board "${activeBoard?.name ?? ''}"`);
    },
    [activeBoardId, activeBoard, logActivity, repository]
  );

  const handleRunAutoArchive = useCallback(
    (_daysThreshold: number) => {
      if (!activeBoard) return;
      const boardId = activeBoard.id;
      const boardName = activeBoard.name;

      (async () => {
        let archiveList = activeBoard.lists.find(l => l.title.toLowerCase().includes('archive'));
        let archiveListId = archiveList?.id;
        if (!archiveListId) {
          archiveListId = await repository.createList(
            boardId,
            {
              title: 'Archive',
              listType: 'kanban',
              homogenousType: 'none',
              color: 'slate',
              icon: 'Archive',
              autoRunAgents: false,
              rbacRole: 'contributor',
            },
            'end'
          );
        }

        const cardsToArchive: CardItemData[] = [];
        activeBoard.lists.forEach(list => {
          if (list.id === archiveListId) return;
          list.cards.forEach(card => {
            if (card.status === 'completed' || card.progress === 100) cardsToArchive.push(card);
          });
        });

        for (const card of cardsToArchive) {
          if (card.status !== 'completed') {
            await repository.updateCard(card.id, { status: 'completed' });
          }
          await repository.moveCard(card.id, archiveListId!, Number.MAX_SAFE_INTEGER);
        }
      })().catch(logError('run auto-archive'));

      logActivity(`Executed Auto-Archive routine (Moved completed cards to Archive list on ${boardName})`);
    },
    [activeBoard, logActivity, repository]
  );

  const handleExecuteVoiceCommand = useCallback(
    (commandText: string) => {
      const lower = commandText.toLowerCase();

      if (lower.includes('create') || lower.includes('feature') || lower.includes('add task') || lower.includes('new card')) {
        ui.openModal('createCard');
        logActivity(`Voice Action: Opened Card Creation for phrase "${commandText}"`);
      } else if (lower.includes('done') || lower.includes('complete') || lower.includes('move')) {
        const card = activeBoard?.lists.flatMap(l => l.cards).find(c => c.status !== 'completed');
        if (card) {
          repository.updateCard(card.id, { status: 'completed', progress: 100 }).catch(logError('complete card via voice'));
          logActivity(`Voice Action: Completed active work item via phrase "${commandText}"`);
        }
      } else if (lower.includes('search')) {
        ui.openModal('search');
        logActivity('Voice Action: Triggered Global Search');
      } else if (lower.includes('analytics') || lower.includes('dashboard')) {
        ui.openModal('analytics');
        logActivity('Voice Action: Opened Telemetry Analytics Dashboard');
      } else if (lower.includes('template')) {
        ui.openModal('boardTemplate');
        logActivity('Voice Action: Opened Board Template Library');
      } else if (lower.includes('archive')) {
        handleRunAutoArchive(7);
        logActivity('Voice Action: Triggered Auto-Archive Routine');
      } else {
        logActivity(`Voice Command received: "${commandText}"`);
      }
    },
    [activeBoard, logActivity, ui, handleRunAutoArchive, repository]
  );

  const handleExportBoardImage = useCallback(async () => {
    const { toPng } = await import('html-to-image');
    const el = document.getElementById('board-canvas-container') || document.body;
    try {
      const dataUrl = await toPng(el, { quality: 0.95, cacheBust: true });
      const a = document.createElement('a');
      a.download = `${(activeBoard?.name ?? 'board').replace(/\s+/g, '_')}_board_export.png`;
      a.href = dataUrl;
      a.click();
      logActivity(`Exported board high-resolution snapshot image (${activeBoard?.name ?? ''})`);
    } catch (err) {
      console.error('Board export failed:', err);
      alert(`Exporting high-resolution snapshot for ${activeBoard?.name ?? ''}...`);
    }
  }, [activeBoard, logActivity]);

  const ready = repository.kind === 'memory' || (!bootstrapping && boardsLoaded);

  if (!ready || !activeBoard) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#020617] text-slate-300 font-sans">
        Loading your workspace…
      </div>
    );
  }

  const value: WorkspaceApi = {
    boards,
    activeBoard,
    activeBoardId,
    goals,
    customTemplates,
    customTagColors,
    activities,
    currentRole,
    setBoards,
    setActiveBoardId,
    setCurrentRole,
    logActivity,
    handleSaveTemplate,
    handleSaveGoal,
    handleDeleteGoal,
    handleDecomposeGoal,
    handleRenameTag,
    handleDeleteTag,
    handleUpdateTagColor,
    handleSelectSearchResult,
    handleSelectBoardTemplate,
    handleCreateCardWithData,
    handleMoveCard,
    handleUpdateCardWidget,
    handleRunAgentTask,
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
    handleExecuteVoiceCommand,
    handleExportBoardImage,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace(): WorkspaceApi {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
